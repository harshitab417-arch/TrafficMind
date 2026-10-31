import os
import json
import pandas as pd
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from database.db import db
from database.models import Dataset
from config import UPLOAD_FOLDER, SAMPLE_DATA_FOLDER
from services.dataset_service import load_dataset_df, detect_columns_and_mapping, sanitize_for_json
from sample_data.generate_sample import generate_sample_dataset

datasets_bp = Blueprint('datasets', __name__)


@datasets_bp.route('', methods=['GET'])
@datasets_bp.route('/', methods=['GET'])
def list_datasets():
    try:
        datasets = Dataset.query.order_by(Dataset.created_at.desc()).all()
        return jsonify([
            {
                'id': d.id,
                'name': d.name,
                'record_count': d.record_count,
                'is_active': bool(d.is_active),
                'is_sample': bool(d.is_sample),
                'created_at': d.created_at.isoformat() if d.created_at else None
            }
            for d in datasets
        ])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@datasets_bp.route('/active', methods=['GET'])
def get_active_dataset():
    try:
        active = Dataset.query.filter_by(is_active=True).first()
        if not active:
            # Fall back to latest dataset if any
            active = Dataset.query.order_by(Dataset.id.desc()).first()
            if active:
                active.is_active = True
                db.session.commit()

        if not active:
            return jsonify({"error": "No active dataset found. Please upload or activate one."}), 404

        return jsonify(active.to_dict())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@datasets_bp.route('/upload', methods=['POST'])
def upload_dataset():
    try:
        if 'file' not in request.files and 'csv_file' not in request.files:
            return jsonify({"error": "No file part in request. Please upload a CSV file."}), 400

        file = request.files.get('file') or request.files.get('csv_file')
        if not file or file.filename == '':
            return jsonify({"error": "No file selected."}), 400

        orig_filename = secure_filename(file.filename)
        if not orig_filename.lower().endswith('.csv'):
            return jsonify({"error": "Invalid file format. Only CSV files are supported."}), 400

        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        unique_filename = f"upload_{int(pd.Timestamp.now().timestamp())}_{orig_filename}"
        saved_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.save(saved_path)

        df = pd.read_csv(saved_path)
        record_count = len(df)
        columns = list(df.columns)
        mapping = detect_columns_and_mapping(df)

        # Deactivate previous active datasets
        Dataset.query.update({Dataset.is_active: False})

        name = request.form.get('name', orig_filename.rsplit('.', 1)[0])
        new_dataset = Dataset(
            name=name,
            filename=orig_filename,
            filepath=saved_path,
            record_count=record_count,
            is_active=True,
            is_sample=False
        )
        new_dataset.set_column_names(columns)
        new_dataset.set_column_mapping(mapping)

        db.session.add(new_dataset)
        db.session.commit()

        return jsonify({
            **new_dataset.to_dict(),
            "detected_columns": columns,
            "suggested_mapping": mapping
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to upload dataset: {str(e)}"}), 500


@datasets_bp.route('/sample', methods=['POST'])
def load_sample_dataset():
    try:
        sample_file = os.path.join(SAMPLE_DATA_FOLDER, 'traffic_sample.csv')
        if not os.path.exists(sample_file):
            generate_sample_dataset(output_path=sample_file)

        df = pd.read_csv(sample_file)
        cols = list(df.columns)
        mapping = {c: c for c in cols}

        # Deactivate others
        Dataset.query.update({Dataset.is_active: False})

        existing = Dataset.query.filter_by(filename='traffic_sample.csv', is_sample=True).first()
        if existing:
            existing.filepath = sample_file
            existing.record_count = len(df)
            existing.is_active = True
            existing.set_column_names(cols)
            existing.set_column_mapping(mapping)
            db.session.commit()
            return jsonify(existing.to_dict())
        else:
            sample_ds = Dataset(
                name="San Francisco Urban Traffic Sample",
                filename="traffic_sample.csv",
                filepath=sample_file,
                record_count=len(df),
                is_active=True,
                is_sample=True
            )
            sample_ds.set_column_names(cols)
            sample_ds.set_column_mapping(mapping)
            db.session.add(sample_ds)
            db.session.commit()
            return jsonify(sample_ds.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to load sample dataset: {str(e)}"}), 500


@datasets_bp.route('/<int:dataset_id>', methods=['GET'])
def get_dataset(dataset_id):
    try:
        dataset = db.session.get(Dataset, dataset_id)
        if not dataset:
            return jsonify({"error": f"Dataset {dataset_id} not found."}), 404
        return jsonify(dataset.to_dict())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@datasets_bp.route('/<int:dataset_id>/preview', methods=['GET'])
def get_preview(dataset_id):
    try:
        df, _ = load_dataset_df(dataset_id, use_preprocessed=True, apply_mapping=True)
        preview_data = df.head(50).to_dict(orient='records')
        columns = list(df.columns)
        return jsonify(sanitize_for_json({
            "columns": columns,
            "rows": preview_data,
            "total_rows": len(df),
            # Backwards compatibility if consumed as direct list
            "records": preview_data
        }))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@datasets_bp.route('/<int:dataset_id>/stats', methods=['GET'])
def get_stats(dataset_id):
    try:
        df, dataset = load_dataset_df(dataset_id, use_preprocessed=True, apply_mapping=False)
        total_records = len(df)
        duplicate_count = int(df.duplicated().sum())
        columns = list(df.columns)

        col_stats = {}
        columns_info = {}
        for col in columns:
            series = df[col]
            null_count = int(series.isnull().sum())
            unique_count = int(series.nunique())
            is_num = pd.api.types.is_numeric_dtype(series)

            min_val = round(float(series.min()), 2) if is_num and not series.dropna().empty else None
            max_val = round(float(series.max()), 2) if is_num and not series.dropna().empty else None
            mean_val = round(float(series.mean()), 2) if is_num and not series.dropna().empty else None
            std_val = round(float(series.std()), 2) if is_num and not series.dropna().empty else None

            stat_obj = {
                "count": int(series.count()),
                "null_count": null_count,
                "unique_count": unique_count,
                "dtype": str(series.dtype),
                "type": str(series.dtype),
                "mean": mean_val,
                "std": std_val,
                "min": min_val,
                "max": max_val
            }
            col_stats[col] = stat_obj
            columns_info[col] = stat_obj

        return jsonify(sanitize_for_json({
            "total_records": total_records,
            "total_rows": total_records,
            "total_columns": len(columns),
            "duplicate_count": duplicate_count,
            "columns": columns,
            "column_stats": col_stats,
            "columns_info": columns_info
        }))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@datasets_bp.route('/<int:dataset_id>/mapping', methods=['PUT'])
def update_mapping(dataset_id):
    try:
        dataset = db.session.get(Dataset, dataset_id)
        if not dataset:
            return jsonify({"error": f"Dataset {dataset_id} not found."}), 404

        data = request.get_json() or {}
        new_mapping = data.get('mapping', {})
        dataset.set_column_mapping(new_mapping)
        db.session.commit()

        return jsonify({
            "message": "Column mapping updated successfully.",
            "mapping": dataset.get_column_mapping()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@datasets_bp.route('/<int:dataset_id>/activate', methods=['POST'])
def activate_dataset(dataset_id):
    try:
        dataset = db.session.get(Dataset, dataset_id)
        if not dataset:
            return jsonify({"error": f"Dataset {dataset_id} not found."}), 404

        Dataset.query.update({Dataset.is_active: False})
        dataset.is_active = True
        db.session.commit()

        return jsonify({
            "message": f"Dataset '{dataset.name}' is now active.",
            "dataset": dataset.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@datasets_bp.route('/<int:dataset_id>', methods=['DELETE'])
def delete_dataset(dataset_id):
    try:
        dataset = db.session.get(Dataset, dataset_id)
        if not dataset:
            return jsonify({"error": f"Dataset {dataset_id} not found."}), 404

        # Delete physical files if not sample
        if not dataset.is_sample:
            if dataset.filepath and os.path.exists(dataset.filepath):
                try:
                    os.remove(dataset.filepath)
                except Exception:
                    pass
            if dataset.preprocessed_filepath and os.path.exists(dataset.preprocessed_filepath):
                try:
                    os.remove(dataset.preprocessed_filepath)
                except Exception:
                    pass

        db.session.delete(dataset)
        db.session.commit()

        # If deleted dataset was active, make another one active if available
        active = Dataset.query.filter_by(is_active=True).first()
        if not active:
            latest = Dataset.query.order_by(Dataset.id.desc()).first()
            if latest:
                latest.is_active = True
                db.session.commit()

        return jsonify({"message": f"Dataset {dataset_id} deleted successfully."})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
