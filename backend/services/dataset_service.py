import os
import json
import math
import numpy as np
import pandas as pd
from database.db import db
from database.models import Dataset, AnalysisRun


def sanitize_for_json(obj):
    """
    Recursively converts numpy and pandas types to standard Python types
    safe for json.dumps / jsonify. Handles NaN, Infinity, Timestamps, etc.
    """
    if obj is None:
        return None
    if isinstance(obj, (np.integer, np.int64, np.int32, np.int16, np.int8)):
        return int(obj)
    if isinstance(obj, (np.floating, np.float64, np.float32, np.float16, float)):
        if math.isnan(obj) or math.isinf(obj) or np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    if isinstance(obj, (np.bool_, bool)):
        return bool(obj)
    if isinstance(obj, (pd.Timestamp, np.datetime64)):
        return str(obj)
    if isinstance(obj, (list, tuple, set, np.ndarray)):
        return [sanitize_for_json(x) for x in obj]
    if isinstance(obj, dict):
        return {str(k): sanitize_for_json(v) for k, v in obj.items()}
    return obj


def load_dataset_df(dataset_id, use_preprocessed=True, apply_mapping=True):
    """
    Loads dataset DataFrame by ID. Uses preprocessed_filepath if available
    and use_preprocessed is True, otherwise falls back to filepath.
    Applies column mapping if apply_mapping is True.
    Returns (df, dataset_model).
    """
    dataset = db.session.get(Dataset, dataset_id)
    if not dataset:
        raise ValueError(f"Dataset with ID {dataset_id} does not exist.")

    filepath_to_use = dataset.filepath
    if use_preprocessed and dataset.preprocessed_filepath and os.path.exists(dataset.preprocessed_filepath):
        filepath_to_use = dataset.preprocessed_filepath
    elif not os.path.exists(filepath_to_use):
        raise FileNotFoundError(f"Dataset file not found at {filepath_to_use}")

    df = pd.read_csv(filepath_to_use)

    if apply_mapping:
        mapping = dataset.get_column_mapping()
        if mapping:
            # If mapping is {standard: csv_col}
            rename_dict = {}
            for std_col, csv_col in mapping.items():
                if csv_col in df.columns and csv_col != std_col:
                    rename_dict[csv_col] = std_col
                # Also handle inverted case {csv_col: std_col}
                elif std_col in df.columns and csv_col not in df.columns:
                    rename_dict[std_col] = csv_col
            if rename_dict:
                df = df.rename(columns=rename_dict)

    return df, dataset


def save_analysis_run(dataset_id, analysis_type, parameters, results):
    """
    Persists an analysis run execution with parameters and results.
    """
    sanitized_params = sanitize_for_json(parameters)
    sanitized_results = sanitize_for_json(results)
    
    run = AnalysisRun(
        dataset_id=dataset_id,
        analysis_type=analysis_type
    )
    run.set_parameters(sanitized_params)
    run.set_results(sanitized_results)
    
    db.session.add(run)
    db.session.commit()
    return run


def detect_columns_and_mapping(df):
    """
    Analyzes DataFrame columns and suggests standard column mappings.
    Standard keys: record_id, date, time, timestamp, location, road_name, road_type,
    latitude, longitude, traffic_volume, average_speed, weather, temperature,
    congestion_level, is_anomaly, day_of_week, hour.
    """
    columns = list(df.columns)
    mapping = {}
    
    candidates = {
        'record_id': ['record_id', 'id', 'record', 'index', 'row_id'],
        'date': ['date', 'dt', 'day_date'],
        'time': ['time', 'time_of_day', 'hh_mm'],
        'timestamp': ['timestamp', 'datetime', 'date_time', 'time_stamp'],
        'location': ['location', 'site', 'station', 'junction', 'intersection', 'loc'],
        'road_name': ['road_name', 'road', 'street', 'street_name', 'highway'],
        'road_type': ['road_type', 'road_class', 'type', 'street_type'],
        'latitude': ['latitude', 'lat', 'y', 'coord_lat'],
        'longitude': ['longitude', 'lon', 'lng', 'x', 'coord_lon'],
        'traffic_volume': ['traffic_volume', 'volume', 'traffic', 'vehicles', 'flow', 'count'],
        'average_speed': ['average_speed', 'speed', 'avg_speed', 'velocity', 'mean_speed'],
        'weather': ['weather', 'condition', 'weather_condition', 'climate'],
        'temperature': ['temperature', 'temp', 'celsius', 'fahrenheit'],
        'congestion_level': ['congestion_level', 'congestion', 'traffic_level', 'level'],
        'is_anomaly': ['is_anomaly', 'anomaly', 'outlier', 'is_outlier'],
        'day_of_week': ['day_of_week', 'day', 'weekday', 'dow'],
        'hour': ['hour', 'hr', 'time_hour']
    }

    # Normalize existing columns for matching
    lower_cols = {c.lower().strip().replace(' ', '_').replace('-', '_'): c for c in columns}

    for std_name, aliases in candidates.items():
        found = False
        # Exact alias match first
        for alias in aliases:
            if alias in lower_cols:
                mapping[std_name] = lower_cols[alias]
                found = True
                break
        # Substring match if not found
        if not found:
            for l_col, orig_col in lower_cols.items():
                if any(alias in l_col for alias in aliases):
                    mapping[std_name] = orig_col
                    break

    return mapping
