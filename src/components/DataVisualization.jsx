import React, { useState, useEffect } from 'react';

const DataVisualization = ({ dataStats }) => {
  const [charts, setCharts] = useState([]);
  const [selectedChart, setSelectedChart] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (dataStats) {
      loadCharts();
    }
  }, [dataStats]);

  const loadCharts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/visualizations');
      const chartData = await response.json();
      setCharts(chartData);
    } catch (error) {
      console.error('Error loading charts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const chartTypes = [
    { id: 'overview', name: 'Data Overview', icon: '📊' },
    { id: 'distribution', name: 'Feature Distribution', icon: '📈' },
    { id: 'correlation', name: 'Correlation Matrix', icon: '🔗' },
    { id: 'trends', name: 'Time Trends', icon: '📉' },
    { id: 'geographic', name: 'Geographic Analysis', icon: '🌍' }
  ];

  if (!dataStats) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Data Available</h2>
          <p className="text-gray-600">Please complete data preprocessing to view visualizations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Data Visualizations</h2>
            <p className="text-gray-600 mt-1">Explore and analyze your FAOSTAT data</p>
          </div>
          
          <button
            onClick={loadCharts}
            disabled={isLoading}
            className="btn-primary disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="loading-spinner mr-2"></div>
                Loading...
              </>
            ) : (
              'Refresh Charts'
            )}
          </button>
        </div>

        <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
          {chartTypes.map((chart) => (
            <button
              key={chart.id}
              onClick={() => setSelectedChart(chart.id)}
              className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                selectedChart === chart.id
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="mr-2">{chart.icon}</span>
              {chart.name}
            </button>
          ))}
        </div>

        <div className="min-h-96">
          {selectedChart === 'overview' && (
            <DataOverview dataStats={dataStats} />
          )}
          
          {selectedChart === 'distribution' && (
            <FeatureDistribution />
          )}
          
          {selectedChart === 'correlation' && (
            <CorrelationMatrix />
          )}
          
          {selectedChart === 'trends' && (
            <TimeTrends />
          )}
          
          {selectedChart === 'geographic' && (
            <GeographicAnalysis />
          )}
        </div>
      </div>
    </div>
  );
};

const DataOverview = ({ dataStats }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="metric-card">
          <div className="metric-value">{dataStats.totalRecords?.toLocaleString()}</div>
          <div className="metric-label">Total Records</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{dataStats.features}</div>
          <div className="metric-label">Features</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{dataStats.countries}</div>
          <div className="metric-label">Countries</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{dataStats.years}</div>
          <div className="metric-label">Year Range</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="text-lg font-semibold mb-4">Data Quality Summary</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Completeness</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
                <span className="text-sm font-medium">85%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Consistency</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                </div>
                <span className="text-sm font-medium">92%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Accuracy</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '88%' }}></div>
                </div>
                <span className="text-sm font-medium">88%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="text-lg font-semibold mb-4">Top Categories</h4>
          <div className="space-y-3">
            {[
              { name: 'Cereals', count: 1250, percentage: 35 },
              { name: 'Livestock', count: 890, percentage: 25 },
              { name: 'Fruits', count: 670, percentage: 19 },
              { name: 'Vegetables', count: 450, percentage: 13 },
              { name: 'Other', count: 290, percentage: 8 }
            ].map((category, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{category.name}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-500 h-2 rounded-full" 
                      style={{ width: `${category.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium w-12">{category.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureDistribution = () => {
  return (
    <div className="bg-gray-50 rounded-lg p-8 text-center">
      <div className="text-4xl mb-4">📈</div>
      <h3 className="text-lg font-semibold mb-2">Feature Distribution Charts</h3>
      <p className="text-gray-600">
        Interactive distribution charts will be displayed here after data processing
      </p>
    </div>
  );
};

const CorrelationMatrix = () => {
  return (
    <div className="bg-gray-50 rounded-lg p-8 text-center">
      <div className="text-4xl mb-4">🔗</div>
      <h3 className="text-lg font-semibold mb-2">Correlation Matrix</h3>
      <p className="text-gray-600">
        Feature correlation heatmap will be displayed here
      </p>
    </div>
  );
};

const TimeTrends = () => {
  return (
    <div className="bg-gray-50 rounded-lg p-8 text-center">
      <div className="text-4xl mb-4">📉</div>
      <h3 className="text-lg font-semibold mb-2">Time Series Analysis</h3>
      <p className="text-gray-600">
        Temporal trends and patterns will be visualized here
      </p>
    </div>
  );
};

const GeographicAnalysis = () => {
  return (
    <div className="bg-gray-50 rounded-lg p-8 text-center">
      <div className="text-4xl mb-4">🌍</div>
      <h3 className="text-lg font-semibold mb-2">Geographic Distribution</h3>
      <p className="text-gray-600">
        World map with data distribution will be shown here
      </p>
    </div>
  );
};

export default DataVisualization;