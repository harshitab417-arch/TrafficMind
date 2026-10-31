import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Dataset } from '../types/api';
import { getDatasets, getActiveDataset, activateDataset as apiActivateDataset } from '../services/api';

interface DatasetContextType {
  activeDataset: Dataset | null;
  datasets: Dataset[];
  isLoading: boolean;
  error: string | null;
  setActiveDataset: (dataset: Dataset | null) => void;
  selectAndActivateDataset: (id: string) => Promise<void>;
  refreshDatasets: () => Promise<void>;
}

const DatasetContext = createContext<DatasetContextType | undefined>(undefined);

export const DatasetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeDataset, setActiveDataset] = useState<Dataset | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshDatasets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [datasetList, active] = await Promise.allSettled([
        getDatasets(),
        getActiveDataset(),
      ]);

      let loadedDatasets: Dataset[] = [];
      if (datasetList.status === 'fulfilled') {
        loadedDatasets = datasetList.value || [];
        setDatasets(loadedDatasets);
      }

      if (active.status === 'fulfilled' && active.value) {
        setActiveDataset(active.value);
      } else if (loadedDatasets.length > 0) {
        // Fallback to active flagged or first dataset
        const flagged = loadedDatasets.find((d) => d.is_active);
        setActiveDataset(flagged || loadedDatasets[0]);
      } else {
        setActiveDataset(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch datasets');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectAndActivateDataset = async (id: string) => {
    setIsLoading(true);
    try {
      const activated = await apiActivateDataset(id);
      setActiveDataset(activated);
      await refreshDatasets();
    } catch (err: any) {
      setError(err?.message || 'Failed to activate dataset');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshDatasets();
  }, [refreshDatasets]);

  return (
    <DatasetContext.Provider
      value={{
        activeDataset,
        datasets,
        isLoading,
        error,
        setActiveDataset,
        selectAndActivateDataset,
        refreshDatasets,
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
};

export const useDataset = (): DatasetContextType => {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error('useDataset must be used within a DatasetProvider');
  }
  return context;
};
