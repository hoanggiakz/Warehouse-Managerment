export interface SessionPayload {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  permissions: string[];
}
