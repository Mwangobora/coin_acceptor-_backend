export type UserResponse = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  status: string;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string | null;
};
