export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  lastSeen?: any;
  name: string;
  avatar: string;
  isGuest?: boolean;
  createdAt?: Date;
}