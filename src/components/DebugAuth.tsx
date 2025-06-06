import React, { useState } from 'react';
import { apiService } from '../services/api';

export const DebugAuth: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testAuth = async () => {
    setLoading(true);
    setResult('Testing authentication...');
    
    try {
      // First, force logout to clear any bad token
      apiService.logout();
      console.log('Cleared existing token');
      
      const token = await apiService.authenticate(username, password);
      setResult(`SUCCESS! Token received (first 50 chars): ${token.substring(0, 50)}...`);
    } catch (error) {
      setResult(`ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const forceReset = () => {
    apiService.logout();
    setResult('Token cleared. Ready for fresh authentication.');
    setUsername('');
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">CloudCall Authentication Debug</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Authentication</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CloudCall Username:
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your CloudCall username"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CloudCall Password:
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your CloudCall password"
              />
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={testAuth}
                disabled={loading || !username || !password}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test Authentication'}
              </button>
              
              <button
                onClick={forceReset}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Force Reset
              </button>
            </div>
          </div>
        </div>
        
        {result && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h3 className="text-lg font-semibold mb-2">Result:</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {result}
            </pre>
          </div>
        )}
        
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Click "Force Reset" to clear any existing token</li>
            <li>Enter your CloudCall credentials</li>
            <li>Click "Test Authentication" and watch the console</li>
            <li>Check the browser console (F12) for detailed debug logs</li>
          </ol>
        </div>
      </div>
    </div>
  );
}; 