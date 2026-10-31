import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DatasetProvider } from './hooks/useDataset';
import MainLayout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import Overview from './pages/Overview';
import TrafficExplorer from './pages/TrafficExplorer';
import DataManagement from './pages/DataManagement';
import OlapAnalytics from './pages/OlapAnalytics';
import AssociationMining from './pages/AssociationMining';
import ClusteringAnalysis from './pages/ClusteringAnalysis';
import CongestionClassification from './pages/CongestionClassification';
import TrafficPrediction from './pages/TrafficPrediction';
import OutlierDetection from './pages/OutlierDetection';
import ModelEvaluation from './pages/ModelEvaluation';

export const App: React.FC = () => {
  return (
    <DatasetProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Overview />} />
              <Route path="explorer" element={<TrafficExplorer />} />
              <Route path="data" element={<DataManagement />} />
              <Route path="olap" element={<OlapAnalytics />} />
              <Route path="association" element={<AssociationMining />} />
              <Route path="clustering" element={<ClusteringAnalysis />} />
              <Route path="classification" element={<CongestionClassification />} />
              <Route path="prediction" element={<TrafficPrediction />} />
              <Route path="outliers" element={<OutlierDetection />} />
              <Route path="evaluation" element={<ModelEvaluation />} />
              {/* Fallback redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </DatasetProvider>
  );
};

export default App;
