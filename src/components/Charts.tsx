import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatDuration } from '../services/api';
import { lookupService } from '../services/lookupService';
import { AgentCallActivity, AgentSummary } from '../types/api';

interface ChartsProps {
  onLogout: () => void;
}

export const Charts: React.FC<ChartsProps> = ({ onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [lookupReady, setLookupReady] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError('');

    try {
      // Build lookup tables first - this fetches monthly data
      await lookupService.buildLookupTables();
      setLookupReady(lookupService.isReady());
      
      const lookupStats = lookupService.getStats();
      console.log('Charts - Monthly data loaded:', lookupStats);

    } catch (err) {
      console.error('Failed to fetch chart data:', err);
      if (err instanceof Error) {
        if (err.message.includes('401') || err.message.includes('Authentication expired') || err.message.includes('Bad token')) {
          setError('Authentication expired. Please log in again.');
          setTimeout(() => onLogout(), 2000);
          return;
        }
        setError(`Failed to load chart data: ${err.message}`);
      } else {
        setError('Failed to load chart data: Unknown error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get available departments from lookup service
  const departments = React.useMemo(() => {
    if (lookupReady) {
      return lookupService.getAllDepartments().map(dept => dept.name);
    }
    return [];
  }, [lookupReady]);

  // Prepare pie chart data for agent call times using monthly data
  const pieChartData = React.useMemo(() => {
    if (!lookupReady) return [];

    // Get monthly data from lookup service
    const monthlyActivities = lookupService.getMonthlyActivities();
    const monthlySummaries = lookupService.getMonthlySummaries();

    // Create agent map from activities for better name resolution
    const agentMap = new Map<number, { name: string, totalTime: number, department: string }>();

    monthlyActivities.forEach(activity => {
      if (activity.accountNumber) {
        const agentId = parseInt(activity.accountNumber);
        const agentName = lookupService.getAgentName(agentId);
        const department = activity.departmentId 
          ? lookupService.getDepartmentName(activity.departmentId)
          : activity.departmentName || 'Unknown';
        
        if (!isNaN(agentId)) {
          if (!agentMap.has(agentId)) {
            agentMap.set(agentId, { name: agentName, totalTime: 0, department });
          }
          const agent = agentMap.get(agentId)!;
          agent.totalTime += activity.talkTime || 0;
        }
      }
    });

    // Add summary data for agents not in activities
    monthlySummaries.forEach(summary => {
      if (!agentMap.has(summary.accountId)) {
        const agentName = lookupService.getAgentName(summary.accountId);
        const department = summary.departmentId 
          ? lookupService.getDepartmentName(summary.departmentId)
          : 'Unknown';

        agentMap.set(summary.accountId, {
          name: agentName,
          totalTime: summary.inboundInCallDuration + summary.outboundInCallDuration,
          department
        });
      } else {
        // Update with summary data if more comprehensive
        const agent = agentMap.get(summary.accountId)!;
        const summaryTime = summary.inboundInCallDuration + summary.outboundInCallDuration;
        if (summaryTime > agent.totalTime) {
          agent.totalTime = summaryTime;
        }
      }
    });

    // Filter by selected department and convert to chart format
    const chartData = Array.from(agentMap.entries())
      .filter(([_, agent]) => 
        selectedDepartment === 'all' || agent.department === selectedDepartment
      )
      .map(([id, agent]) => ({
        name: agent.name,
        value: Math.round(agent.totalTime / 1000), // Convert to seconds
        duration: formatDuration(agent.totalTime),
        id: id
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 agents

    return chartData;
  }, [selectedDepartment, lookupReady]);

  // Colors for pie chart
  const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
    '#82CA9D', '#FFC658', '#FF7C7C', '#8DD1E1', '#D084D0'
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading monthly chart data...</p>
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
            <div className="space-x-2">
              <button
                onClick={fetchData}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Retry
              </button>
              <button
                onClick={onLogout}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Logout
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
              Call Analytics Dashboard
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">This month's data</span>
              {lookupReady && (
                <span className="text-xs text-green-600">
                  Monthly cache: {lookupService.getStats().monthlyActivities} activities, {lookupService.getStats().monthlySummaries} summaries
                </span>
              )}
              <button
                onClick={onLogout}
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
        {/* Department Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Department:
          </label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="block w-60 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Agent Talk Time Distribution
              {selectedDepartment !== 'all' && ` - ${selectedDepartment}`}
            </h3>
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [
                      `${Math.floor(Number(value) / 60)}m ${Number(value) % 60}s`, 
                      'Talk Time'
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No data available for the selected department
              </div>
            )}
          </div>

          {/* Bar Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Top Agents by Talk Time
            </h3>
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={pieChartData.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    fontSize={12}
                  />
                  <YAxis 
                    tickFormatter={(value) => `${Math.floor(value / 60)}m`}
                  />
                  <Tooltip 
                    formatter={(value) => [
                      `${Math.floor(Number(value) / 60)}m ${Number(value) % 60}s`, 
                      'Talk Time'
                    ]}
                  />
                  <Bar dataKey="value" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No data available for the selected department
              </div>
            )}
          </div>
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