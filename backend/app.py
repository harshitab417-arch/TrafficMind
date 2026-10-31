import os
import sys

# Ensure backend root is in Python path
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from config import Config
from database.db import db, create_all_tables
from routes import (
    health_bp,
    datasets_bp,
    preprocessing_bp,
    overview_bp,
    explorer_bp,
    olap_bp,
    association_bp,
    clustering_bp,
    classification_bp,
    prediction_bp,
    outlier_bp,
    evaluation_bp
)


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable CORS for frontend at localhost:5173 (and generic localhost development)
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "Accept"]
        }
    })

    # Initialize Database
    db.init_app(app)

    # Register API Blueprints with /api prefix
    app.register_blueprint(health_bp, url_prefix='/api')
    app.register_blueprint(datasets_bp, url_prefix='/api/datasets')
    app.register_blueprint(preprocessing_bp, url_prefix='/api/preprocessing')
    app.register_blueprint(overview_bp, url_prefix='/api/overview')
    app.register_blueprint(explorer_bp, url_prefix='/api/explorer')
    app.register_blueprint(olap_bp, url_prefix='/api/olap')
    app.register_blueprint(association_bp, url_prefix='/api/association')
    app.register_blueprint(clustering_bp, url_prefix='/api/clustering')
    app.register_blueprint(classification_bp, url_prefix='/api/classification')
    app.register_blueprint(prediction_bp, url_prefix='/api/prediction')
    app.register_blueprint(outlier_bp, url_prefix='/api/outlier')
    app.register_blueprint(evaluation_bp, url_prefix='/api/evaluation')

    # Serve uploads statically
    @app.route('/uploads/<path:filename>', methods=['GET'])
    def serve_upload(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    # Global Error Handlers
    @app.errorhandler(404)
    def handle_not_found(e):
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(500)
    def handle_internal_error(e):
        return jsonify({"error": "An internal server error occurred"}), 500

    # Ensure tables exist
    create_all_tables(app)

    return app


app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting TrafficMind Backend on http://0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)
