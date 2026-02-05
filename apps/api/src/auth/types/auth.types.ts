export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
  companyName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: AuthenticatedUser;
  sessionToken: string;
  expiresAt: Date;
}
