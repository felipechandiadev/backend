import { Request } from 'express';
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { AuditService } from '../../audit/audit.service';
import {
  AuditAction,
  AuditEntityType,
  RequestSource,
} from '../enums/audit.enums';
import { JweService } from '../../auth/jwe/jwe.service';

export interface AuditMetadata {
  action: AuditAction;
  entityType: AuditEntityType;
  description: string;
  entityId?: string;
}

export function Audit(
  action: AuditAction,
  entityType: AuditEntityType,
  description: string,
  entityId?: string,
) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const metadataTarget = descriptor.value as object;
    Reflect.defineMetadata(
      'audit',
      { action, entityType, description, entityId },
      metadataTarget,
    );
  };
}

type AuditRequest = Request & {
  user?: Record<string, unknown>;
  auditUserId?: string;
};

type UserIdResolver = () => Promise<string | undefined>;

type AuditLogSuccessParams = {
  auditMetadata: AuditMetadata;
  ipAddress?: string;
  userAgent?: string;
  baseUserId?: string;
  resolveUserIdFromToken: UserIdResolver;
  result: unknown;
};

type AuditLogFailureParams = {
  auditMetadata: AuditMetadata;
  ipAddress?: string;
  userAgent?: string;
  baseUserId?: string;
  resolveUserIdFromToken: UserIdResolver;
  error: unknown;
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @Inject(AuditService) private readonly auditService: AuditService,
    private readonly jweService: JweService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<AuditRequest>();
    const handler = context.getHandler();
    const auditMetadata = Reflect.getMetadata('audit', handler) as
      | AuditMetadata
      | undefined;

    if (auditMetadata) {
      const ipAddress = this.getClientIp(request);
      const userAgent = this.getHeaderValue(request, 'user-agent');
      const baseUserId = this.extractUserIdFromRequest(request);
      let tokenUserIdPromise: Promise<string | undefined> | null = null;
      const resolveUserIdFromToken: UserIdResolver = () => {
        if (!tokenUserIdPromise) {
          tokenUserIdPromise = this.extractUserIdFromToken(request);
        }
        return tokenUserIdPromise;
      };

      return next.handle().pipe(
        tap((result) => {
          void this.logAuditSuccess({
            auditMetadata,
            ipAddress,
            userAgent,
            baseUserId,
            resolveUserIdFromToken,
            result,
          });
        }),
        catchError((error) => {
          void this.logAuditFailure({
            auditMetadata,
            ipAddress,
            userAgent,
            baseUserId,
            resolveUserIdFromToken,
            error,
          });
          const normalizedError =
            error instanceof Error ? error : new Error(String(error));
          return throwError(() => normalizedError);
        }),
      );
    }

    return next.handle();
  }

  private async logAuditSuccess(params: AuditLogSuccessParams): Promise<void> {
    try {
      const userId =
        params.baseUserId ??
        this.extractUserIdFromResult(params.result) ??
        (await params.resolveUserIdFromToken());

      const entityId =
        params.auditMetadata.entityId ??
        this.extractEntityId(params.result) ??
        userId;

      await this.auditService.createAuditLog({
        userId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        action: params.auditMetadata.action,
        entityType: params.auditMetadata.entityType,
        entityId,
        description: params.auditMetadata.description,
        success: true,
        source: RequestSource.USER,
      });
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }

  private async logAuditFailure(params: AuditLogFailureParams): Promise<void> {
    try {
      const userId =
        params.baseUserId ?? (await params.resolveUserIdFromToken());
      await this.auditService.createAuditLog({
        userId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        action: params.auditMetadata.action,
        entityType: params.auditMetadata.entityType,
        entityId: params.auditMetadata.entityId ?? userId,
        description: params.auditMetadata.description,
        success: false,
        errorMessage: this.extractErrorMessage(params.error) ?? 'Unknown error',
        source: RequestSource.USER,
      });
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }

  private getClientIp(request: AuditRequest): string | undefined {
    return (
      request.ip ||
      request.socket?.remoteAddress ||
      this.extractForwardedForIp(request) ||
      this.getHeaderValue(request, 'x-real-ip')
    );
  }

  private extractForwardedForIp(request: AuditRequest): string | undefined {
    const forwardedFor = this.getHeaderValue(request, 'x-forwarded-for');
    if (!forwardedFor) {
      return undefined;
    }

    const [first] = forwardedFor
      .split(',')
      .map((ip) => ip.trim())
      .filter((ip) => ip.length > 0);

    return first || undefined;
  }

  private extractUserIdFromRequest(request: AuditRequest): string | undefined {
    const userRecord = this.getRecord(request.user);
    const userId = this.pickUserId(userRecord);
    if (userId) {
      return userId;
    }

    return typeof request.auditUserId === 'string'
      ? request.auditUserId
      : undefined;
  }

  private extractUserIdFromResult(result: unknown): string | undefined {
    if (!this.isRecord(result)) {
      return undefined;
    }

    const directUserId = this.getStringField(result, 'userId');
    if (directUserId) {
      return directUserId;
    }

    const userRecord = this.getRecord(result.user);
    const userCandidate = this.pickUserId(userRecord);
    if (userCandidate) {
      return userCandidate;
    }

    const dataRecord = this.getRecord(result.data);
    const dataUserCandidate = this.pickUserId(this.getRecord(dataRecord?.user));
    if (dataUserCandidate) {
      return dataUserCandidate;
    }

    return undefined;
  }

  private async extractUserIdFromToken(
    request: AuditRequest,
  ): Promise<string | undefined> {
    const token = this.extractAuthorizationToken(request);
    if (!token) {
      return undefined;
    }

    try {
      const payload = (await this.jweService.decrypt(token)) as unknown;
      const payloadRecord = this.getRecord(payload);
      if (!payloadRecord) {
        return undefined;
      }

      return (
        this.pickUserId(payloadRecord) ||
        this.pickUserId(this.getRecord(payloadRecord.user)) ||
        this.getStringField(payloadRecord, 'id')
      );
    } catch {
      return undefined;
    }
  }

  private extractAuthorizationToken(request: AuditRequest): string | undefined {
    const header = this.getHeaderValue(request, 'authorization');
    if (!header) {
      return undefined;
    }

    const token = header.replace(/^Bearer\s+/i, '').trim();
    return token.length > 0 ? token : undefined;
  }

  private extractEntityId(result: unknown): string | undefined {
    if (!this.isRecord(result)) {
      return undefined;
    }

    const entityId =
      this.getStringField(result, 'id') ||
      this.getStringField(result, 'userId') ||
      this.getStringField(result, 'propertyId') ||
      this.getStringField(result, 'contractId');

    if (entityId) {
      return entityId;
    }

    const dataRecord = this.getRecord(result.data);
    return this.getStringField(dataRecord, 'id');
  }

  private getHeaderValue(
    request: AuditRequest,
    headerName: string,
  ): string | undefined {
    const rawValue =
      request.headers[headerName.toLowerCase() as keyof typeof request.headers];
    if (Array.isArray(rawValue)) {
      return rawValue[0];
    }
    return typeof rawValue === 'string' ? rawValue : undefined;
  }

  private pickUserId(
    record: Record<string, unknown> | undefined,
  ): string | undefined {
    if (!record) {
      return undefined;
    }

    return (
      this.getStringField(record, 'id') ||
      this.getStringField(record, 'userId') ||
      this.getStringField(record, 'sub')
    );
  }

  private getStringField(
    record: Record<string, unknown> | undefined,
    field: string,
  ): string | undefined {
    const value = record?.[field];
    return typeof value === 'string' ? value : undefined;
  }

  private getRecord(value: unknown): Record<string, unknown> | undefined {
    return this.isRecord(value) ? value : undefined;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private extractErrorMessage(error: unknown): string | undefined {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return undefined;
  }
}
