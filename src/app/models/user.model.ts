export interface User {
  id?: string;
  cniNumber?: string;
  consularCardNumber?: string;
  phoneNumber: string;
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  placeOfBirth?: string;
  address?: string;
  isDiaspora: boolean;
  isAuthenticated?: boolean;
  registrationDate?: Date;
  lastLoginDate?: Date;
}

export interface RegistrationData {
  accountType: 'local' | 'diaspora';
  cniNumber?: string;
  consularCardNumber?: string;
  phoneNumber: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}

export interface LoginData {
  identifier: string; // phone or email
  password: string;
}
