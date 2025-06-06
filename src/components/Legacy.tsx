import React, { useState, useEffect } from 'react';
import { apiService, formatDuration, getTodayDateRange, getThisWeekDateRange, filterActivitiesByDateRange } from '../services/api';
import { lookupService } from '../services/lookupService';
import { AgentSummary } from '../types/api';

interface LegacyProps {
  onLogout: () => void;
}

interface AgentDailyStats {
  agentId: number;
  agentName: string;
  talkTime: number;
  outboundCalls: number;
  inboundCalls: number;
  departmentId?: number;
  departmentName?: string;
}

export const Legacy: React.FC<LegacyProps> = ({ onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [lookupReady, setLookupReady] = useState(false);
  const [todaySummaries, setTodaySummaries] = useState<AgentSummary[]>([]);

  const fetchData = async () => {
    setLoading(true);
    setError('');

    try {
      // Build lookup tables first - this fetches monthly data (force fresh)
      await lookupService.buildLookupTables(true); // Force fresh fetch
      setLookupReady(lookupService.isReady());
      
      // Fetch today's summaries separately since they don't have date fields for filtering
      const todayRange = getTodayDateRange();
      
      const summariesResponse = await apiService.getAgentSummary({
        From: todayRange.from,
        To: todayRange.to,
        Reach: 2,
      });
      
      setTodaySummaries(summariesResponse.data || []);
      
      const lookupStats = lookupService.getStats();
      console.log('Monthly data loaded:', lookupStats);
      
      // Debug name resolution to understand why some agents show as "Agent xxxxx"
      const nameDebug = lookupService.debugNameResolution();
      console.log('Name resolution debug:', nameDebug);
      
      // Debug the specific agents that still show as fallback names
      const missingNames = lookupService.debugMissingNames();
      console.log('Missing names debug:', missingNames.length, 'agents still showing as Agent xxxxx');
      
      // Show agent IDs that need manual name mapping
      const agentsNeedingNames = lookupService.getAgentsNeedingManualNames();
      console.log('Agents needing manual names (copy these IDs for manual mapping):', agentsNeedingNames);
      
      // Inspect the fallback agents to see their raw data
      lookupService.inspectFallbackAgents();

    } catch (err) {
      console.error('Failed to fetch legacy data:', err);
      if (err instanceof Error) {
        if (err.message.includes('401') || err.message.includes('Authentication expired') || err.message.includes('Bad token')) {
          setError('Authentication expired. Please log in again.');
          setTimeout(() => onLogout(), 2000);
          return;
        }
        setError(`Failed to load legacy data: ${err.message}`);
      } else {
        setError('Failed to load legacy data: Unknown error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get available departments for the dropdown
  const availableDepartments = React.useMemo(() => {
    if (lookupReady) {
      return lookupService.getAllDepartments();
    }
    return [];
  }, [lookupReady]);

  // Process monthly data to show today's agent performance
  const agentStats = React.useMemo((): AgentDailyStats[] => {
    if (!lookupReady) return [];

    // Get monthly activities and filter for today
    const monthlyActivities = lookupService.getMonthlyActivities();
    const todayRange = getTodayDateRange();
    const todayActivities = filterActivitiesByDateRange(monthlyActivities, todayRange);

    const agentMap = new Map<number, AgentDailyStats>();

    // Process today's activities to get agent data
    todayActivities.forEach(activity => {
      if (activity.accountNumber) {
        const agentId = parseInt(activity.accountNumber);
        
        if (!isNaN(agentId)) {
          if (!agentMap.has(agentId)) {
            // Use lookup service for consistent naming
            const agentName = lookupService.getAgentName(agentId);
            const departmentName = activity.departmentId
              ? lookupService.getDepartmentName(activity.departmentId)
              : activity.departmentName;

            agentMap.set(agentId, {
              agentId,
              agentName,
              talkTime: 0,
              outboundCalls: 0,
              inboundCalls: 0,
              departmentId: activity.departmentId,
              departmentName,
            });
          }

          const agent = agentMap.get(agentId)!;
          
          // Add talk time from activities (keep in milliseconds - don't convert yet)
          agent.talkTime += (activity.talkTime || 0);
          
          // Count calls by direction (0 = outbound, 1 = inbound - CORRECTED)
          // Only count connected calls (outcome ID 1 = connected based on debug data)
          if (activity.callAgentOutcomeId === 1) {
            if (activity.callDirectionId === 0) {
              agent.outboundCalls++;
            } else if (activity.callDirectionId === 1) {
              agent.inboundCalls++;
            }
          }
        }
      }
    });

    // Enhance with today's summary data for agents not captured in activities
    todaySummaries.forEach(summary => {
      if (!agentMap.has(summary.accountId)) {
        const agentName = lookupService.getAgentName(summary.accountId);

        agentMap.set(summary.accountId, {
          agentId: summary.accountId,
          agentName,
          talkTime: summary.inboundInCallDuration + summary.outboundInCallDuration,
          outboundCalls: summary.outboundConnectedCount,
          inboundCalls: summary.inboundConnectedCount,
          departmentId: summary.departmentId,
          departmentName: summary.departmentId 
            ? lookupService.getDepartmentName(summary.departmentId) 
            : `Department ${summary.departmentId}`,
        });
      } else {
        // Update existing agent with summary data if it provides better info
        const agent = agentMap.get(summary.accountId)!;
        const summaryTalkTime = summary.inboundInCallDuration + summary.outboundInCallDuration;
        
        // Use the higher talk time value
        if (summaryTalkTime > agent.talkTime) {
          agent.talkTime = summaryTalkTime;
        }
        
        // Use summary call counts if they're higher (activities might miss some)
        if (summary.outboundConnectedCount > agent.outboundCalls) {
          agent.outboundCalls = summary.outboundConnectedCount;
        }
        if (summary.inboundConnectedCount > agent.inboundCalls) {
          agent.inboundCalls = summary.inboundConnectedCount;
        }
      }
    });

    // Smart deduplication: Find and merge agents with identical or very similar talk times (likely same person with different IDs)
    const agentsArray = Array.from(agentMap.values());
    const duplicateGroups = new Map<string, AgentDailyStats[]>();
    
    // Group agents by similar talk time + department (likely same person)
    // Use rounded talk time to catch agents with slightly different times (within 30 seconds)
    agentsArray.forEach(agent => {
      const roundedTalkTime = Math.round(agent.talkTime / 30) * 30; // Round to nearest 30 seconds
      const key = `${roundedTalkTime}-${agent.departmentId || 'unknown'}`;
      if (!duplicateGroups.has(key)) {
        duplicateGroups.set(key, []);
      }
      duplicateGroups.get(key)!.push(agent);
    });
    
    // Find groups with multiple agents (potential duplicates)
    const potentialDuplicates = Array.from(duplicateGroups.entries())
      .filter(([_, agents]) => agents.length > 1 && agents[0].talkTime > 0);
    
    // Log potential duplicates for debugging
    console.log('Potential duplicates found:', potentialDuplicates.map(([key, agents]) => ({
      key,
      agents: agents.map(a => ({ name: a.agentName, talkTime: a.talkTime, id: a.agentId }))
    })));
    
    // Merge duplicates: Keep the one with the real name, remove the fallback
    potentialDuplicates.forEach(([_, agents]) => {
      if (agents.length === 2) {
        const [agent1, agent2] = agents;
        
        // Additional validation: talk times should be within 60 seconds of each other
        const timeDifference = Math.abs(agent1.talkTime - agent2.talkTime);
        if (timeDifference > 60) {
          console.log(`Skipping deduplication - time difference too large: ${timeDifference}s between ${agent1.agentName} and ${agent2.agentName}`);
          return;
        }
        
        console.log(`Deduplicating agents: ${agent1.agentName} (${agent1.talkTime}s) and ${agent2.agentName} (${agent2.talkTime}s), difference: ${timeDifference}s`);
        
        // Determine which agent has the real name vs fallback name
        const agent1HasRealName = !agent1.agentName.startsWith('Agent ');
        const agent2HasRealName = !agent2.agentName.startsWith('Agent ');
        
        let keepAgent: AgentDailyStats, removeAgent: AgentDailyStats;
        
        if (agent1HasRealName && !agent2HasRealName) {
          keepAgent = agent1;
          removeAgent = agent2;
        } else if (!agent1HasRealName && agent2HasRealName) {
          keepAgent = agent2;
          removeAgent = agent1;
        } else {
          // Both have real names or both are fallbacks - keep the first one
          keepAgent = agent1;
          removeAgent = agent2;
        }
        
        console.log(`Keeping: ${keepAgent.agentName}, Removing: ${removeAgent.agentName}`);
        
        // Merge the call data (use the higher values)
        keepAgent.outboundCalls = Math.max(keepAgent.outboundCalls, removeAgent.outboundCalls);
        keepAgent.inboundCalls = Math.max(keepAgent.inboundCalls, removeAgent.inboundCalls);
        keepAgent.talkTime = Math.max(keepAgent.talkTime, removeAgent.talkTime);
        
        // Remove the duplicate from the map
        agentMap.delete(removeAgent.agentId);
      }
    });

    // Filter by selected department and sort by talk time descending
    return Array.from(agentMap.values())
      .filter(agent => {
        if (selectedDepartment === 'all') return true;
        return agent.departmentName === selectedDepartment;
      })
      // For today's view, only show agents with productive talk time (> 0)
      .filter(agent => agent.talkTime > 0)
      .sort((a, b) => b.talkTime - a.talkTime);
  }, [selectedDepartment, lookupReady, todaySummaries]);

  // Process monthly data to show this week's agent performance
  const weeklyAgentStats = React.useMemo((): AgentDailyStats[] => {
    if (!lookupReady) return [];

    // Get monthly activities and filter for this week
    const monthlyActivities = lookupService.getMonthlyActivities();
    const weekRange = getThisWeekDateRange();
    const weekActivities = filterActivitiesByDateRange(monthlyActivities, weekRange);

    console.log('=== WEEKLY DATA DEBUG ===');
    console.log(`Week range: ${weekRange.from} to ${weekRange.to}`);
    console.log(`Total monthly activities: ${monthlyActivities.length}, this week: ${weekActivities.length}`);
    
    // Debug the current date and week calculation
    const now = new Date();
    console.log(`Current date: ${now.toISOString()}`);
    console.log(`Day of week: ${now.getDay()} (0=Sunday, 1=Monday, etc.)`);
    
    // Debug some sample activity dates to understand the data
    const sampleActivities = monthlyActivities.slice(0, 5);
    console.log('Sample activity dates:', sampleActivities.map(a => ({
      id: a.id,
      occurredAt: a.occurredAt,
      accountName: a.accountName
    })));
    
    // Debug Alex Hanley's weekly activities
    const alexWeeklyActivities = weekActivities.filter(a => 
      a.accountName && a.accountName.toLowerCase().includes('alex hanley')
    );
    console.log(`Alex Hanley weekly activities: ${alexWeeklyActivities.length}`);
    
    // Count Alex's call directions from activities
    const alexConnectedActivities = alexWeeklyActivities.filter(a => a.callAgentOutcomeId === 0);
    const alexOB = alexConnectedActivities.filter(a => a.callDirectionId === 0).length;
    const alexIB = alexConnectedActivities.filter(a => a.callDirectionId === 1).length;
    console.log(`Alex weekly CONNECTED calls (CORRECTED mapping): ${alexOB} OB, ${alexIB} IB`);
    
    // Also check direction mappings - show ALL direction IDs
    const directionCounts = weekActivities.reduce((acc, a) => {
      acc[a.callDirectionId] = (acc[a.callDirectionId] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    console.log('Weekly call direction distribution (ALL directions):', directionCounts);
    
    // Check if there are outcome IDs that indicate connected vs unconnected
    const outcomeCounts = weekActivities.reduce((acc, a) => {
      acc[a.callAgentOutcomeId] = (acc[a.callAgentOutcomeId] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    console.log('Weekly call outcome distribution:', outcomeCounts);
    
    // Check Alex's calls by both direction AND outcome
    const alexByDirectionAndOutcome = alexWeeklyActivities.reduce((acc, a) => {
      const key = `dir${a.callDirectionId}_out${a.callAgentOutcomeId}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('Alex calls by direction + outcome:', alexByDirectionAndOutcome);

    const agentMap = new Map<number, AgentDailyStats>();

    // Process this week's activities to get agent data
    weekActivities.forEach(activity => {
      if (activity.accountNumber) {
        const agentId = parseInt(activity.accountNumber);
        
        if (!isNaN(agentId)) {
          if (!agentMap.has(agentId)) {
            // Use lookup service for consistent naming
            const agentName = lookupService.getAgentName(agentId);
            const departmentName = activity.departmentId
              ? lookupService.getDepartmentName(activity.departmentId)
              : activity.departmentName;

            agentMap.set(agentId, {
              agentId,
              agentName,
              talkTime: 0,
              outboundCalls: 0,
              inboundCalls: 0,
              departmentId: activity.departmentId,
              departmentName,
            });
          }

          const agent = agentMap.get(agentId)!;
          
          // Add talk time from activities (keep in milliseconds - don't convert yet)
          agent.talkTime += (activity.talkTime || 0);
          
          // Count calls by direction (0 = outbound, 1 = inbound - CORRECTED)
          // Only count connected calls (outcome ID 1 = connected based on debug data)
          if (activity.callAgentOutcomeId === 1) {
            if (activity.callDirectionId === 0) {
              agent.outboundCalls++;
            } else if (activity.callDirectionId === 1) {
              agent.inboundCalls++;
            }
          }
        }
      }
    });

    // Log Alex's data after activity processing
    const alexFromActivities = Array.from(agentMap.values()).find(a => 
      a.agentName.toLowerCase().includes('alex hanley')
    );
    if (alexFromActivities) {
      console.log(`Alex after activity processing: ${alexFromActivities.outboundCalls} OB, ${alexFromActivities.inboundCalls} IB`);
    }

    // Enhance with summary data for more accurate call counts
    // Note: We don't have weekly summaries, so we'll use monthly summaries but only for agents
    // that already appear in weekly activities (to avoid adding agents who weren't active this week)
    const monthlySummaries = lookupService.getMonthlySummaries();
    monthlySummaries.forEach(summary => {
      if (agentMap.has(summary.accountId)) {
        // Agent was active this week, so use summary data for more accurate call counts
        const agent = agentMap.get(summary.accountId)!;
        
        // For weekly view, we want to keep the weekly talk time (from activities)
        // but use summary call counts since the Data Tables tab shows these as correct
        // Note: Using monthly summary counts as proxy for weekly (best we can do)
        
        console.log(`Agent ${agent.agentName}: Activity counts (${agent.outboundCalls} OB, ${agent.inboundCalls} IB) vs Summary counts (${summary.outboundConnectedCount} OB, ${summary.inboundConnectedCount} IB)`);
        
        // Use summary data for call counts since it matches the Data Tables tab
        agent.outboundCalls = summary.outboundConnectedCount;
        agent.inboundCalls = summary.inboundConnectedCount;
      }
    });

    // Apply the same deduplication logic as daily stats
    const agentsArray = Array.from(agentMap.values());
    const duplicateGroups = new Map<string, AgentDailyStats[]>();
    
    // Group agents by similar talk time + department (likely same person)
    agentsArray.forEach(agent => {
      const roundedTalkTime = Math.round(agent.talkTime / 30) * 30; // Round to nearest 30 seconds
      const key = `${roundedTalkTime}-${agent.departmentId || 'unknown'}`;
      if (!duplicateGroups.has(key)) {
        duplicateGroups.set(key, []);
      }
      duplicateGroups.get(key)!.push(agent);
    });
    
    // Find groups with multiple agents (potential duplicates)
    const potentialDuplicates = Array.from(duplicateGroups.entries())
      .filter(([_, agents]) => agents.length > 1 && agents[0].talkTime > 0);
    
    // Merge duplicates for weekly stats too
    potentialDuplicates.forEach(([_, agents]) => {
      if (agents.length === 2) {
        const [agent1, agent2] = agents;
        
        // Additional validation: talk times should be within 60 seconds of each other
        const timeDifference = Math.abs(agent1.talkTime - agent2.talkTime);
        if (timeDifference > 60) {
          return;
        }
        
        // Determine which agent has the real name vs fallback name
        const agent1HasRealName = !agent1.agentName.startsWith('Agent ');
        const agent2HasRealName = !agent2.agentName.startsWith('Agent ');
        
        let keepAgent: AgentDailyStats, removeAgent: AgentDailyStats;
        
        if (agent1HasRealName && !agent2HasRealName) {
          keepAgent = agent1;
          removeAgent = agent2;
        } else if (!agent1HasRealName && agent2HasRealName) {
          keepAgent = agent2;
          removeAgent = agent1;
        } else {
          // Both have real names or both are fallbacks - keep the first one
          keepAgent = agent1;
          removeAgent = agent2;
        }
        
        // Merge the call data (use the higher values)
        keepAgent.outboundCalls = Math.max(keepAgent.outboundCalls, removeAgent.outboundCalls);
        keepAgent.inboundCalls = Math.max(keepAgent.inboundCalls, removeAgent.inboundCalls);
        keepAgent.talkTime = Math.max(keepAgent.talkTime, removeAgent.talkTime);
        
        // Remove the duplicate from the map
        agentMap.delete(removeAgent.agentId);
      }
    });

    // Filter by selected department and sort by talk time descending
    return Array.from(agentMap.values())
      .filter(agent => {
        if (selectedDepartment === 'all') return true;
        return agent.departmentName === selectedDepartment;
      })
      .filter(agent => agent.talkTime > 0 || agent.inboundCalls > 0 || agent.outboundCalls > 0)
      .sort((a, b) => b.talkTime - a.talkTime);
  }, [selectedDepartment, lookupReady]);

  // Process monthly data to show this month's agent performance
  const monthlyAgentStats = React.useMemo((): AgentDailyStats[] => {
    if (!lookupReady) return [];

    // Get all monthly activities (no date filtering - we want the full month)
    const monthlyActivities = lookupService.getMonthlyActivities();
    const monthlySummaries = lookupService.getMonthlySummaries();

    console.log('=== MONTHLY DATA CHECK ===');
    console.log(`Monthly activities: ${monthlyActivities.length}, summaries: ${monthlySummaries.length}`);
    
    // Check raw talk times for specific agents
    const alexActivities = monthlyActivities.filter(a => 
      a.accountName && a.accountName.toLowerCase().includes('alex hanley')
    );
    const alexTotalRaw = alexActivities.reduce((sum, a) => sum + (a.talkTime || 0), 0);
    console.log(`Alex Hanley: ${alexActivities.length} activities, total raw talk time: ${alexTotalRaw}ms = ${alexTotalRaw/1000}s`);
    
    // Check Alex's summary data
    const alexSummary = monthlySummaries.find(s => {
      const agentName = lookupService.getAgentName(s.accountId);
      return agentName.toLowerCase().includes('alex hanley');
    });
    if (alexSummary) {
      const alexSummaryTime = alexSummary.inboundInCallDuration + alexSummary.outboundInCallDuration;
      console.log(`Alex Hanley summary: ${alexSummaryTime}ms (${Math.floor(alexSummaryTime/3600000)}h ${Math.floor((alexSummaryTime%3600000)/60000)}m)`);
    } else {
      console.log('Alex Hanley NOT found in summary data');
      // Show what agents ARE in summary data
      console.log('Summary agents:', monthlySummaries.slice(0, 10).map(s => ({
        id: s.accountId,
        name: lookupService.getAgentName(s.accountId),
        talkTime: s.inboundInCallDuration + s.outboundInCallDuration
      })));
    }

    const agentMap = new Map<number, AgentDailyStats>();

    // Process all monthly activities to get agent data
    monthlyActivities.forEach(activity => {
      if (activity.accountNumber) {
        const agentId = parseInt(activity.accountNumber);
        
        if (!isNaN(agentId)) {
          if (!agentMap.has(agentId)) {
            // Use lookup service for consistent naming
            const agentName = lookupService.getAgentName(agentId);
            const departmentName = activity.departmentId
              ? lookupService.getDepartmentName(activity.departmentId)
              : activity.departmentName;

            agentMap.set(agentId, {
              agentId,
              agentName,
              talkTime: 0,
              outboundCalls: 0,
              inboundCalls: 0,
              departmentId: activity.departmentId,
              departmentName,
            });
          }

          const agent = agentMap.get(agentId)!;
          
          // Add talk time from activities (keep in milliseconds - don't convert yet)
          agent.talkTime += (activity.talkTime || 0);
          
          // Count calls by direction (0 = outbound, 1 = inbound - CORRECTED)
          // Only count connected calls (outcome ID 1 = connected based on debug data)
          if (activity.callAgentOutcomeId === 1) {
            if (activity.callDirectionId === 0) {
              agent.outboundCalls++;
            } else if (activity.callDirectionId === 1) {
              agent.inboundCalls++;
            }
          }
        }
      }
    });

    // Enhance with monthly summary data for agents not captured in activities
    monthlySummaries.forEach(summary => {
      const summaryTalkTime = summary.inboundInCallDuration + summary.outboundInCallDuration;
      
      if (!agentMap.has(summary.accountId)) {
        const agentName = lookupService.getAgentName(summary.accountId);

        agentMap.set(summary.accountId, {
          agentId: summary.accountId,
          agentName,
          talkTime: summaryTalkTime,
          outboundCalls: summary.outboundConnectedCount,
          inboundCalls: summary.inboundConnectedCount,
          departmentId: summary.departmentId,
          departmentName: summary.departmentId 
            ? lookupService.getDepartmentName(summary.departmentId) 
            : `Department ${summary.departmentId}`,
        });
      } else {
        // Always use summary data as it's more complete than activity aggregation
        const agent = agentMap.get(summary.accountId)!;
        
        // Use summary data as the authoritative source for talk time
        agent.talkTime = summaryTalkTime;
        
        // Use summary call counts as they're typically more accurate
        agent.outboundCalls = summary.outboundConnectedCount;
        agent.inboundCalls = summary.inboundConnectedCount;
      }
    });

    // Apply the same deduplication logic as other stats
    const agentsArray = Array.from(agentMap.values());
    const duplicateGroups = new Map<string, AgentDailyStats[]>();
    
    // Group agents by similar talk time + department (likely same person)
    agentsArray.forEach(agent => {
      const roundedTalkTime = Math.round(agent.talkTime / 30) * 30; // Round to nearest 30 seconds
      const key = `${roundedTalkTime}-${agent.departmentId || 'unknown'}`;
      if (!duplicateGroups.has(key)) {
        duplicateGroups.set(key, []);
      }
      duplicateGroups.get(key)!.push(agent);
    });
    
    // Find groups with multiple agents (potential duplicates)
    const potentialDuplicates = Array.from(duplicateGroups.entries())
      .filter(([_, agents]) => agents.length > 1 && agents[0].talkTime > 0);
    
    // Merge duplicates for monthly stats too
    potentialDuplicates.forEach(([_, agents]) => {
      if (agents.length === 2) {
        const [agent1, agent2] = agents;
        
        // Additional validation: talk times should be within 60 seconds of each other
        const timeDifference = Math.abs(agent1.talkTime - agent2.talkTime);
        if (timeDifference > 60) {
          return;
        }
        
        // Determine which agent has the real name vs fallback name
        const agent1HasRealName = !agent1.agentName.startsWith('Agent ');
        const agent2HasRealName = !agent2.agentName.startsWith('Agent ');
        
        let keepAgent: AgentDailyStats, removeAgent: AgentDailyStats;
        
        if (agent1HasRealName && !agent2HasRealName) {
          keepAgent = agent1;
          removeAgent = agent2;
        } else if (!agent1HasRealName && agent2HasRealName) {
          keepAgent = agent2;
          removeAgent = agent1;
        } else {
          // Both have real names or both are fallbacks - keep the first one
          keepAgent = agent1;
          removeAgent = agent2;
        }
        
        // Merge the call data (use the higher values)
        keepAgent.outboundCalls = Math.max(keepAgent.outboundCalls, removeAgent.outboundCalls);
        keepAgent.inboundCalls = Math.max(keepAgent.inboundCalls, removeAgent.inboundCalls);
        keepAgent.talkTime = Math.max(keepAgent.talkTime, removeAgent.talkTime);
        
        // Remove the duplicate from the map
        agentMap.delete(removeAgent.agentId);
      }
    });

    // Filter by selected department and sort by talk time descending
    return Array.from(agentMap.values())
      .filter(agent => {
        if (selectedDepartment === 'all') return true;
        return agent.departmentName === selectedDepartment;
      })
      .filter(agent => agent.talkTime > 0 || agent.inboundCalls > 0 || agent.outboundCalls > 0)
      .sort((a, b) => b.talkTime - a.talkTime);
  }, [selectedDepartment, lookupReady]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">
            Loading monthly data and building lookup tables...
          </p>
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
              Call Statistics
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Today • This Week • This Month • Data source: Monthly cache
              </span>
              {lookupReady && (
                <span className="text-xs text-green-600">
                  Monthly cache: {lookupService.getStats().namedAgents}/{lookupService.getStats().agents} agents named, {lookupService.getStats().departments} depts
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
      <main className="max-w-full mx-auto py-6 sm:px-6 lg:px-8">
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
            {availableDepartments.map(dept => (
              <option key={dept.id} value={dept.name}>{dept.name}</option>
            ))}
          </select>
        </div>

        {/* Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Agent Performance Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Today's Agent Performance
                {selectedDepartment !== 'all' && ` - ${selectedDepartment}`}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Ordered by total talk time ({agentStats.length} agents today)
              </p>
            </div>
            
            <div className="overflow-hidden">
              {agentStats.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Agent Name
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 whitespace-nowrap">
                        Talk Time
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        OB Calls
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        IB Calls
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {agentStats.map((agent, index) => (
                      <tr key={`${agent.agentId}-${index}`} className="hover:bg-gray-50">
                        <td className="px-3 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                          {agent.agentName}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 font-mono w-32 whitespace-nowrap">
                          {formatDuration(agent.talkTime)}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">
                          {agent.outboundCalls}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">
                          {agent.inboundCalls}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-6 py-8 text-center text-gray-500">
                  {selectedDepartment === 'all' 
                    ? 'No agent data available for today'
                    : `No agent data available for ${selectedDepartment} today`
                  }
                </div>
              )}
            </div>
          </div>

          {/* Middle Column - This Week's Performance */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                This Week's Agent Performance
                {selectedDepartment !== 'all' && ` - ${selectedDepartment}`}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Ordered by total talk time ({weeklyAgentStats.length} agents this week)
              </p>
            </div>
            
            <div className="overflow-hidden">
              {weeklyAgentStats.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Agent Name
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 whitespace-nowrap">
                        Talk Time
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        OB Calls
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        IB Calls
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {weeklyAgentStats.map((agent, index) => (
                      <tr key={`weekly-${agent.agentId}-${index}`} className="hover:bg-gray-50">
                        <td className="px-3 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                          {agent.agentName}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 font-mono w-32 whitespace-nowrap">
                          {formatDuration(agent.talkTime)}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">
                          {agent.outboundCalls}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">
                          {agent.inboundCalls}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-6 py-8 text-center text-gray-500">
                  {selectedDepartment === 'all' 
                    ? 'No agent data available for this week'
                    : `No agent data available for ${selectedDepartment} this week`
                  }
                </div>
              )}
            </div>
          </div>

          {/* Right Column - This Month's Performance */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                This Month's Agent Performance
                {selectedDepartment !== 'all' && ` - ${selectedDepartment}`}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Ordered by total talk time ({monthlyAgentStats.length} agents this month)
              </p>
            </div>
            
            <div className="overflow-hidden">
              {monthlyAgentStats.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Agent Name
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 whitespace-nowrap">
                        Talk Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {monthlyAgentStats.map((agent, index) => (
                      <tr key={`monthly-${agent.agentId}-${index}`} className="hover:bg-gray-50">
                        <td className="px-3 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                          {agent.agentName}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 font-mono w-32 whitespace-nowrap">
                          {formatDuration(agent.talkTime)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-6 py-8 text-center text-gray-500">
                  {selectedDepartment === 'all' 
                    ? 'No agent data available for this month'
                    : `No agent data available for ${selectedDepartment} this month`
                  }
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Refresh Button */}
        <div className="mt-6 text-center">
          <button
            onClick={fetchData}
            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Refresh Monthly Data & Lookup Tables
          </button>
        </div>
      </main>
    </div>
  );
}; 