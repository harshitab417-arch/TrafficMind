from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def get_db_session():
    return db.session


def create_all_tables(app=None):
    if app is not None:
        with app.app_context():
            db.create_all()
    else:
        db.create_all()
