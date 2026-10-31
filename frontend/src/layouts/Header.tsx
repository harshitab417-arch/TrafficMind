import React, { useState, useEffect } from 'react';
import { Menu, Database, ChevronDown, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useDataset } from '../hooks/useDataset';
import { checkHealth } from '../services/api';

interface HeaderProps {
  onOpenSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSidebar }) => {
  const { activeDataset, datasets, selectAndActivateDataset, isLoading: datasetLoading, refreshDatasets } = useDataset();
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(false);

  // Poll backend health check
  useEffect(() => {
    let mounted = true;
    const verifyHealth = async () => {
      try {
        await checkHealth();
        if (mounted) setBackendConnected(true);
      } catch {
        if (mounted) setBackendConnected(false);
      }
    };

    verifyHealth();
    const interval = setInterval(verifyHealth, 15000); // Check every 15s

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 shadow-xs flex items-center justify-between px-4 sm:px-6">
      {/* Left: Mobile hamburger & breadcrumb or title */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenSidebar}
          className="p-2 text-gray-600 rounded-lg lg:hidden hover:bg-gray-100 focus:outline-none"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center space-x-2 text-xs">
          <span className="font-semibold text-gray-500 uppercase tracking-wider">Workspace:</span>
          <span className="font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
            Traffic Intelligence & Mining
          </span>
        </div>
      </div>

      {/* Right: Dataset selector & Backend Status & User */}
      <div className="flex items-center space-x-3 sm:space-x-5">
        {/* Backend health status indicator */}
        <div
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 border border-gray-200"
          title={
            backendConnected === true
              ? 'Backend API Connected (http://localhost:5000)'
              : backendConnected === false
              ? 'Backend API Disconnected'
              : 'Checking Backend connection...'
          }
        >
          <span
            className={`w-2 h-2 rounded-full ${
              backendConnected === true
                ? 'bg-green-500'
                : backendConnected === false
                ? 'bg-red-500'
                : 'bg-amber-400 animate-pulse'
            }`}
          />
          <span className="hidden md:inline text-gray-600">
            {backendConnected === true
              ? 'API Online'
              : backendConnected === false
              ? 'API Offline'
              : 'Connecting...'}
          </span>
        </div>

        {/* Dataset Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsSelectorOpen(!isSelectorOpen)}
            className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-2xs hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Database className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div className="text-left max-w-[130px] sm:max-w-[180px] truncate">
              {activeDataset ? (
                <span className="font-semibold text-gray-900">{activeDataset.name}</span>
              ) : (
                <span className="text-gray-400">Select Dataset</span>
              )}
            </div>
            {activeDataset && (
              <span className="hidden sm:inline-block bg-blue-50 text-blue-700 font-semibold px-1.5 py-0.2 rounded text-[10px]">
                {activeDataset.record_count?.toLocaleString() || activeDataset.row_count?.toLocaleString() || 0} rows
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {/* Dropdown Menu */}
          {isSelectorOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 pb-2 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Available Datasets
                </span>
                <button
                  onClick={() => refreshDatasets()}
                  className="p-1 text-gray-400 hover:text-gray-700 rounded"
                  title="Refresh datasets"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${datasetLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto py-1">
                {datasets.length === 0 ? (
                  <div className="p-3 text-center text-xs text-gray-500">
                    No datasets loaded yet.
                  </div>
                ) : (
                  datasets.map((ds) => {
                    const isSelected = activeDataset?.id === ds.id;
                    return (
                      <button
                        key={ds.id}
                        type="button"
                        onClick={async () => {
                          setIsSelectorOpen(false);
                          if (!isSelected) {
                            await selectAndActivateDataset(ds.id);
                          }
                        }}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-blue-50/70 transition-colors ${
                          isSelected ? 'bg-blue-50 text-blue-900 font-semibold' : 'text-gray-700'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <p className="text-xs truncate">{ds.name}</p>
                          <p className="text-[10px] text-gray-400">
                            {ds.record_count?.toLocaleString() || ds.row_count?.toLocaleString() || 0} rows • {ds.status}
                          </p>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs ring-2 ring-gray-100">
            U
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
