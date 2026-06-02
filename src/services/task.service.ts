import { CreateTask, Task, UpdateTask } from "@/types/task";

const BASE_URL = process.env.NEXT_PUBLIC_NODE_API_URL;

const ensureBaseUrl = () => {
  if (!BASE_URL) throw new Error("NEXT_PUBLIC_NODE_API_URL is not defined");
  return BASE_URL;
};

const createHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

// Centraliza checagem de res.ok e extrai mensagem de erro do corpo JSON
const handleResponse = async <T>(res: Response): Promise<T> => {
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      payload && (payload.message || payload.error)
        ? payload.message || payload.error
        : res.statusText;
    throw new Error(message || `Request failed with status ${res.status}`);
  }

  return payload?.data ?? payload;
};

export const taskService = {
  getAll: async (token?: string): Promise<Task[]> => {
    const url = `${ensureBaseUrl()}/api/tasks`;
    const res = await fetch(url, {
      headers: createHeaders(token),
    });
    return handleResponse<Task[]>(res);
  },

  getById: async (id: string, token?: string): Promise<Task> => {
    const url = `${ensureBaseUrl()}/api/tasks/${id}`;
    const res = await fetch(url, {
      headers: createHeaders(token),
    });
    return handleResponse<Task>(res);
  },

  create: async (data: CreateTask, token?: string): Promise<Task> => {
    const url = `${ensureBaseUrl()}/api/tasks`;
    const res = await fetch(url, {
      method: "POST",
      headers: createHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse<Task>(res);
  },

  update: async (
    id: string,
    data: UpdateTask,
    token?: string,
  ): Promise<Task> => {
    const url = `${ensureBaseUrl()}/api/tasks/${id}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: createHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse<Task>(res);
  },

  remove: async (id: string, token?: string): Promise<void> => {
    const url = `${ensureBaseUrl()}/api/tasks/${id}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: createHeaders(token),
    });
    if (!res.ok) {
      await handleResponse(res as any);
    }
  },
};