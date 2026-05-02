export interface INotificationProvider {
  send(userId: number, event: string, payload: any): Promise<void>;
}
