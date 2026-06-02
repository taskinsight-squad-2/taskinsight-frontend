"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";

export default function RegisterTestePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!name || !email || !password) {
      setError("Preencha todos os campos.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      await authService.register(name, email, password);
      router.push("/loginteste");
    } catch (err) {
      setError("Falha no cadastro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-xl border border-slate-200 p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Registro Teste
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Crie sua conta e comece a usar o dashboard de tasks.
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 text-red-700 px-4 py-3">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-xl bg-emerald-50 text-emerald-700 px-4 py-3">
            {success}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700">
            Nome
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
              placeholder="Seu nome"
              required
            />
          </label>

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

          <label className="block text-sm font-medium text-slate-700">
            Confirme a senha
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
            {loading ? "Registrando..." : "Registrar"}
          </button>
        </form>

        <div className="mt-6 text-sm text-slate-500">
          Já tem conta?{" "}
          <button
            type="button"
            onClick={() => router.push("/loginteste")}
            className="font-semibold text-violet-600 hover:text-violet-700"
          >
            Entrar
          </button>
        </div>
      </div>
    </div>
  );
}