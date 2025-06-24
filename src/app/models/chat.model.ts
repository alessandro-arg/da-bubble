export interface Message {
  id?: string;
  sender: string;
  text: string;
  createdAt: any;
}

export interface Chat {
  id: string;
  participants: string[];
  updatedAt: any;
}
