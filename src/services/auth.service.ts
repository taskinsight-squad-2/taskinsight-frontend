import { User } from "@/types/user";
import { AuthResponse } from "@/types/auth";

const BASE_URL = process.env.NEXT_PUBLIC_NODE_API_URL;

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    if (!BASE_URL)
      throw new Error("NEXT_PUBLIC_NODE_API_URL não está definido");

    const response = await fetch(`${BASE_URL}/api/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const json = await response.json();
    if (json?.success === false) {
      throw new Error(json.message || json.error || "Erro de autenticação");
    }
    return json.data;
  },

  register: async (
    name: string,
    email: string,
    password: string,
  ): Promise<AuthResponse> => {
    if (!BASE_URL)
      throw new Error("NEXT_PUBLIC_NODE_API_URL não está definido");

    const response = await fetch(`${BASE_URL}/api/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const json = await response.json();
    if (json?.success === false) {
      throw new Error(json.message || json.error || "Erro de cadastro");
    }
    return json.data;
  },

  forgotPassword: async (email: string): Promise<void> => {
    if (!BASE_URL)
      throw new Error("NEXT_PUBLIC_NODE_API_URL não está definido");

    const response = await fetch(`${BASE_URL}/api/users/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.message || "Erro ao enviar email");
    }
  },
};