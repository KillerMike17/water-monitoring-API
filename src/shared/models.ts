export enum RoleType {
  Customer = 'CUSTOMER',
  ADMIN = 'ADMIN',
}

export class UserFromToken {
  _id: string;
  role: RoleType;
  //optional fields
  sessionId?: string;
  expiryDate?: number;
}
