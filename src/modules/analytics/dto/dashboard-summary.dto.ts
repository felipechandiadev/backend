import { ApiProperty } from '@nestjs/swagger';
import { AgentPerformanceDto } from './agent-performance.dto';

export class RevenueTrendItemDto {
  @ApiProperty({ description: 'Month label (e.g. Feb 2026)' })
  month: string;

  @ApiProperty({ description: 'Amount in millions (CLP / 1_000_000)' })
  amount: number;
}

export class PropertyDistributionItemDto {
  @ApiProperty({ description: 'Property type name' })
  type: string;

  @ApiProperty({ description: 'Count of properties for this type' })
  count: number;

  @ApiProperty({ description: 'Share percentage (0-100)' })
  percentage: number;
}

export class DashboardSummaryDto {
  @ApiProperty({ description: 'Total recognized company revenue for the current month (millions CLP)' })
  totalRevenueThisMonth: number;

  @ApiProperty({ description: 'Raw total revenue for current month (CLP) — used for diagnostics', required: false })
  rawTotalRevenueThisMonth?: number;

  @ApiProperty({ description: 'Number of payments counted as company/agency revenue for the current month (diagnostic)', required: false })
  agencyPaymentsCountThisMonth?: number;

  @ApiProperty({ description: 'Revenue values for the last 6 months', type: [RevenueTrendItemDto] })
  revenueTrend: RevenueTrendItemDto[];

  @ApiProperty({ description: 'Total number of published/active properties' })
  activeProperties: number;

  @ApiProperty({ description: 'New members registered this month' })
  newMembersThisMonth: number;

  @ApiProperty({ description: 'Average closure days (sales) across the platform' })
  avgClosureDays: number;

  @ApiProperty({ description: 'Distribution of properties by type', type: [PropertyDistributionItemDto] })
  propertyDistribution: PropertyDistributionItemDto[];

  @ApiProperty({ description: 'Agent ranking / performance', type: [AgentPerformanceDto] })
  agentRanking: AgentPerformanceDto[];

  @ApiProperty({ description: 'Human readable analysis period (optional)' })
  period?: string;
}
