import React, { useState, useEffect } from 'react';
import DataPreprocessing from './components/DataPreprocessing';
import ModelTraining from './components/ModelTraining';
import ModelPrediction from './components/ModelPrediction';
import DataVisualization from './components/DataVisualization';
import Header from './components/Header';
import Navigation from './components/Navigation';

function App() {
  const [activeTab, setActiveTab] = useState('preprocessing');
  const [modelStatus, setModelStatus] = useState({
    preprocessed: false,
    trained: false,
    accuracy: null
  });

  const [dataStats, setDataStats] = useState(null);

  useEffect(() => {
    // Check model status on load
    checkModelStatus();
  }, []);

  const checkModelStatus = async () => {
    try {
      const response = await fetch('/api/model/status');
      const status = await response.json();
      setModelStatus(status);
    } catch (error) {
      console.error('Error checking model status:', error);
    }
  };

  const updateModelStatus = (newStatus) => {
    setModelStatus(prev => ({ ...prev, ...newStatus }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header modelStatus={modelStatus} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <div className="mt-8">
          {activeTab === 'preprocessing' && (
            <DataPreprocessing 
              onStatusUpdate={updateModelStatus}
              onDataStats={setDataStats}
            />
          )}
          
          {activeTab === 'training' && (
            <ModelTraining 
              onStatusUpdate={updateModelStatus}
              preprocessed={modelStatus.preprocessed}
            />
          )}
          
          {activeTab === 'prediction' && (
            <ModelPrediction 
              trained={modelStatus.trained}
            />
          )}
          
          {activeTab === 'visualization' && (
            <DataVisualization 
              dataStats={dataStats}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;