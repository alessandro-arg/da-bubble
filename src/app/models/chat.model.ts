export interface Message {
  id: string;
  sender: string;
  text: string;
  createdAt: any;
  reactions?: Reaction[];
  mentions?: string[];
}

export interface MessageSegment {
  text: string;
  mentionUid?: string;
}

export interface Chat {
  id: string;
  participants: string[];
  updatedAt: any;
}

export interface Reaction {
  emoji: string;
  userId: string;
  createdAt: any;
}
