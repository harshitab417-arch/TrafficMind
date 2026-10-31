import React, { useState } from 'react';
import {
  Layers,
  Play,
  RotateCcw,
  Sparkles,
  Info,
  Loader2,
  AlertCircle,
  HelpCircle,
  BarChart2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Legend,
} from 'recharts';
import { useDataset } from '../hooks/useDataset';
import { runKMeans, runDBSCAN } from '../services/api';
import { KMeansResponse, DBSCANResponse, ClusterDetail } from '../types/api';
import AlgorithmExplainer from '../components/AlgorithmExplainer';
import DataTable, { Column } from '../components/DataTable';

const CLUSTER_COLORS = ['#2563eb', '#0d9488', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export const ClusteringAnalysis: React.FC = () => {
  const { activeDataset } = useDataset();

  const [activeTab, setActiveTab] = useState<'kmeans' | 'dbscan'>('kmeans');

  // Available numeric features
  const availableFeatures = ['traffic_volume', 'average_speed', 'hour', 'occupancy'];

  // K-Means state
  const [kmeansFeatures, setKmeansFeatures] = useState<string[]>(['traffic_volume', 'average_speed']);
  const [nClusters, setNClusters] = useState<number>(3);
  const [kmeansResult, setKmeansResult] = useState<KMeansResponse | null>(null);
  const [kmeansLoading, setKmeansLoading] = useState<boolean>(false);
  const [kmeansError, setKmeansError] = useState<string | null>(null);

  // DBSCAN state
  const [dbscanFeatures, setDbscanFeatures] = useState<string[]>(['traffic_volume', 'average_speed']);
  const [eps, setEps] = useState<number>(0.5);
  const [minSamples, setMinSamples] = useState<number>(5);
  const [dbscanResult, setDbscanResult] = useState<DBSCANResponse | null>(null);
  const [dbscanLoading, setDbscanLoading] = useState<boolean>(false);
  const [dbscanError, setDbscanError] = useState<string | null>(null);

  const toggleFeature = (feature: string, isKmeans: boolean) => {
    if (isKmeans) {
      if (kmeansFeatures.includes(feature)) {
        if (kmeansFeatures.length > 2) setKmeansFeatures(kmeansFeatures.filter((f) => f !== feature));
      } else {
        setKmeansFeatures([...kmeansFeatures, feature]);
      }
    } else {
      if (dbscanFeatures.includes(feature)) {
        if (dbscanFeatures.length > 2) setDbscanFeatures(dbscanFeatures.filter((f) => f !== feature));
      } else {
        setDbscanFeatures([...dbscanFeatures, feature]);
      }
    }
  };

  const handleRunKMeans = async () => {
    if (!activeDataset) return;
    setKmeansLoading(true);
    setKmeansError(null);
    try {
      const response = await runKMeans(activeDataset.id, {
        features: kmeansFeatures,
        n_clusters: nClusters,
      });
      setKmeansResult(response);
    } catch (err: any) {
      setKmeansError(err?.message || 'K-Means clustering failed');
    } finally {
      setKmeansLoading(false);
    }
  };

  const handleRunDBSCAN = async () => {
    if (!activeDataset) return;
    setDbscanLoading(true);
    setDbscanError(null);
    try {
      const response = await runDBSCAN(activeDataset.id, {
        features: dbscanFeatures,
        eps,
        min_samples: minSamples,
      });
      setDbscanResult(response);
    } catch (err: any) {
      setDbscanError(err?.message || 'DBSCAN clustering failed');
    } finally {
      setDbscanLoading(false);
    }
  };

  const clusterColumns: Column<ClusterDetail>[] = [
    {
      key: 'cluster_id',
      label: 'Cluster ID',
      render: (val: number, row: any) => {
        const idVal = row.cluster_id ?? row.id ?? val ?? 0;
        return (
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: CLUSTER_COLORS[idVal % CLUSTER_COLORS.length] }}
          >
            Cluster {idVal}
          </span>
        );
      },
    },
    {
      key: 'label',
      label: 'Profile Category',
      render: (val: string) => <span className="font-semibold text-gray-900">{val || 'Traffic Pattern'}</span>,
    },
    {
      key: 'size',
      label: 'Data Points',
      render: (val: number, row: any) => (
        <span className="font-mono text-xs text-gray-700">
          {(val ?? row.size ?? 0).toLocaleString()} ({(row.percentage ?? 0).toFixed(1)}%)
        </span>
      ),
    },
    {
      key: 'characteristics',
      label: 'Operational Characteristics',
      render: (val: string) => <span className="text-xs text-gray-600">{val || 'Normal traffic regime'}</span>,
    },
  ];

  if (!activeDataset) {
    return (
      <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-sm text-gray-500">
        Please activate a dataset in Data Management to run Clustering Analysis.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Unsupervised Traffic Clustering</h1>
        <p className="text-xs text-gray-500 mt-1">
          Partition road traffic states into natural behavioral regimes using partition (K-Means) and density-based (DBSCAN) algorithms.
        </p>
      </div>

      {/* Explainer */}
      <AlgorithmExplainer
        title="Unsupervised Clustering: K-Means vs DBSCAN"
        purpose="Clustering groups high-dimensional traffic telemetry into distinct operational regimes (e.g., Free Flow, Peak Congestion, Night Transit) without needing human labels. K-Means finds spherical clusters, whereas DBSCAN discovers arbitrary-shaped dense regions and isolates noisy outliers."
        inputs={['Normalized traffic volume (veh/h)', 'Average vehicle speed (km/h)', 'Time of day / Hour index', 'Lane occupancy percentage']}
        parameters={{
          'K-Means: k': 'Number of clusters to generate. Hyperparameter optimized via Silhouette analysis.',
          'DBSCAN: Epsilon (eps)': 'Radius of neighborhood around points.',
          'DBSCAN: Min Samples': 'Minimum number of points required within eps radius to declare a dense core region.',
        }}
        interpretation="Compare cluster centroids to identify high-risk bottlenecks and off-peak operational standards. Points tagged as -1 (Noise) by DBSCAN represent anomalous irregular conditions."
        metrics={{
          'Silhouette Score [-1 to 1]': 'Measures cohesion within clusters vs separation from other clusters (> 0.5 is strong).',
          'Noise Percentage': 'Proportion of isolated observations unassigned to any dense cluster.',
        }}
        defaultOpen={false}
      />

      {/* Algorithm Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-4 rounded-xl shadow-xs">
        <button
          onClick={() => setActiveTab('kmeans')}
          className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-xs transition-colors ${
            activeTab === 'kmeans'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>K-Means Clustering</span>
        </button>

        <button
          onClick={() => setActiveTab('dbscan')}
          className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-xs transition-colors ${
            activeTab === 'dbscan'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>DBSCAN (Density-Based)</span>
        </button>
      </div>

      {/* K-Means View */}
      {activeTab === 'kmeans' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              K-Means Hyperparameter & Feature Selection
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Feature Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Select Features for Clustering (Min 2)
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableFeatures.map((feat) => {
                    const isSelected = kmeansFeatures.includes(feat);
                    return (
                      <button
                        key={feat}
                        type="button"
                        onClick={() => toggleFeature(feat, true)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {feat.replace('_', ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Number of Clusters */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-gray-700">Number of Clusters (k)</label>
                  <span className="font-mono text-xs font-bold text-blue-600">{nClusters}</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="1"
                  value={nClusters}
                  onChange={(e) => setNClusters(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Iteratively minimizes Within-Cluster Sum of Squares (WCSS)
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={handleRunKMeans}
                disabled={kmeansLoading}
                className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors"
              >
                {kmeansLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Partitioning Clusters...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2 fill-current" />
                    Run K-Means Algorithm
                  </>
                )}
              </button>
            </div>
          </div>

          {kmeansError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center text-xs text-red-700">
              <AlertCircle className="w-4 h-4 mr-2 text-red-500 flex-shrink-0" />
              <span>{kmeansError}</span>
            </div>
          )}

          {/* Results */}
          {kmeansResult && (
            <div className="space-y-6">
              {/* Silhouette Score Badge */}
              <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cluster Validation</h3>
                  <p className="text-xs text-gray-600 mt-0.5">Partition quality across {kmeansResult.n_clusters} clusters</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-semibold text-gray-700">Silhouette Coefficient:</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      kmeansResult.silhouette_score > 0.5
                        ? 'bg-green-100 text-green-800'
                        : kmeansResult.silhouette_score > 0.25
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {kmeansResult.silhouette_score.toFixed(3)}
                  </span>
                </div>
              </div>

              {/* Scatter Plot */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-gray-900">Cluster Feature Space (Scatter Plot)</h3>
                  <p className="text-xs text-gray-500">
                    X: {kmeansResult.x_feature || kmeansFeatures[0]}, Y: {kmeansResult.y_feature || kmeansFeatures[1]}
                  </p>
                </div>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name={kmeansResult.x_feature || kmeansFeatures[0]}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name={kmeansResult.y_feature || kmeansFeatures[1]}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                      />
                      <Scatter name="Traffic Points" data={kmeansResult.scatter_data}>
                        {kmeansResult.scatter_data.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CLUSTER_COLORS[entry.cluster % CLUSTER_COLORS.length]}
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Cluster Summary Table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900">Cluster Profiles & Regimes</h3>
                </div>
                <DataTable
                  columns={clusterColumns}
                  data={kmeansResult.clusters}
                  perPage={10}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* DBSCAN View */}
      {activeTab === 'dbscan' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              DBSCAN Density Parameters
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {/* Feature Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Features</label>
                <div className="flex flex-wrap gap-2">
                  {availableFeatures.map((feat) => {
                    const isSelected = dbscanFeatures.includes(feat);
                    return (
                      <button
                        key={feat}
                        type="button"
                        onClick={() => toggleFeature(feat, false)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {feat.replace('_', ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Epsilon */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Epsilon (Radius: eps)
                </label>
                <input
                  type="number"
                  min="0.05"
                  max="5.0"
                  step="0.05"
                  value={eps}
                  onChange={(e) => setEps(parseFloat(e.target.value) || 0.5)}
                  className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 font-medium"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">Maximum distance between neighbors</span>
              </div>

              {/* Min Samples */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Min Samples (Core Density)
                </label>
                <input
                  type="number"
                  min="2"
                  max="50"
                  step="1"
                  value={minSamples}
                  onChange={(e) => setMinSamples(parseInt(e.target.value, 10) || 5)}
                  className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 font-medium"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">Min points to form dense cluster</span>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={handleRunDBSCAN}
                disabled={dbscanLoading}
                className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors"
              >
                {dbscanLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scanning Density Clusters...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Run DBSCAN
                  </>
                )}
              </button>
            </div>
          </div>

          {dbscanError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center text-xs text-red-700">
              <AlertCircle className="w-4 h-4 mr-2 text-red-500 flex-shrink-0" />
              <span>{dbscanError}</span>
            </div>
          )}

          {/* Results */}
          {dbscanResult && (
            <div className="space-y-6">
              {/* Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-2xs">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Clusters Discovered</span>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{dbscanResult.n_clusters}</div>
                  <span className="text-[11px] text-gray-400">Excluding noise points</span>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-2xs">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Noise Observations</span>
                  <div className="text-2xl font-bold text-amber-600 mt-1">
                    {(dbscanResult.noise_points ?? (dbscanResult as any).noise_count ?? 0).toLocaleString()}
                  </div>
                  <span className="text-[11px] text-gray-400">Isolated outliers</span>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-2xs">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Noise Percentage</span>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {((dbscanResult.noise_percentage ?? (dbscanResult as any).noise_pct ?? 0)).toFixed(1)}%
                  </div>
                  <span className="text-[11px] text-gray-400">of total data volume</span>
                </div>
              </div>

              {/* Scatter Plot with Noise in Gray */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-gray-900">DBSCAN Density Scatter Map</h3>
                  <p className="text-xs text-gray-500">
                    Colored points indicate dense clusters; gray dots indicate noise/outliers.
                  </p>
                </div>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" dataKey="x" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis type="number" dataKey="y" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                      />
                      <Scatter name="DBSCAN Points" data={dbscanResult.scatter_data}>
                        {dbscanResult.scatter_data.map((entry, index) => {
                          const isNoise = entry.is_noise || entry.cluster === -1;
                          const color = isNoise ? '#94a3b8' : CLUSTER_COLORS[entry.cluster % CLUSTER_COLORS.length];
                          return <Cell key={`dbscan-cell-${index}`} fill={color} opacity={isNoise ? 0.4 : 0.8} />;
                        })}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Cluster Details Table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900">Discovered Density Clusters</h3>
                </div>
                <DataTable
                  columns={clusterColumns}
                  data={dbscanResult.clusters}
                  perPage={10}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClusteringAnalysis;
