export type AuthenticatedUser = {
  id: string;
  email: string;
  fullName: string;
  status: string;
  mustChangePassword: boolean;
  sessionId: string;
};
