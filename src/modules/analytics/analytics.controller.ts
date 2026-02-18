import {
  Controller,
  Get,
  Param,
  Query,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AgentPerformanceDto, AnalyticsFiltersDto } from './dto/agent-performance.dto';
import { GeographicAnalyticsDto } from './dto/geographic-analytics.dto';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';
import { Audit } from '../../common/interceptors/audit.interceptor';
import { AuditAction, AuditEntityType } from '../../common/enums/audit.enums';
import { UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Analytics')
@Controller('analytics')
@UseInterceptors(ClassSerializerInterceptor)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('agents/:agentId')
  @Audit(AuditAction.VIEW, AuditEntityType.USER, 'Agent performance metrics viewed')
  @ApiOperation({
    summary: 'Get performance metrics for a specific agent',
    description: 'Retrieves detailed performance analytics for an agent including conversion rates, contract values, and property status breakdowns.'
  })
  @ApiParam({
    name: 'agentId',
    description: 'The ID of the agent to get performance metrics for',
    type: String,
  })
  @ApiQuery({
    name: 'period',
    description: 'Analysis period',
    enum: ['month', 'quarter', 'year', 'all'],
    required: false,
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Start date for analysis (ISO 8601 format)',
    type: Date,
    required: false,
  })
  @ApiQuery({
    name: 'endDate',
    description: 'End date for analysis (ISO 8601 format)',
    type: Date,
    required: false,
  })
  @ApiQuery({
    name: 'operationType',
    description: 'Filter by operation type',
    enum: ['SALE', 'RENT'],
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Agent performance metrics retrieved successfully',
    type: AgentPerformanceDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Agent not found',
  })
  async getAgentPerformance(
    @Param('agentId') agentId: string,
    @Query() filters: AnalyticsFiltersDto,
  ): Promise<AgentPerformanceDto> {
    const performance = await this.analyticsService.getAgentPerformance(agentId, filters);
    return performance as AgentPerformanceDto;
  }

  @Get('agents')
  @Audit(AuditAction.VIEW, AuditEntityType.USER, 'All agents performance metrics viewed')
  @ApiOperation({
    summary: 'Get performance metrics for all agents',
    description: 'Retrieves performance analytics for all agents in the system.'
  })
  @ApiQuery({
    name: 'period',
    description: 'Analysis period',
    enum: ['month', 'quarter', 'year', 'all'],
    required: false,
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Start date for analysis (ISO 8601 format)',
    type: Date,
    required: false,
  })
  @ApiQuery({
    name: 'endDate',
    description: 'End date for analysis (ISO 8601 format)',
    type: Date,
    required: false,
  })
  @ApiQuery({
    name: 'operationType',
    description: 'Filter by operation type',
    enum: ['SALE', 'RENT'],
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'All agents performance metrics retrieved successfully',
    type: [AgentPerformanceDto],
  })
  async getAllAgentsPerformance(
    @Query() filters: AnalyticsFiltersDto,
  ): Promise<AgentPerformanceDto[]> {
    const performances = await this.analyticsService.getAllAgentsPerformance(filters);
    return performances as AgentPerformanceDto[];
  }

  @Get('summary')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Audit(AuditAction.VIEW, AuditEntityType.PROPERTY, 'Dashboard summary viewed')
  @ApiOperation({
    summary: 'Get dashboard summary',
    description: 'Aggregated KPIs and small analytics payload for BackOffice dashboard (revenue trend, property distribution, agent ranking, etc.)'
  })
  @ApiResponse({ status: 200, description: 'Dashboard summary', type: DashboardSummaryDto })
  async getDashboardSummary(@Query() filters: AnalyticsFiltersDto): Promise<DashboardSummaryDto> {
    const summary = await this.analyticsService.getDashboardSummary(filters as any);
    return summary as DashboardSummaryDto;
  }

  @Get('geographic')
  @Audit(AuditAction.VIEW, AuditEntityType.PROPERTY, 'Geographic efficiency analytics viewed')
  @ApiOperation({
    summary: 'Get geographic efficiency analytics',
    description: 'Retrieves performance analytics grouped by regions and communes, including conversion rates and top/lowest performing locations.'
  })
  @ApiQuery({
    name: 'period',
    description: 'Analysis period',
    enum: ['month', 'quarter', 'year', 'all'],
    required: false,
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Start date for analysis (ISO 8601 format)',
    type: Date,
    required: false,
  })
  @ApiQuery({
    name: 'endDate',
    description: 'End date for analysis (ISO 8601 format)',
    type: Date,
    required: false,
  })
  @ApiQuery({
    name: 'operationType',
    description: 'Filter by operation type',
    enum: ['SALE', 'RENT'],
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Geographic analytics retrieved successfully',
    type: GeographicAnalyticsDto,
  })
  async getGeographicAnalytics(
    @Query() filters: AnalyticsFiltersDto,
  ): Promise<GeographicAnalyticsDto> {
    const analytics = await this.analyticsService.getGeographicAnalytics(filters);
    return analytics as GeographicAnalyticsDto;
  }
}