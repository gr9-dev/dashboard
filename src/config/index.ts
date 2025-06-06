// Configuration for the Internal Call Dashboard
// You can modify these values as needed for your environment

interface Config {
  api: {
    baseUrl: string;
    region: string;
    endpoints: {
      auth: string;
      activities: string;
      summaries: string;
    };
  };
  app: {
    name: string;
    version: string;
    defaultDataRange: number; // days
  };
  development: {
    showObfuscatedUrl: boolean;
  };
}

const config: Config = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'https://ng-api.uk.cloudcall.com/v3'),
    region: import.meta.env.VITE_API_REGION || 'UK',
    endpoints: {
      auth: '/auth/login',
      activities: '/reporting/activity/agents',
      summaries: '/reporting/summary/agents',
    },
  },
  app: {
    name: 'Internal Call Dashboard',
    version: '1.0.0',
    defaultDataRange: 7, // Last 7 days
  },
  development: {
    showObfuscatedUrl: import.meta.env.DEV,
  },
};

export default config;

// Helper functions for configuration
export const getApiUrl = (endpoint: keyof Config['api']['endpoints']): string => {
  return `${config.api.baseUrl}${config.api.endpoints[endpoint]}`;
};

export const isProduction = (): boolean => {
  return import.meta.env.PROD;
};

export const isDevelopment = (): boolean => {
  return import.meta.env.DEV;
}; 