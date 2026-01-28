const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

interface AuthResponse {
  data: {
    user: AuthUser;
  };
}

interface AuthErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export async function registerUser(data: {
  email: string;
  password: string;
  name?: string;
}): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error: AuthErrorResponse = await response.json();
    throw new Error(error.error.message);
  }

  return response.json();
}

export async function loginUser(data: { email: string; password: string }): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error: AuthErrorResponse = await response.json();
    throw new Error(error.error.message);
  }

  return response.json();
}

export async function logoutUser(): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    const error: AuthErrorResponse = await response.json();
    throw new Error(error.error.message);
  }

  return response.json();
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    const data: AuthResponse = await response.json();
    return data.data.user;
  } catch {
    return null;
  }
}
