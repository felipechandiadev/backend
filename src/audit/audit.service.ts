import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThan } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import {
  AuditAction,
  AuditEntityType,
  RequestSource,
} from '../common/enums/audit.enums';

export interface CreateAuditLogInput {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  description: string;
  metadata?: any;
  oldValues?: any;
  newValues?: any;
  success?: boolean;
  errorMessage?: string;
  source?: RequestSource;
}

export interface AuditLogFilters {
  userId?: string;
  action?: AuditAction;
  entityType?: AuditEntityType;
  entityId?: string;
  success?: boolean;
  source?: RequestSource;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async createAuditLog(input: CreateAuditLogInput): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      userId: input.userId || null,
      ipAddress: this.sanitizeIpAddress(input.ipAddress),
      userAgent: this.sanitizeUserAgent(input.userAgent),
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId || null,
      description: input.description,
      metadata: input.metadata || null,
      oldValues: input.oldValues ? this.sanitizeData(input.oldValues) : null,
      newValues: input.newValues ? this.sanitizeData(input.newValues) : null,
      success: input.success !== undefined ? input.success : true,
      errorMessage: input.errorMessage || null,
      source: input.source || RequestSource.USER,
    });

    return await this.auditLogRepository.save(auditLog);
  }

  async findAuditLogs(
    filters: AuditLogFilters = {},
  ): Promise<[AuditLog[], number]> {
    const queryBuilder = this.auditLogRepository.createQueryBuilder('audit');

    if (filters.userId) {
      queryBuilder.andWhere('audit.userId = :userId', {
        userId: filters.userId,
      });
    }

    if (filters.action) {
      queryBuilder.andWhere('audit.action = :action', {
        action: filters.action,
      });
    }

    if (filters.entityType) {
      queryBuilder.andWhere('audit.entityType = :entityType', {
        entityType: filters.entityType,
      });
    }

    if (filters.entityId) {
      queryBuilder.andWhere('audit.entityId = :entityId', {
        entityId: filters.entityId,
      });
    }

    if (filters.success !== undefined) {
      queryBuilder.andWhere('audit.success = :success', {
        success: filters.success,
      });
    }

    if (filters.source) {
      queryBuilder.andWhere('audit.source = :source', {
        source: filters.source,
      });
    }

    if (filters.dateFrom || filters.dateTo) {
      const dateFilter: any = {};
      if (filters.dateFrom) dateFilter.gte = filters.dateFrom;
      if (filters.dateTo) dateFilter.lte = filters.dateTo;
      queryBuilder.andWhere('audit.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: filters.dateFrom || new Date(0),
        dateTo: filters.dateTo || new Date(),
      });
    }

    queryBuilder.orderBy('audit.createdAt', 'DESC');

    if (filters.limit) {
      queryBuilder.limit(filters.limit);
    }

    if (filters.offset) {
      queryBuilder.offset(filters.offset);
    }

    return await queryBuilder.getManyAndCount();
  }

  async getUserAuditLogs(userId: string, limit = 50): Promise<AuditLog[]> {
    return await this.auditLogRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getEntityAuditLogs(
    entityType: AuditEntityType,
    entityId: string,
    limit = 50,
  ): Promise<AuditLog[]> {
    return await this.auditLogRepository.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getAuditStats(days = 30): Promise<any> {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const stats = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select([
        'COUNT(*) as totalLogs',
        'SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successfulLogs',
        'SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failedLogs',
        'COUNT(DISTINCT userId) as uniqueUsers',
      ])
      .where('audit.createdAt >= :dateFrom', { dateFrom })
      .getRawOne();

    // Action breakdown
    const actionStats = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select(['action', 'COUNT(*) as count'])
      .where('audit.createdAt >= :dateFrom', { dateFrom })
      .groupBy('action')
      .getRawMany();

    // Convert count to number
    actionStats.forEach((stat) => {
      stat.count = parseInt(stat.count, 10);
    });

    // Entity type breakdown
    const entityStats = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select(['entityType', 'COUNT(*) as count'])
      .where('audit.createdAt >= :dateFrom', { dateFrom })
      .groupBy('entityType')
      .getRawMany();

    // Convert count to number
    entityStats.forEach((stat) => {
      stat.count = parseInt(stat.count, 10);
    });

    return {
      period: `${days} days`,
      summary: stats,
      actions: actionStats,
      entities: entityStats,
    };
  }

  async cleanOldLogs(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.auditLogRepository.delete({
      createdAt: LessThan(cutoffDate),
    });

    return result.affected || 0;
  }

  async cleanupInvalidValues(): Promise<void> {
    // Update invalid IP addresses
    await this.auditLogRepository
      .createQueryBuilder()
      .update(AuditLog)
      .set({ ipAddress: null })
      .where('ipAddress IN (:...invalidIps)', {
        invalidIps: ['::1', '127.0.0.1', ''],
      })
      .execute();

    // Update invalid user agents
    await this.auditLogRepository
      .createQueryBuilder()
      .update(AuditLog)
      .set({ userAgent: null })
      .where('userAgent IN (:...invalidAgents)', {
        invalidAgents: ['', 'N/A', 'null'],
      })
      .execute();
  }

  private sanitizeIpAddress(ip: string | undefined): string | null {
    if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === '') {
      return null;
    }
    return ip;
  }

  private sanitizeUserAgent(userAgent: string | undefined): string | null {
    if (
      !userAgent ||
      userAgent === '' ||
      userAgent === 'N/A' ||
      userAgent === 'null'
    ) {
      return null;
    }
    return userAgent;
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };

    // Remove sensitive fields
    const sensitiveFields = [
      'password',
      'passHash',
      'passSalt',
      'token',
      'secret',
      'key',
    ];
    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
