export interface Group {
  id: string;
  name: string;
  description?: string;
  participants: string[];
  pastParticipants?: string[];
  creator: string;
  createdAt: any;
  updatedAt: any;
}
