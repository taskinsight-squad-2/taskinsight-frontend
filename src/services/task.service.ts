import { Task } from "@/types/task";

const BASE_URL = process.env.NEXT_PUBLIC_NODE_API_URL;

export const taskService = {
  getAll: async (): Promise<Task[]> => {
    const response = await fetch(`${BASE_URL}/tasks`);
    return response.json();
  },

  getById: async (id: string): Promise<Task> => {
    const response = await fetch(`${BASE_URL}/tasks/${id}`);
    return response.json();
  },

  create: async (data: Omit<Task, "id">): Promise<Task> => {
    const response = await fetch(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  update: async (id: string, data: Partial<Task>): Promise<Task> => {
    const response = await fetch(`${BASE_URL}/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return response.json();
  },

<<<<<<< HEAD
  remove: async (id: string) => {
=======
  remove: async (id: string): Promise<void> => {
>>>>>>> 2cc8e53 (Types)
    const response = await fetch(`${BASE_URL}/tasks/${id}`, {
      method: "DELETE",
    });
    return response.json();
  },
};
