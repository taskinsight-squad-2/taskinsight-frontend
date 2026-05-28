const BASE_URL = process.env.NEXT_PUBLIC_NODE_API_URL;

export const taskService = {
  getAll: async () => {
    const response = await fetch(`${BASE_URL}/tasks`);
    return response.json();
  },

  getById: async (id: string) => {
    const response = await fetch(`${BASE_URL}/tasks/${id}`);
    return response.json();
  },

  create: async (data: unknown) => {
    const response = await fetch(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  update: async (id: string, data: unknown) => {
    const response = await fetch(`${BASE_URL}/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  remove: async (id: string) => {
    const response = await fetch(`${BASE_URL}/tasks/${id}`, { method: "DELETE" });
    return response.json();
  },
};