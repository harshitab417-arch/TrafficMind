import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  page?: number;
  perPage?: number;
  total?: number;
  onPageChange?: (newPage: number) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (field: string) => void;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  page = 1,
  perPage = 10,
  total,
  onPageChange,
  sortBy,
  sortOrder,
  onSortChange,
  emptyMessage = 'No records found',
  onRowClick,
}: DataTableProps<T>) {
  const totalRecords = total !== undefined ? total : data.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / perPage));

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50/75">
            <tr>
              {columns.map((col) => {
                const isSorted = sortBy === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={`px-4 py-3.5 text-xs font-semibold text-gray-700 tracking-wider uppercase ${
                      col.sortable ? 'cursor-pointer select-none hover:bg-gray-100' : ''
                    } ${col.className || ''}`}
                    onClick={() => {
                      if (col.sortable && onSortChange) {
                        onSortChange(col.key);
                      }
                    }}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{col.label}</span>
                      {col.sortable && (
                        <span className="text-gray-400">
                          {isSorted ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                            )
                          ) : (
                            <ChevronsUpDown className="w-3.5 h-3.5 opacity-50" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              // Loading Skeleton
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} className="animate-pulse">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3.5">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-sm font-medium">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={row.id || rowIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors duration-150 hover:bg-slate-50/80 ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-gray-800 ${col.className || ''}`}>
                      {col.render ? col.render(row[col.key], row) : (row[col.key] !== undefined && row[col.key] !== null ? String(row[col.key]) : '-')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {(onPageChange || totalRecords > perPage) && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="text-xs text-gray-600">
            Showing <span className="font-semibold text-gray-900">{Math.min((page - 1) * perPage + 1, totalRecords)}</span> to{' '}
            <span className="font-semibold text-gray-900">{Math.min(page * perPage, totalRecords)}</span> of{' '}
            <span className="font-semibold text-gray-900">{totalRecords}</span> entries
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPageChange && onPageChange(page - 1)}
              disabled={page <= 1 || loading}
              className="inline-flex items-center rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4 mr-0.5" />
              Prev
            </button>
            <span className="text-xs font-medium text-gray-700 px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange && onPageChange(page + 1)}
              disabled={page >= totalPages || loading}
              className="inline-flex items-center rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
