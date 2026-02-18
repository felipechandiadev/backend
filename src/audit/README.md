# Audit System Implementation

This document describes the comprehensive audit system implemented for the real estate platform backend.

## Overview

The audit system provides complete traceability and security monitoring for all platform operations. It logs user actions, system events, and administrative activities to ensure compliance, security, and operational visibility.

## Components

### 1. AuditLog Entity (`audit-log.entity.ts`)

The core entity that stores all audit information:

- **userId**: ID of the user performing the action (nullable for system actions)
- **ipAddress**: Client IP address (sanitized to prevent logging localhost)
- **userAgent**: Browser/client user agent string
- **action**: Type of action performed (enum: LOGIN, CREATE, UPDATE, DELETE, VIEW)
- **entityType**: Type of entity affected (enum: USER, PROPERTY, CONTRACT, etc.)
- **entityId**: ID of the specific entity (nullable)
- **description**: Human-readable description of the action
- **metadata**: Additional context data (JSON)
- **oldValues**: Previous state of the entity (JSON, for updates)
- **newValues**: New state of the entity (JSON, for creates/updates)
- **success**: Whether the operation succeeded
- **errorMessage**: Error details if operation failed
- **source**: Origin of the action (USER, UI_AUTO, SYSTEM, API)
- **createdAt**: Timestamp of the audit log

**Database Indexes:**
- `IDX_audit_log_user_created` on (userId, createdAt)
- `IDX_audit_log_entity` on (entityType, entityId)
- `IDX_audit_log_action_created` on (action, createdAt)

### 2. Audit Enums (`audit.enums.ts`)

#### AuditAction
- `LOGIN`: User authentication attempts
- `LOGOUT`: User logout actions
- `CREATE`: Entity creation
- `UPDATE`: Entity modification
- `DELETE`: Entity deletion
- `VIEW`: Entity access/viewing
- `EXPORT`: Data export operations
- `IMPORT`: Data import operations
- `ASSIGN`: Role/permission assignments
- `REVOKE`: Role/permission revocations

#### AuditEntityType
- `USER`: User accounts
- `PROPERTY`: Real estate properties
- `CONTRACT`: Rental/purchase contracts
- `PERSON`: People/entities involved
- `MULTIMEDIA`: Media files
- `NOTIFICATION`: System notifications
- `DOCUMENT_TYPE`: Document classifications
- `PROPERTY_TYPE`: Property classifications

#### RequestSource
- `USER`: Direct user actions
- `UI_AUTO`: Automated UI operations
- `SYSTEM`: System-generated actions
- `API`: External API calls

### 3. AuditService (`audit.service.ts`)

Core service for audit log management:

#### Methods:
- `createAuditLog(input)`: Creates a new audit log entry
- `findAuditLogs(filters)`: Retrieves audit logs with filtering and pagination
- `getUserAuditLogs(userId, limit)`: Gets audit logs for a specific user
- `getEntityAuditLogs(entityType, entityId, limit)`: Gets audit logs for a specific entity
- `getAuditStats(days)`: Generates comprehensive audit statistics
- `cleanOldLogs(days)`: Removes audit logs older than specified days
- `cleanupInvalidValues()`: Sanitizes invalid IP addresses and user agents

#### Features:
- **Data Sanitization**: Automatically redacts sensitive fields (passwords, tokens)
- **Fail-Safe Design**: Audit logging failures don't break main operations
- **Performance Optimized**: Uses database indexes for efficient queries
- **Flexible Filtering**: Supports complex queries by user, action, entity, date ranges

### 4. AuditController (`audit.controller.ts`)

REST API endpoints for audit log access:

#### Endpoints:
- `GET /audit/logs`: Get audit logs with filtering
- `GET /audit/logs/user/:userId`: Get logs for specific user
- `GET /audit/logs/entity/:entityType/:entityId`: Get logs for specific entity
- `GET /audit/stats`: Get comprehensive audit statistics
- `GET /audit/stats/actions`: Get action breakdown
- `GET /audit/stats/entities`: Get entity type breakdown
- `GET /audit/stats/summary`: Get summary statistics

#### Query Parameters:
- `userId`, `action`, `entityType`, `entityId`
- `success`, `source`, `dateFrom`, `dateTo`
- `limit`, `offset` for pagination

### 5. AuditInterceptor (`audit.interceptor.ts`)

Automatic audit logging for controller methods:

#### Usage:
```typescript
@Audit(AuditAction.CREATE, AuditEntityType.USER, 'Creating new user account')
@Post('users')
async createUser(@Body() createUserDto: CreateUserDto) {
  return await this.usersService.create(createUserDto);
}
```

#### Features:
- **Automatic Logging**: Intercepts method calls and logs results/errors
- **IP Detection**: Extracts client IP from various headers
- **Entity ID Extraction**: Automatically extracts entity IDs from responses
- **Error Handling**: Logs both successful and failed operations
- **Non-Intrusive**: Audit failures don't affect main business logic

### 6. AuditModule (`audit.module.ts`)

Global module that provides audit services throughout the application.

## Usage Examples

### Manual Audit Logging
```typescript
await this.auditService.createAuditLog({
  userId: 'user-123',
  action: AuditAction.UPDATE,
  entityType: AuditEntityType.PROPERTY,
  entityId: 'property-456',
  description: 'Updated property price',
  oldValues: { price: 100000 },
  newValues: { price: 120000 },
  success: true,
  source: RequestSource.USER,
});
```

### Using the Audit Decorator
```typescript
@Audit(AuditAction.DELETE, AuditEntityType.CONTRACT, 'Contract deletion')
@Delete('contracts/:id')
async deleteContract(@Param('id') id: string) {
  return await this.contractsService.delete(id);
}
```

### Querying Audit Logs
```typescript
// Get recent user activities
const userLogs = await this.auditService.getUserAuditLogs('user-123', 20);

// Get property modification history
const propertyLogs = await this.auditService.getEntityAuditLogs(
  AuditEntityType.PROPERTY,
  'property-456'
);

// Get filtered logs
const [logs, total] = await this.auditService.findAuditLogs({
  action: AuditAction.UPDATE,
  entityType: AuditEntityType.USER,
  dateFrom: new Date('2024-01-01'),
  limit: 50,
});
```

## Security Considerations

1. **Data Sanitization**: Sensitive fields are automatically redacted
2. **Access Control**: Audit endpoints should be protected with appropriate guards
3. **Fail-Safe Operation**: Audit system failures don't break business operations
4. **Performance**: Indexed queries prevent performance degradation
5. **Retention**: Configurable log retention with cleanup utilities

## Integration Points

The audit system integrates with:
- **Authentication System**: Logs login attempts and failures
- **User Management**: Tracks user creation, updates, and role changes
- **Property Management**: Audits all property-related operations
- **Contract Management**: Logs contract lifecycle events
- **File Operations**: Tracks multimedia uploads and access

## Maintenance

### Regular Tasks:
- Monitor audit log table size
- Run cleanup operations for old logs
- Review failed operations for security issues
- Analyze usage patterns for optimization

### Cleanup Commands:
```typescript
// Remove logs older than 90 days
await this.auditService.cleanOldLogs(90);

// Fix invalid data
await this.auditService.cleanupInvalidValues();
```

## API Examples

### Get Recent Audit Logs
```
GET /audit/logs?limit=20&action=LOGIN&success=false
```

### Get User Activity Summary
```
GET /audit/stats?days=7
```

### Get Entity Change History
```
GET /audit/logs/entity/PROPERTY/property-123
```

This audit system provides comprehensive traceability while maintaining performance and security standards required for production real estate platforms.