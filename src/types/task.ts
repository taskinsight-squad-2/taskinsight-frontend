export type TaskStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "CANCELLED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

<<<<<<< HEAD
=======
export interface DeadlineHistoryEntry {
  oldDate: string | null;
  newDate: string;
  reason: string;
  changedAt: string;
}

>>>>>>> hugo-frontend
export interface Task {
  _id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  userId: string;
  startedAt?: string | null;
  completedAt?: string | null;
  dueDate?: string | null;
<<<<<<< HEAD
=======
  originalDueDate?: string | null;
  deadlineHistory?: DeadlineHistoryEntry[];
>>>>>>> hugo-frontend
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
<<<<<<< HEAD
}
=======
  deadlineChangeReason?: string;
}
>>>>>>> hugo-frontend
