export interface Dataset {
  id: string;
  name: string;
  filename: string;
  record_count: number;
  row_count?: number;
  column_count: number;
  upload_date: string;
  status: 'raw' | 'preprocessed' | 'active' | 'ready';
  is_active: boolean;
  columns: string[];
  column_mapping?: Record<string, string>;
  file_size?: number;
}

export interface DatasetPreview {
  columns: string[];
  rows: Record<string, any>[];
  total_rows: number;
}

export interface ColumnStat {
  type: string;
  null_count: number;
  unique_count: number;
  min?: number | string | null;
  max?: number | string | null;
  mean?: number | null;
  sample_values?: any[];
}

export interface DatasetStats {
  total_rows: number;
  total_columns: number;
  columns_info: Record<string, ColumnStat>;
}

export interface PreprocessingOperations {
  remove_duplicates: boolean;
  impute_missing: boolean;
  normalize: boolean;
  encode_categorical: boolean;
  extract_datetime: boolean;
  discretize: boolean;
}

export interface PreprocessingSummary {
  dataset_id: string;
  operations_applied: string[];
  before_stats: {
    row_count: number;
    missing_values: number;
    duplicate_rows?: number;
  };
  after_stats: {
    row_count: number;
    missing_values: number;
    duplicate_rows?: number;
  };
  download_url?: string;
  message?: string;
}

export interface OverviewKPIs {
  total_records: number;
  avg_speed: number;
  avg_volume?: number;
  peak_traffic_volume: number;
  high_congestion_pct: number;
  active_locations: number;
  anomaly_count?: number;
  available_locations?: string[];
  selected_location?: string;
  trends?: {
    volume?: { value: number; positive: boolean };
    speed?: { value: number; positive: boolean };
    congestion?: { value: number; positive: boolean };
  };
}

export interface OverviewCharts {
  volume_over_time: Array<{ date: string; volume: number }>;
  congestion_distribution: Array<{ name: string; value: number; color?: string }>;
  speed_by_location: Array<{ location: string; speed: number }>;
  hourly_distribution: Array<{ hour: number | string; volume: number; speed?: number }>;
  congestion_by_day: Array<{ day: string; low: number; medium: number; high: number }>;
  weather_congestion: Array<{ weather: string; low: number; medium: number; high: number; avg_volume?: number }>;
}

export interface OverviewInsights {
  insights: string[];
  most_congested_locations: Array<{ location: string; congestion_rate: number; avg_speed: number }>;
  peak_traffic_hours: Array<{ hour: string; avg_volume: number }>;
  recent_anomalies: Array<{
    id: string | number;
    timestamp: string;
    location: string;
    volume: number;
    speed: number;
    severity: 'Low' | 'Medium' | 'High';
  }>;
}

export interface ExplorerRecord {
  id?: string | number;
  date?: string;
  time?: string;
  timestamp?: string;
  location?: string;
  location_id?: string | number;
  latitude?: number;
  longitude?: number;
  traffic_volume: number;
  average_speed: number;
  congestion_level: 'Low' | 'Medium' | 'High';
  weather?: string;
  road_type?: string;
  [key: string]: any;
}

export interface ExplorerFilters {
  locations: string[];
  weather_conditions: string[];
  weathers?: string[];
  congestion_levels: string[];
  road_types?: string[];
  date_min?: string;
  date_max?: string;
  date_range?: {
    min?: string;
    max?: string;
  };
}

export interface ExplorerStats {
  avg_volume: number;
  avg_speed: number;
  total_records: number;
  is_predicted?: boolean;
  congestion_breakdown?: {
    Low: number;
    Medium: number;
    High: number;
  };
}

export interface ExplorerParams {
  page?: number;
  per_page?: number;
  location?: string;
  date_from?: string;
  date_to?: string;
  time_from?: string;
  time_to?: string;
  weather?: string;
  congestion_level?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface OLAPQueryRequest {
  operation: 'rollup' | 'drilldown' | 'slice' | 'dice';
  dimension: string;
  measure: string;
  time_grain?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  filters?: Record<string, any>;
}

export interface OLAPQueryResponse {
  operation: string;
  dimension: string;
  measure: string;
  time_grain?: string;
  summary: string;
  data: Array<{
    dimension_value: string;
    measure_value: number;
    count?: number;
    [key: string]: any;
  }>;
  comparison_data?: Array<{
    dimension_value: string;
    measure_value: number;
    period: string;
  }>;
}

export interface AssociationRule {
  antecedents: string[];
  consequents: string[];
  support: number;
  confidence: number;
  lift: number;
  interpretation?: string;
}

export interface AssociationMiningResponse {
  total_transactions: number;
  frequent_itemsets_count: number;
  frequent_itemsets?: Array<{ itemset: string[]; support: number }>;
  rules_count: number;
  rules: AssociationRule[];
  message?: string;
}

export interface ClusterDetail {
  cluster_id: number;
  id?: number;
  size: number;
  percentage: number;
  centroids?: Record<string, number>;
  label: string;
  characteristics?: string;
}

export interface KMeansResponse {
  n_clusters: number;
  silhouette_score: number;
  clusters: ClusterDetail[];
  scatter_data: Array<{
    x: number;
    y: number;
    cluster: number;
    location?: string;
    volume?: number;
    speed?: number;
  }>;
  x_feature: string;
  y_feature: string;
}

export interface DBSCANResponse {
  n_clusters: number;
  noise_points: number;
  noise_count?: number;
  noise_percentage: number;
  noise_pct?: number;
  silhouette_score?: number;
  clusters: ClusterDetail[];
  scatter_data: Array<{
    x: number;
    y: number;
    cluster: number;
    is_noise: boolean;
    location?: string;
    volume?: number;
    speed?: number;
  }>;
  x_feature: string;
  y_feature: string;
}

export interface ConfusionMatrixData {
  labels: string[];
  matrix: number[][];
}

export interface ClassMetrics {
  precision: number;
  recall: number;
  'f1-score': number;
  support: number;
}

export interface ClassifierResult {
  algorithm: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  confusion_matrix: ConfusionMatrixData;
  classification_report: Record<string, ClassMetrics>;
  target_derived: boolean;
}

export interface TrainAllClassifiersResponse {
  comparison: Array<{
    algorithm: string;
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
  }>;
  results: Record<string, ClassifierResult>;
  target_derived: boolean;
}

export interface PredictionResponse {
  algorithm: string;
  target: string;
  metrics: {
    mae: number;
    rmse: number;
    r2: number;
  };
  historical_test: Array<{
    date: string;
    actual: number;
    predicted: number;
  }>;
  future_forecast: Array<{
    date: string;
    predicted: number;
  }>;
  summary: string;
}

export interface AnomalyItem {
  id: string | number;
  timestamp?: string;
  date?: string;
  time?: string;
  location: string;
  volume: number;
  speed: number;
  score: number;
  severity: 'Low' | 'Medium' | 'High';
  features?: Record<string, any>;
}

export interface OutlierDetectionResponse {
  method: string;
  anomaly_count: number;
  anomaly_percentage: number;
  total_evaluated: number;
  scatter_points: Array<{
    x: number;
    y: number;
    is_anomaly: boolean;
    score?: number;
    date?: string;
    location?: string;
  }>;
  anomalies: AnomalyItem[];
  method_comparison?: Array<{
    method: string;
    count: number;
    percentage: number;
  }>;
}

export interface ModelEvaluationSummary {
  classification?: Array<{
    algorithm: string;
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
  }>;
  clustering?: {
    kmeans?: {
      silhouette: number;
      n_clusters: number;
    };
    dbscan?: {
      n_clusters: number;
      noise_pct: number;
    };
  };
  prediction?: Array<{
    algorithm: string;
    mae: number;
    rmse: number;
    r2: number;
  }>;
  association?: {
    rules_count: number;
    avg_support: number;
    avg_confidence: number;
    avg_lift: number;
  };
  outliers?: Array<{
    method: string;
    anomaly_count: number;
    anomaly_pct: number;
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
