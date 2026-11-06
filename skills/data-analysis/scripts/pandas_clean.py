"""
Safe snippet for basic pandas cleaning. Copy and adapt for your dataset.
Run: python pandas_clean.py  (ensure pandas is installed)
"""
import sys

try:
    import pandas as pd
except ImportError:
    # El ejemplo comunica la dependencia faltante sin generar un traceback técnico.
    print("Error: instala pandas antes de ejecutar este ejemplo.", file=sys.stderr)
    sys.exit(1)


def main() -> int:
    # Leer el CSV en un bloque acotado y dar un error seguro si falta o está malformado.
    try:
        df = pd.read_csv("data.csv")  # or read_json, read_excel
    except (OSError, UnicodeError, ValueError, pd.errors.ParserError) as error:
        print(f"Error: could not read the dataset ({type(error).__name__}).", file=sys.stderr)
        return 1

    print("df_shape", df.shape)
    print("df_dtypes", df.dtypes)

    # Drop fully null columns
    df = df.dropna(axis=1, how="all")
    print("df_shape_after_drop_all_null_cols", df.shape)

    # Fill or drop nulls in key columns (customise columns)
    # df = df.dropna(subset=["required_col"])
    # df["optional_col"] = df["optional_col"].fillna(0)

    # Normalise column names (optional)
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")
    print("df_columns", list(df.columns))

    # Deduplicate (optional)
    before = len(df)
    df = df.drop_duplicates()
    print("rows_dropped_duplicates", before - len(df))

    # Report only a row count; printing sample rows could expose personal data.
    print("sample_rows_available", min(5, len(df)))
    return 0


if __name__ == "__main__":
    # SystemExit convierte el resultado de main en el código de salida del proceso.
    sys.exit(main())
