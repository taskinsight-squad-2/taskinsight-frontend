"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";

export default function LoginTestePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!email || !password) {
<<<<<<< HEAD
      setError("Preencha e-mail e senha!");
=======
      setError("Preencha e-mail e senha.");
>>>>>>> hugo-frontend
      return;
    }

    setLoading(true);
    try {
      const response = await authService.login(email, password);
      localStorage.setItem("taskinsight_token", response.token);
      const { password: _password, ...safeUser } = response.user as any; //remove password do localstorage. TODO => backend parar de enviar password.
      localStorage.setItem("taskinsight_user", JSON.stringify(safeUser));
      router.push("/dashboardteste");
    } catch (err) {
      setError("Falha no login. Verifique seus dados.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-xl border border-slate-200 p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Login Teste</h1>
        <p className="text-sm text-slate-500 mb-6">
          Acesse sua conta e veja suas tasks com analytics.
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 text-red-700 px-4 py-3">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700">
            E-mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
              placeholder="seu@email.com"
              required
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Senha
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
              placeholder="••••••••"
              required
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-violet-600 text-white py-3 font-semibold hover:bg-violet-700 transition disabled:opacity-70"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-6 text-sm text-slate-500">
          Ainda não tem conta?{" "}
          <button
            type="button"
            onClick={() => router.push("/registerteste")}
            className="font-semibold text-violet-600 hover:text-violet-700"
          >
            Registrar
          </button>
        </div>
      </div>
    </div>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> hugo-frontend
