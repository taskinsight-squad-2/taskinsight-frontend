export interface StatusItem {
  count: number;
  percent: number;
}

export interface MetricsByStatusResponse {
  success: boolean;
  data: {
    total_tasks: number;
    PENDING: StatusItem;
    IN_PROGRESS: StatusItem;
    DONE: StatusItem;
    CANCELLED: StatusItem;
  };
}

export interface MetricsByPriorityResponse {
  success: boolean;
  data: {
    total_tasks: number;
    HIGH: StatusItem;
    MEDIUM: StatusItem;
    LOW: StatusItem;
  };
}

export interface AverageTimeResponse {
  success: boolean;
  data: {
    average_time_seconds: number;
    average_time_hours: number;
    average_time_days: number;
  };
}

export interface ThroughputItem {
  day: string;
  count: number;
}

export interface ThroughputResponse {
  success: boolean;
  data: ThroughputItem[];
}

export interface BacklogItem {
  date: string;
  criadas: number;
  finalizadas: number;
  backlog: number;
}

export interface BacklogResponse {
  success: boolean;
  data: BacklogItem[];
}

export interface ResponseTimeItem {
  date: string;
  slaPercentage: number;
  target: number;
}

export interface ResponseTimeResponse {
  success: boolean;
  data: ResponseTimeItem[];
}
