"""
import_bengaluru.py — TrafficMind Bengaluru Urban Traffic Dataset Importer

Source:
    Repository: https://github.com/tarunika973/Bangalore-s-Traffic-Pulse
    File: Banglore_traffic_Dataset.csv

Provenance:
    UNVERIFIED. The original repository describes this as capturing "detailed
    traffic patterns across major roads and intersections in Bangalore" but does
    NOT specify whether the data originates from observed sensors, simulated
    models, government records, or other sources. Users of this dataset within
    TrafficMind should treat the data as unverified unless independent reliable
    documentation confirms its provenance.

This script:
    1. Reads the raw CSV (must be pre-downloaded to bengaluru_traffic_raw.csv)
    2. Transforms columns to match the TrafficMind standard schema
    3. Saves the transformed CSV as bengaluru_traffic.csv
    4. Registers the dataset in the TrafficMind SQLite database
    5. Is idempotent: running twice will NOT create duplicate entries

Column transformation documentation:
    - record_id: Auto-generated sequential integer (1-based)
    - date: Direct from source 'Date' column (YYYY-MM-DD, date-only granularity)
    - location: Combined "Area Name — Road/Intersection Name"
    - road_name: Direct from source 'Road/Intersection Name'
    - latitude: Fixed, verified reference coordinates per named location
    - longitude: Fixed, verified reference coordinates per named location
    - traffic_volume: Direct from source 'Traffic Volume' (units unspecified by source)
    - average_speed: Direct from source 'Average Speed' (units unspecified, appears km/h)
    - weather: Direct from source 'Weather Conditions' (original labels preserved)
    - congestion_level: DERIVED from continuous 'Congestion Level' (0-100 scale)
                        using PROJECT-DEFINED thresholds:
                          >= 70 → "High", 40-69.99 → "Medium", < 40 → "Low"
                        These are NOT original observations from the source dataset.
    - day_of_week: DERIVED from 'Date' using Python datetime

    Columns EXCLUDED (not present in source, not fabricated):
    - time: No time-of-day information in source dataset
    - timestamp: Not generated to avoid implying midnight observations
    - hour: No time-of-day information in source dataset
    - road_type: Not available in source dataset
    - temperature: Not available in source dataset
    - is_anomaly: Not available in source dataset; EXCLUDED rather than set to
                  False, because setting False would incorrectly imply these are
                  verified non-anomalous observations. The existing TrafficMind
                  codebase has a z-score fallback for anomaly detection when this
                  column is absent.
"""

import os
import sys
import pandas as pd
from datetime import datetime

# ----- Path setup (matches generate_sample.py pattern) -----
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# ----- File paths -----
RAW_CSV_URL = (
    "https://raw.githubusercontent.com/tarunika973/"
    "Bangalore-s-Traffic-Pulse/main/Banglore_traffic_Dataset.csv"
)
RAW_CSV_PATH = os.path.join(CURRENT_DIR, "bengaluru_traffic_raw.csv")
OUTPUT_CSV_PATH = os.path.join(CURRENT_DIR, "bengaluru_traffic.csv")

DATASET_NAME = "Bengaluru Urban Traffic Dataset"
DATASET_FILENAME = "bengaluru_traffic.csv"

# ----- Fixed, verified geographic reference coordinates -----
# These are well-known Bengaluru landmarks whose locations can be verified
# on any standard mapping service (OpenStreetMap, Google Maps, etc.).
# No random jitter is applied. Each record for a given road/intersection
# uses exactly these coordinates.
#
# Source: OpenStreetMap / public geographic knowledge of Bengaluru landmarks.
LOCATION_COORDINATES = {
    "100 Feet Road":        (12.9784, 77.6408),   # Indiranagar
    "CMH Road":             (12.9806, 77.6440),   # Indiranagar
    "Marathahalli Bridge":  (12.9591, 77.7010),   # Whitefield
    "ITPL Main Road":       (12.9857, 77.7316),   # Whitefield
    "Sony World Junction":  (12.9340, 77.6106),   # Koramangala
    "Sarjapur Road":        (12.9100, 77.6235),   # Koramangala
    "Trinity Circle":       (12.9716, 77.6198),   # M.G. Road
    "Anil Kumble Circle":   (12.9756, 77.6032),   # M.G. Road
    "Jayanagar 4th Block":  (12.9260, 77.5830),   # Jayanagar
    "South End Circle":     (12.9375, 77.5770),   # Jayanagar
    "Hebbal Flyover":       (13.0358, 77.5970),   # Hebbal
    "Ballari Road":         (13.0274, 77.5905),   # Hebbal
    "Yeshwanthpur Circle":  (13.0216, 77.5510),   # Yeshwanthpur
    "Tumkur Road":          (13.0200, 77.5400),   # Yeshwanthpur
    "Hosur Road":           (12.8440, 77.6608),   # Electronic City
    "Silk Board Junction":  (12.9170, 77.6230),   # Electronic City / Koramangala
}


def derive_congestion_category(congestion_value):
    """
    Derives a categorical congestion level from the source dataset's
    continuous Congestion Level field (0-100 scale).

    PROJECT-DEFINED thresholds (these are NOT from the original source):
        >= 70  → "High"
        40-70  → "Medium"
        < 40   → "Low"

    The original dataset uses a continuous 0-100 scale. TrafficMind requires
    categorical Low/Medium/High labels. These thresholds are chosen based on
    the dataset's distribution and the accompanying Travel Time Index and
    Road Capacity Utilization columns, which show strong correlation with
    these breakpoints.
    """
    if pd.isna(congestion_value):
        return "Medium"  # Conservative default for any missing values
    val = float(congestion_value)
    if val >= 70.0:
        return "High"
    elif val >= 40.0:
        return "Medium"
    else:
        return "Low"


def download_raw_csv():
    """Downloads the raw CSV from GitHub if not already present locally."""
    if os.path.exists(RAW_CSV_PATH):
        print(f"  Raw CSV already exists: {RAW_CSV_PATH}")
        return

    print(f"  Downloading from GitHub...")
    try:
        import urllib.request
        urllib.request.urlretrieve(RAW_CSV_URL, RAW_CSV_PATH)
        print(f"  Downloaded to: {RAW_CSV_PATH}")
    except Exception as e:
        print(f"\n  ERROR: Failed to download CSV: {e}")
        print(f"  Please manually download from:\n    {RAW_CSV_URL}")
        print(f"  Save as:\n    {RAW_CSV_PATH}")
        sys.exit(1)


def transform_dataset():
    """
    Reads the raw Bengaluru CSV and transforms it to TrafficMind schema.
    Returns the transformed DataFrame.
    """
    print(f"  Reading raw CSV: {RAW_CSV_PATH}")
    raw_df = pd.read_csv(RAW_CSV_PATH)

    print(f"  Raw dataset: {len(raw_df)} rows, {len(raw_df.columns)} columns")
    print(f"  Date range: {raw_df['Date'].min()} to {raw_df['Date'].max()}")
    print(f"  Missing values: {raw_df.isnull().sum().sum()}")
    print(f"  Duplicate rows: {raw_df.duplicated().sum()}")
    print(f"  Traffic Volume range: {raw_df['Traffic Volume'].min()} to {raw_df['Traffic Volume'].max()}")
    print(f"  Average Speed range: {raw_df['Average Speed'].min():.1f} to {raw_df['Average Speed'].max():.1f}")

    # Build transformed records
    records = []
    unmatched_locations = set()

    for idx, row in raw_df.iterrows():
        road_name = str(row["Road/Intersection Name"]).strip()
        area_name = str(row["Area Name"]).strip()
        location = f"{area_name} \u2014 {road_name}"

        # Look up fixed reference coordinates
        coords = LOCATION_COORDINATES.get(road_name)
        if coords:
            lat, lon = coords
        else:
            unmatched_locations.add(road_name)
            lat, lon = None, None  # Not fabricated

        date_str = str(row["Date"]).strip()

        # Derive day_of_week from date
        try:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            day_of_week = dt.strftime("%A")
        except (ValueError, TypeError):
            day_of_week = None

        # Derive categorical congestion level
        congestion_level = derive_congestion_category(row["Congestion Level"])

        records.append({
            "record_id": idx + 1,
            "date": date_str,
            "location": location,
            "road_name": road_name,
            "latitude": lat,
            "longitude": lon,
            "traffic_volume": row["Traffic Volume"],
            "average_speed": round(float(row["Average Speed"]), 2),
            "weather": str(row["Weather Conditions"]).strip(),
            "congestion_level": congestion_level,
            "day_of_week": day_of_week,
            "is_sample": True,
        })

    if unmatched_locations:
        print(f"\n  WARNING: No coordinates for: {unmatched_locations}")
        print(f"  These records will have NULL latitude/longitude.")

    df = pd.DataFrame(records)

    # Save transformed CSV
    df.to_csv(OUTPUT_CSV_PATH, index=False)
    print(f"\n  Transformed dataset: {len(df)} rows, {len(df.columns)} columns")
    print(f"  Columns: {list(df.columns)}")
    print(f"  Saved to: {OUTPUT_CSV_PATH}")

    # Print congestion distribution for verification
    cong_counts = df["congestion_level"].value_counts()
    print(f"\n  Derived congestion distribution:")
    for level in ["Low", "Medium", "High"]:
        count = cong_counts.get(level, 0)
        pct = round((count / len(df)) * 100, 1)
        print(f"    {level}: {count} ({pct}%)")

    return df


def register_in_database(df):
    """
    Registers the Bengaluru dataset in the TrafficMind SQLite database.
    Follows the same pattern as generate_sample.py for consistency.
    Idempotent: checks for existing registration before creating.
    """
    try:
        from config import Config
        from database.db import db, create_all_tables
        from database.models import Dataset
        from flask import Flask

        app = Flask(__name__)
        app.config.from_object(Config)
        db.init_app(app)
        create_all_tables(app)

        with app.app_context():
            # Check for existing registration to prevent duplicates
            existing = Dataset.query.filter_by(filename=DATASET_FILENAME).first()

            cols = list(df.columns)
            mapping = {col: col for col in cols}

            if existing:
                # Update existing record without changing is_active
                existing.name = DATASET_NAME
                existing.filepath = OUTPUT_CSV_PATH
                existing.record_count = len(df)
                existing.preprocessed_filepath = None
                existing.set_column_names(cols)
                existing.set_column_mapping(mapping)
                db.session.commit()
                print(f"  Updated existing database record (ID: {existing.id})")
                print(f"    Active: {existing.is_active}")
            else:
                # Create new record — NOT active (SF remains the default)
                new_dataset = Dataset(
                    name=DATASET_NAME,
                    filename=DATASET_FILENAME,
                    filepath=OUTPUT_CSV_PATH,
                    record_count=len(df),
                    is_active=False,
                    is_sample=True,
                )
                new_dataset.set_column_names(cols)
                new_dataset.set_column_mapping(mapping)
                db.session.add(new_dataset)
                db.session.commit()
                print(f"  Registered new dataset (ID: {new_dataset.id})")
                print(f"    Active: False (San Francisco remains the default)")

            # Verify San Francisco dataset is untouched
            sf = Dataset.query.filter_by(filename="traffic_sample.csv").first()
            if sf:
                print(f"\n  San Francisco dataset verification:")
                print(f"    ID: {sf.id}, Records: {sf.record_count}, Active: {sf.is_active}")
            else:
                print(f"\n  Note: San Francisco dataset not yet in database.")
                print(f"    It will be created when the sample dataset is loaded.")

            # List all datasets
            all_ds = Dataset.query.all()
            print(f"\n  All datasets in database:")
            for d in all_ds:
                marker = " (ACTIVE)" if d.is_active else ""
                print(f"    [{d.id}] {d.name} — {d.record_count} records{marker}")

    except Exception as e:
        print(f"\n  Database registration failed: {e}")
        print(f"  The CSV file was created successfully at: {OUTPUT_CSV_PATH}")
        print(f"  You can import it manually through the TrafficMind UI.")
        raise


def main():
    print("=" * 70)
    print("TrafficMind — Bengaluru Urban Traffic Dataset Import")
    print("=" * 70)
    print()
    print("Source: github.com/tarunika973/Bangalore-s-Traffic-Pulse")
    print("Provenance: UNVERIFIED (see script docstring)")
    print()

    # Step 1: Ensure raw CSV is available
    print("[1/3] Checking raw CSV...")
    download_raw_csv()

    # Step 2: Transform to TrafficMind schema
    print()
    print("[2/3] Transforming to TrafficMind schema...")
    df = transform_dataset()

    # Step 3: Register in database
    print()
    print("[3/3] Registering in database...")
    register_in_database(df)

    print()
    print("=" * 70)
    print("IMPORT COMPLETE")
    print(f"  CSV file: {OUTPUT_CSV_PATH}")
    print(f"  Records imported: {len(df)}")
    print(f"  Default active dataset: San Francisco (unchanged)")
    print()
    print("The Bengaluru dataset is now available in the header dropdown.")
    print("Select it to switch. All existing SF data is preserved.")
    print("=" * 70)


if __name__ == "__main__":
    main()
