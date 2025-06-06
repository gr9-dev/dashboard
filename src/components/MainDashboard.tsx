import React, { useState } from 'react';
import { Charts } from './Charts';
import { Dashboard } from './Dashboard';
import { Legacy } from './Legacy';

interface MainDashboardProps {
  onLogout: () => void;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({ onLogout }) => {
  const [activeView, setActiveView] = useState<'charts' | 'legacy' | 'tables'>('legacy');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveView('charts')}
                className={`py-2 px-4 rounded-md font-medium text-sm transition-colors ${
                  activeView === 'charts'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                📊 Analytics & Charts
              </button>
              <button
                onClick={() => setActiveView('legacy')}
                className={`py-2 px-4 rounded-md font-medium text-sm transition-colors ${
                  activeView === 'legacy'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                📈 Legacy View
              </button>
              <button
                onClick={() => setActiveView('tables')}
                className={`py-2 px-4 rounded-md font-medium text-sm transition-colors ${
                  activeView === 'tables'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                📋 Data Tables
              </button>
            </div>
            <div className="text-sm text-gray-500">
              CloudCall Dashboard - Phase 2
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      {activeView === 'charts' ? (
        <Charts onLogout={onLogout} />
      ) : activeView === 'legacy' ? (
        <Legacy onLogout={onLogout} />
      ) : (
        <Dashboard onLogout={onLogout} />
      )}
    </div>
  );
}; 