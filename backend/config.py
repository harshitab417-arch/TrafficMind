import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
SAMPLE_DATA_FOLDER = os.path.join(BASE_DIR, 'sample_data')
DATABASE_URI = f"sqlite:///{os.path.join(BASE_DIR, 'trafficmind.db')}"
MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50 MB

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(SAMPLE_DATA_FOLDER, exist_ok=True)


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'trafficmind-secret-key-2024')
    SQLALCHEMY_DATABASE_URI = DATABASE_URI
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = UPLOAD_FOLDER
    SAMPLE_DATA_FOLDER = SAMPLE_DATA_FOLDER
    MAX_CONTENT_LENGTH = MAX_CONTENT_LENGTH
