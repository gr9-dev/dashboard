import React, { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { MainDashboard } from './components/MainDashboard';
import { apiService } from './services/api';

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      const hasToken = apiService.hasValidToken();
      console.log('App startup - hasToken:', hasToken);
      setIsAuthenticated(hasToken);
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    apiService.logout();
    setIsAuthenticated(false);
  };

  // Add debugging for state changes
  useEffect(() => {
    console.log('Authentication state changed to:', isAuthenticated);
  }, [isAuthenticated]);

  useEffect(() => {
    console.log('Loading state changed to:', isLoading);
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleAuthSuccess} />;
  }

  return <MainDashboard onLogout={handleLogout} />;

  /*
  // Temporarily show debug page
  return <DebugAuth />;
  */
};

export default App; 