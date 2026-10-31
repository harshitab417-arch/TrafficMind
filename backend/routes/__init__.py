from routes.health import health_bp
from routes.datasets import datasets_bp
from routes.preprocessing import preprocessing_bp
from routes.overview import overview_bp
from routes.explorer import explorer_bp
from routes.olap import olap_bp
from routes.association import association_bp
from routes.clustering import clustering_bp
from routes.classification import classification_bp
from routes.prediction import prediction_bp
from routes.outlier import outlier_bp
from routes.evaluation import evaluation_bp

__all__ = [
    'health_bp',
    'datasets_bp',
    'preprocessing_bp',
    'overview_bp',
    'explorer_bp',
    'olap_bp',
    'association_bp',
    'clustering_bp',
    'classification_bp',
    'prediction_bp',
    'outlier_bp',
    'evaluation_bp'
]
