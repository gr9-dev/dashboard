import axios, { AxiosInstance, AxiosError } from 'axios';
import config, { getApiUrl } from '../config';
import {
  AuthRequest,
  AuthResponse,
  AgentCallActivityResponse,
  AgentSummaryListResponse,
  ActivityQueryParams,
  SummaryQueryParams,
} from '../types/api';

class ApiService {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: config.api.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
        console.log('Adding Authorization header:', `Bearer ${this.token.substring(0, 20)}...`);
      } else {
        console.log('No token available for Authorization header');
      }
      return config;
    });

    // Add response interceptor for better error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error('API Error:', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  async authenticate(username: string, password: string): Promise<string> {
    try {
      const formData = new URLSearchParams();
      formData.append('type', 'account');
      formData.append('username', username);
      formData.append('password', password);

      console.log('Attempting authentication to:', getApiUrl('auth'));
      console.log('Form data being sent:', {
        type: 'account',
        username: username,
        password: password ? '[PROVIDED]' : '[MISSING]'
      });

      const response = await axios.post(getApiUrl('auth'), formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      console.log('Authentication HTTP status:', response.status);
      console.log('Authentication HTTP headers:', response.headers);
      console.log('Full authentication response:', response.data);
      
      // Check what type of response we got
      console.log('Response data type:', typeof response.data);
      console.log('Response data keys:', Object.keys(response.data || {}));

      console.log('Authentication response:', {
        status: response.status,
        hasToken: !!(response.data.token || response.data.access_token || response.data),
      });

      // CloudCall API returns token nested in response.data.data
      // Let's check different possible locations for the token
      const tokenSources = [
        response.data.data?.token,           // Most likely: response.data.data.token
        response.data.data?.access_token,    // Alternative: response.data.data.access_token
        response.data.data,                  // If data itself is the token
        response.data.token,                 // Direct: response.data.token
        response.data.access_token,          // Direct: response.data.access_token
      ];

      console.log('Checking token sources:', {
        'data.data.token': response.data.data?.token,
        'data.data.access_token': response.data.data?.access_token,
        'data.data': response.data.data,
        'data.token': response.data.token,
        'data.access_token': response.data.access_token,
      });

      // Find the first valid token (should be a string)
      this.token = tokenSources.find(token => token && typeof token === 'string') || null;
      
      console.log('Extracted token type:', typeof this.token);
      console.log('Extracted token (first 20 chars):', typeof this.token === 'string' ? this.token.substring(0, 20) : this.token);
      
      // If we still don't have a string token, something is wrong
      if (!this.token || typeof this.token !== 'string') {
        console.error('No valid string token found. Response structure:', response.data);
        throw new Error('Invalid token format received from authentication');
      }

      console.log('Final token stored (first 20 chars):', this.token.substring(0, 20));
      return this.token;
    } catch (error) {
      console.error('Authentication error details:', error);
      
      if (axios.isAxiosError(error)) {
        console.error('Axios error response:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
        });
        
        if (error.response?.status === 401) {
          throw new Error('Invalid credentials. Please check your username and password.');
        } else if (error.response?.status === 403) {
          throw new Error('Access denied. Your account may not have the required permissions.');
        } else if (error.response?.data?.message) {
          throw new Error(`Authentication failed: ${error.response.data.message}`);
        }
      }
      
      throw new Error('Authentication failed. Please check your credentials and network connection.');
    }
  }

  async getAgentActivity(params: ActivityQueryParams = {}): Promise<AgentCallActivityResponse> {
    if (!this.token) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      console.log('Fetching agent activity with params:', params);
      console.log('API endpoint:', `${config.api.baseUrl}${config.api.endpoints.activities}`);
      console.log('Current token available:', !!this.token);

      const response = await this.api.get(config.api.endpoints.activities, {
        params,
      });

      console.log('Agent activity response:', {
        status: response.status,
        dataCount: response.data.data?.length || 0,
        totalCount: response.data.totalCount,
      });

      return response.data;
    } catch (error) {
      console.error('Failed to fetch agent activity:', error);
      throw new Error('Failed to fetch agent activity data');
    }
  }

  async getAgentSummary(params: SummaryQueryParams = {}): Promise<AgentSummaryListResponse> {
    if (!this.token) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      const requestParams = {
        ...params,
        'api-version': '1.1',
      };

      console.log('Fetching agent summary with params:', requestParams);
      console.log('API endpoint:', `${config.api.baseUrl}${config.api.endpoints.summaries}`);
      console.log('Current token available:', !!this.token);

      const response = await this.api.get(config.api.endpoints.summaries, {
        params: requestParams,
      });

      console.log('Agent summary response:', {
        status: response.status,
        dataCount: response.data.data?.length || 0,
        page: response.data.page,
        count: response.data.count,
      });

      return response.data;
    } catch (error) {
      console.error('Failed to fetch agent summary:', error);
      
      // Provide more specific error information
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const status = error.response.status;
          const message = error.response.data?.message || error.response.statusText;
          
          if (status === 401) {
            throw new Error('Authentication expired. Please login again.');
          } else if (status === 403) {
            throw new Error('Access denied. You may not have permission to access agent summaries.');
          } else if (status === 404) {
            throw new Error('Agent summary endpoint not found. Check API configuration.');
          } else {
            throw new Error(`API Error (${status}): ${message}`);
          }
        } else if (error.request) {
          throw new Error('Network error. Please check your internet connection.');
        }
      }
      
      throw new Error(`Failed to fetch agent summary data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  logout(): void {
    this.token = null;
    localStorage.removeItem('cloudcall_token');
    console.log('User logged out, token cleared');
  }

  hasValidToken(): boolean {
    const hasToken = !!this.token;
    console.log('hasValidToken check:', hasToken);
    return hasToken;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

// Create a singleton instance
export const apiService = new ApiService();

// Utility functions for date handling
export const getDateRange = (days: number = config.app.defaultDataRange) => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
};

// Get this month's date range (1st of current month to now)
export const getThisMonthDateRange = () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const endOfMonth = new Date(); // Current time

  return {
    from: startOfMonth.toISOString(),
    to: endOfMonth.toISOString(),
  };
};

// Get today's date range (start of day to end of day)
export const getTodayDateRange = () => {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  
  return {
    from: startOfDay.toISOString(),
    to: endOfDay.toISOString(),
  };
};

// Get yesterday's date range
export const getYesterdayDateRange = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const startOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
  const endOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
  
  return {
    from: startOfDay.toISOString(),
    to: endOfDay.toISOString(),
  };
};

// Get this week's date range (Monday to now)
export const getThisWeekDateRange = () => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days
  
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - daysFromMonday);
  startOfWeek.setHours(0, 0, 0, 0);
  
  return {
    from: startOfWeek.toISOString(),
    to: now.toISOString(),
  };
};

// Utility function to filter data by date range
export const filterDataByDateRange = <T extends { dateTime?: string; createdDate?: string }>(
  data: T[],
  dateRange: { from: string; to: string }
): T[] => {
  const fromDate = new Date(dateRange.from);
  const toDate = new Date(dateRange.to);
  
  return data.filter(item => {
    const itemDate = new Date(item.dateTime || item.createdDate || '');
    return itemDate >= fromDate && itemDate <= toDate;
  });
};

// CloudCall specific filtering functions
export const filterActivitiesByDateRange = (
  activities: any[],
  dateRange: { from: string; to: string }
): any[] => {
  const fromDate = new Date(dateRange.from);
  const toDate = new Date(dateRange.to);
  
  return activities.filter(activity => {
    if (activity.occurredAt) {
      const activityDate = new Date(activity.occurredAt);
      return activityDate >= fromDate && activityDate <= toDate;
    }
    return false;
  });
};

// Format duration from milliseconds to readable format
export const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

// Format date for display
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString();
}; 