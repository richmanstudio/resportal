import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2, KeyRound, MailCheck, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { inviteAcceptSchema, passwordResetSchema, type InviteAcceptInput, type PasswordResetInput } from "@resportal/shared";
import { apiFetch, setSession } from "../lib/api";

function AuthActionShell(props: { title: string; description: string; icon: LucideIcon; children: ReactNode }) {
  const Icon = props.icon;
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-5 py-10 text-slate-950">
      <div className="w-full max-w-[520px] rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:p-8">
        <div className="mb-7 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
            <Icon size={22} />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">{props.title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">{props.description}</p>
          </div>
        </div>
        {props.children}
      </div>
    </main>
  );
}

function useToken() {
  const [params] = useSearchParams();
  return useMemo(() => params.get("token") ?? "", [params]);
}

export function PasswordResetPage() {
  const token = useToken();
  const [message, setMessage] = useState("");
  const form = useForm<PasswordResetInput>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: { token, password: "" }
  });

  async function onSubmit(values: PasswordResetInput) {
    try {
      const result = await apiFetch<{ message: string }>("/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify(values)
      });
      setMessage(result.message);
    } catch (error) {
      form.setError("root", { message: error instanceof Error ? error.message : "Не удалось обновить пароль" });
    }
  }

  return (
    <AuthActionShell title="Новый пароль" description="Задайте новый пароль для входа в рабочее пространство." icon={KeyRound}>
      {message ? <SuccessMessage message={message} /> : (
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <input type="hidden" {...form.register("token")} />
          <input className="premium-input" type="password" placeholder="Новый пароль" autoComplete="new-password" {...form.register("password")} />
          {form.formState.errors.root ? <ErrorMessage message={form.formState.errors.root.message ?? "Ошибка"} /> : null}
          <button className="premium-button-blue h-12 w-full" disabled={form.formState.isSubmitting}>Сохранить пароль <ArrowRight size={18} /></button>
        </form>
      )}
    </AuthActionShell>
  );
}

export function EmailVerificationPage() {
  const token = useToken();
  const [status, setStatus] = useState<"idle" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function confirm() {
    try {
      const result = await apiFetch<{ message: string }>("/auth/email-verification/confirm", {
        method: "POST",
        body: JSON.stringify({ token })
      });
      setStatus("done");
      setMessage(result.message);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Не удалось подтвердить email");
    }
  }

  return (
    <AuthActionShell title="Подтверждение email" description="Нажмите кнопку, чтобы завершить подтверждение адреса." icon={MailCheck}>
      {status === "done" ? <SuccessMessage message={message} /> : null}
      {status === "error" ? <ErrorMessage message={message} /> : null}
      {status === "idle" ? <button className="premium-button-blue h-12 w-full" onClick={() => void confirm()}>Подтвердить email <ArrowRight size={18} /></button> : null}
    </AuthActionShell>
  );
}

export function InviteAcceptPage() {
  const token = useToken();
  const navigate = useNavigate();
  const form = useForm<InviteAcceptInput>({
    resolver: zodResolver(inviteAcceptSchema),
    defaultValues: { token, password: "" }
  });

  async function onSubmit(values: InviteAcceptInput) {
    try {
      const result = await apiFetch<{ accessToken: string; organization?: { id: string } }>("/auth/invites/accept", {
        method: "POST",
        body: JSON.stringify(values)
      });
      setSession(result.accessToken, result.organization?.id);
      navigate("/dashboard");
    } catch (error) {
      form.setError("root", { message: error instanceof Error ? error.message : "Не удалось принять приглашение" });
    }
  }

  return (
    <AuthActionShell title="Принять приглашение" description="Если у вас еще нет аккаунта, задайте пароль. Если аккаунт уже есть, пароль можно не заполнять." icon={UserPlus}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <input type="hidden" {...form.register("token")} />
        <input className="premium-input" type="password" placeholder="Пароль для нового аккаунта" autoComplete="new-password" {...form.register("password")} />
        {form.formState.errors.root ? <ErrorMessage message={form.formState.errors.root.message ?? "Ошибка"} /> : null}
        <button className="premium-button-blue h-12 w-full" disabled={form.formState.isSubmitting}>Войти в рабочее пространство <ArrowRight size={18} /></button>
      </form>
    </AuthActionShell>
  );
}

function SuccessMessage(props: { message: string }) {
  return (
    <div className="rounded-2xl bg-emerald-50 px-4 py-4 text-sm font-semibold leading-6 text-emerald-700">
      <CheckCircle2 size={18} className="mb-2" />
      {props.message} <Link className="text-emerald-900 underline" to="/login">Перейти ко входу</Link>
    </div>
  );
}

function ErrorMessage(props: { message: string }) {
  return <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-100">{props.message}</div>;
}
