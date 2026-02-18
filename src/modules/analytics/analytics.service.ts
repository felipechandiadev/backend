import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, SelectQueryBuilder } from 'typeorm';
import { Property } from '../../entities/property.entity';
import { Contract } from '../../entities/contract.entity';
import { User, UserRole } from '../../entities/user.entity';
import { PropertyStatus } from '../../common/enums/property-status.enum';
import { ContractStatus, ContractOperationType } from '../../entities/contract.entity';
import { Payment, PaymentType, PaymentStatus } from '../../entities/payment.entity';
import { AgentPerformance, AgentPerformanceMetrics, AnalyticsFilters, GeographicAnalytics } from './interfaces/agent-performance.interface';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  /**
   * Dashboard summary aggregator used by BackOffice dashboard
   * - Returns revenue (monthly + trend), properties count, new users, avg closure days,
   *   property distribution and agent ranking.
   */
  async getDashboardSummary(filters: AnalyticsFilters = {}): Promise<any> {
    const now = new Date();

    // Current month range
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Revenue (company recognized income) for current month (raw CLP and converted to millions)
    const totalRevenueThisMonthRaw = await this.getAgencyRevenueSum(startOfMonth, endOfMonth);
    const totalRevenueThisMonth = Math.round((totalRevenueThisMonthRaw / 1_000_000) * 10) / 10; // 1 decimal, millions

    // Count of agency-recognized payments in the same range (diagnostic)
    const agencyPaymentsCountThisMonth = await this.paymentRepository.createQueryBuilder('p')
      .select('COUNT(*)', 'count')
      .andWhere('p.status = :status', { status: PaymentStatus.PAID })
      .andWhere('p.isAgencyRevenue = true')
      .andWhere('COALESCE(p.paidAt, p.date) BETWEEN :start AND :end', { start: startOfMonth, end: endOfMonth })
      .getRawOne()
      .then(r => Number(r?.count || 0));

    // Revenue trend (last 6 months)
    const revenueTrend = await this.getRevenueTrend(6);

    // Active / published properties
    const activeProperties = await this.propertyRepository.createQueryBuilder('p')
      .where('p.status = :status', { status: PropertyStatus.PUBLISHED })
      .andWhere('p.deletedAt IS NULL')
      .getCount();

    // New members this month (only COMMUNITY role)
    const newMembersThisMonth = await this.userRepository.createQueryBuilder('u')
      .where('u.createdAt BETWEEN :start AND :end', { start: startOfMonth, end: endOfMonth })
      .andWhere('u.role = :role', { role: UserRole.COMMUNITY })
      .getCount();

    // Average closure days (global, sales)
    const avgClosureDays = await this.getGlobalAverageClosureDays();

    // Property distribution by type
    const propertyDistribution = await this.getPropertyDistribution();

    // Agent ranking (reuse existing service logic)
    const agentRanking = await this.getAllAgentsPerformance({ period: 'month' });

    return {
      totalRevenueThisMonth,
      rawTotalRevenueThisMonth: totalRevenueThisMonthRaw,
      agencyPaymentsCountThisMonth,
      revenueTrend,
      activeProperties,
      newMembersThisMonth,
      avgClosureDays: Math.round(avgClosureDays * 100) / 100,
      propertyDistribution,
      agentRanking,
      period: this.getPeriodString(filters),
    };
  }

  // Sum of all payments recognized as agency/company revenue in the given range
  private async getAgencyRevenueSum(start: Date, end: Date): Promise<number> {
    const qb = this.paymentRepository.createQueryBuilder('p')
      .select('SUM(p.amount)', 'total')
      .andWhere("p.status = :status", { status: PaymentStatus.PAID })
      .andWhere('p.isAgencyRevenue = true')
      .andWhere('COALESCE(p.paidAt, p.date) BETWEEN :start AND :end', { start, end });

    const res = await qb.getRawOne();
    return Number(res?.total || 0);
  }

  private async getRevenueTrend(months = 6): Promise<any[]> {
    const now = new Date();
    const trend: Array<{ month: string; amount: number }> = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const sum = await this.getAgencyRevenueSum(start, end);
      trend.push({
        month: start.toLocaleString('es-CL', { month: 'short', year: 'numeric' }),
        amount: Math.round((sum / 1_000_000) * 10) / 10, // millions, 1 decimal
      });
    }

    return trend;
  }

  private async getGlobalAverageClosureDays(): Promise<number> {
    const result = await this.contractRepository
      .createQueryBuilder('contract')
      .select('AVG(DATEDIFF(contract.updatedAt, contract.createdAt))', 'avgDays')
      .where('contract.status = :status', { status: ContractStatus.CLOSED })
      .andWhere('contract.deletedAt IS NULL')
      .getRawOne();

    return Number(result?.avgDays || 0);
  }

  private async getPropertyDistribution(): Promise<any[]> {
    const results = await this.propertyRepository
      .createQueryBuilder('property')
      .leftJoin('property.propertyType', 'pt')
      .select("COALESCE(pt.name, 'Otro')", 'type')
      .addSelect('COUNT(*)', 'count')
      .where('property.deletedAt IS NULL')
      .groupBy('pt.name')
      .getRawMany();

    const total = results.reduce((s, r) => s + Number(r.count), 0) || 1;

    return results.map(r => ({
      type: r.type,
      count: Number(r.count),
      percentage: Math.round((Number(r.count) / total) * 100),
    }));
  }

  async getAgentPerformance(
    agentId: string,
    filters: AnalyticsFilters = {}
  ): Promise<AgentPerformance> {
    const agent = await this.userRepository.findOne({
      where: { id: agentId, role: UserRole.AGENT },
    });

    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }

    const metrics = await this.calculateAgentMetrics(agentId, filters);
    const period = this.getPeriodString(filters);

    return {
      agentId,
      agentName: agent.name,
      period,
      metrics,
    };
  }

  async getAllAgentsPerformance(
    filters: AnalyticsFilters = {}
  ): Promise<AgentPerformance[]> {
    const take = (filters as any).limit ?? 50;
    const skip = (filters as any).offset ?? 0;

    const agents = await this.userRepository.find({
      where: { role: UserRole.AGENT },
      take,
      skip,
      order: { createdAt: 'DESC' },
    });

    const performances: AgentPerformance[] = [];
    const period = this.getPeriodString(filters);

    // Process agents sequentially to avoid excessive parallel DB load
    for (const agent of agents) {
      try {
        const metrics = await this.calculateAgentMetrics(agent.id, filters);
        performances.push({
          agentId: agent.id,
          agentName: agent.name,
          period,
          metrics,
        });
      } catch (error) {
        this.logger.error(`Error calculating metrics for agent ${agent.id}:`, error);
      }
    }

    return performances;
  }

  private async calculateAgentMetrics(
    agentId: string,
    filters: AnalyticsFilters
  ): Promise<AgentPerformanceMetrics> {
    const dateRange = this.getDateRange(filters);

    // Get assigned properties count
    const assignedProperties = await this.getAssignedPropertiesCount(agentId, dateRange);

    // Get closed contracts count
    const closedContracts = await this.getClosedContractsCount(agentId, dateRange, filters.operationType);

    // Calculate conversion rate
    const conversionRate = assignedProperties > 0 ? (closedContracts / assignedProperties) * 100 : 0;

    // Get total contract value
    const totalContractValue = await this.getTotalContractValue(agentId, dateRange, filters.operationType);

    // Get average closure days
    const avgClosureDays = await this.getAverageClosureDays(agentId, dateRange, filters.operationType);

    // Get properties by status
    const propertiesByStatus = await this.getPropertiesByStatus(agentId, dateRange);

    // Get contracts by operation
    const contractsByOperation = await this.getContractsByOperation(agentId, dateRange);

    return {
      assignedProperties,
      closedContracts,
      conversionRate: Math.round(conversionRate * 100) / 100, // Round to 2 decimal places
      totalContractValue,
      avgClosureDays: Math.round(avgClosureDays * 100) / 100, // Round to 2 decimal places
      propertiesByStatus,
      contractsByOperation,
    };
  }

  private async getAssignedPropertiesCount(
    agentId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<number> {
    const query = this.propertyRepository
      .createQueryBuilder('property')
      .where('property.assignedAgentId = :agentId', { agentId })
      .andWhere('property.deletedAt IS NULL');

    if (dateRange) {
      query.andWhere('property.createdAt BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    return await query.getCount();
  }

  private async getClosedContractsCount(
    agentId: string,
    dateRange?: { start: Date; end: Date },
    operationType?: 'SALE' | 'RENT'
  ): Promise<number> {
    const query = this.contractRepository
      .createQueryBuilder('contract')
      .innerJoin('contract.property', 'property')
      .where('property.assignedAgentId = :agentId', { agentId })
      .andWhere('contract.status = :status', { status: ContractStatus.CLOSED })
      .andWhere('contract.deletedAt IS NULL')
      .andWhere('property.deletedAt IS NULL');

    if (dateRange) {
      query.andWhere('contract.createdAt BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    if (operationType) {
      const contractOp = operationType === 'SALE' ? ContractOperationType.COMPRAVENTA : ContractOperationType.ARRIENDO;
      query.andWhere('contract.operation = :operation', { operation: contractOp });
    }

    return await query.getCount();
  }

  private async getTotalContractValue(
    agentId: string,
    dateRange?: { start: Date; end: Date },
    operationType?: 'SALE' | 'RENT'
  ): Promise<number> {
    const query = this.contractRepository
      .createQueryBuilder('contract')
      .innerJoin('contract.property', 'property')
      .select('SUM(contract.amount)', 'total')
      .where('property.assignedAgentId = :agentId', { agentId })
      .andWhere('contract.status = :status', { status: ContractStatus.CLOSED })
      .andWhere('contract.deletedAt IS NULL')
      .andWhere('property.deletedAt IS NULL');

    if (dateRange) {
      query.andWhere('contract.createdAt BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    if (operationType) {
      const contractOp = operationType === 'SALE' ? ContractOperationType.COMPRAVENTA : ContractOperationType.ARRIENDO;
      query.andWhere('contract.operation = :operation', { operation: contractOp });
    }

    const result = await query.getRawOne();
    return result?.total || 0;
  }

  private async getAverageClosureDays(
    agentId: string,
    dateRange?: { start: Date; end: Date },
    operationType?: 'SALE' | 'RENT'
  ): Promise<number> {
    const query = this.contractRepository
      .createQueryBuilder('contract')
      .innerJoin('contract.property', 'property')
      .select([
        'AVG(DATEDIFF(contract.updatedAt, contract.createdAt)) as avgDays'
      ])
      .where('property.assignedAgentId = :agentId', { agentId })
      .andWhere('contract.status = :status', { status: ContractStatus.CLOSED })
      .andWhere('contract.deletedAt IS NULL')
      .andWhere('property.deletedAt IS NULL');

    if (dateRange) {
      query.andWhere('contract.createdAt BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    if (operationType) {
      const contractOp = operationType === 'SALE' ? ContractOperationType.COMPRAVENTA : ContractOperationType.ARRIENDO;
      query.andWhere('contract.operation = :operation', { operation: contractOp });
    }

    const result = await query.getRawOne();
    return result?.avgDays || 0;
  }

  private async getPropertiesByStatus(
    agentId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    REQUEST: number;
    PRE_APPROVED: number;
    PUBLISHED: number;
    INACTIVE: number;
    SOLD: number;
    RENTED: number;
  }> {
    const query = this.propertyRepository
      .createQueryBuilder('property')
      .select('property.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('property.assignedAgentId = :agentId', { agentId })
      .andWhere('property.deletedAt IS NULL')
      .groupBy('property.status');

    if (dateRange) {
      query.andWhere('property.createdAt BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    const results = await query.getRawMany();

    const statusCounts = {
      REQUEST: 0,
      PRE_APPROVED: 0,
      PUBLISHED: 0,
      INACTIVE: 0,
      SOLD: 0,
      RENTED: 0,
    };

    results.forEach(result => {
      statusCounts[result.status] = parseInt(result.count, 10);
    });

    return statusCounts;
  }

  private async getContractsByOperation(
    agentId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    SALE: number;
    RENT: number;
  }> {
    const query = this.contractRepository
      .createQueryBuilder('contract')
      .innerJoin('contract.property', 'property')
      .select('contract.operation', 'operation')
      .addSelect('COUNT(*)', 'count')
      .where('property.assignedAgentId = :agentId', { agentId })
      .andWhere('contract.status = :status', { status: ContractStatus.CLOSED })
      .andWhere('contract.deletedAt IS NULL')
      .andWhere('property.deletedAt IS NULL')
      .groupBy('contract.operation');

    if (dateRange) {
      query.andWhere('contract.createdAt BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    const results = await query.getRawMany();

    const operationCounts = {
      SALE: 0,
      RENT: 0,
    };

    results.forEach(result => {
      if (result.operation === ContractOperationType.COMPRAVENTA) {
        operationCounts.SALE = parseInt(result.count, 10);
      } else if (result.operation === ContractOperationType.ARRIENDO) {
        operationCounts.RENT = parseInt(result.count, 10);
      }
    });

    return operationCounts;
  }

  async getGeographicAnalytics(filters: AnalyticsFilters = {}): Promise<GeographicAnalytics> {
    const dateRange = this.getDateRange(filters);
    const period = this.getPeriodString(filters);

    // Get efficiency by region
    const efficiencyByRegion = await this.getEfficiencyByRegion(dateRange, filters.operationType);

    // Get efficiency by commune
    const efficiencyByCommune = await this.getEfficiencyByCommune(dateRange, filters.operationType);

    // Get top and lowest performing regions
    const sortedByConversion = [...efficiencyByRegion].sort((a, b) => b.conversionRate - a.conversionRate);
    const topPerformingRegions = sortedByConversion.slice(0, 5);
    const lowestPerformingRegions = sortedByConversion.slice(-5).reverse();

    return {
      period,
      totalRegions: efficiencyByRegion.length,
      totalCommunes: efficiencyByCommune.length,
      efficiencyByRegion,
      efficiencyByCommune,
      topPerformingRegions,
      lowestPerformingRegions,
    };
  }

  private async getEfficiencyByRegion(
    dateRange?: { start: Date; end: Date },
    operationType?: 'SALE' | 'RENT'
  ): Promise<any[]> {
    const query = this.propertyRepository
      .createQueryBuilder('property')
      .leftJoin('property.state', 'region')
      .leftJoin('property.city', 'commune')
      .select([
        'region.name as region',
        'COUNT(DISTINCT property.id) as assignedProperties',
        'COUNT(DISTINCT CASE WHEN contract.id IS NOT NULL AND contract.status = :contractStatus THEN contract.id END) as closedContracts',
        'AVG(CASE WHEN contract.id IS NOT NULL AND contract.status = :contractStatus THEN DATEDIFF(contract.updatedAt, contract.createdAt) END) as avgClosureDays',
        'SUM(CASE WHEN contract.id IS NOT NULL AND contract.status = :contractStatus THEN contract.amount END) as totalContractValue'
      ])
      .leftJoin('contract', 'contract', 'contract.propertyId = property.id')
      .where('property.deletedAt IS NULL')
      .andWhere('region.name IS NOT NULL')
      .setParameters({ contractStatus: ContractStatus.CLOSED })
      .groupBy('region.name')
      .orderBy('region.name');

    if (dateRange) {
      query.andWhere('property.createdAt BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    if (operationType) {
      const contractOp = operationType === 'SALE' ? ContractOperationType.COMPRAVENTA : ContractOperationType.ARRIENDO;
      query.andWhere('contract.operation = :operation', { operation: contractOp });
    }

    const results = await query.getRawMany();

    // Calculate conversion rates and get properties by status for each region
    for (const result of results) {
      const conversionRate = result.assignedProperties > 0 ? (result.closedContracts / result.assignedProperties) * 100 : 0;
      result.conversionRate = Math.round(conversionRate * 100) / 100;
      result.avgClosureDays = result.avgClosureDays || 0;
      result.totalContractValue = result.totalContractValue || 0;

      // Get properties by status for this region
      result.propertiesByStatus = await this.getPropertiesByStatusForLocation(
        { region: result.region },
        dateRange
      );
    }

    return results;
  }

  private async getEfficiencyByCommune(
    dateRange?: { start: Date; end: Date },
    operationType?: 'SALE' | 'RENT'
  ): Promise<any[]> {
    const query = this.propertyRepository
      .createQueryBuilder('property')
      .leftJoin('property.state', 'region')
      .leftJoin('property.city', 'commune')
      .select([
        'region.name as region',
        'commune.name as commune',
        'COUNT(DISTINCT property.id) as assignedProperties',
        'COUNT(DISTINCT CASE WHEN contract.id IS NOT NULL AND contract.status = :contractStatus THEN contract.id END) as closedContracts',
        'AVG(CASE WHEN contract.id IS NOT NULL AND contract.status = :contractStatus THEN DATEDIFF(contract.updatedAt, contract.createdAt) END) as avgClosureDays',
        'SUM(CASE WHEN contract.id IS NOT NULL AND contract.status = :contractStatus THEN contract.amount END) as totalContractValue'
      ])
      .leftJoin('contract', 'contract', 'contract.propertyId = property.id')
      .where('property.deletedAt IS NULL')
      .andWhere('commune.name IS NOT NULL')
      .setParameters({ contractStatus: ContractStatus.CLOSED })
      .groupBy('region.name, commune.name')
      .orderBy('region.name, commune.name');

    if (dateRange) {
      query.andWhere('property.createdAt BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    if (operationType) {
      const contractOp = operationType === 'SALE' ? ContractOperationType.COMPRAVENTA : ContractOperationType.ARRIENDO;
      query.andWhere('contract.operation = :operation', { operation: contractOp });
    }

    const results = await query.getRawMany();

    // Calculate conversion rates and get properties by status for each commune
    for (const result of results) {
      const conversionRate = result.assignedProperties > 0 ? (result.closedContracts / result.assignedProperties) * 100 : 0;
      result.conversionRate = Math.round(conversionRate * 100) / 100;
      result.avgClosureDays = result.avgClosureDays || 0;
      result.totalContractValue = result.totalContractValue || 0;

      // Get properties by status for this commune
      result.propertiesByStatus = await this.getPropertiesByStatusForLocation(
        { region: result.region, commune: result.commune },
        dateRange
      );
    }

    return results;
  }

  private async getPropertiesByStatusForLocation(
    location: { region?: string; commune?: string },
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    REQUEST: number;
    PRE_APPROVED: number;
    PUBLISHED: number;
    INACTIVE: number;
    SOLD: number;
    RENTED: number;
  }> {
    const query = this.propertyRepository
      .createQueryBuilder('property')
      .leftJoin('property.state', 'region')
      .leftJoin('property.city', 'commune')
      .select('property.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('property.deletedAt IS NULL');

    if (location.region) {
      query.andWhere('region.name = :region', { region: location.region });
    }
    if (location.commune) {
      query.andWhere('commune.name = :commune', { commune: location.commune });
    }

    if (dateRange) {
      query.andWhere('property.createdAt BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    query.groupBy('property.status');

    const results = await query.getRawMany();

    const statusCounts = {
      REQUEST: 0,
      PRE_APPROVED: 0,
      PUBLISHED: 0,
      INACTIVE: 0,
      SOLD: 0,
      RENTED: 0,
    };

    results.forEach(result => {
      statusCounts[result.status] = parseInt(result.count, 10);
    });

    return statusCounts;
  }

  private getDateRange(filters: AnalyticsFilters): { start: Date; end: Date } | undefined {
    if (filters.startDate && filters.endDate) {
      return { start: filters.startDate, end: filters.endDate };
    }

    if (filters.period) {
      const now = new Date();
      const start = new Date();

      switch (filters.period) {
        case 'month':
          start.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          start.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          start.setFullYear(now.getFullYear() - 1);
          break;
        case 'all':
          return undefined;
      }

      return { start, end: now };
    }

    return undefined;
  }

  private getPeriodString(filters: AnalyticsFilters): string {
    if (filters.startDate && filters.endDate) {
      return `${filters.startDate.toISOString().split('T')[0]} to ${filters.endDate.toISOString().split('T')[0]}`;
    }

    if (filters.period) {
      return `Last ${filters.period}`;
    }

    return 'All time';
  }
}