const BASE_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL;

export const analyticsService = {
  getSummary: async () => {
    const response = await fetch(`${BASE_URL}/analytics/summary`);
    return response.json();
  },

  getByUser: async (userId: string) => {
    const response = await fetch(`${BASE_URL}/analytics/user/${userId}`);
    return response.json();
  },
};
