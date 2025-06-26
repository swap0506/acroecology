import React, { useState } from 'react';

const ModelTraining = ({ onStatusUpdate, preprocessed }) => {
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [hyperparameters, setHyperparameters] = useState({
    max_depth: 6,
    learning_rate: 0.1,
    n_estimators: 100,
    subsample: 0.8,
    colsample_bytree: 0.8
  });

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { message, type, timestamp }]);
  };

  const startTraining = async () => {
    if (!preprocessed) {
      addLog('Please complete data preprocessing first', 'error');
      return;
    }

    setIsTraining(true);
    setProgress(0);
    setLogs([]);
    
    try {
      addLog('Starting XGBoost model training...', 'info');
      
      const response = await fetch('/api/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hyperparameters })
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
            } else if (data.type === 'metrics') {
              setMetrics(data.metrics);
            } else if (data.type === 'complete') {
              addLog('Model training completed successfully!', 'success');
              onStatusUpdate({ 
                trained: true, 
                accuracy: data.accuracy 
              });
            }
          } catch (e) {
            // Ignore JSON parse errors for partial chunks
          }
        }
      }
    } catch (error) {
      addLog(`Error: ${error.message}`, 'error');
    } finally {
      setIsTraining(false);
    }
  };

  const updateHyperparameter = (key, value) => {
    setHyperparameters(prev => ({
      ...prev,
      [key]: parseFloat(value) || value
    }));
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">XGBoost Model Training</h2>
            <p className="text-gray-600 mt-1">Train gradient boosting model on preprocessed data</p>
          </div>
          
          <button
            onClick={startTraining}
            disabled={isTraining || !preprocessed}
            className="btn-primary disabled:opacity-50"
          >
            {isTraining ? (
              <>
                <div className="loading-spinner mr-2"></div>
                Training...
              </>
            ) : (
              'Start Training'
            )}
          </button>
        </div>

        {!preprocessed && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <span className="text-yellow-600 mr-2">⚠️</span>
              <span className="text-yellow-800">Please complete data preprocessing before training the model.</span>
            </div>
          </div>
        )}

        {isTraining && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Training Progress</span>
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

        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="metric-card">
              <div className="metric-value">{(metrics.accuracy * 100).toFixed(1)}%</div>
              <div className="metric-label">Accuracy</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{metrics.precision?.toFixed(3)}</div>
              <div className="metric-label">Precision</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{metrics.recall?.toFixed(3)}</div>
              <div className="metric-label">Recall</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{metrics.f1_score?.toFixed(3)}</div>
              <div className="metric-label">F1 Score</div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Hyperparameters</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Depth
              </label>
              <input
                type="number"
                value={hyperparameters.max_depth}
                onChange={(e) => updateHyperparameter('max_depth', e.target.value)}
                className="input"
                min="1"
                max="20"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Learning Rate
              </label>
              <input
                type="number"
                value={hyperparameters.learning_rate}
                onChange={(e) => updateHyperparameter('learning_rate', e.target.value)}
                className="input"
                min="0.01"
                max="1"
                step="0.01"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                N Estimators
              </label>
              <input
                type="number"
                value={hyperparameters.n_estimators}
                onChange={(e) => updateHyperparameter('n_estimators', e.target.value)}
                className="input"
                min="10"
                max="1000"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subsample
              </label>
              <input
                type="number"
                value={hyperparameters.subsample}
                onChange={(e) => updateHyperparameter('subsample', e.target.value)}
                className="input"
                min="0.1"
                max="1"
                step="0.1"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Column Sample by Tree
              </label>
              <input
                type="number"
                value={hyperparameters.colsample_bytree}
                onChange={(e) => updateHyperparameter('colsample_bytree', e.target.value)}
                className="input"
                min="0.1"
                max="1"
                step="0.1"
              />
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Training Logs</h3>
          <div className="bg-gray-50 rounded-lg p-4 max-h-80 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500 text-sm">No logs yet. Start training to see progress.</p>
            ) : (
              <div className="space-y-2">
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelTraining;