import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import "./AuthPanel.css";

type AuthMode = "signin" | "signup" | "recover";

type AuthPanelProps = {
  onAuthenticated?: () => void;
};

type PasswordRecoveryPanelProps = {
  onComplete: () => void;
};

export function AuthPanel({
  onAuthenticated,
}: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      if (mode === "recover") {
        const { error: recoveryError } =
          await supabase.auth.resetPasswordForEmail(
            normalizedEmail,
            {
              redirectTo: `${window.location.origin}/`,
            }
          );

        if (recoveryError) {
          throw recoveryError;
        }

        setMessage(
          "If an account exists for this email, a password recovery link will be sent. Check your inbox."
        );

        return;
      }

      if (mode === "signup") {
        const { data, error: signupError } =
          await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/`,
            },
          });

        if (signupError) {
          throw signupError;
        }

        if (data.session) {
          onAuthenticated?.();
        } else {
          setMessage(
            "Your account has been created. Check your email if confirmation is required before signing in."
          );
        }

        return;
      }

      const { error: signinError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      if (signinError) {
        throw signinError;
      }

      onAuthenticated?.();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
    setPassword("");
  }

  return (
    <main className="auth-panel">
      <section className="auth-panel__content">
        <p className="auth-panel__eyebrow">
          INVITATION STUDIO
        </p>

        <h1>
          {mode === "signin"
            ? "Welcome back."
            : mode === "signup"
              ? "Create your space."
              : "Reset your password."}
        </h1>

        <p className="auth-panel__description">
          {mode === "signin"
            ? "Sign in to create something personal."
            : mode === "signup"
              ? "Create an account to start making invitations."
              : "Enter your email and we will send you a recovery link."}
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="auth-email">Email address</label>

          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          {mode !== "recover" && (
            <>
              <label htmlFor="auth-password">Password</label>

              <input
                id="auth-password"
                type="password"
                autoComplete={
                  mode === "signup"
                    ? "new-password"
                    : "current-password"
                }
                placeholder="Enter your password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                minLength={6}
                required
              />
            </>
          )}

          {error && (
            <p className="auth-panel__error" role="alert">
              {error}
            </p>
          )}

          {message && (
            <p
              className="auth-panel__message"
              role="status"
            >
              {message}
            </p>
          )}

          <button type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : "Send recovery link"}
          </button>
        </form>

        {mode === "signin" && (
          <button
            type="button"
            className="auth-panel__switch"
            onClick={() => changeMode("recover")}
          >
            Forgot your password?
          </button>
        )}

        {mode === "recover" && (
          <button
            type="button"
            className="auth-panel__switch"
            onClick={() => changeMode("signin")}
          >
            Back to sign in
          </button>
        )}

        <p className="auth-panel__switch">
          {mode === "signin" ? (
            <>
              New here?{" "}
              <button
                type="button"
                onClick={() => changeMode("signup")}
              >
                Create an account
              </button>
            </>
          ) : mode === "signup" ? (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => changeMode("signin")}
              >
                Sign in
              </button>
            </>
          ) : null}
        </p>
      </section>
    </main>
  );
}

export function PasswordRecoveryPanel({
  onComplete,
}: PasswordRecoveryPanelProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (password.length < 6) {
      setError("Your password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update your password. Try requesting a new recovery link."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleReturnToSignIn() {
    setLoading(true);
    setError("");

    try {
      const { error: signoutError } =
        await supabase.auth.signOut();

      if (signoutError) {
        throw signoutError;
      }

      onComplete();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to return to sign in."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-panel">
      <section className="auth-panel__content">
        <p className="auth-panel__eyebrow">
          INVITATION STUDIO
        </p>

        <h1>
          {success
            ? "Password updated."
            : "Choose a new password."}
        </h1>

        <p className="auth-panel__description">
          {success
            ? "Your password has been changed successfully."
            : "Choose a new password for your account."}
        </p>

        {!success ? (
          <form onSubmit={handleSubmit}>
            <label htmlFor="new-password">
              New password
            </label>

            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              minLength={6}
              required
            />

            <label htmlFor="confirm-password">
              Confirm new password
            </label>

            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder="Enter the password again"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              minLength={6}
              required
            />

            {error && (
              <p className="auth-panel__error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading}>
              {loading
                ? "Updating password..."
                : "Update password"}
            </button>
          </form>
        ) : (
          <>
            {error && (
              <p className="auth-panel__error" role="alert">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleReturnToSignIn}
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : "Return to sign in"}
            </button>
          </>
        )}
      </section>
    </main>
  );
}