import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from pydantic import SecretStr
from tinydb import TinyDB

from core import storage
from core import email as email_service
from models import ChangePasswordInput, ForgotPasswordInput, ResetPasswordInput
from routes import auth


def make_request(ip_address: str = "192.0.2.15"):
    # Build the smallest Starlette request needed to verify the recorded client IP.
    return auth.Request(
        {
            "type": "http",
            "http_version": "1.1",
            "method": "POST",
            "scheme": "http",
            "path": "/auth/password",
            "raw_path": b"/auth/password",
            "query_string": b"",
            "headers": [],
            "client": (ip_address, 12345),
            "server": ("testserver", 80),
        }
    )


class PasswordFlowTests(unittest.TestCase):
    def test_reset_token_can_only_be_consumed_once(self):
        # A temporary TinyDB table isolates the one-use check from local application data.
        with tempfile.TemporaryDirectory() as directory:
            temporary_db = TinyDB(Path(directory) / "password-resets.json")
            reset_table = temporary_db.table("password_reset_tokens")
            with patch.object(storage, "password_reset_tokens", reset_table):
                expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
                storage.store_password_reset_token("random-jti", "user-123", expires_at)

                self.assertTrue(storage.consume_password_reset_token("random-jti", "user-123"))
                self.assertFalse(storage.consume_password_reset_token("random-jti", "user-123"))
            temporary_db.close()

    def test_expired_reset_token_cannot_be_consumed(self):
        with tempfile.TemporaryDirectory() as directory:
            temporary_db = TinyDB(Path(directory) / "password-resets.json")
            reset_table = temporary_db.table("password_reset_tokens")
            with patch.object(storage, "password_reset_tokens", reset_table):
                storage.store_password_reset_token(
                    "expired-jti",
                    "user-123",
                    datetime.now(timezone.utc) - timedelta(minutes=1),
                )

                self.assertFalse(storage.consume_password_reset_token("expired-jti", "user-123"))
            temporary_db.close()

    def test_forgot_password_uses_same_message_for_unknown_address(self):
        with (
            patch.object(auth, "register_password_reset_request", return_value=True),
            patch.object(auth, "get_user_by_email", return_value=None),
        ):
            result = auth.forgot_password(
                ForgotPasswordInput(email="unknown@example.com"),
                make_request(),
            )

        self.assertEqual(result["message"], auth.PASSWORD_RESET_CONFIRMATION)

    def test_reset_password_rejects_invalid_or_expired_token(self):
        with patch.object(auth, "decode_password_reset_token", return_value=None):
            with self.assertRaises(HTTPException) as error:
                auth.reset_password(
                    ResetPasswordInput(token="expired-token", new_password="new-password"),
                    make_request(),
                )

        self.assertEqual(error.exception.status_code, 400)

    def test_reset_password_updates_hash_after_consuming_valid_token(self):
        user = {"id": "user-123", "is_active": True}
        with (
            patch.object(auth, "decode_password_reset_token", return_value=("user-123", "jti")),
            patch.object(auth, "get_user_by_id", return_value=user),
            patch.object(auth, "consume_password_reset_token", return_value=True) as consume,
            patch.object(auth, "hash_password", return_value="new-hash"),
            patch.object(auth, "update_user") as update,
            patch.object(auth, "record_password_reset_success") as audit,
        ):
            result = auth.reset_password(
                ResetPasswordInput(token="valid-token", new_password="new-password"),
                make_request(),
            )

        consume.assert_called_once_with("jti", "user-123")
        update.assert_called_once_with("user-123", {"hashed_password": "new-hash"})
        audit.assert_called_once_with("user-123", "192.0.2.15")
        self.assertIn("actualizó", result["message"])

    def test_change_password_rejects_incorrect_current_password(self):
        user = {"id": "user-123", "hashed_password": "old-hash"}
        request = ChangePasswordInput(
            current_password="incorrect-password",
            new_password="new-password",
        )
        with patch.object(auth, "verify_password", return_value=False):
            with self.assertRaises(HTTPException) as error:
                auth.change_password(request, current_user=user)

        self.assertEqual(error.exception.status_code, 400)

    def test_password_reset_requests_are_limited_and_audited_without_raw_email(self):
        with tempfile.TemporaryDirectory() as directory:
            temporary_db = TinyDB(Path(directory) / "password-resets.json")
            rate_limits = temporary_db.table("password_reset_rate_limits")
            audit_log = temporary_db.table("password_reset_audit")
            with (
                patch.object(storage, "password_reset_rate_limits", rate_limits),
                patch.object(storage, "password_reset_audit", audit_log),
            ):
                results = [
                    storage.register_password_reset_request(
                        "Learner@example.com" if index < 20 else "learner@example.com",
                        "192.0.2.25",
                    )
                    for index in range(21)
                ]

                self.assertEqual(results, [True] * 20 + [False])
                self.assertEqual(len(audit_log), 21)
                self.assertTrue(
                    all(record["ip_address"] == "192.0.2.25" for record in audit_log.all())
                )
                self.assertTrue(
                    all("learner@example.com" not in str(record) for record in audit_log.all())
                )
                self.assertEqual(
                    sum(record["throttled"] for record in audit_log.all()),
                    1,
                )
            temporary_db.close()

    def test_forgot_password_throttles_email_delivery_but_keeps_generic_response(self):
        with tempfile.TemporaryDirectory() as directory:
            temporary_db = TinyDB(Path(directory) / "password-resets.json")
            rate_limits = temporary_db.table("password_reset_rate_limits")
            audit_log = temporary_db.table("password_reset_audit")
            user = {"id": "user-123", "email": "learner@example.com", "is_active": True}
            with (
                patch.object(storage, "password_reset_rate_limits", rate_limits),
                patch.object(storage, "password_reset_audit", audit_log),
                patch.object(auth, "get_user_by_email", return_value=user) as get_user,
                patch.object(
                    auth,
                    "create_password_reset_token",
                    return_value=(
                        "token",
                        "jti",
                        datetime.now(timezone.utc) + timedelta(minutes=30),
                    ),
                ),
                patch.object(auth, "store_password_reset_token"),
                patch.object(auth, "_password_reset_link", return_value="https://example.com/reset?token=token"),
                patch.object(auth, "send_password_reset_email") as send_email,
            ):
                results = [
                    auth.forgot_password(
                        ForgotPasswordInput(email="learner@example.com"),
                        make_request(),
                    )
                    for _ in range(21)
                ]

            self.assertTrue(
                all(result["message"] == auth.PASSWORD_RESET_CONFIRMATION for result in results)
            )
            self.assertEqual(get_user.call_count, 20)
            self.assertEqual(send_email.call_count, 20)
            temporary_db.close()

    def test_password_reset_rate_limit_expires_after_one_hour(self):
        fixed_now = datetime(2026, 11, 3, 12, 0, tzinfo=timezone.utc)
        email = "learner@example.com"
        fingerprint = storage._email_fingerprint(email)
        with tempfile.TemporaryDirectory() as directory:
            temporary_db = TinyDB(Path(directory) / "password-resets.json")
            rate_limits = temporary_db.table("password_reset_rate_limits")
            audit_log = temporary_db.table("password_reset_audit")
            rate_limits.insert(
                {
                    "email_fingerprint": fingerprint,
                    "request_timestamps": [
                        (fixed_now - timedelta(hours=1, seconds=1)).isoformat()
                    ],
                }
            )

            class FixedDateTime(datetime):
                @classmethod
                def now(cls, tz=None):
                    return fixed_now

            with (
                patch.object(storage, "password_reset_rate_limits", rate_limits),
                patch.object(storage, "password_reset_audit", audit_log),
                patch.object(storage, "datetime", FixedDateTime),
            ):
                self.assertTrue(storage.register_password_reset_request(email, "192.0.2.25"))

            self.assertEqual(
                rate_limits.all()[0]["request_timestamps"],
                [fixed_now.isoformat()],
            )
            temporary_db.close()

    def test_successful_reset_audit_includes_timestamp_and_ip(self):
        with tempfile.TemporaryDirectory() as directory:
            temporary_db = TinyDB(Path(directory) / "password-resets.json")
            audit_log = temporary_db.table("password_reset_audit")
            with patch.object(storage, "password_reset_audit", audit_log):
                storage.record_password_reset_success("user-123", "192.0.2.25")

            event = audit_log.all()[0]
            self.assertEqual(event["event"], "password_reset_completed")
            self.assertEqual(event["ip_address"], "192.0.2.25")
            self.assertEqual(event["user_id"], "user-123")
            self.assertIn("T", event["occurred_at"])
            temporary_db.close()

    def test_resend_email_uses_configured_key_and_reset_link(self):
        response = MagicMock()
        response.__enter__.return_value = response
        response.__exit__.return_value = False
        # Mock the HTTP client so the test verifies the request without contacting Resend.
        with (
            patch.object(
                email_service.settings,
                "resend_api_key",
                SecretStr("re_test_key"),
            ),
            patch.object(email_service.settings, "email_from", "TrackFlow <test@example.com>"),
            patch.object(email_service, "urlopen", return_value=response) as send,
        ):
            email_service.send_password_reset_email(
                "learner@example.com",
                "https://example.com/reset-password?token=one-time-token",
            )

        request = send.call_args.args[0]
        self.assertEqual(request.get_header("Authorization"), "Bearer re_test_key")
        payload = request.data.decode("utf-8")
        self.assertIn("learner@example.com", payload)
        self.assertIn("one-time-token", payload)


if __name__ == "__main__":
    unittest.main()
