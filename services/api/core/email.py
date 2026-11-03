import json
from html import escape
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from core.config import settings


class EmailDeliveryError(Exception):
    """Raised when a password reset email cannot be accepted by Resend."""


def send_password_reset_email(recipient: str, reset_url: str) -> None:
    # Do not let a missing provider configuration prevent the API from starting.
    if settings.resend_api_key is None or not settings.email_from:
        raise EmailDeliveryError("Resend is not configured.")

    safe_url = escape(reset_url, quote=True)
    payload = {
        "from": settings.email_from,
        "to": [recipient],
        "subject": "Restablece tu contraseña de TrackFlow",
        "html": (
            '<!doctype html><html><head><meta name="viewport" '
            'content="width=device-width, initial-scale=1"></head>'
            '<body style="margin:0;padding:24px;font-family:Arial,sans-serif;'
            'color:#223328"><main style="max-width:560px;margin:auto">'
            "<h1>Restablece tu contraseña</h1>"
            "<p>Recibimos una solicitud para cambiar la contraseña de tu cuenta.</p>"
            f'<p><a href="{safe_url}" style="display:inline-block;padding:14px 20px;'
            'background:#245d42;color:#fff;text-decoration:none;border-radius:4px">'
            "Elegir nueva contraseña</a></p>"
            "<p>El enlace caduca pronto. Si no solicitaste este cambio, ignora este correo.</p>"
            "</main></body></html>"
        ),
        "text": (
            "Recibimos una solicitud para cambiar la contraseña de tu cuenta de TrackFlow.\n\n"
            f"Abre este enlace para elegir una contraseña nueva: {reset_url}\n\n"
            "El enlace caduca pronto. Si no solicitaste este cambio, ignora este correo."
        ),
    }
    request = Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.resend_api_key.get_secret_value()}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "TrackFlow-email/1.0",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            response.read()
    except HTTPError as error:
        raise EmailDeliveryError(f"Resend returned HTTP {error.code}.") from error
    except (URLError, TimeoutError) as error:
        raise EmailDeliveryError("Could not connect to Resend.") from error
