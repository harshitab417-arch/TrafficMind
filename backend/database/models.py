import json
from datetime import datetime
from database.db import db


class Dataset(db.Model):
    __tablename__ = 'datasets'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    filepath = db.Column(db.String(1024), nullable=False)
    record_count = db.Column(db.Integer, default=0)
    column_names = db.Column(db.Text, default='[]')
    column_mapping = db.Column(db.Text, default='{}')
    is_active = db.Column(db.Boolean, default=False)
    is_sample = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    preprocessed_filepath = db.Column(db.String(1024), nullable=True)

    analysis_runs = db.relationship('AnalysisRun', backref='dataset', cascade='all, delete-orphan', lazy='dynamic')

    def get_column_names(self):
        try:
            return json.loads(self.column_names) if self.column_names else []
        except Exception:
            return []

    def set_column_names(self, cols):
        self.column_names = json.dumps(cols if cols is not None else [])

    def get_column_mapping(self):
        try:
            return json.loads(self.column_mapping) if self.column_mapping else {}
        except Exception:
            return {}

    def set_column_mapping(self, mapping):
        self.column_mapping = json.dumps(mapping if mapping is not None else {})

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'filename': self.filename,
            'filepath': self.filepath,
            'record_count': self.record_count,
            'column_names': self.get_column_names(),
            'column_mapping': self.get_column_mapping(),
            'is_active': bool(self.is_active),
            'is_sample': bool(self.is_sample),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'preprocessed_filepath': self.preprocessed_filepath
        }


class AnalysisRun(db.Model):
    __tablename__ = 'analysis_runs'

    id = db.Column(db.Integer, primary_key=True)
    dataset_id = db.Column(db.Integer, db.ForeignKey('datasets.id'), nullable=False)
    analysis_type = db.Column(db.String(50), nullable=False)
    parameters = db.Column(db.Text, default='{}')
    results = db.Column(db.Text, default='{}')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def get_parameters(self):
        try:
            return json.loads(self.parameters) if self.parameters else {}
        except Exception:
            return {}

    def set_parameters(self, params):
        self.parameters = json.dumps(params if params is not None else {})

    def get_results(self):
        try:
            return json.loads(self.results) if self.results else {}
        except Exception:
            return {}

    def set_results(self, res):
        self.results = json.dumps(res if res is not None else {})

    def to_dict(self):
        return {
            'id': self.id,
            'dataset_id': self.dataset_id,
            'analysis_type': self.analysis_type,
            'parameters': self.get_parameters(),
            'results': self.get_results(),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
