import { User } from "@/types/user";
import { AuthResponse } from "@/types/auth";

const BASE_URL = process.env.NEXT_PUBLIC_NODE_API_URL;

//TODO Qual o retorno do backend? Só o token, ou o usuário e o token?
export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return response.json();
  },
  //TODO Definir tipo de retorno da promise
  register: async (email: string, password: string) => {
    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return response.json();
  },
};