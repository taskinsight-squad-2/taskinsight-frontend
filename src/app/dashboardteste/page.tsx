"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Task } from "@/types/task";
import { taskService } from "@/services/task.service";
import { analyticsApi } from "@/services/analytics.service";

interface AnalyticsResult {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  averageCompletionRate: number;
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
      setAnalytics({
        totalTasks: status.data.total_tasks,
        completedTasks: status.data.DONE.count,
        pendingTasks: status.data.PENDING.count,
        averageCompletionRate: status.data.DONE.percent,
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
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-slate-900">
                  Analytics
                </h2>
                <p className="text-sm text-slate-500">
                  Resumo de métricas geradas pela FastAPI.
                </p>
              </div>
              {analytics ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-500">
                      Total de tasks
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {analytics.totalTasks}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-500">
                      Concluídas
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {analytics.completedTasks}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-500">
                      Pendentes
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {analytics.pendingTasks}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-500">
                      Taxa média
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {analytics.averageCompletionRate}%
                    </p>
                  </div>
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
}
