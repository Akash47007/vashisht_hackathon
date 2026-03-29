"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { getSession, saveSession } from "../../lib/session";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const existingSession = getSession();
    if (existingSession?.userId) {
      router.replace("/dashboard");
    }
  }, [router]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await api.login({
        email: form.email,
        password: form.password,
      });

      saveSession({
        token: result.token,
        userId: result.userId,
        email: form.email,
      });

      let redirectPath = "/dashboard";
      try {
        await api.getProfile(result.userId);
      } catch {
        redirectPath = "/onboarding";
      }

      setSuccess("Login successful. Redirecting...");
      setTimeout(() => {
        router.push(redirectPath);
      }, 400);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid">
      <article className="card highlight-card">
        <h2>Login to your account</h2>
        <p className="muted">
          Continue from where you left off and track your retirement plan progress.
        </p>
      </article>

      <article className="card">
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <label>
            Password
            <input
              required
              minLength={6}
              type="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="Enter your password"
            />
          </label>

          <div className="actions">
            <button className="btn primary" disabled={loading} type="submit">
              {loading ? "Logging in..." : "Login"}
            </button>
            <a className="btn secondary" href="/onboarding">
              Create new account
            </a>
          </div>

          {error ? <p className="error">{error}</p> : null}
          {success ? <p className="success">{success}</p> : null}
        </form>
      </article>
    </section>
  );
}
