import { ApplicantType } from './service.model';

export interface Application {
    id: string;
    userId: string;
    serviceId: number;
    serviceName: string;
    applicantType: ApplicantType;
    applicantDetails?: ApplicantDetails;
    status: ApplicationStatus;
    submissionDate: Date;
    expectedCompletionDate?: Date;
    completionDate?: Date;
    documents: ApplicationDocument[];
    timeline: ApplicationTimeline[];
    payments: Payment[];
    trackingNumber: string;
    notes?: string;
}

export interface ApplicantDetails {
    firstName: string;
    lastName: string;
    relationship?: string; // for 'other' type
    dateOfBirth?: Date;
    placeOfBirth?: string;
}

export interface ApplicationDocument {
    id: string;
    name: string;
    type: DocumentType;
    fileName: string;
    fileUrl: string;
    uploadDate: Date;
    isVerified: boolean;
    verificationDate?: Date;
    verificationNotes?: string;
}

export interface ApplicationTimeline {
    id: string;
    step: string;
    status: TimelineStatus;
    date: Date;
    description: string;
    isCompleted: boolean;
    estimatedDuration?: string;
}

export interface Payment {
    id: string;
    amount: number;
    currency: string;
    description: string;
    method: PaymentMethod;
    status: PaymentStatus;
    date: Date;
    referenceNumber: string;
    isSimulated: boolean;
}

export enum ApplicationStatus {
    DRAFT = 'draft',
    SUBMITTED = 'submitted',
    UNDER_REVIEW = 'under_review',
    PAYMENT_PENDING = 'payment_pending',
    PROCESSING = 'processing',
    READY_FOR_PICKUP = 'ready_for_pickup',
    COMPLETED = 'completed',
    REJECTED = 'rejected',
    CANCELLED = 'cancelled'
}

export enum TimelineStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    SKIPPED = 'skipped'
}

export enum PaymentMethod {
    MTN_MONEY = 'mtn_money',
    ORANGE_MONEY = 'orange_money',
    CREDIT_CARD = 'credit_card',
    BANK_TRANSFER = 'bank_transfer',
    CASH = 'cash'
}

export enum PaymentStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    REFUNDED = 'refunded'
}

export enum DocumentType {
    IDENTITY = 'identity',
    BIRTH_CERTIFICATE = 'birth_certificate',
    MARRIAGE_CERTIFICATE = 'marriage_certificate',
    PHOTO = 'photo',
    RESIDENCE_PROOF = 'residence_proof',
    FISCAL_STAMP = 'fiscal_stamp',
    FORM = 'form',
    AUTHORIZATION = 'authorization'
}