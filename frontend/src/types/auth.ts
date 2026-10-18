import type { User } from './user';

export type AuthUser = User;

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface DemoAccount {
  id: number;
  name: string;
  email: string;
  role_name: string;
  department: string;
  avatar_color: string;
  password_hint: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}
