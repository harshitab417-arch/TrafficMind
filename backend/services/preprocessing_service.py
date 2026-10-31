import os
import pandas as pd
import numpy as np
from database.db import db
from database.models import Dataset, AnalysisRun
from config import UPLOAD_FOLDER
from services.dataset_service import sanitize_for_json


def run_preprocessing_pipeline(dataset_id, operations=None):
    if operations is None:
        operations = [
            "remove_duplicates",
            "impute_missing",
            "normalize",
            "encode_categorical",
            "extract_datetime",
            "discretize"
        ]

    dataset = db.session.get(Dataset, dataset_id)
    if not dataset:
        raise ValueError(f"Dataset {dataset_id} not found.")

    if not os.path.exists(dataset.filepath):
        raise FileNotFoundError(f"Source file {dataset.filepath} not found.")

    df = pd.read_csv(dataset.filepath)

    before_stats = {
        "records": int(len(df)),
        "row_count": int(len(df)),
        "nulls": int(df.isnull().sum().sum()),
        "missing_values": int(df.isnull().sum().sum()),
        "duplicates": int(df.duplicated().sum()),
        "duplicate_rows": int(df.duplicated().sum())
    }

    applied = []

    # 1. Remove Duplicates
    if "remove_duplicates" in operations:
        df = df.drop_duplicates().reset_index(drop=True)
        applied.append("remove_duplicates")

    # 2. Impute Missing
    if "impute_missing" in operations:
        for col in df.columns:
            if df[col].isnull().sum() > 0:
                if pd.api.types.is_numeric_dtype(df[col]):
                    median_val = df[col].median()
                    df[col] = df[col].fillna(median_val)
                else:
                    mode_val = df[col].mode()
                    fill_val = mode_val.iloc[0] if not mode_val.empty else "Unknown"
                    df[col] = df[col].fillna(fill_val)
        applied.append("impute_missing")

    # 3. Extract Datetime
    if "extract_datetime" in operations:
        dt_col = None
        if 'timestamp' in df.columns:
            dt_col = 'timestamp'
        elif 'date' in df.columns and 'time' in df.columns:
            try:
                df['timestamp'] = pd.to_datetime(df['date'].astype(str) + ' ' + df['time'].astype(str), errors='coerce')
                dt_col = 'timestamp'
            except Exception:
                pass
        elif 'date' in df.columns:
            dt_col = 'date'

        if dt_col and dt_col in df.columns:
            try:
                dt_series = pd.to_datetime(df[dt_col], errors='coerce')
                df['extracted_year'] = dt_series.dt.year
                df['extracted_month'] = dt_series.dt.month
                df['extracted_day'] = dt_series.dt.day
                df['extracted_hour'] = dt_series.dt.hour
                df['extracted_minute'] = dt_series.dt.minute
                df['extracted_day_of_week'] = dt_series.dt.day_name()
                df['is_weekend'] = dt_series.dt.dayofweek.isin([5, 6]).astype(int)
                applied.append("extract_datetime")
            except Exception:
                pass

    # 4. Discretize
    if "discretize" in operations:
        if 'traffic_volume' in df.columns and pd.api.types.is_numeric_dtype(df['traffic_volume']):
            df['volume_level'] = pd.cut(
                df['traffic_volume'],
                bins=[-np.inf, 60, 110, np.inf],
                labels=['Low', 'Medium', 'High']
            ).astype(str)

        if 'average_speed' in df.columns and pd.api.types.is_numeric_dtype(df['average_speed']):
            df['speed_level'] = pd.cut(
                df['average_speed'],
                bins=[-np.inf, 30, 60, np.inf],
                labels=['Slow', 'Moderate', 'Fast']
            ).astype(str)

        if 'temperature' in df.columns and pd.api.types.is_numeric_dtype(df['temperature']):
            df['temp_level'] = pd.cut(
                df['temperature'],
                bins=[-np.inf, 50, 70, np.inf],
                labels=['Cold', 'Mild', 'Warm']
            ).astype(str)
        applied.append("discretize")

    # 5. Normalize
    if "normalize" in operations:
        numeric_cols = [c for c in ['traffic_volume', 'average_speed', 'temperature'] if c in df.columns and pd.api.types.is_numeric_dtype(df[c])]
        for col in numeric_cols:
            c_min = df[col].min()
            c_max = df[col].max()
            if c_max > c_min:
                df[f'{col}_normalized'] = ((df[col] - c_min) / (c_max - c_min)).round(4)
            else:
                df[f'{col}_normalized'] = 0.0
        applied.append("normalize")

    # 6. Encode Categorical
    if "encode_categorical" in operations:
        cat_candidates = ['weather', 'road_type', 'congestion_level', 'location', 'volume_level', 'speed_level']
        for col in cat_candidates:
            if col in df.columns:
                df[f'{col}_encoded'] = df[col].astype('category').cat.codes
        applied.append("encode_categorical")

    after_stats = {
        "records": int(len(df)),
        "row_count": int(len(df)),
        "nulls": int(df.isnull().sum().sum()),
        "missing_values": int(df.isnull().sum().sum()),
        "duplicates": int(df.duplicated().sum()),
        "duplicate_rows": int(df.duplicated().sum())
    }

    # Save preprocessed file
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    filename = f"preprocessed_{dataset.id}_{os.path.basename(dataset.filename)}"
    preprocessed_filepath = os.path.join(UPLOAD_FOLDER, filename)
    df.to_csv(preprocessed_filepath, index=False)

    # Update dataset in DB
    dataset.preprocessed_filepath = preprocessed_filepath
    dataset.record_count = len(df)
    dataset.set_column_names(list(df.columns))

    result_payload = {
        "dataset_id": str(dataset.id),
        "before": before_stats,
        "before_stats": before_stats,
        "after": after_stats,
        "after_stats": after_stats,
        "operations_applied": applied,
        "preprocessed_filepath": preprocessed_filepath,
        "download_url": f"/api/datasets/{dataset.id}/preview",
        "message": f"Successfully executed {len(applied)} preprocessing operations on {len(df)} records."
    }

    # Persist analysis run for audit/summary
    run = AnalysisRun(
        dataset_id=dataset.id,
        analysis_type="preprocessing"
    )
    run.set_parameters({"operations": operations})
    run.set_results(result_payload)
    db.session.add(run)
    db.session.commit()

    return result_payload
