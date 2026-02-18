import { Controller, Get, Query, Param, ParseEnumPipe } from '@nestjs/common';
import { AuditService, AuditLogFilters } from './audit.service';
import { AuditLog } from '../entities/audit-log.entity';
import {
  AuditAction,
  AuditEntityType,
  RequestSource,
} from '../common/enums/audit.enums';
import { UserRole } from '../entities/user.entity';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  async getAuditLogs(
    @Query('userId') userId?: string,
    @Query('action') action?: AuditAction,
    @Query('entityType') entityType?: AuditEntityType,
    @Query('entityId') entityId?: string,
    @Query('success') success?: boolean,
    @Query('source') source?: RequestSource,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const filters: AuditLogFilters = {
      userId,
      action,
      entityType,
      entityId,
      success: success !== undefined ? success : undefined,
      source,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      limit: limit || 50,
      offset: offset || 0,
    };

    const [logs, total] = await this.auditService.findAuditLogs(filters);

    return { logs, total };
  }

  @Get('logs/user/:userId')
  async getUserAuditLogs(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ): Promise<AuditLog[]> {
    return await this.auditService.getUserAuditLogs(userId, limit || 50);
  }

  @Get('logs/entity/:entityType/:entityId')
  async getEntityAuditLogs(
    @Param('entityType', new ParseEnumPipe(AuditEntityType))
    entityType: AuditEntityType,
    @Param('entityId') entityId: string,
    @Query('limit') limit?: number,
  ): Promise<AuditLog[]> {
    return await this.auditService.getEntityAuditLogs(
      entityType,
      entityId,
      limit || 50,
    );
  }

  @Get('stats')
  async getAuditStats(@Query('days') days?: number): Promise<any> {
    return await this.auditService.getAuditStats(days || 30);
  }

  @Get('stats/actions')
  async getActionStats(@Query('days') days?: number): Promise<any> {
    const stats = await this.auditService.getAuditStats(days || 30);
    return stats.actions;
  }

  @Get('stats/entities')
  async getEntityStats(@Query('days') days?: number): Promise<any> {
    const stats = await this.auditService.getAuditStats(days || 30);
    return stats.entities;
  }

  @Get('stats/summary')
  async getSummaryStats(@Query('days') days?: number): Promise<any> {
    const stats = await this.auditService.getAuditStats(days || 30);
    return stats.summary;
  }
}
