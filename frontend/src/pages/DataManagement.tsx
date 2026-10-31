import React, { useState, useEffect } from 'react';
import {
  Upload,
  Table as TableIcon,
  SlidersHorizontal,
  CheckCircle,
  Trash2,
  Play,
  Download,
  Database,
  Loader2,
  FileSpreadsheet,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useDataset } from '../hooks/useDataset';
import {
  uploadDataset,
  loadSampleDataset,
  deleteDataset,
  getDatasetPreview,
  getDatasetStats,
  updateColumnMapping,
  runPreprocessing,
  getPreprocessingSummary,
} from '../services/api';
import {
  DatasetPreview,
  DatasetStats,
  PreprocessingOperations,
  PreprocessingSummary,
} from '../types/api';
import FileUpload from '../components/FileUpload';
import ColumnMapper from '../components/ColumnMapper';
import DataTable, { Column } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';

export const DataManagement: React.FC = () => {
  const {
    activeDataset,
    datasets,
    refreshDatasets,
    selectAndActivateDataset,
    isLoading: contextLoading,
  } = useDataset();

  const [activeTab, setActiveTab] = useState<'upload' | 'preview' | 'preprocessing'>('upload');

  // Preview tab state
  const [previewData, setPreviewData] = useState<DatasetPreview | null>(null);
  const [statsData, setStatsData] = useState<DatasetStats | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Preprocessing tab state
  const [operations, setOperations] = useState<PreprocessingOperations>({
    remove_duplicates: true,
    impute_missing: true,
    normalize: false,
    encode_categorical: true,
    extract_datetime: true,
    discretize: true,
  });
  const [preprocessingSummary, setPreprocessingSummary] = useState<PreprocessingSummary | null>(null);
  const [prepLoading, setPrepLoading] = useState<boolean>(false);
  const [prepError, setPrepError] = useState<string | null>(null);

  // Upload actions state
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  const [sampleLoading, setSampleLoading] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load preview & stats when tab is preview or activeDataset changes
  useEffect(() => {
    if (activeDataset && (activeTab === 'preview' || activeTab === 'preprocessing')) {
      loadPreviewAndStats(activeDataset.id);
    }
  }, [activeDataset?.id, activeTab]);

  const loadPreviewAndStats = async (id: string) => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const [preview, stats] = await Promise.all([
        getDatasetPreview(id, 50),
        getDatasetStats(id),
      ]);
      setPreviewData(preview);
      setStatsData(stats);
    } catch (err: any) {
      setPreviewError(err?.message || 'Failed to load preview/stats');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    setUploadLoading(true);
    setActionMessage(null);
    try {
      const dataset = await uploadDataset(file);
      await selectAndActivateDataset(dataset.id);
      setActionMessage({ type: 'success', text: `Uploaded and activated ${file.name} successfully.` });
      setActiveTab('preview');
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || 'Failed to upload dataset.' });
      throw err;
    } finally {
      setUploadLoading(false);
    }
  };

  const handleLoadSample = async () => {
    setSampleLoading(true);
    setActionMessage(null);
    try {
      const sample = await loadSampleDataset();
      await selectAndActivateDataset(sample.id);
      setActionMessage({ type: 'success', text: 'Pre-packaged Urban Traffic sample dataset loaded and activated!' });
      setActiveTab('preview');
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || 'Failed to load sample dataset.' });
    } finally {
      setSampleLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete dataset "${name}"?`)) return;
    try {
      await deleteDataset(id);
      await refreshDatasets();
      setActionMessage({ type: 'success', text: `Dataset "${name}" deleted.` });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || 'Failed to delete dataset.' });
    }
  };

  const handleSaveMapping = async (mapping: Record<string, string>) => {
    if (!activeDataset) return;
    await updateColumnMapping(activeDataset.id, mapping);
    await refreshDatasets();
    await loadPreviewAndStats(activeDataset.id);
  };

  const handleRunPreprocessing = async () => {
    if (!activeDataset) return;
    setPrepLoading(true);
    setPrepError(null);
    try {
      const summary = await runPreprocessing(activeDataset.id, operations);
      setPreprocessingSummary(summary);
      await refreshDatasets();
      await loadPreviewAndStats(activeDataset.id);
    } catch (err: any) {
      setPrepError(err?.message || 'Preprocessing pipeline failed');
    } finally {
      setPrepLoading(false);
    }
  };

  // Preview table columns
  const previewColumns: Column<Record<string, any>>[] = (
    Array.isArray(previewData)
      ? Object.keys(previewData[0] || {})
      : previewData?.columns || []
  ).map((col) => ({
    key: col,
    label: col,
    sortable: false,
  }));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dataset Management & Cleaning</h1>
        <p className="text-xs text-gray-500 mt-1">
          Ingest, map schemas, inspect statistics, and preprocess raw traffic sensor and loop data.
        </p>
      </div>

      {/* Notifications */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            actionMessage.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-4 rounded-xl shadow-xs">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-xs transition-colors ${
            activeTab === 'upload'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Upload & Repositories</span>
        </button>

        <button
          onClick={() => setActiveTab('preview')}
          className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-xs transition-colors ${
            activeTab === 'preview'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <TableIcon className="w-4 h-4" />
          <span>Preview & Column Mapping</span>
        </button>

        <button
          onClick={() => setActiveTab('preprocessing')}
          className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-xs transition-colors ${
            activeTab === 'preprocessing'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Preprocessing Pipeline</span>
        </button>
      </div>

      {/* Tab 1: Upload */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-1">Upload New Traffic CSV Dataset</h3>
              <p className="text-xs text-gray-500 mb-4">
                Upload raw vehicle sensor records, urban intersection telemetry, or GPS trajectory exports.
              </p>
              <FileUpload onUpload={handleUpload} isLoading={uploadLoading} />
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 p-6 rounded-xl border border-blue-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-3 shadow-md shadow-blue-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">Pre-built Urban Sample Dataset</h3>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  Demonstrate the complete platform instantly with our curated benchmark dataset featuring:
                </p>
                <ul className="mt-2 text-xs text-gray-600 space-y-1 list-disc list-inside">
                  <li>Hourly traffic counts & speed telemetry</li>
                  <li>Multi-corridor sensor network coordinates</li>
                  <li>Weather attributes & road classifications</li>
                  <li>Congestion ground truth for classification</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={handleLoadSample}
                disabled={sampleLoading}
                className="mt-6 w-full inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
              >
                {sampleLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading Benchmark Sample...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    Load Sample Dataset
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Dataset List Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Registered Datasets</h3>
                <p className="text-xs text-gray-500">Datasets currently stored and accessible for analytical tasks</p>
              </div>
              <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                Total: {datasets.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-gray-600 uppercase">Dataset Name</th>
                    <th className="px-5 py-3 font-semibold text-gray-600 uppercase">Records</th>
                    <th className="px-5 py-3 font-semibold text-gray-600 uppercase">Columns</th>
                    <th className="px-5 py-3 font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-5 py-3 font-semibold text-gray-600 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {datasets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                        No datasets uploaded yet. Upload a CSV or load the benchmark sample above.
                      </td>
                    </tr>
                  ) : (
                    datasets.map((ds) => {
                      const isActive = activeDataset?.id === ds.id;
                      return (
                        <tr key={ds.id} className={`hover:bg-slate-50 ${isActive ? 'bg-blue-50/30' : ''}`}>
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-gray-900">{ds.name}</div>
                            <div className="text-[10px] text-gray-400">{ds.filename}</div>
                          </td>
                          <td className="px-5 py-3.5 font-medium text-gray-700">
                            {(ds.record_count || ds.row_count || 0).toLocaleString()} rows
                          </td>
                          <td className="px-5 py-3.5 text-gray-600">
                            {ds.column_count || ds.columns?.length || 0} features
                          </td>
                          <td className="px-5 py-3.5">
                            <StatusBadge status={isActive ? 'Active' : ds.status} size="sm" />
                          </td>
                          <td className="px-5 py-3.5 text-right space-x-2">
                            {!isActive ? (
                              <button
                                onClick={() => selectAndActivateDataset(ds.id)}
                                className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded"
                              >
                                Activate
                              </button>
                            ) : (
                              <span className="text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                                Current Active
                              </span>
                            )}
                            <button
                              onClick={() => handleDelete(ds.id, ds.name)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                              title="Delete dataset"
                            >
                              <Trash2 className="w-3.5 h-3.5 inline" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Preview & Schema */}
      {activeTab === 'preview' && (
        <div className="space-y-6">
          {!activeDataset ? (
            <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-xs text-gray-500">
              Please upload or activate a dataset first.
            </div>
          ) : (
            <>
              {/* Column Mapper Component */}
              <ColumnMapper
                datasetId={activeDataset.id}
                detectedColumns={previewData?.columns || activeDataset.columns || []}
                initialMapping={activeDataset.column_mapping}
                onSave={handleSaveMapping}
              />

              {/* Data Statistics Grid */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Per-Column Summary Statistics</h3>
                    <p className="text-xs text-gray-500">
                      Feature profiles, null distribution, data types, and min/max ranges
                    </p>
                  </div>
                  {statsData && (
                    <span className="text-xs text-gray-500">
                      {statsData.total_rows.toLocaleString()} rows x {statsData.total_columns} columns
                    </span>
                  )}
                </div>

                {previewLoading ? (
                  <div className="p-8 text-center text-xs text-gray-400 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin mr-2 text-blue-600" />
                    Computing column profile statistics...
                  </div>
                ) : statsData?.columns_info ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {Object.entries(statsData.columns_info).map(([colName, colStat]) => (
                      <div
                        key={colName}
                        className="p-3 bg-gray-50/80 rounded-lg border border-gray-200 text-xs"
                      >
                        <div className="flex items-center justify-between font-semibold text-gray-900 mb-1">
                          <span className="truncate" title={colName}>{colName}</span>
                          <span className="text-[10px] font-mono text-gray-500 bg-gray-200 px-1.5 py-0.2 rounded">
                            {colStat.type}
                          </span>
                        </div>
                        <div className="space-y-0.5 text-gray-600 text-[11px] mt-1.5">
                          <div className="flex justify-between">
                            <span>Missing / Nulls:</span>
                            <span className={colStat.null_count > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                              {colStat.null_count}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Unique Values:</span>
                            <span className="font-semibold text-gray-800">{colStat.unique_count}</span>
                          </div>
                          {colStat.min !== undefined && colStat.min !== null && (
                            <div className="flex justify-between">
                              <span>Min:</span>
                              <span className="font-mono text-gray-700">{String(colStat.min)}</span>
                            </div>
                          )}
                          {colStat.max !== undefined && colStat.max !== null && (
                            <div className="flex justify-between">
                              <span>Max:</span>
                              <span className="font-mono text-gray-700">{String(colStat.max)}</span>
                            </div>
                          )}
                          {colStat.mean !== undefined && colStat.mean !== null && (
                            <div className="flex justify-between">
                              <span>Mean:</span>
                              <span className="font-mono text-gray-700">{Number(colStat.mean).toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 py-4 text-center">No statistical profile available</p>
                )}
              </div>

              {/* Data Preview Table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">First 50 Rows Preview</h3>
                    <p className="text-xs text-gray-500">Live raw record snapshot from active dataset</p>
                  </div>
                </div>

                <DataTable
                  columns={previewColumns}
                  data={Array.isArray(previewData) ? previewData : previewData?.rows || []}
                  loading={previewLoading}
                  emptyMessage="No rows in dataset"
                  perPage={10}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 3: Preprocessing */}
      {activeTab === 'preprocessing' && (
        <div className="space-y-6">
          {!activeDataset ? (
            <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-xs text-gray-500">
              Please upload or activate a dataset first.
            </div>
          ) : (
            <>
              {/* Operations Control */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-200 mb-6 gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Configure Preprocessing Tasks</h3>
                    <p className="text-xs text-gray-500">
                      Standardize features, clean missing data, encode variables, and derive congestion labels.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunPreprocessing}
                    disabled={prepLoading}
                    className="inline-flex items-center px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors"
                  >
                    {prepLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Executing Preprocessing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2 fill-current" />
                        Run Preprocessing Pipeline
                      </>
                    )}
                  </button>
                </div>

                {prepError && (
                  <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>{prepError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    {
                      id: 'remove_duplicates',
                      title: 'Remove Duplicate Rows',
                      desc: 'Drops redundant observations matching identical timestamps and sensors.',
                    },
                    {
                      id: 'impute_missing',
                      title: 'Impute Missing Values',
                      desc: 'Median imputation for numeric metrics; mode for categorical weather.',
                    },
                    {
                      id: 'normalize',
                      title: 'Normalize Features (MinMax/Standard)',
                      desc: 'Scales speed and volume values between [0, 1] for clustering algorithms.',
                    },
                    {
                      id: 'encode_categorical',
                      title: 'Encode Categorical Variables',
                      desc: 'One-hot or label encode weather, road type, and junction attributes.',
                    },
                    {
                      id: 'extract_datetime',
                      title: 'Extract DateTime Features',
                      desc: 'Extracts hour, day_of_week, is_weekend, and peak_period flags.',
                    },
                    {
                      id: 'discretize',
                      title: 'Derive Congestion Target',
                      desc: 'Binned rule-based categorization into Low, Medium, and High congestion states.',
                    },
                  ].map((op) => (
                    <label
                      key={op.id}
                      className={`flex items-start p-4 rounded-xl border cursor-pointer transition-colors ${
                        (operations as any)[op.id]
                          ? 'border-blue-300 bg-blue-50/30'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={(operations as any)[op.id]}
                        onChange={(e) =>
                          setOperations({
                            ...operations,
                            [op.id]: e.target.checked,
                          })
                        }
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="ml-3">
                        <span className="text-xs font-bold text-gray-900">{op.title}</span>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{op.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Before / After Comparison */}
              {preprocessingSummary && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Preprocessing Results & Audit</h3>
                    <p className="text-xs text-gray-500">Summary of data changes before and after execution</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Before Preprocessing</span>
                      <div className="mt-3 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Row Count:</span>
                          <span className="font-bold text-gray-900">
                            {(preprocessingSummary.before_stats?.row_count ?? (preprocessingSummary as any).before?.row_count ?? 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Missing Values:</span>
                          <span className="font-bold text-red-600">
                            {(preprocessingSummary.before_stats?.missing_values ?? (preprocessingSummary as any).before?.missing_values ?? 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Duplicates:</span>
                          <span className="font-bold text-amber-600">
                            {preprocessingSummary.before_stats?.duplicate_rows ?? (preprocessingSummary as any).before?.duplicate_rows ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-green-50/40 rounded-xl border border-green-200">
                      <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">After Preprocessing</span>
                      <div className="mt-3 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Row Count:</span>
                          <span className="font-bold text-gray-900">
                            {(preprocessingSummary.after_stats?.row_count ?? (preprocessingSummary as any).after?.row_count ?? 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Missing Values:</span>
                          <span className="font-bold text-green-700">
                            {(preprocessingSummary.after_stats?.missing_values ?? (preprocessingSummary as any).after?.missing_values ?? 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Duplicates:</span>
                          <span className="font-bold text-green-700">0</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Operations applied list */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-800 mb-2">Applied Transformations:</h4>
                    <div className="flex flex-wrap gap-2">
                      {preprocessingSummary.operations_applied.map((opName, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 font-semibold text-[11px] rounded-lg border border-blue-200"
                        >
                          ✓ {opName}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Cleaned Download */}
                  {preprocessingSummary.download_url && (
                    <div className="pt-2">
                      <a
                        href={preprocessingSummary.download_url}
                        download
                        className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        <Download className="w-4 h-4 mr-1.5" />
                        Download Cleaned CSV Dataset
                      </a>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DataManagement;
