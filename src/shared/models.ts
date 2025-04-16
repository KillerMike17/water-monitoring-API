export enum RoleType {
  Customer = 'CUSTOMER',
  ADMIN = 'ADMIN',
  TECHNICIAN = 'TECHNICIAN',
  IOT_DEVICE = 'IOT_DEVICE',
}

export class UserFromToken {
  _id: string;
  role: RoleType;
  //optional fields
  sessionId?: string;
  expiryDate?: number;
}
