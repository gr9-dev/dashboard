# CloudCall Analytics Dashboard

A fast, lightweight, and responsive dashboard for displaying call data from CloudCall IP phone system with advanced analytics, centralized data management, and intelligent agent deduplication.

## Features

- **🔐 Secure Authentication**: CloudCall credentials with automatic token management
- **📊 Three-Tab Interface**: 
  - **Legacy View**: Today's, weekly, and monthly agent performance with detailed statistics (Default tab)
  - **Analytics & Charts**: Interactive visualizations with pie charts and bar graphs
  - **Data Tables**: Comprehensive data exploration with agent summaries
- **🚀 Centralized Data Architecture**: Single monthly data fetch with intelligent filtering
- **👥 Smart Agent Deduplication**: Handles duplicate agents across different data sources
- **🏢 Department Filtering**: Filter all views by department
- **📈 Real-time Performance**: Live agent statistics and call metrics
- **💾 Intelligent Caching**: 5-minute cache with automatic refresh
- **📱 Responsive Design**: Works seamlessly on desktop and mobile devices
- **⚡ Pagination System**: Automatically handles CloudCall API limits with batch fetching
- **✅ Accurate Call Metrics**: Proper call direction mapping and connected call filtering

## Recent Major Updates (June 2025)

### ✅ **Fixed Critical Data Discrepancies**
- **Unit Conversion Fix**: Resolved major issue where Legacy tab showed seconds instead of hours due to double millisecond-to-second conversion
- **Call Direction Correction**: Fixed swapped call directions (now correctly: 0=outbound, 1=inbound)
- **Connected Call Filtering**: Implemented proper filtering to only count connected calls (outcome ID 1), matching Data Tables behavior
- **Data Consistency**: Legacy tab now matches Data Tables tab for accurate agent performance metrics

### ✅ **Enhanced Legacy View (Default Tab)**
- **Three-Column Layout**: Today's performance, This week's performance, This month's performance
- **Accurate Call Counts**: Fixed from showing wrong direction and including unconnected calls
- **Proper Talk Time Display**: Corrected from ~15 seconds to proper 4+ hour displays
- **Consistent Data Processing**: Applied same fixes to daily, weekly, and monthly columns
- **Smart Data Prioritization**: Uses summary data when available, falls back to activity aggregation

### ✅ **Improved User Experience**
- **Default Tab**: Legacy View now loads by default instead of Charts
- **Better Data Accuracy**: Alex Hanley example: Fixed from showing 15s talk time to proper 4h+ with 92 OB/8 IB calls
- **Debug Information**: Enhanced console debugging for troubleshooting data issues
- **Performance Consistency**: All three time periods now use consistent data processing logic

## Architecture Overview

### Centralized Data Management
The dashboard uses a revolutionary approach where **all data is fetched once monthly** and cached centrally:

1. **Monthly Data Fetch**: Fetches complete month's activities and summaries with automatic pagination
2. **Smart Filtering**: Individual tabs filter from the cached monthly dataset (e.g., Legacy View shows "today" from monthly data)
3. **Lookup Service**: Builds comprehensive agent and department lookup tables from monthly data
4. **Performance**: Reduces API calls by ~90% and improves response times significantly

### Key Components

#### Lookup Service (`src/services/lookupService.ts`)
- **Centralized Data Store**: Caches monthly activities and summaries
- **Agent Deduplication**: Intelligent merging of agents with different IDs but same performance
- **Name Resolution**: Comprehensive agent name lookup with fallback handling
- **Department Management**: Full department lists from complete monthly dataset
- **Statistics Tracking**: Provides detailed cache statistics and data coverage

#### API Service Enhancements (`src/services/api.ts`)
- **Date Range Functions**: `getThisMonthDateRange()`, `getTodayDateRange()`, `getYesterdayDateRange()`, `getThisWeekDateRange()`
- **Smart Filtering**: `filterActivitiesByDateRange()` for CloudCall-specific date filtering
- **Pagination Handling**: Automatic batch fetching with 500-record API limit compliance
- **Error Management**: Comprehensive error handling with authentication expiration detection
- **Unit Conversion**: Proper millisecond to second conversion with `formatDuration()` function

## Current Implementation

### Legacy View Tab (Default)
- **Today's Performance**: Shows today's agent statistics filtered from monthly data with only connected calls
- **Weekly Performance**: Shows this week's connected call statistics with correct call directions
- **Monthly Performance**: Shows complete monthly performance from summary data
- **Smart Data Combination**: Merges activity data with summary data for comprehensive metrics
- **Agent Deduplication**: Automatically detects and merges duplicate agents based on performance patterns
- **Department Filtering**: Real-time filtering by department
- **Accurate Metrics**: Fixed unit conversion and call direction issues for precise data display

### Analytics & Charts Tab  
- **Interactive Visualizations**: Pie charts and bar graphs using Recharts
- **Monthly Data Analysis**: Shows comprehensive monthly performance trends
- **Department-Specific Views**: Filter charts by department
- **Top Performer Identification**: Automatically highlights top agents by talk time
- **Responsive Charts**: Mobile-friendly interactive visualizations

### Data Tables Tab
- **Agent Summaries**: Comprehensive agent performance with connected call counts
- **Sortable Columns**: Click headers to sort by any metric
- **Department Filtering**: Real-time department-based filtering
- **Accurate Data**: Uses summary data for precise connected call counts and talk times

### Data Architecture

#### Monthly Data Fetching
```typescript
// Automatic pagination to overcome 500-record API limit
const allActivities: AgentCallActivity[] = [];
let page = 1;
while (hasMoreData) {
  const response = await apiService.getAgentActivity({
    From: monthDateRange.from,
    To: monthDateRange.to,
    Take: 500,  // CloudCall API maximum
    Page: page,
  });
  // Smart termination when < 500 records returned
}
```

#### Smart Agent Deduplication
- **Performance-Based Matching**: Identifies duplicates by identical talk times + department
- **Name Priority**: Keeps real names over fallback "Agent X" names
- **Data Merging**: Combines call counts and talk times from multiple sources

#### Call Data Processing (Fixed June 2025)
```typescript
// Proper call direction mapping and connected call filtering
if (activity.callAgentOutcomeId === 1) { // Connected calls only
  if (activity.callDirectionId === 0) {
    agent.outboundCalls++; // 0 = outbound (corrected)
  } else if (activity.callDirectionId === 1) {
    agent.inboundCalls++; // 1 = inbound (corrected)
  }
}

// Proper unit handling - keep in milliseconds until display
agent.talkTime += (activity.talkTime || 0); // No premature conversion
// formatDuration() handles milliseconds to readable format
```

#### Department Management
- **Complete Coverage**: Builds department list from full monthly dataset
- **Consistent Naming**: Uses lookup service for standardized department names
- **Real-time Filtering**: Instant department filtering across all components

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn  
- CloudCall account credentials with API access

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd Dashboard
npm install
```

2. **Configure the application:**
Edit `src/config/index.ts` to match your CloudCall region and preferences.

3. **Start the development server:**
```bash
npm run dev
```

4. **Open your browser:**
Navigate to `http://localhost:3000` - Legacy View will load by default

## Production Deployment (Debian/RaspbianOS)

### System Requirements
- Debian 11+ or RaspbianOS (tested on Raspberry Pi 4)
- 2GB+ RAM recommended
- 10GB+ storage space
- Internet connection for CloudCall API access

### Step 1: System Preparation

```bash
# Update the system
sudo apt update && sudo apt upgrade -y

# Install essential build tools
sudo apt install -y curl wget git build-essential software-properties-common

# Install Node.js (v18 LTS recommended)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show v9.x.x or higher
```

### Step 2: Install Production Dependencies

```bash
# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install -y nginx

# Install certbot for SSL certificates (optional but recommended)
sudo apt install -y certbot python3-certbot-nginx

# Install firewall
sudo apt install -y ufw
```

### Step 3: Application Deployment

```bash
# Create application directory
sudo mkdir -p /var/www/cloudcall-dashboard
sudo chown $USER:$USER /var/www/cloudcall-dashboard

# Clone the repository
cd /var/www/cloudcall-dashboard
git clone <your-repository-url> .

# Install dependencies
npm install

# Build for production
npm run build

# Copy built files to serve directory
sudo mkdir -p /var/www/html/cloudcall-dashboard
sudo cp -r dist/* /var/www/html/cloudcall-dashboard/
sudo chown -R www-data:www-data /var/www/html/cloudcall-dashboard
```

### Step 4: Configure Nginx

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/cloudcall-dashboard
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or IP
    
    root /var/www/html/cloudcall-dashboard;
    index index.html;
    
    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Handle React routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

Enable the site:

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/cloudcall-dashboard /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Step 5: SSL Certificate (Recommended)

```bash
# Obtain SSL certificate (replace your-domain.com with your actual domain)
sudo certbot --nginx -d your-domain.com

# Set up automatic renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test renewal
sudo certbot renew --dry-run
```

### Step 6: Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (adjust port if needed)
sudo ufw allow 22

# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Step 7: Process Management with PM2

If you need to run a Node.js server alongside the static files:

```bash
# Create PM2 ecosystem file
nano /var/www/cloudcall-dashboard/ecosystem.config.js
```

Add the following configuration:

```javascript
module.exports = {
  apps: [{
    name: 'cloudcall-dashboard',
    script: 'npm',
    args: 'run preview',
    cwd: '/var/www/cloudcall-dashboard',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
```

Start the application:

```bash
# Start with PM2
cd /var/www/cloudcall-dashboard
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME

# Check status
pm2 status
pm2 logs cloudcall-dashboard
```

### Step 8: Monitoring and Maintenance

```bash
# View application logs
pm2 logs cloudcall-dashboard

# Monitor system resources
pm2 monit

# Check Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check system status
sudo systemctl status nginx
sudo systemctl status certbot.timer

# Update application
cd /var/www/cloudcall-dashboard
git pull
npm install
npm run build
sudo cp -r dist/* /var/www/html/cloudcall-dashboard/
pm2 restart cloudcall-dashboard
```

### Step 9: Backup Strategy

```bash
# Create backup script
sudo nano /usr/local/bin/backup-dashboard.sh
```

Add the following:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/cloudcall-dashboard"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz -C /var/www/cloudcall-dashboard .

# Backup nginx configuration
cp /etc/nginx/sites-available/cloudcall-dashboard $BACKUP_DIR/nginx_$DATE.conf

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.conf" -mtime +7 -delete

echo "Backup completed: $DATE"
```

Make it executable and schedule:

```bash
# Make script executable
sudo chmod +x /usr/local/bin/backup-dashboard.sh

# Add to crontab (daily backup at 2 AM)
sudo crontab -e
# Add this line:
# 0 2 * * * /usr/local/bin/backup-dashboard.sh >> /var/log/dashboard-backup.log 2>&1
```

### Step 10: Performance Optimization

```bash
# Optimize Nginx for better performance
sudo nano /etc/nginx/nginx.conf
```

Add/modify these settings in the `http` block:

```nginx
# Worker processes (usually number of CPU cores)
worker_processes auto;

# Worker connections
events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    # Enable sendfile
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    
    # Timeout settings
    keepalive_timeout 65;
    client_body_timeout 12;
    client_header_timeout 12;
    send_timeout 10;
    
    # Buffer sizes
    client_body_buffer_size 10K;
    client_header_buffer_size 1k;
    client_max_body_size 8m;
    large_client_header_buffers 2 1k;
}
```

Restart Nginx:

```bash
sudo systemctl restart nginx
```

### Troubleshooting

#### Common Issues

1. **Permission Denied Errors**
```bash
# Fix file permissions
sudo chown -R www-data:www-data /var/www/html/cloudcall-dashboard
sudo chmod -R 755 /var/www/html/cloudcall-dashboard
```

2. **Nginx Configuration Errors**
```bash
# Test configuration
sudo nginx -t
# Check logs
sudo tail -f /var/log/nginx/error.log
```

3. **SSL Certificate Issues**
```bash
# Renew certificate manually
sudo certbot renew
# Check certificate status
sudo certbot certificates
```

4. **Application Not Loading**
```bash
# Check if files exist
ls -la /var/www/html/cloudcall-dashboard/
# Check Nginx status
sudo systemctl status nginx
# Check PM2 status (if using)
pm2 status
```

5. **Memory Issues on Raspberry Pi**
```bash
# Check memory usage
free -h
# Monitor processes
top
# Restart services if needed
sudo systemctl restart nginx
pm2 restart all
```

### Security Considerations

1. **Keep System Updated**
```bash
# Set up automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

2. **SSH Security**
```bash
# Disable root login and password authentication
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Set: PasswordAuthentication no
sudo systemctl restart ssh
```

3. **Fail2Ban for Intrusion Prevention**
```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Monitoring and Alerts

1. **System Monitoring**
```bash
# Install htop for better system monitoring
sudo apt install htop

# Check disk usage
df -h

# Monitor network
sudo apt install iotop nethogs
```

2. **Log Rotation**
```bash
# Configure logrotate for application logs
sudo nano /etc/logrotate.d/cloudcall-dashboard
```

Add:
```
/var/log/cloudcall-dashboard/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
```

Your CloudCall Dashboard is now ready for production use on Debian/RaspbianOS with enterprise-grade configuration, security, and monitoring!

## Configuration

### API Settings
```typescript
const config = {
  api: {
    baseUrl: 'https://ng-api.uk.cloudcall.com/v3', // UK region
    region: 'UK',
    timeout: 30000,
  },
  app: {
    defaultDataRange: 30, // Monthly data fetching
    cacheTimeout: 300000, // 5-minute cache
  }
};
```

**Available Regions:**
- UK: `https://ng-api.uk.cloudcall.com/v3`
- US: `https://ng-api.us.cloudcall.com/v3`  
- Staging: `https://ng-api.staging.cloudcall.com/v3`

### Usage Guide

1. **Authentication**: Enter CloudCall username and password
2. **Monthly Data Load**: System automatically fetches and caches monthly data
3. **Default View**: Legacy View loads by default with three-column layout
4. **Tab Navigation**: Switch between Legacy View, Analytics, and Data Tables
5. **Department Filtering**: Use dropdown to filter by specific departments
6. **Data Refresh**: Click refresh buttons to update cached data
7. **Logout**: Secure session termination

## API Integration

### CloudCall Reporting API v3
- **Authentication**: `/auth/login` - Bearer token management
- **Activities**: `/reporting/activity/agents` - Detailed call activities with pagination
- **Summaries**: `/reporting/summary/agents` - Agent performance summaries
- **Smart Pagination**: Automatically handles 500-record API limits
- **Error Handling**: Authentication expiration detection and graceful failures

### Data Processing Pipeline
1. **Monthly Fetch**: Comprehensive data retrieval with pagination
2. **Lookup Building**: Agent and department table construction
3. **Smart Caching**: 5-minute cache with forced refresh options
4. **Component Filtering**: Real-time filtering from cached dataset
5. **Deduplication**: Intelligent agent merging across data sources
6. **Unit Conversion**: Proper millisecond to second conversion
7. **Call Filtering**: Connected calls only (outcome ID 1)

## Technology Stack

### Frontend
- **React 18** with TypeScript - Modern component architecture
- **Vite** - Lightning-fast development and building
- **Tailwind CSS** - Utility-first styling with responsive design
- **Recharts** - Interactive data visualizations

### Data Management
- **Axios** - HTTP client with interceptors
- **Custom Lookup Service** - Centralized data management
- **TypeScript Types** - Comprehensive type safety
- **Map-based Caching** - High-performance data storage

### Development Tools
- **TypeScript** - Full type safety and IntelliSense
- **ESLint** - Code quality and consistency
- **PostCSS** - Advanced CSS processing

## Performance Features

### Optimizations
- **Centralized Data Fetching**: ~90% reduction in API calls
- **Intelligent Caching**: 5-minute cache with selective updates
- **Smart Pagination**: Automatic batch processing of large datasets
- **Component-Level Filtering**: Real-time filtering without API calls
- **Lazy Loading**: Efficient component rendering
- **Accurate Data Processing**: Fixed unit conversion and call direction issues

### Monitoring
- **Cache Statistics**: Real-time cache hit rates and data coverage
- **API Limits Handling**: Automatic 500-record pagination
- **Error Tracking**: Comprehensive error logging and user feedback
- **Performance Metrics**: Load times and data processing statistics
- **Debug Console**: Enhanced debugging information for troubleshooting

## Security Features

- **Token Management**: Automatic bearer token refresh
- **Secure Storage**: No credentials stored in localStorage
- **Session Management**: Proper authentication state handling
- **API Security**: Automatic logout on authentication failures
- **Data Protection**: Secure credential handling throughout
- **Production Security**: Nginx security headers and SSL/TLS

## Development

### Available Scripts
```bash
npm run dev      # Development server with HMR
npm run build    # Production build with optimization  
npm run preview  # Preview production build locally
npm run lint     # Code quality checks
```

### Project Structure
```
src/
├── components/          # React components
│   ├── Login.tsx       # Authentication component
│   ├── MainDashboard.tsx # Main navigation component
│   ├── Legacy.tsx      # Three-column performance view (Default)
│   ├── Charts.tsx      # Analytics and visualizations
│   └── Dashboard.tsx   # Data tables view
├── services/           # Business logic and API
│   ├── api.ts         # CloudCall API integration
│   └── lookupService.ts # Centralized data management
├── types/             # TypeScript definitions
│   └── api.ts         # API response types
├── config/            # Configuration management
│   └── index.ts       # App configuration
└── App.tsx            # Main application component
```

## Advanced Features

### Agent Deduplication Algorithm
```typescript
// Smart duplicate detection by performance + department
const duplicateGroups = new Map<string, AgentDailyStats[]>();
agentsArray.forEach(agent => {
  const roundedTalkTime = Math.round(agent.talkTime / 30) * 30; // 30-second tolerance
  const key = `${roundedTalkTime}-${agent.departmentId || 'unknown'}`;
  // Group and merge duplicates intelligently
});
```

### Call Data Processing (Fixed June 2025)
```typescript
// Proper call direction mapping and connected call filtering
if (activity.callAgentOutcomeId === 1) { // Connected calls only
  if (activity.callDirectionId === 0) {
    agent.outboundCalls++; // 0 = outbound (corrected)
  } else if (activity.callDirectionId === 1) {
    agent.inboundCalls++; // 1 = inbound (corrected)
  }
}

// Proper unit handling - keep in milliseconds until display
agent.talkTime += (activity.talkTime || 0); // No premature conversion
// formatDuration() handles milliseconds to readable format
```

### Monthly Data Architecture Benefits
- **Comprehensive Coverage**: No missed data from daily fetching gaps
- **Better Name Resolution**: More data points for agent name lookup
- **Consistent Department Lists**: Complete department coverage
- **Reduced API Pressure**: Fewer, larger requests vs. many small ones
- **Enhanced Performance**: Local filtering vs. repeated API calls
- **Accurate Metrics**: Fixed unit conversion and call direction issues

### Intelligent Caching System
- **Time-based Expiration**: 5-minute cache with manual refresh
- **Selective Updates**: Only fetch when necessary
- **Memory Efficient**: Map-based storage with automatic cleanup
- **Statistics Tracking**: Cache hit rates and performance metrics

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify CloudCall credentials
   - Check API region in configuration
   - Ensure API access permissions

2. **No Data Display or Wrong Data**
   - Check browser console for debugging information
   - Verify monthly data availability in "=== MONTHLY DATA CHECK ===" logs
   - Check department filtering settings  
   - Look for unit conversion issues in debug output

3. **Call Count Discrepancies**
   - Verify call direction debugging in console
   - Check connected vs unconnected call filtering
   - Compare with Data Tables tab for reference

4. **API Limit Errors**
   - System automatically handles 500-record limits
   - Pagination implemented to fetch complete datasets
   - Monitor console for pagination progress

5. **Performance Issues**
   - Monthly cache should load within 30 seconds
   - Check network connectivity
   - Monitor browser console for errors
   - Look for memory issues on resource-constrained devices

### Configuration Troubleshooting
- **Region Mismatch**: Update `src/config/index.ts` baseUrl
- **Timeout Issues**: Increase API timeout in configuration
- **Cache Problems**: Force refresh or clear browser storage
- **Talk Time Display Issues**: Check for unit conversion problems in console logs

### Data Accuracy Issues (Fixed June 2025)
- **Wrong Talk Times**: Fixed double conversion issue (milliseconds to seconds twice)
- **Swapped Call Directions**: Fixed call direction mapping (0=outbound, 1=inbound)
- **Including Unconnected Calls**: Now filters to only connected calls (outcome ID 1)
- **Tab Inconsistencies**: Applied same fixes to all columns (daily, weekly, monthly)

## Future Enhancements

### Planned Features
- **Enhanced Data Export**: CSV/Excel export with filtered data
- **Real-time Updates**: WebSocket integration for live data
- **Advanced Analytics**: Trend analysis and predictive insights
- **Dark Mode**: Theme customization options
- **Mobile App**: React Native implementation
- **Advanced Filtering**: Custom date ranges and multi-department selection

### Performance Roadmap
- **WebSocket Integration**: Real-time data updates
- **Background Sync**: Service worker implementation
- **Advanced Caching**: Redis integration for enterprise deployments
- **Micro-frontend Architecture**: Scalable component loading

## Support

### Documentation
- CloudCall API: https://cloudcall.readme.io/docs
- CloudCall Support: integrations@cloudcall.com

### Technical Support
- Check browser console for detailed error messages and debugging information
- Monitor network tab for API request/response details
- Use lookup service debug methods for data inspection
- Review cache statistics for performance insights
- Check "=== WEEKLY DATA DEBUG ===" and "=== MONTHLY DATA CHECK ===" console output

## 🔧 **Agent Name Resolution**

The system uses a multi-tier approach to resolve agent names:

1. **Primary Source**: Agent activity data with `accountName` fields
2. **Fallback**: Agent summary data (shows as "Agent xxxxx")
3. **Manual Mapping**: For agents without activity data

### **Manual Agent Name Mapping**

Some agents may only appear in summary data without corresponding activity records containing names. For these agents:

1. **Check Console**: Look for "Agents needing manual names" in browser console
2. **Add Mappings**: Edit `src/services/lookupService.ts` and add entries to `manualAgentNames`:

```typescript
private manualAgentNames = new Map<number, string>([
  [443333079999, "John Smith"],
  [443333080000, "Jane Doe"],
  // Add more mappings as needed
]);
```

3. **Refresh Data**: The names will appear immediately on next data refresh

---

**Version**: 2.1.0 - Major Data Accuracy Update & Production Deployment
**Last Updated**: June 2025
**License**: Internal Use Only 