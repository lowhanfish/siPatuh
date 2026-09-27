"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useLogin } from "@/features/auth/hooks/use-auth";
import { getApiErrorMessage } from "@/lib/api-client";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const loginMutation = useLogin();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    try {
      const user = await loginMutation.mutateAsync({
        identifier: identifier.trim(),
        password,
      });
      setPassword("");
      toast.success(`Selamat datang, ${user.nama}.`);
      router.replace(redirectTo);
      router.refresh();
    } catch (error) {
      setPassword("");
      const message = getApiErrorMessage(error);
      setFormError(message);
      toast.error(message);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
      <div>
        <label className="form-label" htmlFor="identifier">
          NIP atau username
        </label>
        <input
          autoComplete="username"
          autoFocus
          className="form-input"
          disabled={loginMutation.isPending}
          id="identifier"
          name="identifier"
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="Masukkan NIP atau username EGOV"
          required
          type="text"
          value={identifier}
        />
      </div>

      <div>
        <label className="form-label" htmlFor="password">
          Password
        </label>
        <input
          autoComplete="current-password"
          className="form-input"
          disabled={loginMutation.isPending}
          id="password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Masukkan password EGOV"
          required
          type="password"
          value={password}
        />
      </div>

      {formError ? (
        <p
          aria-live="polite"
          className="rounded-xl bg-danger-soft px-4 py-3 text-sm leading-6 text-danger"
          role="alert"
        >
          {formError}
        </p>
      ) : null}

      <button
        className="button-primary flex min-h-11 w-full disabled:cursor-not-allowed disabled:opacity-60"
        disabled={loginMutation.isPending}
        type="submit"
      >
        {loginMutation.isPending ? "Memeriksa akun…" : "Masuk ke SIPATUH"}
      </button>
    </form>
  );
}
