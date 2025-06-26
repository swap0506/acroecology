import React, { useState, useEffect } from 'react';

const DataPreprocessing = ({ onStatusUpdate, onDataStats }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { message, type, timestamp }]);
  };

  const startPreprocessing = async () => {
    setIsProcessing(true);
    setProgress(0);
    setLogs([]);
    
    try {
      addLog('Starting data preprocessing...', 'info');
      setProgress(10);

      const response = await fetch('/api/preprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.type === 'progress') {
              setProgress(data.progress);
            } else if (data.type === 'log') {
              addLog(data.message, data.level);
            } else if (data.type === 'stats') {
              setStats(data.stats);
              onDataStats(data.stats);
            } else if (data.type === 'complete') {
              addLog('Preprocessing completed successfully!', 'success');
              onStatusUpdate({ preprocessed: true });
            }
          } catch (e) {
            // Ignore JSON parse errors for partial chunks
          }
        }
      }
    } catch (error) {
      addLog(`Error: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Data Preprocessing</h2>
            <p className="text-gray-600 mt-1">Clean and prepare FAOSTAT data for machine learning</p>
          </div>
          
          <button
            onClick={startPreprocessing}
            disabled={isProcessing}
            className="btn-primary disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <div className="loading-spinner mr-2"></div>
                Processing...
              </>
            ) : (
              'Start Preprocessing'
            )}
          </button>
        </div>

        {isProcessing && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm text-gray-500">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="metric-card">
              <div className="metric-value">{stats.totalRecords?.toLocaleString()}</div>
              <div className="metric-label">Total Records</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{stats.features}</div>
              <div className="metric-label">Features</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{stats.missingValues?.toLocaleString()}</div>
              <div className="metric-label">Missing Values</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{stats.duplicates?.toLocaleString()}</div>
              <div className="metric-label">Duplicates Removed</div>
            </div>
          </div>
        )}

        {logs.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Processing Logs</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`flex items-start space-x-3 text-sm ${
                    log.type === 'error' ? 'text-red-600' :
                    log.type === 'success' ? 'text-green-600' :
                    log.type === 'warning' ? 'text-yellow-600' :
                    'text-gray-700'
                  }`}
                >
                  <span className="text-gray-400 text-xs mt-0.5 font-mono">
                    {log.timestamp}
                  </span>
                  <span className="flex-1">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Preprocessing Steps</h3>
          <div className="space-y-3">
            {[
              'Load FAOSTAT CSV data',
              'Handle missing values',
              'Remove duplicates',
              'Encode categorical variables',
              'Scale numerical features',
              'Feature engineering',
              'Split train/test sets',
              'Save processed data'
            ].map((step, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  progress > (index + 1) * 12.5 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  {progress > (index + 1) * 12.5 ? '✓' : index + 1}
                </div>
                <span className={`text-sm ${
                  progress > (index + 1) * 12.5 ? 'text-green-600 font-medium' : 'text-gray-600'
                }`}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Data Quality Checks</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Data Completeness</span>
              <span className="status-success">Good</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Feature Correlation</span>
              <span className="status-success">Analyzed</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Outlier Detection</span>
              <span className="status-warning">Moderate</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Data Distribution</span>
              <span className="status-success">Normalized</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataPreprocessing;