export interface Claim {
  id: string;
  userId: string;
  trackingNumber: string;
  applicationId?: string;
  serviceId?: number;
  serviceName?: string;
  
  // Claim Details
  claimType: ClaimType;
  subject: string;
  description: string;
  priority: ClaimPriority;
  category: ClaimCategory;
  
  // Status and Timeline
  status: ClaimStatus;
  submissionDate: Date;
  assignedTo?: string;
  resolution?: ClaimResolution;
  resolutionDate?: Date;
  
  // Attachments
  attachments: ClaimAttachment[];
  
  // Communication
  messages: ClaimMessage[];
  
  // Satisfaction
  satisfactionRating?: number;
  satisfactionComment?: string;
}

export interface ClaimAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadDate: Date;
}

export interface ClaimMessage {
  id: string;
  senderId: string;
  senderType: 'citizen' | 'admin';
  message: string;
  timestamp: Date;
  isRead: boolean;
}

export interface ClaimResolution {
  solution: string;
  compensation?: string;
  nextSteps?: string;
  resolvedBy: string;
  resolutionType: ResolutionType;
}

export enum ClaimType {
  SERVICE_DELAY = 'service_delay',
  SERVICE_QUALITY = 'service_quality',
  PAYMENT_ISSUE = 'payment_issue',
  DOCUMENT_ERROR = 'document_error',
  STAFF_BEHAVIOR = 'staff_behavior',
  SYSTEM_ERROR = 'system_error',
  OTHER = 'other'
}

export enum ClaimPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum ClaimCategory {
  COMPLAINT = 'complaint',
  SUGGESTION = 'suggestion',
  COMPLIMENT = 'compliment',
  INQUIRY = 'inquiry'
}

export enum ClaimStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  ESCALATED = 'escalated'
}

export enum ResolutionType {
  RESOLVED = 'resolved',
  PARTIALLY_RESOLVED = 'partially_resolved',
  REFERRED = 'referred',
  NOT_VALID = 'not_valid'
}