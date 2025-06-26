import React, { useState } from 'react';

const ModelPrediction = ({ trained }) => {
  const [inputData, setInputData] = useState({});
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [availableFeatures, setAvailableFeatures] = useState([]);

  React.useEffect(() => {
    if (trained) {
      fetchFeatures();
    }
  }, [trained]);

  const fetchFeatures = async () => {
    try {
      const response = await fetch('/api/features');
      const features = await response.json();
      setAvailableFeatures(features);
      
      // Initialize input data with default values
      const defaultData = {};
      features.forEach(feature => {
        defaultData[feature.name] = feature.default || '';
      });
      setInputData(defaultData);
    } catch (error) {
      console.error('Error fetching features:', error);
    }
  };

  const makePrediction = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: inputData })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setPrediction(result);
    } catch (error) {
      console.error('Error making prediction:', error);
      setPrediction({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const updateInput = (feature, value) => {
    setInputData(prev => ({
      ...prev,
      [feature]: value
    }));
  };

  if (!trained) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Model Not Ready</h2>
          <p className="text-gray-600 mb-6">Please complete preprocessing and training first.</p>
          <div className="flex justify-center space-x-4">
            <span className="status-warning">Preprocessing Required</span>
            <span className="status-warning">Training Required</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Model Predictions</h2>
            <p className="text-gray-600 mt-1">Make predictions using the trained XGBoost model</p>
          </div>
          
          <button
            onClick={makePrediction}
            disabled={isLoading}
            className="btn-primary disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="loading-spinner mr-2"></div>
                Predicting...
              </>
            ) : (
              'Make Prediction'
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Input Features</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {availableFeatures.map((feature, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {feature.name}
                    {feature.description && (
                      <span className="text-gray-500 text-xs ml-1">
                        ({feature.description})
                      </span>
                    )}
                  </label>
                  
                  {feature.type === 'categorical' ? (
                    <select
                      value={inputData[feature.name] || ''}
                      onChange={(e) => updateInput(feature.name, e.target.value)}
                      className="select"
                    >
                      <option value="">Select {feature.name}</option>
                      {feature.options?.map((option, idx) => (
                        <option key={idx} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={feature.type === 'numerical' ? 'number' : 'text'}
                      value={inputData[feature.name] || ''}
                      onChange={(e) => updateInput(feature.name, e.target.value)}
                      className="input"
                      placeholder={feature.placeholder || `Enter ${feature.name}`}
                      step={feature.type === 'numerical' ? 'any' : undefined}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Prediction Results</h3>
            
            {prediction ? (
              <div className="space-y-4">
                {prediction.error ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <span className="text-red-600 mr-2">❌</span>
                      <span className="text-red-800">{prediction.error}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600 mb-2">
                          {prediction.prediction}
                        </div>
                        <div className="text-sm text-green-700">
                          Predicted Value
                        </div>
                      </div>
                    </div>

                    {prediction.confidence && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-blue-700">
                            Confidence Score
                          </span>
                          <span className="text-sm text-blue-600">
                            {(prediction.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${prediction.confidence * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {prediction.feature_importance && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">
                          Feature Importance
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(prediction.feature_importance)
                            .sort(([,a], [,b]) => b - a)
                            .slice(0, 5)
                            .map(([feature, importance], idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <span className="text-xs text-gray-600">{feature}</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-16 bg-gray-200 rounded-full h-1">
                                  <div
                                    className="bg-primary-600 h-1 rounded-full"
                                    style={{ width: `${importance * 100}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-500 w-8">
                                  {(importance * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <div className="text-4xl mb-4">🎯</div>
                <p className="text-gray-600">
                  Fill in the features and click "Make Prediction" to see results
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Batch Predictions</h3>
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <div className="text-2xl mb-2">📊</div>
          <p className="text-gray-600 mb-4">
            Upload a CSV file to make predictions on multiple records
          </p>
          <input
            type="file"
            accept=".csv"
            className="hidden"
            id="batch-upload"
            onChange={(e) => {
              // Handle batch prediction file upload
              console.log('Batch file:', e.target.files[0]);
            }}
          />
          <label
            htmlFor="batch-upload"
            className="btn-secondary cursor-pointer"
          >
            Upload CSV File
          </label>
        </div>
      </div>
    </div>
  );
};

export default ModelPrediction;