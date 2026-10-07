import { useRef, useState } from "react";
import { postAuth } from "../api/auth";
import PasswordInput from "../components/PasswordInput";

export function ForgotPasswordForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const submitting = useRef(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting.current) return;

    const fields = new FormData(event.currentTarget);
    submitting.current = true;
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const result = await postAuth("forgot-password", {
        email: String(fields.get("email") ?? ""),
      });
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <section>
      <p>Enter your registered email to request a password reset link.</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="recovery-email">Email</label>
        <input
          id="recovery-email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />

        <button type="submit" disabled={busy}>
          {busy ? "Requesting…" : "Send reset link"}
        </button>
      </form>

      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

export function ResetPasswordPage() {
  const [token] = useState(() =>
    new URLSearchParams(window.location.hash.slice(1)).get("token") ?? ""
  );
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const submitting = useRef(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting.current) return;

    const form = event.currentTarget;
    const fields = new FormData(form);
    const password = String(fields.get("password") ?? "");
    const confirmation = String(fields.get("confirmation") ?? "");

    setError("");

    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    if (/\s/u.test(password)) {
      setError("Password must not contain spaces or other whitespace.");
      return;
    }

    submitting.current = true;
    setBusy(true);

    try {
      const result = await postAuth("reset-password", {
        token,
        new_password: password,
      });

      form.reset();
      setMessage(result.message);
      setComplete(true);

      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.search
      );

      window.dispatchEvent(new Event("seekmakan:session-changed"));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="page auth-page">
      <h1>Reset your password</h1>

      {!token ? (
        <p>Open the reset link from your email to continue.</p>
      ) : !complete ? (
        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="reset-password">New password</label>
          <PasswordInput
            id="reset-password"
            name="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
          />

          <small>12–128 characters, without whitespace.</small>

          <label htmlFor="reset-confirmation">Confirm new password</label>
          <PasswordInput
            id="reset-confirmation"
            name="confirmation"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
          />

          <button type="submit" disabled={busy}>
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>
      ) : null}

      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      <p><a href="/login">Return to log in</a></p>
    </main>
  );
}