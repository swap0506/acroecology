import React from 'react';

const Header = ({ modelStatus }) => {
  return (
    <header className="gradient-bg text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">FAOSTAT ML Pipeline</h1>
            <p className="text-blue-100 mt-1">Advanced Agricultural Data Analysis with XGBoost</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="glass-effect rounded-lg px-4 py-2">
              <div className="flex items-center space-x-3">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${
                    modelStatus.preprocessed ? 'bg-green-400' : 'bg-gray-400'
                  }`}></div>
                  <span className="text-sm">Preprocessed</span>
                </div>
                
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${
                    modelStatus.trained ? 'bg-green-400' : 'bg-gray-400'
                  }`}></div>
                  <span className="text-sm">Trained</span>
                </div>
                
                {modelStatus.accuracy && (
                  <div className="text-sm font-medium">
                    Accuracy: {(modelStatus.accuracy * 100).toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;