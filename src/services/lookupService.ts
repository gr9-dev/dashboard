import { apiService, getThisMonthDateRange, getDateRange, getTodayDateRange } from './api';
import { AgentCallActivity, AgentSummary } from '../types/api';

interface AgentInfo {
  id: number;
  name: string;
  accountNumber?: string;
  customerId?: number;
  source: 'activity' | 'summary' | 'fallback';
}

interface DepartmentInfo {
  id: number;
  name: string;
}

class LookupService {
  private agentLookup = new Map<number, AgentInfo>();
  private departmentLookup = new Map<number, DepartmentInfo>();
  private monthlyActivities: AgentCallActivity[] = [];
  private monthlySummaries: AgentSummary[] = [];
  private lastFetched: Date | null = null;
  private isFetching = false;

  // Manual agent name mapping for agents without activity data
  private manualAgentNames = new Map<number, string>([
    // Add manual mappings here for agents that don't appear in activity data
    // Example: [443333079999, "John Smith"],
  ]);

  // Build comprehensive lookup tables from monthly API data
  async buildLookupTables(forceFresh = false): Promise<void> {
    // Don't refetch if we have recent data (unless forced)
    if (!forceFresh && this.lastFetched && Date.now() - this.lastFetched.getTime() < 5 * 60 * 1000) {
      return;
    }

    if (this.isFetching) {
      return;
    }

    this.isFetching = true;

    try {
      // Fetch this month's data for comprehensive coverage with pagination
      const monthDateRange = getThisMonthDateRange();
      
      console.log('Starting paginated data fetch for monthly data...');
      
      // Fetch activities with pagination
      const allActivities: AgentCallActivity[] = [];
      let activitiesPage = 1;
      let hasMoreActivities = true;
      
      while (hasMoreActivities) {
        console.log(`Fetching activities page ${activitiesPage}...`);
        
        const activitiesResponse = await apiService.getAgentActivity({
          From: monthDateRange.from,
          To: monthDateRange.to,
          Take: 500,
          Page: activitiesPage,
        });
        
        const activities = activitiesResponse.data || [];
        allActivities.push(...activities);
        
        console.log(`Page ${activitiesPage}: ${activities.length} activities (total: ${allActivities.length})`);
        
        // If we got less than 500 records, we've reached the end
        hasMoreActivities = activities.length === 500;
        activitiesPage++;
        
        // Safety check to prevent infinite loops
        if (activitiesPage > 50) {
          console.warn('Stopping pagination at page 50 to prevent infinite loop');
          break;
        }
      }

      // Fetch summaries (usually don't need pagination, but let's be safe)
      const summariesResponse = await apiService.getAgentSummary({
        From: monthDateRange.from,
        To: monthDateRange.to,
        Reach: 2,
      });

      const summaries = summariesResponse.data || [];
      
      console.log(`Completed data fetch - Total activities: ${allActivities.length}, summaries: ${summaries.length}`);
      
      // Store monthly data for filtering by components
      this.monthlyActivities = allActivities;
      this.monthlySummaries = summaries;

      // Build agent lookup from activities (best source for names)
      const agentMap = new Map<number, AgentInfo>();
      
      // IMPORTANT: Also fetch today's activities to capture agent names for agents
      // that might appear in today's summaries but not in monthly activities
      console.log('Fetching today\'s activities for additional name resolution...');
      const todayRange = getTodayDateRange();
      
      try {
        const todayActivitiesResponse = await apiService.getAgentActivity({
          From: todayRange.from,
          To: todayRange.to,
          Take: 500,
        });
        
        const todayActivities = todayActivitiesResponse.data || [];
        console.log(`Found ${todayActivities.length} today's activities for name resolution`);
        
        // Debug: Check if Agent 163108 appears in today's activities
        const agent163108InToday = todayActivities.filter(activity => 
          activity.accountNumber === '163108'
        );
        console.log(`Agent 163108 in today's activities:`, agent163108InToday.length, 'records');
        if (agent163108InToday.length > 0) {
          console.log(`Agent 163108 today sample:`, agent163108InToday[0]);
        }
        
        // Debug: Show today's date range being used
        console.log(`Today's date range:`, todayRange);
        
        // Debug: Show sample of today's activities
        console.log(`Today's activities sample (first 3):`, todayActivities.slice(0, 3).map(a => ({
          accountNumber: a.accountNumber,
          accountName: a.accountName,
          occurredAt: a.occurredAt
        })));
        
        // If we got exactly 500 records, there might be more - fetch additional pages
        if (todayActivities.length === 500) {
          console.log('Today\'s activities reached 500 records, checking for more pages...');
          let todayPage = 2;
          let hasMoreTodayActivities = true;
          
          while (hasMoreTodayActivities && todayPage <= 5) { // Limit to 5 pages for today
            const additionalResponse = await apiService.getAgentActivity({
              From: todayRange.from,
              To: todayRange.to,
              Take: 500,
              Page: todayPage,
            });
            
            const additionalActivities = additionalResponse.data || [];
            todayActivities.push(...additionalActivities);
            
            console.log(`Today's activities page ${todayPage}: ${additionalActivities.length} records (total today: ${todayActivities.length})`);
            
            hasMoreTodayActivities = additionalActivities.length === 500;
            todayPage++;
          }
        }
        
        // Combine monthly and today's activities for comprehensive name lookup
        const combinedActivities = [...allActivities, ...todayActivities];
        console.log(`Combined activities: ${combinedActivities.length} (${allActivities.length} monthly + ${todayActivities.length} today)`);
        
        // Debug: Check if Agent 163108 appears in combined activities
        const agent163108InCombined = combinedActivities.filter(activity => 
          activity.accountNumber === '163108'
        );
        console.log(`Agent 163108 in combined activities:`, agent163108InCombined.length, 'records');
        
        // Use combined activities for name extraction
        this.extractAgentNamesFromActivities(combinedActivities, agentMap);
        
        // Debug: Check which agents appear in summaries but not in activities
        console.log('=== SUMMARY vs ACTIVITY ANALYSIS ===');
        const summaryAgentIds = new Set(summaries.map(s => s.accountId));
        const activityAgentIds = new Set(
          combinedActivities
            .map(a => parseInt(a.accountNumber || '0'))
            .filter(id => !isNaN(id) && id > 0)
        );
        
        console.log(`Agents in summaries: ${summaryAgentIds.size}`);
        console.log(`Agents in combined activities: ${activityAgentIds.size}`);
        
        const summaryOnlyAgents = Array.from(summaryAgentIds).filter(id => !activityAgentIds.has(id));
        console.log(`Agents in summaries but NOT in activities (${summaryOnlyAgents.length}):`, summaryOnlyAgents.slice(0, 10));
        
      } catch (error) {
        console.warn('Failed to fetch today\'s activities, using only monthly:', error);
        // Fallback to monthly activities only
        this.extractAgentNamesFromActivities(allActivities, agentMap);
      }

      // Add agents from summaries if not found in activities
      summaries.forEach(summary => {
        if (!agentMap.has(summary.accountId)) {
          agentMap.set(summary.accountId, {
            id: summary.accountId,
            name: `Agent ${summary.accountId}`,
            customerId: summary.customerId,
            source: 'summary',
          });
        }
      });

      // Build department lookup
      const deptMap = new Map<number, DepartmentInfo>();
      
      allActivities.forEach(activity => {
        if (activity.departmentId && activity.departmentName) {
          deptMap.set(activity.departmentId, {
            id: activity.departmentId,
            name: activity.departmentName,
          });
        }
      });

      // Update internal lookup tables
      this.agentLookup = agentMap;
      this.departmentLookup = deptMap;
      this.lastFetched = new Date();
      
      console.log(`Lookup tables built - Agents: ${agentMap.size}, Departments: ${deptMap.size}, Monthly activities: ${allActivities.length}`);
      
    } catch (error) {
      console.error('Failed to build lookup tables:', error);
    } finally {
      this.isFetching = false;
    }
  }

  // Get monthly activities data (cached)
  getMonthlyActivities(): AgentCallActivity[] {
    return this.monthlyActivities;
  }

  // Get monthly summaries data (cached)
  getMonthlySummaries(): AgentSummary[] {
    return this.monthlySummaries;
  }

  // Get agent name by ID with improved fallback
  getAgentName(agentId: number): string {
    const agent = this.agentLookup.get(agentId);
    if (agent) {
      return agent.name;
    }
    
    // Check manual mapping for agents without activity data
    const manualName = this.manualAgentNames.get(agentId);
    if (manualName) {
      return manualName;
    }
    
    return `Agent ${agentId}`;
  }

  // Get department name by ID
  getDepartmentName(departmentId: number): string {
    const department = this.departmentLookup.get(departmentId);
    return department?.name || `Department ${departmentId}`;
  }

  // Get all departments for dropdowns
  getAllDepartments(): DepartmentInfo[] {
    return Array.from(this.departmentLookup.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  // Get all agents for reference
  getAllAgents(): AgentInfo[] {
    return Array.from(this.agentLookup.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  // Check if lookup tables are available
  isReady(): boolean {
    return this.agentLookup.size > 0 || this.departmentLookup.size > 0;
  }

  // Get lookup statistics with more detail
  getStats() {
    const namedAgents = Array.from(this.agentLookup.values()).filter(agent => !agent.name.startsWith('Agent '));
    const fallbackAgents = Array.from(this.agentLookup.values()).filter(agent => agent.name.startsWith('Agent '));
    
    return {
      agents: this.agentLookup.size,
      namedAgents: namedAgents.length,
      fallbackAgents: fallbackAgents.length,
      departments: this.departmentLookup.size,
      lastFetched: this.lastFetched,
      isReady: this.isReady(),
      monthlyActivities: this.monthlyActivities.length,
      monthlySummaries: this.monthlySummaries.length,
    };
  }

  // Debug method to inspect specific agents
  debugAgent(agentId: number) {
    const agent = this.agentLookup.get(agentId);
    console.log(`Debug agent ${agentId}:`, agent);
    
    // Also check raw activity data for this agent
    const agentActivities = this.monthlyActivities.filter(activity => 
      activity.accountNumber === agentId.toString()
    );
    
    console.log(`Raw activities for agent ${agentId} (${agentActivities.length} found):`);
    agentActivities.slice(0, 5).forEach((activity, index) => {
      console.log(`Activity ${index + 1}:`, {
        accountNumber: activity.accountNumber,
        accountName: activity.accountName,
        contactName: activity.contactName,
        departmentName: activity.departmentName,
        callDirection: activity.callDirectionDescription,
      });
    });
    
    return agent;
  }

  // Method to find all unique accountName values for agents showing as "Agent xxxxx"
  debugMissingNames() {
    console.log('=== Debugging Missing Agent Names ===');
    
    const fallbackAgents = Array.from(this.agentLookup.values())
      .filter(agent => agent.name.startsWith('Agent '));
    
    console.log(`Found ${fallbackAgents.length} agents with fallback names`);
    
    fallbackAgents.slice(0, 10).forEach(agent => {
      console.log(`\n--- Agent ${agent.id} ---`);
      this.debugAgent(agent.id);
    });
    
    return fallbackAgents;
  }

  // Enhanced method to determine if an accountName is a valid agent name
  private isValidAgentName(accountName: string, agentId: number): boolean {
    if (!accountName || accountName.trim() === '') {
      return false;
    }
    
    const name = accountName.trim();
    
    // Reject if it's just the agent ID as a string
    if (name === agentId.toString()) {
      return false;
    }
    
    // Reject if it's only digits (but allow names with numbers like "John123" or "Agent 456")
    if (/^\d+$/.test(name)) {
      return false;
    }
    
    // Reject very short names (likely not real names)
    if (name.length < 2) {
      return false;
    }
    
    // Accept almost everything else - names can be quite varied:
    // - "John Smith"
    // - "j.smith"  
    // - "John123"
    // - "Agent 456" (this is actually a valid format from some systems)
    // - "JSmith"
    // - "John_Smith"
    // - Names with special characters from different languages
    
    return true;
  }

  // Get a list of agent IDs that need manual name mapping
  getAgentsNeedingManualNames(): number[] {
    const agentsNeedingNames: number[] = [];
    
    this.agentLookup.forEach((agent, agentId) => {
      if (agent.name.startsWith('Agent ') && !this.manualAgentNames.has(agentId)) {
        agentsNeedingNames.push(agentId);
      }
    });
    
    return agentsNeedingNames.sort((a, b) => a - b);
  }

  // Enhanced debug method to understand name resolution issues
  debugNameResolution() {
    console.log('=== Agent Name Resolution Debug ===');
    console.log('Total agents in lookup:', this.agentLookup.size);
    
    const agents = Array.from(this.agentLookup.values());
    const namedAgents = agents.filter(agent => !agent.name.startsWith('Agent '));
    const fallbackAgents = agents.filter(agent => agent.name.startsWith('Agent '));
    
    console.log('Named agents:', namedAgents.length);
    console.log('Fallback agents:', fallbackAgents.length);
    
    console.log('Sample named agents:', namedAgents.slice(0, 5).map(a => ({ id: a.id, name: a.name, source: a.source })));
    console.log('Sample fallback agents:', fallbackAgents.slice(0, 5).map(a => ({ id: a.id, name: a.name, source: a.source })));
    
    // Check for sample activities with agent names
    console.log('Sample activities with accountName:');
    this.monthlyActivities.slice(0, 10).forEach(activity => {
      if (activity.accountName && activity.accountNumber) {
        console.log(`Agent ${activity.accountNumber}: "${activity.accountName}"`);
      }
    });
    
    return {
      total: agents.length,
      named: namedAgents.length,
      fallback: fallbackAgents.length,
      namedSamples: namedAgents.slice(0, 10),
      fallbackSamples: fallbackAgents.slice(0, 10),
    };
  }

  // Method to inspect fallback agents and their raw data
  inspectFallbackAgents() {
    console.log('=== INSPECTING FALLBACK AGENTS ===');
    
    const fallbackAgents = Array.from(this.agentLookup.values())
      .filter(agent => agent.name.startsWith('Agent '))
      .slice(0, 10); // Look at first 10
    
    console.log(`Inspecting ${fallbackAgents.length} fallback agents:`);
    
    fallbackAgents.forEach(agent => {
      console.log(`\n--- Agent ${agent.id} (showing as "${agent.name}") ---`);
      
      // Find all activities for this agent
      const agentActivities = this.monthlyActivities.filter(activity => 
        activity.accountNumber === agent.id.toString()
      );
      
      console.log(`Found ${agentActivities.length} activities for this agent`);
      
      if (agentActivities.length > 0) {
        // Show unique accountName values for this agent
        const uniqueNames = new Set(
          agentActivities
            .map(a => a.accountName)
            .filter(name => name !== null && name !== undefined)
        );
        
        console.log('Unique accountName values found:', Array.from(uniqueNames));
        console.log('Sample activities:');
        
        agentActivities.slice(0, 3).forEach((activity, index) => {
          console.log(`  Activity ${index + 1}:`, {
            accountNumber: activity.accountNumber,
            accountName: activity.accountName,
            contactName: activity.contactName,
            companyName: activity.companyName,
            direction: activity.callDirectionDescription,
            talkTime: activity.talkTime,
          });
        });
      } else {
        console.log('No activities found - this agent is only in summary data');
      }
    });
  }

  // Method to extract agent names from activities
  private extractAgentNamesFromActivities(activities: AgentCallActivity[], agentMap: Map<number, AgentInfo>): void {
    // Track name statistics for debugging
    const nameStats = {
      totalActivities: activities.length,
      activitiesWithAccountNumber: 0,
      activitiesWithAccountName: 0,
      validAgentNames: 0,
      rejectedNames: [] as string[],
    };
    
    activities.forEach(activity => {
      if (activity.accountNumber) {
        nameStats.activitiesWithAccountNumber++;
        
        const agentId = parseInt(activity.accountNumber);
        if (!isNaN(agentId)) {
          const existingAgent = agentMap.get(agentId);
          const activityName = activity.accountName;
          
          if (activityName) {
            nameStats.activitiesWithAccountName++;
            
            // Enhanced name validation - be more flexible with what we accept as a real name
            const isValidName = this.isValidAgentName(activityName, agentId);
            
            if (isValidName) {
              nameStats.validAgentNames++;
              
              // Prefer activity names over existing fallback names, or if we don't have this agent yet
              if (!existingAgent || existingAgent.source !== 'activity' || existingAgent.name.startsWith('Agent ')) {
                agentMap.set(agentId, {
                  id: agentId,
                  name: activityName,
                  accountNumber: activity.accountNumber,
                  customerId: activity.customerId,
                  source: 'activity',
                });
              }
            } else {
              nameStats.rejectedNames.push(activityName);
            }
          }
        }
      }
    });

    console.log('Agent name extraction statistics:', nameStats);
    console.log('Sample rejected names:', nameStats.rejectedNames.slice(0, 10));
  }
}

// Create singleton instance
export const lookupService = new LookupService(); 