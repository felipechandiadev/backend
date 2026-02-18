import { PostRequestStatus } from '../enums/post-request-status.enum';

export interface PostRequest {
  requestedAt: Date;
  requestedBy: string; // User ID of the requester
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  message?: string;
  notes?: string;
  status: PostRequestStatus;
}

export interface ChangeHistoryEntry {
  timestamp: Date;
  changedBy: string; // User ID of the person who made the change
  field: string;
  previousValue: any;
  newValue: any;
}

export enum UserType {
  COMMUNITY = 'COMMUNITY',
  ANONYMOUS = 'ANONYMOUS',
}

export interface ViewEntry {
  timestamp: Date;
  userId?: string;
  userType?: UserType; // Added userType field
}

export interface LeadEntry {
  timestamp: Date;
  contactInfo: {
    name?: string;
    email?: string;
    phone?: string;
  };
  message?: string;
  userType?: UserType; // Added userType field
  status?: string; // Added optional status field
}
