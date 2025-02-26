export enum RoleType {
  Customer = 'CUSTOMER',
  ADMIN = 'ADMIN',
  TECHNICIAN = 'TECHNICIAN',
}

export class UserFromToken {
  _id: string;
  role: RoleType;
  //optional fields
  sessionId?: string;
  expiryDate?: number;
}
