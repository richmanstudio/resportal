import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Lock, Mail, Scale, User } from "lucide-react";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from "@resportal/shared";
import { apiFetch, setSession } from "../lib/api";
import loginBgUrl from "../assets/loginbg-app.jpg";
import logoUrl from "../assets/logo-app.png";

type AuthPageProps = {
  mode: "login" | "register";
};

export function AuthPage({ mode }: AuthPageProps) {
  const isRegister = mode === "register";
  const schema = isRegister ? registerSchema : loginSchema;
  const navigate = useNavigate();
  const form = useForm<LoginInput | RegisterInput>({
    resolver: zodResolver(schema),
    defaultValues: isRegister
      ? { email: "", password: "", fullName: "", organizationName: "" }
      : { email: "", password: "" }
  });

  async function onSubmit(values: LoginInput | RegisterInput) {
    try {
      const result = await apiFetch<{ accessToken: string; organization?: { id: string } }>(
        isRegister ? "/auth/register" : "/auth/login",
        {
          method: "POST",
          body: JSON.stringify(values)
        }
      );
      setSession(result.accessToken, result.organization?.id);
      navigate("/dashboard");
    } catch (error) {
      form.setError("root", { message: error instanceof Error ? error.message : "Не удалось войти" });
    }
  }

  const isBusy = form.formState.isSubmitting;

  return (
    <main className="grid min-h-screen bg-[#f7f8fb] text-slate-950 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-slate-950 lg:block">
        <img src={loginBgUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.46),rgba(2,6,23,0.18)_42%,rgba(2,6,23,0.72))]" />
        <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

        <div className="relative z-10 flex min-h-screen flex-col justify-between p-10 xl:p-12">
          <div className="flex items-center gap-4">
            <img src={logoUrl} alt="РЕСПОРТАЛ" className="h-14 w-14 rounded-[18px] object-cover shadow-2xl shadow-black/30" />
            <div>
              <div className="text-xl font-semibold tracking-normal text-white">РЕСПОРТАЛ</div>
              <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-200/80">Legal OS</div>
            </div>
          </div>

          <div className="max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-100 backdrop-blur">
              <Scale size={15} />
              LegalTech CRM
            </div>
            <h1 className="text-[46px] font-semibold leading-[1.05] tracking-normal text-white xl:text-[56px]">
              Операционная система для юридической практики.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-200">
              Дела, клиенты, документы, задачи и процессуальные сроки в одном премиальном рабочем пространстве.
            </p>
            <div className="mt-8 grid max-w-lg gap-3 sm:grid-cols-3">
              <Feature label="Реестр дел" />
              <Feature label="Контроль сроков" />
              <Feature label="Документы" />
            </div>
          </div>

          <div className="max-w-lg rounded-[22px] border border-white/12 bg-white/10 p-4 text-sm leading-6 text-slate-200 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="font-semibold text-white">Для юристов и команд</div>
            <div className="mt-1 text-slate-300">Структурируйте практику так, чтобы каждый рабочий день начинался с ясного списка приоритетов.</div>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8">
        <div className="w-full max-w-[480px]">
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <img src={logoUrl} alt="РЕСПОРТАЛ" className="h-12 w-12 rounded-2xl object-cover" />
            <div>
              <div className="text-lg font-semibold">РЕСПОРТАЛ</div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Legal OS</div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:p-8">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[32px] font-semibold leading-tight tracking-normal text-slate-950">
                  {isRegister ? "Создать аккаунт" : "Войти"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {isRegister
                    ? "Зарегистрируйте пользователя и первое рабочее пространство."
                    : "Войдите в рабочее пространство юридической команды."}
                </p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                {isRegister ? <BriefcaseBusiness size={22} /> : <Lock size={22} />}
              </div>
            </div>

            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              {isRegister ? (
                <>
                  <Field label="ФИО" icon={<User size={18} />}>
                    <input className="premium-input pl-11" autoComplete="name" {...form.register("fullName" as const)} />
                  </Field>
                  <Field label="Организация" icon={<BriefcaseBusiness size={18} />}>
                    <input className="premium-input pl-11" autoComplete="organization" {...form.register("organizationName" as const)} />
                  </Field>
                </>
              ) : null}

              <Field label="Email" icon={<Mail size={18} />}>
                <input className="premium-input pl-11" type="email" autoComplete="email" {...form.register("email")} />
              </Field>
              <Field label="Пароль" icon={<Lock size={18} />}>
                <input className="premium-input pl-11" type="password" autoComplete={isRegister ? "new-password" : "current-password"} {...form.register("password")} />
              </Field>

              {form.formState.errors.root ? (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-100">
                  {form.formState.errors.root.message}
                </div>
              ) : null}

              <button className="premium-button-blue h-12 w-full" disabled={isBusy}>
                {isBusy ? "Проверяем..." : isRegister ? "Создать аккаунт" : "Войти"}
                <ArrowRight size={18} />
              </button>
            </form>

            <div className="mt-6 rounded-[18px] bg-slate-50 px-4 py-4 text-sm text-slate-600">
              {isRegister ? "Уже есть аккаунт?" : "Нет аккаунта?"}{" "}
              <Link className="font-semibold text-blue-700 hover:text-blue-900" to={isRegister ? "/login" : "/register"}>
                {isRegister ? "Войти" : "Зарегистрироваться"}
              </Link>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
            <CheckCircle2 size={15} className="text-emerald-500" />
            Доступ защищен. Секреты не хранятся в коде.
          </div>
        </div>
      </section>
    </main>
  );
}

function Feature(props: { label: string }) {
  return (
    <div className="rounded-[18px] border border-white/12 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur">
      {props.label}
    </div>
  );
}

function Field(props: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{props.label}</span>
      <span className="relative mt-2 block">
        <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400">{props.icon}</span>
        {props.children}
      </span>
    </label>
  );
}
