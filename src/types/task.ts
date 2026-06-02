export type TaskStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "CANCELLED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  userId: string;
  startedAt?: string | null;
  completedAt?: string | null;
  dueDate?: string | null;
  isDeleted?: boolean;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTask {
  title: string;
  description: string;
  priority?: TaskPriority;
  dueDate?: string;
}

export interface UpdateTask {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
}
