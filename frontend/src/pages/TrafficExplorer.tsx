import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Filter,
  RotateCcw,
  Search,
  Activity,
  Gauge,
  Database,
  Calendar,
  Clock,
  CloudSun,
  AlertCircle,
  Layers,
  Sparkles,
} from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from 'react-leaflet';
import { useDataset } from '../hooks/useDataset';
import {
  getExplorerRecords,
  getExplorerFilters,
  getExplorerStats,
} from '../services/api';
import {
  ExplorerRecord,
  ExplorerFilters,
  ExplorerStats,
  ExplorerParams,
} from '../types/api';
import DataTable, { Column } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import KpiCard from '../components/KpiCard';

// Helper to format local date as YYYY-MM-DD
const getLocalDateString = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getRelativeDateString = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return getLocalDateString(d);
};

export const TrafficExplorer: React.FC = () => {
  const { activeDataset } = useDataset();

  // Filters state
  const [filterOptions, setFilterOptions] = useState<ExplorerFilters | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedWeather, setSelectedWeather] = useState<string>('');
  const [selectedCongestion, setSelectedCongestion] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [timeFrom, setTimeFrom] = useState<string>('');
  const [timeTo, setTimeTo] = useState<string>('');

  // Pagination & Sorting state
  const [page, setPage] = useState<number>(1);
  const perPage = 15;
  const [sortBy, setSortBy] = useState<string>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Data state
  const [records, setRecords] = useState<ExplorerRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [stats, setStats] = useState<ExplorerStats | null>(null);
  const [isPredictedMode, setIsPredictedMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load available filters on dataset mount
  useEffect(() => {
    if (!activeDataset) return;
    const fetchFilters = async () => {
      try {
        const filters = await getExplorerFilters(activeDataset.id);
        setFilterOptions(filters);
      } catch (err) {
        console.warn('Could not load filters from server:', err);
      }
    };
    fetchFilters();
  }, [activeDataset?.id]);

  // Load records and stats
  const fetchData = async (overrideParams?: Partial<ExplorerParams>) => {
    if (!activeDataset) return;
    setLoading(true);
    setError(null);

    const params: ExplorerParams = {
      page: overrideParams?.page ?? page,
      per_page: overrideParams?.per_page ?? perPage,
      location: overrideParams?.location !== undefined ? overrideParams.location : (selectedLocation || undefined),
      weather: overrideParams?.weather !== undefined ? overrideParams.weather : (selectedWeather || undefined),
      congestion_level: overrideParams?.congestion_level !== undefined ? overrideParams.congestion_level : (selectedCongestion || undefined),
      date_from: overrideParams?.date_from !== undefined ? overrideParams.date_from : (dateFrom || undefined),
      date_to: overrideParams?.date_to !== undefined ? overrideParams.date_to : (dateTo || undefined),
      time_from: overrideParams?.time_from !== undefined ? overrideParams.time_from : (timeFrom || undefined),
      time_to: overrideParams?.time_to !== undefined ? overrideParams.time_to : (timeTo || undefined),
      sort_by: overrideParams?.sort_by ?? sortBy,
      sort_order: overrideParams?.sort_order ?? sortOrder,
    };

    try {
      const [recRes, statsRes] = await Promise.all([
        getExplorerRecords(activeDataset.id, params),
        getExplorerStats(activeDataset.id, params),
      ]);
      setRecords(recRes.records || []);
      setTotalRecords(recRes.total || 0);
      setStats(statsRes);
      setIsPredictedMode(Boolean(recRes.is_predicted || statsRes?.is_predicted));
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch explorer data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeDataset?.id, page, sortBy, sortOrder]);

  const handleApplyFilters = () => {
    setPage(1);
    fetchData({ page: 1 });
  };

  const handleResetFilters = () => {
    setSelectedLocation('');
    setSelectedWeather('');
    setSelectedCongestion('');
    setDateFrom('');
    setDateTo('');
    setTimeFrom('');
    setTimeTo('');
    setIsPredictedMode(false);
    setPage(1);
    fetchData({
      page: 1,
      location: undefined,
      weather: undefined,
      congestion_level: undefined,
      date_from: undefined,
      date_to: undefined,
      time_from: undefined,
      time_to: undefined,
    });
  };

  const handleSortChange = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Geographic points for Leaflet map
  const geoPoints = useMemo(() => {
    return records
      .filter((r) => r.latitude && r.longitude && !isNaN(Number(r.latitude)) && !isNaN(Number(r.longitude)))
      .map((r) => ({
        lat: Number(r.latitude),
        lng: Number(r.longitude),
        location: r.location || r.location_name || 'Traffic Point',
        volume: r.traffic_volume,
        speed: r.average_speed,
        congestion: r.congestion_level,
      }));
  }, [records]);

  // Map center calculation
  const mapCenter = useMemo<[number, number]>(() => {
    if (geoPoints.length > 0) {
      const avgLat = geoPoints.reduce((acc, p) => acc + p.lat, 0) / geoPoints.length;
      const avgLng = geoPoints.reduce((acc, p) => acc + p.lng, 0) / geoPoints.length;
      return [avgLat, avgLng];
    }
    return [40.7128, -74.006]; // Default fallback
  }, [geoPoints]);

  const columns: Column<ExplorerRecord>[] = [
    {
      key: 'timestamp',
      label: 'Date & Time',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center space-x-1.5">
          <span className="font-mono text-xs">
            {val || `${row.date || ''} ${row.time || ''}`.trim() || '-'}
          </span>
          {row.is_predicted && (
            <span className="px-1.5 py-0.5 text-[9px] bg-purple-100 text-purple-700 rounded font-semibold whitespace-nowrap">
              Forecast
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'location',
      label: 'Location / Corridor',
      sortable: true,
      render: (val, row) => (
        <div className="font-semibold text-gray-900">
          {val || row.location_name || `Junction ${row.location_id || ''}`}
        </div>
      ),
    },
    {
      key: 'traffic_volume',
      label: 'Volume (veh/h)',
      sortable: true,
      render: (val) => <span className="font-bold text-gray-900">{Number(val).toLocaleString()}</span>,
    },
    {
      key: 'average_speed',
      label: 'Avg Speed',
      sortable: true,
      render: (val) => <span className="font-medium text-gray-700">{Number(val).toFixed(1)} km/h</span>,
    },
    {
      key: 'congestion_level',
      label: 'Congestion',
      sortable: true,
      render: (val) => <StatusBadge status={val} size="sm" />,
    },
    {
      key: 'weather',
      label: 'Weather',
      sortable: false,
      render: (val, row) => (
        <span className="text-gray-600 text-xs">
          {val || row.weather_condition || 'Clear'}
        </span>
      ),
    },
    {
      key: 'road_type',
      label: 'Road Type',
      sortable: false,
      render: (val) => <span className="text-gray-500 text-xs">{val || 'Arterial'}</span>,
    },
  ];

  if (!activeDataset) {
    return (
      <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-sm text-gray-500">
        Please activate a dataset in Data Management to explore traffic records.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Interactive Traffic Explorer</h1>
        <p className="text-xs text-gray-500 mt-1">
          Slice and drill into granular traffic loop observations with geospatial and temporal parameters.
        </p>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-gray-100">
          <Filter className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Multi-Attribute Filters</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Location Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Location</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-700 font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Locations</option>
              {filterOptions?.locations?.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Congestion Level Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Congestion Level</label>
            <select
              value={selectedCongestion}
              onChange={(e) => setSelectedCongestion(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-700 font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Levels</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          {/* Weather Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Weather</label>
            <select
              value={selectedWeather}
              onChange={(e) => setSelectedWeather(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-700 font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Weather</option>
              {(filterOptions?.weather_conditions || filterOptions?.weathers || []).map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range From */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold text-gray-600">Date From</label>
              <span className="text-[10px] text-blue-600 font-mono font-medium">Today: {getLocalDateString()}</span>
            </div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg px-2 py-1.5 text-gray-700 focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Date Range To */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold text-gray-600">Date To</label>
              <span className="text-[10px] text-purple-600 font-mono">Future = Prediction</span>
            </div>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg px-2 py-1.5 text-gray-700 focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
        </div>

        {/* Date Quick Presets - Fully Dynamic relative to Current System Date */}
        <div className="mt-3 pt-2.5 border-t border-gray-100 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] text-gray-500 font-medium mr-1">Quick Date Presets:</span>
          <button
            type="button"
            onClick={() => {
              const today = getLocalDateString();
              setDateFrom(today);
              setDateTo(today);
              fetchData({ date_from: today, date_to: today, page: 1 });
            }}
            className="px-2.5 py-1 text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition font-semibold"
          >
            Today ({getLocalDateString()})
          </button>
          <button
            type="button"
            onClick={() => {
              const tomorrow = getRelativeDateString(1);
              setDateFrom(tomorrow);
              setDateTo(tomorrow);
              fetchData({ date_from: tomorrow, date_to: tomorrow, page: 1 });
            }}
            className="px-2.5 py-1 text-[11px] bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition font-semibold inline-flex items-center"
          >
            <Sparkles className="w-3 h-3 mr-1 text-purple-600" />
            Tomorrow (🔮 Forecast: {getRelativeDateString(1)})
          </button>
          <button
            type="button"
            onClick={() => {
              const past7 = getRelativeDateString(-7);
              const today = getLocalDateString();
              setDateFrom(past7);
              setDateTo(today);
              fetchData({ date_from: past7, date_to: today, page: 1 });
            }}
            className="px-2.5 py-1 text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition font-medium"
          >
            Past 7 Days
          </button>
          <button
            type="button"
            onClick={() => {
              const min = filterOptions?.date_range?.min || getRelativeDateString(-300);
              const max = filterOptions?.date_range?.max || getLocalDateString();
              setDateFrom(min);
              setDateTo(max);
              fetchData({ date_from: min, date_to: max, page: 1 });
            }}
            className="px-2.5 py-1 text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition font-medium"
          >
            Full Dataset ({filterOptions?.date_range?.min || 'Start'} to {filterOptions?.date_range?.max || getLocalDateString()})
          </button>
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-1 text-[11px] bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition font-medium"
            >
              Clear Dates
            </button>
          )}
        </div>

        {/* Buttons */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset
          </button>
          <button
            type="button"
            onClick={handleApplyFilters}
            className="inline-flex items-center px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            <Search className="w-3.5 h-3.5 mr-1" />
            Apply Filters
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center text-xs text-red-700">
          <AlertCircle className="w-4 h-4 mr-2 text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Helpful banner when date filter yields zero results */}
      {!loading && totalRecords === 0 && (dateFrom || dateTo) && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 text-amber-600 flex-shrink-0" />
            <span>
              No records found for the selected date range ({dateFrom || '...'} to {dateTo || '...'}).
              {filterOptions?.date_range?.min && filterOptions?.date_range?.max && (
                <strong className="ml-1 font-semibold">
                  Dataset observations are between {filterOptions.date_range.min} and {filterOptions.date_range.max}.
                </strong>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (filterOptions?.date_range?.min && filterOptions?.date_range?.max) {
                setDateFrom(filterOptions.date_range.min);
                setDateTo(filterOptions.date_range.max);
                fetchData({ date_from: filterOptions.date_range.min, date_to: filterOptions.date_range.max, page: 1 });
              }
            }}
            className="ml-3 px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg font-semibold text-[11px] whitespace-nowrap"
          >
            Show All Dataset Dates
          </button>
        </div>
      )}

      {/* Predictive Forecast Banner when future date is queried */}
      {isPredictedMode && (
        <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl mt-0.5">
              <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-xs text-purple-950 uppercase tracking-wider">
                  Future Date Query: ML Predictive Simulation
                </span>
                <span className="px-2 py-0.5 bg-purple-200/80 text-purple-800 text-[10px] font-bold rounded-full">
                  Forecast Active
                </span>
              </div>
              <p className="text-xs text-purple-800 mt-1 leading-relaxed">
                Dates on or after tomorrow have no historical sensor recordings yet. TrafficMind is displaying{' '}
                <strong>simulated traffic flow predictions</strong> generated by time-series regression models matching historical day-of-week and hourly rhythms.
              </p>
            </div>
          </div>
          <Link
            to="/prediction"
            className="inline-flex items-center self-start sm:self-center px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-xs whitespace-nowrap shadow-xs transition-colors"
          >
            <span>Open Predictive Model</span>
            <Sparkles className="w-3.5 h-3.5 ml-1.5" />
          </Link>
        </div>
      )}

      {/* Summary KPI Cards for active query */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Matching Records"
          value={stats ? stats.total_records.toLocaleString() : totalRecords.toLocaleString()}
          subtitle="Filtered observation points"
          icon={<Database className="w-5 h-5" />}
          color="blue"
        />
        <KpiCard
          title="Filter Avg Volume"
          value={stats ? `${Math.round(stats.avg_volume)} veh/h` : '-'}
          subtitle="Mean density in subset"
          icon={<Activity className="w-5 h-5" />}
          color="amber"
        />
        <KpiCard
          title="Filter Avg Speed"
          value={stats ? `${stats.avg_speed.toFixed(1)} km/h` : '-'}
          subtitle="Mean corridor velocity"
          icon={<Gauge className="w-5 h-5" />}
          color="teal"
        />
      </div>

      {/* Filtered Data Table */}
      <DataTable
        columns={columns}
        data={records}
        loading={loading}
        page={page}
        perPage={perPage}
        total={totalRecords}
        onPageChange={(newPage) => setPage(newPage)}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        emptyMessage="No traffic records match the specified filters."
      />

      {/* GIS Map Visualization (if lat/lon mapped or available) */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-gray-900">Geospatial Sensor Distribution</h3>
          </div>
          <span className="text-xs text-gray-500">
            {geoPoints.length > 0 ? `${geoPoints.length} points plotted` : 'Geocoded markers'}
          </span>
        </div>

        {geoPoints.length > 0 ? (
          <div className="h-96 w-full rounded-xl overflow-hidden border border-gray-200 shadow-inner">
            <MapContainer
              center={mapCenter}
              zoom={12}
              scrollWheelZoom={false}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {geoPoints.map((pt, idx) => {
                const color =
                  pt.congestion === 'High'
                    ? '#ef4444'
                    : pt.congestion === 'Medium'
                    ? '#f59e0b'
                    : '#22c55e';

                return (
                  <CircleMarker
                    key={`map-pt-${idx}`}
                    center={[pt.lat, pt.lng]}
                    radius={8}
                    pathOptions={{
                      color: color,
                      fillColor: color,
                      fillOpacity: 0.8,
                      weight: 2,
                    }}
                  >
                    <LeafletTooltip direction="top" offset={[0, -5]} opacity={1}>
                      <div className="text-xs font-sans">
                        <p className="font-bold text-gray-900">{pt.location}</p>
                        <p className="text-gray-600">Volume: {pt.volume} veh/h</p>
                        <p className="text-gray-600">Speed: {pt.speed} km/h</p>
                        <p className="font-semibold" style={{ color }}>
                          Congestion: {pt.congestion}
                        </p>
                      </div>
                    </LeafletTooltip>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-xs text-gray-500">
            <MapPin className="w-8 h-8 text-gray-300 mb-2" />
            <p className="font-medium text-gray-600">No Geographic Coordinates Mapped</p>
            <p className="text-gray-400 mt-0.5">
              To view GIS circle markers, ensure latitude and longitude columns are mapped in Data Management.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrafficExplorer;
