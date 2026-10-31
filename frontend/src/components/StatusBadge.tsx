import React from 'react';

export interface StatusBadgeProps {
  status: 'Low' | 'Medium' | 'High' | 'active' | 'raw' | 'preprocessed' | 'ready' | string;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className = '',
}) => {
  const normalized = String(status || '').toLowerCase();

  let badgeColor = 'bg-gray-100 text-gray-800 border-gray-200';

  if (normalized === 'low' || normalized === 'active' || normalized === 'ready' || normalized === 'success') {
    badgeColor = 'bg-green-50 text-green-700 border-green-200';
  } else if (normalized === 'medium' || normalized === 'preprocessed' || normalized === 'warning') {
    badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (normalized === 'high' || normalized === 'error' || normalized === 'failed') {
    badgeColor = 'bg-red-50 text-red-700 border-red-200';
  } else if (normalized === 'raw' || normalized === 'info') {
    badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${badgeColor} ${sizeClasses} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 mr-1.5 rounded-full ${
          normalized === 'low' || normalized === 'active' || normalized === 'ready'
            ? 'bg-green-500'
            : normalized === 'medium' || normalized === 'preprocessed'
            ? 'bg-amber-500'
            : normalized === 'high' || normalized === 'error'
            ? 'bg-red-500'
            : 'bg-blue-500'
        }`}
      />
      {status}
    </span>
  );
};

export default StatusBadge;
