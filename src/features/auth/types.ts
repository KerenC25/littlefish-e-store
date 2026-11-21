export type Role = 'admin' | 'moderator' | 'user';

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  image?: string;
  role?: Role;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse extends User {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}
