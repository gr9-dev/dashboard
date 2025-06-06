# Configuration Setup

Since environment files (.env) cannot be created in this environment, configuration is handled through the TypeScript configuration file at `src/config/index.ts`.

## Default Configuration

The application comes with sensible defaults for the CloudCall UK platform:

```typescript
{
  api: {
    baseUrl: 'https://ng-api.uk.cloudcall.com/v3',
    region: 'UK',
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
    showObfuscatedUrl: true, // Shows obfuscated URL in development mode
  },
}
```

## Customizing Configuration

To customize the configuration for your environment:

1. **For Different Regions**: 
   - Edit `src/config/index.ts`
   - Change `baseUrl` to the appropriate CloudCall server:
     - UK: `https://ng-api.uk.cloudcall.com/v3`
     - US: `https://ng-api.us.cloudcall.com/v3`
     - Staging: `https://ng-api.staging.cloudcall.com/v3`

2. **For Different Data Ranges**:
   - Modify `defaultDataRange` to change how many days of data to fetch by default

3. **For Production Deployment**:
   - The obfuscated URL display will automatically be disabled in production builds
   - You can manually set `showObfuscatedUrl: false` if needed

## Environment Variables (Alternative)

If you can create environment files in your deployment environment, the application supports these Vite environment variables:

- `VITE_API_BASE_URL`: Override the default API base URL
- `VITE_API_REGION`: Override the default region

Create a `.env` file in the project root with:

```env
VITE_API_BASE_URL=https://ng-api.uk.cloudcall.com/v3
VITE_API_REGION=UK
```

## Security Notes

- Never commit actual credentials to the repository
- The configuration file is designed to be safe for version control
- Actual authentication credentials are entered at runtime through the login form
- Bearer tokens are stored only in memory during the session 