import React, { useState, useEffect } from 'react';
import { apiService, getDateRange, formatDuration, formatDate } from '../services/api';
import { AgentCallActivity, AgentSummary } from '../types/api';

interface DashboardProps {
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [activities, setActivities] = useState<AgentCallActivity[]>([]);
  const [summaries, setSummaries] = useState<AgentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'activities' | 'summaries'>('activities');

  const fetchData = async () => {
    setLoading(true);
    setError('');

    try {
      const dateRange = getDateRange(7); // Last 7 days
      console.log('Fetching data for date range:', dateRange);
      console.log('Current token available:', apiService.hasValidToken());

      // First, try to fetch summaries (simpler call)
      console.log('Fetching agent summaries...');
      const summariesResponse = await apiService.getAgentSummary({
        From: dateRange.from,
        To: dateRange.to,
        Reach: 2, // All calls (external + internal)
      });

      console.log('Summaries fetch successful:', summariesResponse.data?.length || 0, 'records');
      const summariesData = summariesResponse.data || [];

      // Then try to fetch activities (more complex call)
      console.log('Fetching agent activities...');
      const activitiesResponse = await apiService.getAgentActivity({
        From: dateRange.from,
        To: dateRange.to,
        Take: 500,
      });

      console.log('Activities fetch successful:', activitiesResponse.data?.length || 0, 'records');
      const activitiesData = activitiesResponse.data || [];

      setActivities(activitiesData);
      setSummaries(summariesData);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      
      // More detailed error handling
      if (err instanceof Error) {
        console.error('Error message:', err.message);
        
        // Check if it's an authentication error
        if (err.message.includes('401') || err.message.includes('Authentication expired') || err.message.includes('Bad token')) {
          console.log('Authentication error detected - forcing logout');
          setError('Authentication expired. Please log in again.');
          setTimeout(() => {
            handleLogout();
          }, 2000);
          return;
        }
        
        setError(`Failed to load dashboard data: ${err.message}`);
      } else {
        setError('Failed to load dashboard data: Unknown error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = () => {
    onLogout();
  };

  const forceLogout = () => {
    console.log('Force logout triggered');
    apiService.logout();
    onLogout();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading call data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="rounded-md bg-red-50 p-4 max-w-md">
            <div className="text-sm text-red-700 mb-4">{error}</div>
            <div className="text-xs text-gray-600 mb-4">
              Debug Info: Token available: {apiService.hasValidToken() ? 'Yes' : 'No'}
            </div>
            <div className="space-x-2">
              <button
                onClick={fetchData}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Retry
              </button>
              <button
                onClick={forceLogout}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Force Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Internal Call Dashboard
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Last 7 days
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('activities')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'activities'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Call Activities ({activities.length})
            </button>
            <button
              onClick={() => setActiveTab('summaries')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'summaries'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Agent Summaries ({summaries.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {activeTab === 'activities' ? (
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Recent Call Activities
              </h3>
              {activities.length === 0 ? (
                <p className="text-gray-500">No call activities found for the last 7 days.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date/Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Direction
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Outcome
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Duration
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Department
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {activities.map((activity) => (
                        <tr key={activity.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(activity.occurredAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {activity.contactName || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {activity.contactNumber}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              activity.callDirectionId === 0 
                                ? 'bg-blue-100 text-blue-800' 
                                : activity.callDirectionId === 1
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {activity.callDirectionDescription}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              activity.callAgentOutcomeId === 0 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {activity.callAgentOutcomeDescription}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDuration(activity.totalDuration)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {activity.departmentName || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Agent Summary Statistics
              </h3>
              {summaries.length === 0 ? (
                <p className="text-gray-500">No agent summaries found for the last 7 days.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Agent ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Department ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Inbound Connected
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Outbound Connected
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Connected
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Talk Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {summaries.map((summary, index) => (
                        <tr key={`${summary.accountId}-${index}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {summary.accountId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {summary.departmentId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {summary.inboundConnectedCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {summary.outboundConnectedCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {summary.connectedCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDuration(summary.inboundInCallDuration + summary.outboundInCallDuration)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Refresh Button */}
        <div className="mt-6 text-center">
          <button
            onClick={fetchData}
            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Refresh Data
          </button>
        </div>
      </main>
    </div>
  );
}; 