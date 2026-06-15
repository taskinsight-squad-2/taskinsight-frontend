import {
  MetricsByStatusResponse,
  MetricsByPriorityResponse,
  AverageTimeResponse,
  ThroughputResponse,
  BacklogResponse,
  ResponseTimeResponse,
  ResolutionTimeResponse,
} from "@/types/analytics";

const BASE_URL = process.env.NEXT_PUBLIC_ANALYTICS_API_URL ?? "";

if (!BASE_URL) {
  console.warn("NEXT_PUBLIC_ANALYTICS_API_URL não está definida. Analytics desabilitado.");
}

async function fetchMetrics<T>(endpoint: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Erro ao buscar ${endpoint}: ${res.status}`);
  }

  return res.json();
}

export const analyticsApi = {
  getByStatus: (token?: string) =>
    fetchMetrics<MetricsByStatusResponse>("/task/metrics/by-status", token),

  getByPriority: (token?: string) =>
    fetchMetrics<MetricsByPriorityResponse>("/task/metrics/by-priority", token),

  getAverageTime: (token?: string) =>
    fetchMetrics<AverageTimeResponse>("/task/metrics/average-time", token),

  getThroughput: (token?: string) =>
    fetchMetrics<ThroughputResponse>("/task/metrics/throughput", token),

  getBacklog: (token?: string) =>
    fetchMetrics<BacklogResponse>("/task/metrics/backlog", token),

  getResponseTime: (token?: string) =>
    fetchMetrics<ResponseTimeResponse>("/task/metrics/response-time", token),

  getResolutionTime: (token?: string) =>
    fetchMetrics<ResolutionTimeResponse>("/task/metrics/resolution-time", token),
};
