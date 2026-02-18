import { ApiProperty } from '@nestjs/swagger';
import { AgentPerformanceMetrics } from '../interfaces/agent-performance.interface';

export class AgentPerformanceMetricsDto implements AgentPerformanceMetrics {
  @ApiProperty({ description: 'Number of properties assigned to the agent' })
  assignedProperties: number;

  @ApiProperty({ description: 'Number of closed contracts by the agent' })
  closedContracts: number;

  @ApiProperty({ description: 'Conversion rate (closed contracts / assigned properties)' })
  conversionRate: number;

  @ApiProperty({ description: 'Total value of closed contracts' })
  totalContractValue: number;

  @ApiProperty({ description: 'Average days to close contracts' })
  avgClosureDays: number;

  @ApiProperty({ description: 'Properties grouped by status' })
  propertiesByStatus: {
    REQUEST: number;
    PRE_APPROVED: number;
    PUBLISHED: number;
    INACTIVE: number;
    SOLD: number;
    RENTED: number;
  };

  @ApiProperty({ description: 'Contracts grouped by operation type' })
  contractsByOperation: {
    SALE: number;
    RENT: number;
  };
}

export class AgentPerformanceDto {
  @ApiProperty({ description: 'Agent ID' })
  agentId: string;

  @ApiProperty({ description: 'Agent name' })
  agentName: string;

  @ApiProperty({ description: 'Analysis period' })
  period: string;

  @ApiProperty({ description: 'Performance metrics' })
  metrics: AgentPerformanceMetricsDto;
}

export class AnalyticsFiltersDto {
  @ApiProperty({
    description: 'Analysis period',
    enum: ['month', 'quarter', 'year', 'all'],
    required: false
  })
  period?: 'month' | 'quarter' | 'year' | 'all';

  @ApiProperty({
    description: 'Start date for analysis',
    type: Date,
    required: false
  })
  startDate?: Date;

  @ApiProperty({
    description: 'End date for analysis',
    type: Date,
    required: false
  })
  endDate?: Date;

  @ApiProperty({
    description: 'Operation type filter',
    enum: ['SALE', 'RENT'],
    required: false
  })
  operationType?: 'SALE' | 'RENT';
}