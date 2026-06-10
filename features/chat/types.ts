export interface Message {
  id: string;
  senderId: string;
  text: string;
  imageUrl?: string;
  createdAt: Date | null;
}

export interface PendingImage {
  tempId: string;
  senderId: string;
  localUri: string;
  status: 'uploading' | 'failed';
}
