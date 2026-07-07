export type NotificationType = 'promotion' | 'trip' | 'system' | 'payment';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  time: string;
  isRead: boolean;
}

export interface NotificationSection {
  title: string;
  data: Notification[];
}
