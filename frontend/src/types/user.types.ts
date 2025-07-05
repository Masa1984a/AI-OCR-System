export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',       // 部長
  SUPERVISOR = 'supervisor', // 係長
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  username: string;
  password: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  username?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface InviteUserRequest {
  email: string;
  username: string;
  role?: UserRole;
  message?: string;
}

export interface ChangePasswordRequest {
  newPassword: string;
}

export interface ImportUsersRequest {
  users: CreateUserRequest[];
}

export interface ImportUsersResponse {
  total: number;
  success: number;
  failed: number;
  errors: ImportUserError[];
}

export interface ImportUserError {
  row: number;
  email: string;
  username: string;
  error: string;
}

export interface UsersListResponse {
  users: User[];
  total: number;
}

export interface UsersListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface RoleOption {
  value: UserRole;
  label: string;
}