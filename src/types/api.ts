// Authentication types
export interface AuthRequest {
  type: 'account' | 'customer';
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  expires_in?: number;
}

// Agent Call Activity types
export interface AgentCallActivity {
  id: number;
  sessionId?: string;
  callStartDate?: string;
  callEndDate?: string;
  callStartEpochTime: number;
  callEndEpochTime: number;
  contactName?: string;
  companyName?: string;
  contactNumber?: string;
  isInternalCall: boolean;
  accountName?: string;
  accountNumber?: string;
  departmentName?: string;
  departmentId?: number;
  callDirectionId: number;
  callDirectionDescription?: string;
  callAgentOutcomeId: number;
  callAgentOutcomeDescription?: string;
  totalDuration: number;
  ringDuration: number;
  talkTime: number;
  holdTime: number;
  agentMadeTransferDuration: number;
  agentReceivedTransferDuration: number;
  customerId: number;
  occurredAt: string;
  campaignId: number;
  campaignName?: string;
  campaignNumber?: string;
  callRecordingAvailable: boolean;
  inCallDuration: number;
}

export interface AgentCallActivityResponse {
  page: number;
  take?: number;
  totalCount: number;
  data?: AgentCallActivity[];
}

// Agent Summary types
export interface AgentSummary {
  customerId: number;
  departmentId: number;
  accountId: number;
  inboundConnectedCount: number;
  inboundUnconnectedCount: number;
  outboundConnectedCount: number;
  outboundCount: number;
  connectedCount: number;
  inboundInCallDuration: number;
  outboundInCallDuration: number;
  inboundTotalDuration: number;
  outboundTotalDuration: number;
  inboundConnectedTotalDuration: number;
  outboundConnectedTotalDuration: number;
}

export interface AgentSummaryListResponse {
  data?: AgentSummary[];
  page: number;
  count: number;
}

// API Query parameters
export interface ActivityQueryParams {
  From?: string;
  To?: string;
  DepartmentId?: number;
  DepartmentName?: string;
  AccountId?: number;
  CallDirectionId?: number;
  CallAgentOutcomeId?: number;
  Take?: number;
  Page?: number;
  SearchAfter?: boolean;
  SearchAfterId?: number;
}

export interface SummaryQueryParams {
  From?: string;
  To?: string;
  DepartmentId?: number;
  AccountId?: number;
  Reach?: 0 | 1 | 2; // 0 - External, 1 - Internal, 2 - All
} 