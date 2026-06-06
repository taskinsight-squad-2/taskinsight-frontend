"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Task } from "@/types/task";
import { taskService } from "@/services/task.service";
import { analyticsApi } from "@/services/analytics.service";
import {
  MetricsByStatusResponse,
  MetricsByPriorityResponse,
  AverageTimeResponse,
  ThroughputResponse,
  BacklogResponse,
  ResponseTimeResponse,
} from "@/types/analytics";

interface AnalyticsResult {
  status: MetricsByStatusResponse | null;
  priority: MetricsByPriorityResponse | null;
  averageTime: AverageTimeResponse | null;
  throughput: ThroughputResponse | null;
  backlog: BacklogResponse | null;
  responseTime: ResponseTimeResponse | null;
}

export default function DashboardTestePage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Task["status"]>("PENDING");
  const [priority, setPriority] = useState<Task["priority"]>("MEDIUM");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [analytics, setAnalytics] = useState<AnalyticsResult | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("taskinsight_token");
  }, []);

  async function loadTasks() {
    try {
      const data = await taskService.getAll(token ?? undefined);
      setTasks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao buscar tasks", error);
      setMessage(
        "Não foi possível carregar tasks. Faça login ou verifique a API.",
      );
      setTasks([]);
    }
  }

  async function loadAnalytics() {
    try {
      const status = await analyticsApi.getByStatus(token ?? undefined);

      // Só chama getBacklog se houver tarefas DONE
      let backlog = null;
      if (status.data.DONE.count > 0) {
        try {
          backlog = await analyticsApi.getBacklog(token ?? undefined);
        } catch (error) {
          console.warn("Erro ao buscar backlog:", error);
          backlog = null;
        }
      }

      const [priority, averageTime, throughput, responseTime] =
        await Promise.all([
          analyticsApi.getByPriority(token ?? undefined),
          analyticsApi.getAverageTime(token ?? undefined),
          analyticsApi.getThroughput(token ?? undefined),
          analyticsApi.getResponseTime(token ?? undefined),
        ]);

      setAnalytics({
        status,
        priority,
        averageTime,
        throughput,
        backlog,
        responseTime,
      });
      setAnalyticsError(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : JSON.stringify(error, null, 2);
      console.warn("Analytics não disponível", message);
      setAnalytics(null);
      setAnalyticsError(message);
    }
  }

  useEffect(() => {
    if (!token) {
      router.push("/loginteste");
      return;
    }
    loadTasks();
    loadAnalytics();
  }, [router, token]);

  async function handleSaveTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title || !description) {
      setMessage("Preencha título e descrição.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const body = { title, description, status, priority };
      if (selectedTaskId) {
        await taskService.update(selectedTaskId, body, token ?? undefined);
        setMessage("Task atualizada com sucesso.");
      } else {
        await taskService.create(body, token ?? undefined);
        setMessage("Task criada com sucesso.");
      }
      setTitle("");
      setDescription("");
      setStatus("PENDING");
      setPriority("MEDIUM");
      setSelectedTaskId(null);
      await loadTasks();
      await loadAnalytics();
    } catch (error) {
      setMessage("Erro ao salvar task. Verifique a API e o token.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!taskId) return;
    setLoading(true);
    try {
      await taskService.remove(taskId, token ?? undefined);
      setMessage("Task removida.");
      await loadTasks();
      await loadAnalytics();
    } catch (error) {
      setMessage("Falha ao deletar task.");
    } finally {
      setLoading(false);
    }
  }

  function handleEditTask(task: Task) {
    setSelectedTaskId(task._id);
    setTitle(task.title);
    setDescription(task.description);
    setStatus(task.status);
    setPriority(task.priority);
  }

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("taskinsight_token");
      localStorage.removeItem("taskinsight_user");
    }
    router.push("/loginteste");
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Dashboard Teste
            </h1>
            <p className="mt-2 text-slate-600">
              Crie, edite e delete tasks do usuário logado e veja seus dados de
              analytics.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition"
          >
            Sair
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Formulário de task
            </h2>
            <form className="space-y-4" onSubmit={handleSaveTask}>
              <label className="block text-sm font-medium text-slate-700">
                Título
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  placeholder="Ex: Criar nova rota"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Descrição
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  placeholder="Detalhe o que precisa ser feito"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Status
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as Task["status"])
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="DONE">DONE</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Prioridade
                  <select
                    value={priority}
                    onChange={(e) =>
                      setPriority(e.target.value as Task["priority"])
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                  </select>
                </label>
              </div>

              <div className="flex gap-3 items-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700 transition disabled:opacity-70"
                >
                  {selectedTaskId ? "Atualizar task" : "Criar task"}
                </button>
                {selectedTaskId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTaskId(null);
                      setTitle("");
                      setDescription("");
                      setStatus("PENDING");
                      setPriority("MEDIUM");
                      setMessage("");
                    }}
                    className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancelar edição
                  </button>
                )}
              </div>
            </form>

            {message && (
              <p className="mt-4 text-sm text-slate-600">{message}</p>
            )}
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Minhas tasks
                  </h2>
                  <p className="text-sm text-slate-500">
                    Total de tasks do usuário logado.
                  </p>
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">
                  {tasks.length} items
                </span>
              </div>

              <div className="space-y-3">
                {tasks.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-500">
                    Nenhuma task encontrada.
                  </p>
                ) : (
                  tasks.map((task, index) => (
                    <div
                      key={task._id ?? index}
                      className="rounded-3xl border border-slate-200 p-4 hover:border-violet-300 transition"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {task.title}
                          </p>
                          <p className="text-sm text-slate-500">
                            {task.description}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.15em] text-slate-700">
                            {task.priority}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.15em] text-slate-700">
                            {task.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditTask(task)}
                          className="rounded-2xl border border-violet-500 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50 transition"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task._id)}
                          className="rounded-2xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 transition"
                        >
                          Deletar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900">
                  Analytics
                </h2>
                <p className="text-sm text-slate-500">
                  Resumo de métricas geradas pela FastAPI.
                </p>
              </div>
              {analytics?.status ? (
                <div className="space-y-8">
                  {/* Status Metrics */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-4">
                      Métricas por Status
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-3xl bg-slate-50 p-4">
                        <p className="text-sm font-medium text-slate-500">
                          Total de tasks
                        </p>
                        <p className="mt-2 text-3xl font-bold text-slate-900">
                          {analytics.status.data.total_tasks}
                        </p>
                      </div>
                      <div className="rounded-3xl bg-slate-50 p-4">
                        <p className="text-sm font-medium text-slate-500">
                          PENDING
                        </p>
                        <p className="mt-2 text-2xl font-bold text-amber-600">
                          {analytics.status.data.PENDING.count}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {analytics.status.data.PENDING.percent}%
                        </p>
                      </div>
                      <div className="rounded-3xl bg-slate-50 p-4">
                        <p className="text-sm font-medium text-slate-500">
                          IN_PROGRESS
                        </p>
                        <p className="mt-2 text-2xl font-bold text-blue-600">
                          {analytics.status.data.IN_PROGRESS.count}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {analytics.status.data.IN_PROGRESS.percent}%
                        </p>
                      </div>
                      <div className="rounded-3xl bg-slate-50 p-4">
                        <p className="text-sm font-medium text-slate-500">
                          DONE
                        </p>
                        <p className="mt-2 text-2xl font-bold text-green-600">
                          {analytics.status.data.DONE.count}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {analytics.status.data.DONE.percent}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Priority Metrics */}
                  {analytics.priority && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-4">
                        Métricas por Prioridade
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="rounded-3xl bg-slate-50 p-4">
                          <p className="text-sm font-medium text-slate-500">
                            HIGH
                          </p>
                          <p className="mt-2 text-3xl font-bold text-red-600">
                            {analytics.priority.data.HIGH.count}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {analytics.priority.data.HIGH.percent}%
                          </p>
                        </div>
                        <div className="rounded-3xl bg-slate-50 p-4">
                          <p className="text-sm font-medium text-slate-500">
                            MEDIUM
                          </p>
                          <p className="mt-2 text-3xl font-bold text-amber-600">
                            {analytics.priority.data.MEDIUM.count}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {analytics.priority.data.MEDIUM.percent}%
                          </p>
                        </div>
                        <div className="rounded-3xl bg-slate-50 p-4">
                          <p className="text-sm font-medium text-slate-500">
                            LOW
                          </p>
                          <p className="mt-2 text-3xl font-bold text-green-600">
                            {analytics.priority.data.LOW.count}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {analytics.priority.data.LOW.percent}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Average Time Metric */}
                  {analytics.averageTime && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-4">
                        Tempo Médio de Conclusão
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="rounded-3xl bg-slate-50 p-4">
                          <p className="text-sm font-medium text-slate-500">
                            Horas
                          </p>
                          <p className="mt-2 text-3xl font-bold text-slate-900">
                            {analytics.averageTime.data.average_time_hours.toFixed(
                              2,
                            )}
                          </p>
                        </div>
                        <div className="rounded-3xl bg-slate-50 p-4">
                          <p className="text-sm font-medium text-slate-500">
                            Dias
                          </p>
                          <p className="mt-2 text-3xl font-bold text-slate-900">
                            {analytics.averageTime.data.average_time_days.toFixed(
                              2,
                            )}
                          </p>
                        </div>
                        <div className="rounded-3xl bg-slate-50 p-4">
                          <p className="text-sm font-medium text-slate-500">
                            Segundos
                          </p>
                          <p className="mt-2 text-3xl font-bold text-slate-900">
                            {analytics.averageTime.data.average_time_seconds.toFixed(
                              0,
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Throughput Chart */}
                  {analytics.throughput &&
                    analytics.throughput.data.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-4">
                          Throughput (Tasks por Dia)
                        </h3>
                        <div className="rounded-3xl bg-slate-50 p-4">
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={analytics.throughput.data}>
                              <CartesianGrid stroke="#e2e8f0" />
                              <XAxis
                                dataKey="day"
                                stroke="#64748b"
                                style={{ fontSize: "0.875rem" }}
                              />
                              <YAxis
                                stroke="#64748b"
                                style={{ fontSize: "0.875rem" }}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "#fff",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: "8px",
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey="count"
                                stroke="#7c3aed"
                                strokeWidth={2}
                                dot={{ fill: "#7c3aed", r: 4 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  {(!analytics.throughput ||
                    analytics.throughput.data.length === 0) && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-4">
                        Throughput (Tasks por Dia)
                      </h3>
                      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-500">
                        Dados Insuficientes para analytics
                      </div>
                    </div>
                  )}

                  {/* Backlog Chart */}
                  {analytics.backlog && analytics.backlog.data.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-4">
                        Evolução do Backlog
                      </h3>
                      <div className="rounded-3xl bg-slate-50 p-4">
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={analytics.backlog.data}>
                            <CartesianGrid stroke="#e2e8f0" />
                            <XAxis
                              dataKey="date"
                              stroke="#64748b"
                              style={{ fontSize: "0.875rem" }}
                            />
                            <YAxis
                              stroke="#64748b"
                              style={{ fontSize: "0.875rem" }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#fff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                              }}
                            />
                            <Bar
                              dataKey="criadas"
                              fill="#3b82f6"
                              name="Criadas"
                            />
                            <Bar
                              dataKey="finalizadas"
                              fill="#10b981"
                              name="Finalizadas"
                            />
                            <Bar
                              dataKey="backlog"
                              fill="#ef4444"
                              name="Backlog"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                  {(!analytics.backlog ||
                    analytics.backlog.data.length === 0) && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-4">
                        Evolução do Backlog
                      </h3>
                      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-500">
                        Dados Insuficientes para analytics
                      </div>
                    </div>
                  )}

                  {/* Response Time Chart */}
                  {analytics.responseTime &&
                    analytics.responseTime.data.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-4">
                          SLA de Tempo de Resposta
                        </h3>
                        <div className="rounded-3xl bg-slate-50 p-4">
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={analytics.responseTime.data}>
                              <CartesianGrid stroke="#e2e8f0" />
                              <XAxis
                                dataKey="date"
                                stroke="#64748b"
                                style={{ fontSize: "0.875rem" }}
                              />
                              <YAxis
                                stroke="#64748b"
                                style={{ fontSize: "0.875rem" }}
                                label={{
                                  value: "%",
                                  angle: -90,
                                  position: "insideLeft",
                                }}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "#fff",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: "8px",
                                }}
                                formatter={(value) => `${value}%`}
                              />
                              <Line
                                type="monotone"
                                dataKey="slaPercentage"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                dot={{ fill: "#f59e0b", r: 4 }}
                                name="SLA %"
                              />
                              <Line
                                type="monotone"
                                dataKey="target"
                                stroke="#6b7280"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={{ fill: "#6b7280", r: 4 }}
                                name="Target"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  {(!analytics.responseTime ||
                    analytics.responseTime.data.length === 0) && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-4">
                        SLA de Tempo de Resposta
                      </h3>
                      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-500">
                        Dados Insuficientes para analytics
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-500">
                  <p>
                    Analytics indisponível. Verifique
                    `NEXT_PUBLIC_FASTAPI_ANALYTICS_URL` ou o endpoint
                    `/analytics/user`.
                  </p>
                  {analyticsError && (
                    <pre className="mt-3 overflow-x-auto text-xs text-red-600 bg-red-50 p-3 rounded-xl">
                      {analyticsError}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> hugo-frontend
