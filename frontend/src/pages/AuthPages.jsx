import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { postAuth } from "../api/auth";
import PasswordInput from "../components/PasswordInput";
import AuthForm from "../components/AuthForm";

export function RegisterForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!resendAvailableAt) return;

    function updateCountdown() {
      setSecondsLeft(
        Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000))
      );
    }

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(timer);
  }, [resendAvailableAt]);

  function startCooldown() {
    setSecondsLeft(60);
    setResendAvailableAt(Date.now() + 60_000);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting.current) return;

    const form = event.currentTarget;
    const fields = new FormData(form);
    const password = String(fields.get("password") ?? "");
    const confirmation = String(fields.get("confirmation") ?? "");

    setMessage("");
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
      const result = await postAuth("register", {
        display_name: String(fields.get("display_name") ?? ""),
        email: String(fields.get("email") ?? ""),
        password,
      });

      setMessage(result.message);
      setSubmittedEmail(String(fields.get("email") ?? "").trim());
      startCooldown();
      form.reset();

    } catch (requestError) {
      setError(requestError.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

    async function handleResend() {
    if (
      submitting.current ||
      !submittedEmail ||
      Date.now() < resendAvailableAt
    ) {
      return;
    }

    submitting.current = true;
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const result = await postAuth("resend-verification", {
        email: submittedEmail,
      });

      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      startCooldown();
      submitting.current = false;
      setBusy(false);
    }
  }

    if (submittedEmail) {
    return (
      <section aria-label="Email verification">
        <p>
          <strong>Check your email</strong>
        </p>

        <p>{submittedEmail}</p>

        {message && <p role="status">{message}</p>}
        {error && <p role="alert">{error}</p>}

        <button
          type="button"
          onClick={handleResend}
          disabled={busy || secondsLeft > 0}
        >
          {busy
            ? "Sending…"
            : secondsLeft > 0
              ? `Resend available in ${secondsLeft}s`
              : "Resend verification email"}
        </button>

        <p>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setSubmittedEmail("");
              setMessage("");
              setError("");
            }}
          >
            Use a different email
          </button>
        </p>
      </section>
    );
  }

  return (
    <section>
      <p>Verify your email to activate your SeekMakan account.</p>

      <AuthForm onSubmit={handleSubmit}>
        <label htmlFor="register-name">Display name</label>
        <input
          id="register-name"
          name="display_name"
          autoComplete="nickname"
          maxLength={80}
          required
        />

        <label htmlFor="register-email">Email</label>
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />

        <label htmlFor="register-password">Password</label>
        <PasswordInput
            id="register-password"
            name="password"
            autoComplete="new-password"
            minLength={10}
            maxLength={128}
            aria-describedby="password-help"
            required
        />
        <small id="password-help">
          10–128 characters. No whitespace. Numbers and symbols are optional.
        </small>

        <label htmlFor="register-confirmation">Confirm password</label>
        <PasswordInput
            id="register-confirmation"
            name="confirmation"
            autoComplete="new-password"
            required
        />

        <button type="submit" disabled={busy}>
          {busy ? "Submitting…" : "Create account"}
        </button>
      </AuthForm>

      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

    </section>
  );
}

export function VerifyEmailPage() {
  const [token] = useState(() =>
    new URLSearchParams(window.location.hash.slice(1)).get("token") ?? ""
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const submitting = useRef(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendMessage, setResendMessage] = useState("");

  async function handleResendVerification(event) {
  event.preventDefault();
  if (submitting.current) return;

  submitting.current = true;
  setBusy(true);
  setError("");
  setResendMessage("");

  try {
    const result = await postAuth("resend-verification", {
      email: resendEmail.trim(),
    });

    setResendMessage(result.message);
  } catch (requestError) {
    setError(requestError.message);
  } finally {
    submitting.current = false;
    setBusy(false);
  }
}

  async function handleVerify() {
    if (submitting.current || verified) return;

    submitting.current = true;
    setBusy(true);
    setError("");

    try {
      const result = await postAuth("verify-email", { token });
      setMessage(result.message);
      setVerified(true);

      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.search
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }

  }

  return (
    <main className="page auth-page">
      <h1>Verify your email</h1>

      {token ? (
        <>
          <p>
            If you requested this SeekMakan account, confirm your email below.
          </p>
          <button
            type="button"
            onClick={handleVerify}
            disabled={busy || verified}
          >
            {verified ? "Email verified" : busy ? "Verifying…" : "Verify email"}
          </button>
        </>
      ) : (
        <p>Open the verification link from your email to continue.</p>
      )}

      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      {verified && (
        <p>
            <Link to="/login">Continue to log in</Link>
        </p>
    )}

    {!verified && (
      <details>
        <summary>Request a new verification link</summary>

        <AuthForm onSubmit={handleResendVerification}>
          <label htmlFor="verification-resend-email">
            Email used to register
          </label>

          <input
            id="verification-resend-email"
            name="email"
            type="email"
            autoComplete="email"
            value={resendEmail}
            onChange={event => setResendEmail(event.target.value)}
            disabled={busy}
            required
          />

          <button type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send verification link"}
          </button>
        </AuthForm>

        {resendMessage && <p role="status">{resendMessage}</p>}
      </details>
    )}
    </main>
  );
}