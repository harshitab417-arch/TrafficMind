import React, { useState, useEffect } from 'react';
import { Check, Save, Loader2, Sparkles, RefreshCw } from 'lucide-react';

export interface ColumnMapperProps {
  datasetId: string;
  detectedColumns: string[];
  initialMapping?: Record<string, string>;
  onSave: (mapping: Record<string, string>) => Promise<void>;
  isLoading?: boolean;
}

interface StandardField {
  key: string;
  label: string;
  required: boolean;
  aliases: string[];
  description: string;
}

const STANDARD_FIELDS: StandardField[] = [
  {
    key: 'timestamp',
    label: 'Timestamp',
    required: false,
    aliases: ['timestamp', 'datetime', 'date_time', 'time_stamp', 'record_time'],
    description: 'ISO or standard timestamp string (e.g. 2024-01-01 08:00:00)',
  },
  {
    key: 'date',
    label: 'Date',
    required: false,
    aliases: ['date', 'record_date', 'day', 'dt'],
    description: 'Calendar date (YYYY-MM-DD)',
  },
  {
    key: 'time',
    label: 'Time / Hour',
    required: false,
    aliases: ['time', 'hour', 'time_of_day', 'minute'],
    description: 'Time string (HH:MM) or hour of day (0-23)',
  },
  {
    key: 'location_name',
    label: 'Location Name',
    required: true,
    aliases: ['location', 'location_name', 'junction', 'intersection', 'road_name', 'street', 'station'],
    description: 'Intersection, road, or sensor point name',
  },
  {
    key: 'location_id',
    label: 'Location / Sensor ID',
    required: false,
    aliases: ['location_id', 'sensor_id', 'junction_id', 'id', 'station_id'],
    description: 'Identifier for sensor or detector',
  },
  {
    key: 'latitude',
    label: 'Latitude',
    required: false,
    aliases: ['lat', 'latitude', 'y_coord', 'gps_lat'],
    description: 'GPS Latitude for GIS mapping',
  },
  {
    key: 'longitude',
    label: 'Longitude',
    required: false,
    aliases: ['lon', 'lng', 'longitude', 'x_coord', 'gps_lon'],
    description: 'GPS Longitude for GIS mapping',
  },
  {
    key: 'traffic_volume',
    label: 'Traffic Volume',
    required: true,
    aliases: ['traffic_volume', 'volume', 'vehicle_count', 'flow', 'cars', 'vehicles'],
    description: 'Count of vehicles or traffic flow rate',
  },
  {
    key: 'average_speed',
    label: 'Average Speed',
    required: true,
    aliases: ['average_speed', 'speed', 'avg_speed', 'velocity', 'mean_speed'],
    description: 'Average traffic speed (km/h or mph)',
  },
  {
    key: 'congestion_level',
    label: 'Congestion Level',
    required: false,
    aliases: ['congestion_level', 'congestion', 'traffic_level', 'status', 'level'],
    description: 'Target categorical (Low, Medium, High). Auto-derived if missing.',
  },
  {
    key: 'weather_condition',
    label: 'Weather Condition',
    required: false,
    aliases: ['weather', 'weather_condition', 'climate', 'condition', 'weather_type'],
    description: 'Weather at time of observation (e.g. Clear, Rain, Fog)',
  },
  {
    key: 'road_type',
    label: 'Road Type',
    required: false,
    aliases: ['road_type', 'road_class', 'highway_type', 'street_type'],
    description: 'Arterial, Highway, Collector, Local',
  },
  {
    key: 'day_of_week',
    label: 'Day of Week',
    required: false,
    aliases: ['day_of_week', 'weekday', 'day_name', 'dow'],
    description: 'Monday-Sunday or weekday index',
  },
];

export const ColumnMapper: React.FC<ColumnMapperProps> = ({
  detectedColumns,
  initialMapping = {},
  onSave,
  isLoading = false,
}) => {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Auto-suggest mapping based on aliases and exact names
  const autoMapColumns = () => {
    const newMapping: Record<string, string> = { ...initialMapping };

    STANDARD_FIELDS.forEach((field) => {
      if (!newMapping[field.key]) {
        // Look for match
        const match = detectedColumns.find((col) => {
          const colClean = col.toLowerCase().replace(/[^a-z0-9]/g, '');
          return field.aliases.some((alias) => alias.replace(/[^a-z0-9]/g, '') === colClean);
        });
        if (match) {
          newMapping[field.key] = match;
        }
      }
    });

    setMapping(newMapping);
  };

  useEffect(() => {
    if (Object.keys(initialMapping).length > 0) {
      setMapping(initialMapping);
    } else {
      autoMapColumns();
    }
  }, [detectedColumns, initialMapping]);

  const handleFieldChange = (standardKey: string, selectedCsvCol: string) => {
    setMapping((prev) => {
      const updated = { ...prev };
      if (!selectedCsvCol || selectedCsvCol === '__unmapped__') {
        delete updated[standardKey];
      } else {
        updated[standardKey] = selectedCsvCol;
      }
      return updated;
    });
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    try {
      await onSave(mapping);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveSuccess(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-200 mb-6 gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Dataset Schema & Column Mapping</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Map detected CSV columns to TrafficMind standard analytical dimensions for processing.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={autoMapColumns}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
            Auto-Detect
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg shadow-sm transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5 text-white" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Save Mapping
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {STANDARD_FIELDS.map((field) => {
          const selectedCol = mapping[field.key] || '__unmapped__';
          const isMapped = selectedCol !== '__unmapped__';

          return (
            <div
              key={field.key}
              className={`p-3.5 rounded-lg border transition-colors ${
                isMapped
                  ? 'border-blue-200 bg-blue-50/20'
                  : field.required
                  ? 'border-amber-200 bg-amber-50/20'
                  : 'border-gray-200 bg-gray-50/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-semibold text-gray-800">{field.label}</span>
                  {field.required && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.2 rounded font-medium">
                      Recommended
                    </span>
                  )}
                </div>
                {isMapped && (
                  <span className="text-[10px] text-green-700 font-semibold bg-green-100 px-1.5 py-0.5 rounded flex items-center">
                    <Check className="w-3 h-3 mr-0.5" /> Mapped
                  </span>
                )}
              </div>

              <p className="text-[11px] text-gray-500 mb-2">{field.description}</p>

              <select
                value={selectedCol}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                className="w-full text-xs bg-white border border-gray-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700"
              >
                <option value="__unmapped__">-- Not mapped --</option>
                {detectedColumns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ColumnMapper;
