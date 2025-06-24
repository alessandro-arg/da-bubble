export interface User {
  uid: string;
  name: string;
  email: string;
  avatar: string;
  isGuest?: boolean;
  createdAt?: Date;
  lastSeen?: any;
}
