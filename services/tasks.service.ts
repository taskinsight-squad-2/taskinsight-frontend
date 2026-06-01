const NODE_API_URL = process.env.NEXT_PUBLIC_NODE_API_URL

export interface Task {
  id: string
  title: string
  description: string
  status: 'pending' | 'in-progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
  dueDate: string
  userId: string
  createdAt: string
  updatedAt: string
}

export interface CreateTaskData {
  title: string
  description?: string
  status?: string
  priority?: string
  dueDate?: string
}

async function authApiClient(endpoint: string, options?: RequestInit) {
  const token = typeof window !== 'undefined' 
    ? localStorage.getItem('token') 
    : null

  const res = await fetch(`${NODE_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options?.headers,
    },
  })
  
  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        window.location.href = '/login'
      }
    }
    throw new Error(`Tasks API Error: ${res.statusText}`)
  }
  
  return res.json()
}

export const taskService = {
  getAll: (): Promise<Task[]> => authApiClient('/tasks'),
  
  getById: (id: string): Promise<Task> => authApiClient(`/tasks/${id}`),
  
  create: (data: CreateTaskData): Promise<Task> => authApiClient('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  update: (id: string, data: Partial<CreateTaskData>): Promise<Task> => 
    authApiClient(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string): Promise<void> => authApiClient(`/tasks/${id}`, {
    method: 'DELETE',
  }),
}
