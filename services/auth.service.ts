const NODE_API_URL = process.env.NEXT_PUBLIC_NODE_API_URL;

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

async function authApiClient(endpoint: string, options?: RequestInit) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const res = await fetch(`${NODE_API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }
    throw new Error(`Auth API Error: ${res.statusText}`);
  }

  return res.json();
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const data = await authApiClient("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    if (typeof window !== "undefined" && data.token) {
      localStorage.setItem("token", data.token);
    }

    return data;
  },

  register: async (userData: RegisterData): Promise<AuthResponse> => {
    const data = await authApiClient("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });

    if (typeof window !== "undefined" && data.token) {
      localStorage.setItem("token", data.token);
    }

    return data;
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  },

  getCurrentUser: () => authApiClient("/auth/me"),
};
