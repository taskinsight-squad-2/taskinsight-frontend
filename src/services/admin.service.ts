import type { Task } from "@/types/task";
import type { User } from "@/types/user";

const BASE_URL = process.env.NEXT_PUBLIC_NODE_API_URL;

const createHeaders = (token?: string) => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

const handleResponse = async <T>(res: Response): Promise<T> => {
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const message = payload?.message || payload?.error || res.statusText;
    throw new ApiError(message || `Request failed with status ${res.status}`, res.status);
  }
  return payload?.data ?? payload;
};

export const adminService = {
  getAllTasks: async (token?: string): Promise<Task[]> => {
    if (!BASE_URL) throw new Error("NEXT_PUBLIC_NODE_API_URL não está definida");
    const res = await fetch(`${BASE_URL}/api/tasks/all`, {
      headers: createHeaders(token),
    });
    return handleResponse<Task[]>(res);
  },

  getAllUsers: async (token?: string): Promise<User[]> => {
    if (!BASE_URL) throw new Error("NEXT_PUBLIC_NODE_API_URL não está definida");
    const res = await fetch(`${BASE_URL}/api/users`, {
      headers: createHeaders(token),
    });
    return handleResponse<User[]>(res);
  },
};
