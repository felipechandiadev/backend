export interface AgentPerformanceMetrics {
  assignedProperties: number;
  closedContracts: number;
  conversionRate: number;
  totalContractValue: number;
  avgClosureDays: number;
  propertiesByStatus: {
    REQUEST: number;
    PRE_APPROVED: number;
    PUBLISHED: number;
    INACTIVE: number;
    SOLD: number;
    RENTED: number;
  };
  contractsByOperation: {
    SALE: number;
    RENT: number;
  };
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  period: string;
  metrics: AgentPerformanceMetrics;
}

export interface GeographicEfficiency {
  region: string;
  commune: string;
  assignedProperties: number;
  closedContracts: number;
  conversionRate: number;
  avgClosureDays: number;
  totalContractValue: number;
  propertiesByStatus: {
    REQUEST: number;
    PRE_APPROVED: number;
    PUBLISHED: number;
    INACTIVE: number;
    SOLD: number;
    RENTED: number;
  };
}

export interface GeographicAnalytics {
  period: string;
  totalRegions: number;
  totalCommunes: number;
  efficiencyByRegion: GeographicEfficiency[];
  efficiencyByCommune: GeographicEfficiency[];
  topPerformingRegions: GeographicEfficiency[];
  lowestPerformingRegions: GeographicEfficiency[];
}

export interface AnalyticsFilters {
  period?: 'month' | 'quarter' | 'year' | 'all';
  startDate?: Date;
  endDate?: Date;
  operationType?: 'SALE' | 'RENT';
}