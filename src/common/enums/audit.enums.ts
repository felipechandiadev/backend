export enum AuditAction {
  // Authentication
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',

  // CRUD Operations
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',

  // Business Actions
  VIEW = 'VIEW',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',

  // User Management
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  PROFILE_VIEWED = 'PROFILE_VIEWED',
  ROLE_CHANGED = 'ROLE_CHANGED',
  PERMISSIONS_CHANGED = 'PERMISSIONS_CHANGED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',

  // System Actions
  SYSTEM_EVENT = 'SYSTEM_EVENT',
}

export enum AuditEntityType {
  // User Management
  USER = 'USER',

  // Real Estate
  PROPERTY = 'PROPERTY',
  CONTRACT = 'CONTRACT',
  PROPERTY_TYPE = 'PROPERTY_TYPE',

  // Content Management
  ARTICLE = 'ARTICLE',
  TESTIMONIAL = 'TESTIMONIAL',

  // Company
  TEAM_MEMBER = 'TEAM_MEMBER',
  IDENTITY = 'IDENTITY',
  ABOUT_US = 'ABOUT_US',

  // Media
  MULTIMEDIA = 'MULTIMEDIA',

  // Notifications
  NOTIFICATION = 'NOTIFICATION',

  // Documents
  DOCUMENT_TYPE = 'DOCUMENT_TYPE',

  // People
  PERSON = 'PERSON',

  // System
  SYSTEM = 'SYSTEM',
}

export enum RequestSource {
  USER = 'USER',
  UI_AUTO = 'UI_AUTO',
  SYSTEM = 'SYSTEM',
  API = 'API',
}
