import axios, { AxiosError } from 'axios';
import {
  Dataset,
  DatasetPreview,
  DatasetStats,
  PreprocessingOperations,
  PreprocessingSummary,
  OverviewKPIs,
  OverviewCharts,
  OverviewInsights,
  ExplorerRecord,
  ExplorerFilters,
  ExplorerStats,
  ExplorerParams,
  OLAPQueryRequest,
  OLAPQueryResponse,
  AssociationMiningResponse,
  KMeansResponse,
  DBSCANResponse,
  ClassifierResult,
  TrainAllClassifiersResponse,
  PredictionResponse,
  OutlierDetectionResponse,
  ModelEvaluationSummary,
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 seconds timeout for ML operations
});

// Interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; error?: string }>) => {
    const errorMsg =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred with the TrafficMind API';
    console.error(`API Error [${error.config?.url}]:`, errorMsg);
    return Promise.reject(new Error(errorMsg));
  }
);

// Helper to normalize response data whether it is directly payload or wrapped in { success: true, data: ... }
function unwrap<T>(response: { data: any }): T {
  if (
    response.data &&
    typeof response.data === 'object' &&
    'data' in response.data &&
    'success' in response.data &&
    !Array.isArray(response.data)
  ) {
    return response.data.data as T;
  }
  return response.data as T;
}

// Health check
export const checkHealth = async (): Promise<{ status: string; timestamp?: string }> => {
  const res = await apiClient.get('/health');
  return res.data;
};

// Dataset Management APIs
export const getDatasets = async (): Promise<Dataset[]> => {
  const res = await apiClient.get('/datasets');
  return unwrap<Dataset[]>(res);
};

export const getActiveDataset = async (): Promise<Dataset | null> => {
  const res = await apiClient.get('/datasets/active');
  return unwrap<Dataset | null>(res);
};

export const uploadDataset = async (file: File): Promise<Dataset> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post('/datasets/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return unwrap<Dataset>(res);
};

export const loadSampleDataset = async (): Promise<Dataset> => {
  const res = await apiClient.post('/datasets/sample');
  return unwrap<Dataset>(res);
};

export const activateDataset = async (id: string): Promise<Dataset> => {
  const res = await apiClient.post(`/datasets/${id}/activate`);
  return unwrap<Dataset>(res);
};

export const getDatasetPreview = async (id: string, limit: number = 50): Promise<DatasetPreview> => {
  const res = await apiClient.get(`/datasets/${id}/preview`, { params: { limit } });
  return unwrap<DatasetPreview>(res);
};

export const getDatasetStats = async (id: string): Promise<DatasetStats> => {
  const res = await apiClient.get(`/datasets/${id}/stats`);
  return unwrap<DatasetStats>(res);
};

export const updateColumnMapping = async (
  id: string,
  mapping: Record<string, string>
): Promise<{ success: boolean; message: string }> => {
  const res = await apiClient.put(`/datasets/${id}/mapping`, { mapping });
  return res.data;
};

export const deleteDataset = async (id: string): Promise<{ success: boolean; message?: string }> => {
  const res = await apiClient.delete(`/datasets/${id}`);
  return res.data;
};

// Preprocessing APIs
export const runPreprocessing = async (
  id: string,
  operations: PreprocessingOperations
): Promise<PreprocessingSummary> => {
  const res = await apiClient.post(`/preprocessing/${id}/run`, { operations });
  return unwrap<PreprocessingSummary>(res);
};

export const getPreprocessingSummary = async (id: string): Promise<PreprocessingSummary> => {
  const res = await apiClient.get(`/preprocessing/${id}/summary`);
  return unwrap<PreprocessingSummary>(res);
};

// Overview APIs
export const getOverviewKPIs = async (id: string, location?: string): Promise<OverviewKPIs> => {
  const res = await apiClient.get(`/overview/${id}/kpis`, { params: location && location !== 'all' ? { location } : {} });
  return unwrap<OverviewKPIs>(res);
};

export const getOverviewCharts = async (id: string, location?: string): Promise<OverviewCharts> => {
  const res = await apiClient.get(`/overview/${id}/charts`, { params: location && location !== 'all' ? { location } : {} });
  return unwrap<OverviewCharts>(res);
};

export const getOverviewInsights = async (id: string, location?: string): Promise<OverviewInsights> => {
  const res = await apiClient.get(`/overview/${id}/insights`, { params: location && location !== 'all' ? { location } : {} });
  return unwrap<OverviewInsights>(res);
};

// Traffic Explorer APIs
export const getExplorerRecords = async (
  id: string,
  params?: ExplorerParams
): Promise<{
  records: ExplorerRecord[];
  total: number;
  page: number;
  per_page: number;
  total_pages?: number;
  is_predicted?: boolean;
  prediction_note?: string;
}> => {
  const res = await apiClient.get(`/explorer/${id}/records`, { params });
  return unwrap<{
    records: ExplorerRecord[];
    total: number;
    page: number;
    per_page: number;
    total_pages?: number;
    is_predicted?: boolean;
    prediction_note?: string;
  }>(res);
};

export const getExplorerFilters = async (id: string): Promise<ExplorerFilters> => {
  const res = await apiClient.get(`/explorer/${id}/filters`);
  return unwrap<ExplorerFilters>(res);
};

export const getExplorerStats = async (id: string, params?: ExplorerParams): Promise<ExplorerStats> => {
  const res = await apiClient.get(`/explorer/${id}/stats`, { params });
  return unwrap<ExplorerStats>(res);
};

// OLAP Analytics APIs
export const runOLAPQuery = async (id: string, params: OLAPQueryRequest): Promise<OLAPQueryResponse> => {
  const res = await apiClient.post(`/olap/${id}/query`, params);
  if (res.data && typeof res.data === 'object' && ('operation' in res.data || 'summary' in res.data)) {
    return res.data as OLAPQueryResponse;
  }
  return unwrap<OLAPQueryResponse>(res);
};

// Association Mining APIs
export const runAssociationMining = async (
  id: string,
  params: { min_support: number; min_confidence: number; min_lift: number }
): Promise<AssociationMiningResponse> => {
  const res = await apiClient.post(`/association/${id}/run`, params);
  return unwrap<AssociationMiningResponse>(res);
};

// Clustering Analysis APIs
export const runKMeans = async (
  id: string,
  params: { features: string[]; n_clusters: number }
): Promise<KMeansResponse> => {
  const res = await apiClient.post(`/clustering/${id}/kmeans`, params);
  return unwrap<KMeansResponse>(res);
};

export const runDBSCAN = async (
  id: string,
  params: { features: string[]; eps: number; min_samples: number }
): Promise<DBSCANResponse> => {
  const res = await apiClient.post(`/clustering/${id}/dbscan`, params);
  return unwrap<DBSCANResponse>(res);
};

// Congestion Classification APIs
export const trainClassifier = async (
  id: string,
  params: {
    algorithm: string;
    features: string[];
    target?: string;
    test_size: number;
    params?: Record<string, any>;
  }
): Promise<ClassifierResult> => {
  const res = await apiClient.post(`/classification/${id}/train`, params);
  return unwrap<ClassifierResult>(res);
};

export const trainAllClassifiers = async (
  id: string,
  params: {
    features: string[];
    target?: string;
    test_size: number;
  }
): Promise<TrainAllClassifiersResponse> => {
  const res = await apiClient.post(`/classification/${id}/train_all`, params);
  return unwrap<TrainAllClassifiersResponse>(res);
};

// Traffic Prediction APIs
export const runPrediction = async (
  id: string,
  params: {
    algorithm: string;
    target: string;
    location?: string;
    features: string[];
    forecast_steps: number;
  }
): Promise<PredictionResponse> => {
  const res = await apiClient.post(`/prediction/${id}/run`, params);
  return unwrap<PredictionResponse>(res);
};

// Outlier Detection APIs
export const runOutlierDetection = async (
  id: string,
  params: {
    method: string;
    features: string[];
    z_threshold?: number;
    lof_neighbors?: number;
    contamination?: number;
  }
): Promise<OutlierDetectionResponse> => {
  const res = await apiClient.post(`/outlier/${id}/run`, params);
  return unwrap<OutlierDetectionResponse>(res);
};

// Model Evaluation APIs
export const getEvaluationSummary = async (id: string): Promise<ModelEvaluationSummary> => {
  const res = await apiClient.get(`/evaluation/${id}/summary`);
  return unwrap<ModelEvaluationSummary>(res);
};

export default apiClient;
