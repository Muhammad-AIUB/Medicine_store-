"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@medistore/shared";
import { adminApi, ApiRequestError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginInput) => {
    setBusy(true);
    setError(null);
    try {
      await adminApi.login(data);
      router.push("/");
    } catch (e: unknown) {
      setError(e instanceof ApiRequestError ? e.message : "Login failed");
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        noValidate
      >
        <h1 className="text-xl font-bold">MediStore Admin</h1>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Email</span>
          <input {...register("email")} type="email" className={inputCls} autoComplete="username" />
          {errors.email ? <span className="mt-1 block text-xs text-red-600">{errors.email.message}</span> : null}
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Password</span>
          <input {...register("password")} type="password" className={inputCls} autoComplete="current-password" />
          {errors.password ? <span className="mt-1 block text-xs text-red-600">{errors.password.message}</span> : null}
        </label>
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-slate-900 py-2.5 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 bg-white";
