import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { getSession, postAuth } from "../api/auth";
import { RegisterForm } from "../pages/AuthPages";
import PasswordInput from "./PasswordInput";
import { ForgotPasswordForm } from "../pages/PasswordRecovery";

const PROMPT_KEY = "seekmakan-auth-prompt-seen";

export default function AuthAccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const dialogRef = useRef(null);
  const headingRef = useRef(null);
  const submitting = useRef(false);
  const automaticPromptHandled = useRef(false);

  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    getSession()
      .then(result => {
        if (!cancelled) setUser(result.user);
      })
      .catch(requestError => {
        if (!cancelled) setError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    const requestedMode = new URLSearchParams(location.search).get("auth");

    if (requestedMode === "login" || requestedMode === "register") {
      automaticPromptHandled.current = true;

      if (!user) {
        setMode(requestedMode);
        setOpen(true);
      }

      const parameters = new URLSearchParams(location.search);
      parameters.delete("auth");
      const search = parameters.toString();

      navigate(
        `${location.pathname}${search ? `?${search}` : ""}${location.hash}`,
        { replace: true }
      );
      return;
    }

    if (automaticPromptHandled.current) return;
    automaticPromptHandled.current = true;

    // Do not interrupt email-verification or other deep links.
    if (
      user ||
      !["/", "/restaurants"].includes(location.pathname)
    ) {
      return;
    }

    let seen = false;

    try {
      seen = sessionStorage.getItem(PROMPT_KEY) === "1";
      sessionStorage.setItem(PROMPT_KEY, "1");
    } catch {
      // Browsing remains possible when browser storage is unavailable.
    }

    if (!seen) setOpen(true);
  }, [
    ready,
    user,
    location.pathname,
    location.search,
    location.hash,
    navigate,
  ]);

  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;

    dialog.showModal();
    headingRef.current?.focus();
    document.body.style.overflow = "hidden";

    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function closePopup() {
    setOpen(false);

    try {
      sessionStorage.setItem(PROMPT_KEY, "1");
    } catch {
      // This flag only controls the prompt; it is not authentication.
    }
  }

  function switchMode(nextMode) {
    setError("");
    setMode(nextMode);
  }

  async function handleLogin(event) {
    event.preventDefault();
    if (submitting.current) return;

    const fields = new FormData(event.currentTarget);
    submitting.current = true;
    setBusy(true);
    setError("");

    try {
      await postAuth("login", {
        email: String(fields.get("email") ?? ""),
        password: String(fields.get("password") ?? ""),
      });

      // Confirm that the browser actually retained the session cookie.
      const result = await getSession();

      if (!result.user) {
        throw new Error(
          "The session cookie was not retained. Open the site using localhost."
        );
      }

      setUser(result.user);
      window.dispatchEvent(new Event("seekmakan:session-changed"));
      closePopup();

      if (result.user.preference_setup === "not_started") {
        navigate("/profile?setup=1");
      }

    } catch (requestError) {
      setError(requestError.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function handleLogout() {
    if (submitting.current) return;

    submitting.current = true;
    setBusy(true);
    setError("");

    try {
      await postAuth("logout");
      setUser(null);
      window.dispatchEvent(new Event("seekmakan:session-changed"));
      closePopup();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

    useEffect(() => {
    let active = true;

    function refreshSession() {
      getSession()
        .then(result => {
          if (active) setUser(result.user);
        })
        .catch(() => {
          // A network error does not prove that the user logged out.
        });
    }

    window.addEventListener("focus", refreshSession);
    window.addEventListener("seekmakan:session-changed", refreshSession);

    return () => {
      active = false;
      window.removeEventListener("focus", refreshSession);
      window.removeEventListener(
        "seekmakan:session-changed",
        refreshSession
      );
    };
  }, []);

  return (
    <>
      <div className="account-access">
        {user ? (
          <>
            <Link to="/profile">Profile</Link>
            <button type="button" onClick={handleLogout} disabled={busy}>
              {busy ? "Please wait…" : "Log out"}
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={!ready}
            onClick={() => {
              switchMode("login");
              setOpen(true);
            }}
          >
            {ready ? "Log in" : "Checking account…"}
          </button>
        )}

        {!open && error && <p role="alert">{error}</p>}
      </div>

      <dialog
        ref={dialogRef}
        className="auth-dialog"
        aria-labelledby="auth-title"
        onCancel={event => {
          event.preventDefault();
          closePopup();
        }}
      >
        {open && (
          <>
            <div className="auth-dialog__heading">
              <h2 id="auth-title" ref={headingRef} tabIndex={-1}>
                {mode === "register"
                  ? "Create your account"
                  : mode === "forgot"
                    ? "Reset your password"
                    : "Welcome to SeekMakan"}
              </h2>
              <button type="button" onClick={closePopup}>
                Close
              </button>
            </div>

            <p>
              Log in to your account, or continue exploring restaurants as a guest.
            </p>

            {mode === "forgot" ? (
              <>
                <ForgotPasswordForm />
                <button type="button" onClick={() => switchMode("login")}>
                  Back to log in
                </button>
              </>
            ) : mode === "register" ? (
              <>
                <RegisterForm />
                <p className="auth-signup-prompt">
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="auth-text-link"
                    onClick={() => switchMode("login")}
                  > 
                    <strong>Log in</strong>
                  </button>
                </p>
              </>
            ) : (
              <>
                <form className="auth-form" onSubmit={handleLogin}>
                  <label htmlFor="login-email">Email</label>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                  />

                  <label htmlFor="login-password">Password</label>
                  <PasswordInput
                    id="login-password"
                    name="password"
                    autoComplete="current-password"
                    maxLength={128}
                    required
                  />

                  <button
                    type="button"
                    className="auth-text-link"
                    onClick={() => switchMode("forgot")}
                    disabled={busy}
                  >
                    Forgot password?
                  </button>

                  <button type="submit" disabled={busy}>
                    {busy ? "Logging in…" : "Log in"}
                  </button>
                </form>

                <p className="auth-signup-prompt">
                  New to SeekMakan?{" "}
                  <button
                    type="button"
                    className="auth-text-link"
                    onClick={() => switchMode("register")}
                    disabled={busy}
                  >
                    <strong>Sign up</strong>
                  </button>
                </p>

              </>
            )}

            {error && <p role="alert">{error}</p>}

            <button
              type="button"
              className="auth-guest-button"
              onClick={closePopup}
            >
              Continue as guest
            </button>
          </>
        )}
      </dialog>
    </>
  );
}