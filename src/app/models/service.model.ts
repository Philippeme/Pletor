export interface ServiceCategory {
  id: number;
  fname: string;
  description: string;
  icon: string;
  color: string;
  displayOrder: number;
  isActive: boolean;
  procedures: Service[];
}

export interface Service {
  id: number;
  categoryId: number;
  pname: string;
  shortdesc: string;
  longdesc: string;
  documents: ServiceRequirement[];
  processtime: string;
  servicecost: number;
  currency: string;
  providingAdministration: ProvidingAdministration;
  legaltext?: string;
  published: boolean;
  displayOrder: number;
  isActive: boolean;
  canApplyFor: ApplicantType[];
}

export interface ServiceRequirement {
  id: number;
  name: string;
  description: string;
  isRequired: boolean;
  documentType: DocumentType;
  type: string;
}

export interface LegalText {
  id: number;
  title: string;
  content: string;
  pdfUrl?: string;
}

export interface ProvidingAdministration {
  id: number;
  institutionName: string;
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

export enum ApplicantType {
  SELF = 'self',
  CHILD = 'child',
  OTHER = 'other'
}