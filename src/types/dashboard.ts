import type {
  MetricsByStatusResponse,
  MetricsByPriorityResponse,
  AverageTimeResponse,
  ThroughputResponse,
  BacklogResponse,
  ResponseTimeResponse,
} from '@/types/analytics'

export type Priority  = 'High' | 'Medium' | 'Low'
export type Status    = 'Pending' | 'InProgress' | 'Done'
export type FilterTab = 'All' | 'Pending' | 'InProgress' | 'Done' | 'Overdue'
export type SortMode  = 'default' | 'created' | 'completed' | 'overdue'

export interface AnalyticsResult {
  status:       MetricsByStatusResponse   | null
  priority:     MetricsByPriorityResponse | null
  averageTime:  AverageTimeResponse       | null
  throughput:   ThroughputResponse        | null
  backlog:      BacklogResponse           | null
  responseTime: ResponseTimeResponse      | null
}

export interface TaskDates {
  created:          string
  started:          string | null
  finished:         string | null
  deadline:         string | null
  originalDeadline: string | null
}
