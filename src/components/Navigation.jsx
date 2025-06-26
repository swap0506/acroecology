import React from 'react';

const Navigation = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'preprocessing', name: 'Data Preprocessing', icon: '🔧' },
    { id: 'training', name: 'Model Training', icon: '🤖' },
    { id: 'prediction', name: 'Predictions', icon: '🎯' },
    { id: 'visualization', name: 'Visualizations', icon: '📊' }
  ];

  return (
    <nav className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="flex space-x-1 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.name}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;