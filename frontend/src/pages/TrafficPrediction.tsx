import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Play,
  RotateCcw,
  Sparkles,
  Info,
  Loader2,
  AlertCircle,
  Activity,
  Gauge,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { useDataset } from '../hooks/useDataset';
import { runPrediction, getExplorerFilters } from '../services/api';
import { PredictionResponse } from '../types/api';
import AlgorithmExplainer from '../components/AlgorithmExplainer';
import KpiCard from '../components/KpiCard';

export const TrafficPrediction: React.FC = () => {
  const { activeDataset } = useDataset();

  // Controls
  const [algorithm, setAlgorithm] = useState<'random_forest' | 'linear_regression'>('random_forest');
  const [target, setTarget] = useState<string>('traffic_volume');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [forecastSteps, setForecastSteps] = useState<number>(12);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([
    'hour',
    'day_of_week',
    'lag_1',
    'lag_2',
  ]);

  // Results
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeDataset) return;
    const fetchLocations = async () => {
      try {
        const filters = await getExplorerFilters(activeDataset.id);
        if (filters?.locations && filters.locations.length > 0) {
          setAvailableLocations(filters.locations);
          setSelectedLocation(filters.locations[0]);
        }
      } catch (err) {
        console.warn('Failed to fetch locations for prediction', err);
      }
    };
    fetchLocations();
  }, [activeDataset?.id]);

  const handleRunPrediction = async () => {
    if (!activeDataset) return;
    setLoading(true);
    setError(null);
    try {
      const response = await runPrediction(activeDataset.id, {
        algorithm,
        target,
        location: selectedLocation || undefined,
        features: selectedFeatures,
        forecast_steps: forecastSteps,
      });
      setResult(response);
    } catch (err: any) {
      setError(err?.message || 'Traffic prediction model execution failed');
    } finally {
      setLoading(false);
    }
  };

  // Merge historical actual/predicted with future forecast for unified chart
  const combinedChartData = React.useMemo(() => {
    if (!result) return [];
    const historical = (result.historical_test || []).map((item) => ({
      date: item.date,
      actual: item.actual,
      predicted: item.predicted,
      isForecast: false,
    }));

    const future = (result.future_forecast || []).map((item) => ({
      date: item.date,
      actual: null,
      forecast: item.predicted,
      isForecast: true,
    }));

    return [...historical, ...future];
  }, [result]);

  if (!activeDataset) {
    return (
      <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-sm text-gray-500">
        Please activate a dataset in Data Management to run Traffic Prediction models.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Time-Series Traffic Prediction</h1>
        <p className="text-xs text-gray-500 mt-1">
          Forecast near-future traffic volume flows and corridor speeds using supervised regression models.
        </p>
      </div>

      {/* Explainer */}
      <AlgorithmExplainer
        title="Time-Series Regression: Random Forest vs Linear Regression"
        purpose="Traffic prediction models continuous parameters (traffic volume in veh/h or speed in km/h) into future periods. Historical lag features (t-1, t-2) and cyclic temporal indicators (hour, day of week) capture peak rush congestion build-up and dissipation."
        inputs={['Temporal indicators (hour, day of week, month)', 'Lagged observations (volume_t-1, speed_t-1)', 'Corridor location indices', 'Weather conditions']}
        parameters={{
          'Random Forest Regressor': 'Non-linear ensemble of decision trees. Robust to outliers and models non-linear sudden gridlocks.',
          'Linear Regression': 'Interpretable linear model estimating baseline trend slopes and direct coefficient weights.',
          'Forecast Horizon': 'Number of future time steps (e.g. 15-minute or hourly increments) projected forward.',
        }}
        interpretation="Higher R² (> 0.75) shows strong fit to historical cyclical swings. MAE communicates the expected deviation in real vehicle units (e.g. +/- 12 vehicles per hour)."
        metrics={{
          'MAE (Mean Absolute Error)': 'Average magnitude of errors in raw feature units. Easy to interpret for urban planners.',
          'RMSE (Root Mean Squared Error)': 'Penalizes large outlier forecast errors more severely.',
          'R² (Coefficient of Determination)': 'Proportion of traffic variance explained by the model (1.0 is perfect).',
        }}
        defaultOpen={false}
      />

      {/* Control Panel */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
        {/* Algorithm Tabs */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            1. Select Regression Architecture
          </label>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <button
              type="button"
              onClick={() => setAlgorithm('random_forest')}
              className={`p-3 rounded-xl border text-left transition-all ${
                algorithm === 'random_forest'
                  ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-2xs'
                  : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="text-xs">Random Forest Regressor</div>
              <div className="text-[10px] text-gray-500">Non-linear ensemble trees</div>
            </button>

            <button
              type="button"
              onClick={() => setAlgorithm('linear_regression')}
              className={`p-3 rounded-xl border text-left transition-all ${
                algorithm === 'linear_regression'
                  ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-2xs'
                  : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="text-xs">Linear Regression</div>
              <div className="text-[10px] text-gray-500">Fast parametric baseline</div>
            </button>
          </div>
        </div>

        {/* Target & Location & Horizon */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Target Variable</label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="traffic_volume">Traffic Volume (veh/h)</option>
              <option value="average_speed">Average Speed (km/h)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Corridor Location</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Corridors (Network Average)</option>
              {availableLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-gray-700">Forecast Steps Ahead</label>
              <span className="font-mono text-xs font-bold text-blue-600">{forecastSteps} steps</span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              step="1"
              value={forecastSteps}
              onChange={(e) => setForecastSteps(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-[10px] text-gray-400 mt-1 block">Projected future time periods</span>
          </div>
        </div>

        {/* Run Button */}
        <div className="pt-3 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={handleRunPrediction}
            disabled={loading}
            className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Training & Projecting Forecast...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2 fill-current" />
                Generate Prediction & Forecast
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center text-xs text-red-700">
          <AlertCircle className="w-4 h-4 mr-2 text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results View */}
      {result && (
        <div className="space-y-6">
          {/* Regression Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              title="Mean Absolute Error (MAE)"
              value={(result.metrics?.mae ?? (result as any).mae ?? 0).toFixed(2)}
              subtitle={`Average error in ${target === 'average_speed' ? 'km/h' : 'veh/h'}`}
              icon={<Gauge className="w-5 h-5" />}
              color="teal"
            />
            <KpiCard
              title="Root Mean Squared (RMSE)"
              value={(result.metrics?.rmse ?? (result as any).rmse ?? 0).toFixed(2)}
              subtitle="Penalty for peak deviations"
              icon={<Activity className="w-5 h-5" />}
              color="amber"
            />
            <KpiCard
              title="Goodness of Fit (R²)"
              value={(((result.metrics?.r2 ?? (result as any).r2 ?? 0)) * 100).toFixed(1) + '%'}
              subtitle="Explained variance"
              icon={<TrendingUp className="w-5 h-5" />}
              color="blue"
            />
          </div>

          {/* Main Chart */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Actual Telemetry vs Model Predicted vs Future Horizon
                </h3>
                <p className="text-xs text-gray-500">
                  Solid lines represent validation test observations; dashed orange indicates projected future steps.
                </p>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={combinedChartData} margin={{ top: 10, right: 20, left: 0, bottom: 45 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    angle={-25}
                    textAnchor="end"
                    height={45}
                    minTickGap={35}
                    tickFormatter={(val: string) => (val && val.length > 10 ? val.slice(5) : val)}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px', paddingBottom: '8px' }} />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    name="Actual Ground Truth"
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#0d9488"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    name="Model Fit (Test Set)"
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    dot={{ r: 3 }}
                    name="Projected Forecast"
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Summary and Academic Disclaimer Note */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
            <p className="font-semibold">{result.summary}</p>
            <p className="text-[11px] text-amber-800">
              <strong>Notice:</strong> This model is trained on historical offline datasets. Predictions reflect statistical patterns learned in the training set and are NOT live real-time traffic sensor feeds.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrafficPrediction;
