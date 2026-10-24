"""API de análisis de incidencias para TrackFlow."""

import csv
from io import StringIO, TextIOWrapper
from threading import Lock

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import Response

from scripts.analyze import (
    INVALID_REASON_LABELS,
    analyze_stream,
    write_results_csv,
)


app = FastAPI(title="TrackFlow Incident Analysis API")
_latest_summary = None
_summary_lock = Lock()


def serialize_summary(summary):
    """Convierte los agregados a tipos JSON sin incluir filas originales."""
    return {
        "total_records": summary["total_records"],
        "valid_records": summary["valid_records"],
        "invalid_records": summary["invalid_records"],
        "invalid_reasons": {
            reason: summary["invalid_reasons"][reason]
            for reason in INVALID_REASON_LABELS
        },
        "category_counts": dict(summary["category_counts"]),
        "status_counts": dict(summary["status_counts"]),
        "country_counts": dict(summary["country_counts"]),
        "closed_records": summary["closed_records"],
        "scored_closed_records": summary["scored_closed_records"],
        "average_score": (
            round(summary["average_score"], 2)
            if summary["average_score"] is not None
            else None
        ),
        "satisfaction_counts": {
            str(score): count
            for score, count in summary["satisfaction_counts"].items()
        },
    }


@app.post("/api/incidents/analyze")
def analyze_incidents(file: UploadFile = File(...)):
    """Analiza un CSV multipart y devuelve exclusivamente métricas agregadas."""
    text_stream = TextIOWrapper(file.file, encoding="utf-8-sig", newline="")
    try:
        summary = analyze_stream(text_stream)
    except UnicodeError as error:
        raise HTTPException(
            status_code=400, detail="The uploaded CSV must use UTF-8 encoding."
        ) from error
    except csv.Error as error:
        raise HTTPException(status_code=400, detail="The uploaded CSV is malformed.") from error
    except ValueError as error:
        status_code = 400 if "empty" in str(error).lower() else 422
        raise HTTPException(status_code=status_code, detail=str(error)) from error
    finally:
        # FastAPI cierra el archivo subido al terminar; se conserva su propiedad.
        text_stream.detach()

    global _latest_summary
    with _summary_lock:
        _latest_summary = summary
    return serialize_summary(summary)


@app.get("/api/incidents/results/export")
def export_latest_results():
    """Descarga en CSV el último resumen calculado por este proceso."""
    with _summary_lock:
        summary = _latest_summary
    if summary is None:
        raise HTTPException(
            status_code=404,
            detail="No analysis results are available. Analyze a CSV first.",
        )

    csv_output = StringIO(newline="")
    write_results_csv(summary, csv_output)
    return Response(
        content=csv_output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="results.csv"'},
    )