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

export function AuthPanel({ onAuthenticated }: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
          await supabase.auth.resetPasswordForEmail(normalizedEmail, {
            redirectTo: `${window.location.origin}/`,
          });

        if (recoveryError) throw recoveryError;

        setMessage(
          "If an account exists for this email, a password recovery link will be sent. Check your inbox."
        );
        return;
      }

      if (mode === "signup") {
        const { data, error: signupError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (signupError) throw signupError;

        if (data.session) {
          onAuthenticated?.();
        } else {
          setMessage(
            "Your account has been created. Check your email if confirmation is required before signing in."
          );
        }
        return;
      }

      const { error: signinError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signinError) throw signinError;
      onAuthenticated?.();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
    setPassword("");
    setShowPassword(false);
  }

  const isSignIn = mode === "signin";
  const isSignUp = mode === "signup";
  const isRecover = mode === "recover";

  return (
    <main className="auth-panel">
      <aside className="auth-panel__story" aria-label="Invitation Studio">
        <a className="auth-panel__wordmark" href="/" aria-label="Invitation Studio home">
          <span className="auth-panel__mark" aria-hidden="true">i.</span>
          <span>invitation studio</span>
        </a>

        <div className="auth-panel__story-copy">
          <p className="auth-panel__eyebrow">A MORE PERSONAL WAY TO INVITE</p>
          <h1>
            Make room for
            <br />
            <em>something meaningful.</em>
          </h1>
          <p className="auth-panel__story-description">
            Thoughtful invitations, shared privately, and plans worth remembering.
          </p>
        </div>

        <div className="auth-panel__signature" aria-hidden="true">
          <span className="auth-panel__signature-line" />
          <span>Made with intention.</span>
        </div>
        <span className="auth-panel__ornament auth-panel__ornament--one" aria-hidden="true" />
        <span className="auth-panel__ornament auth-panel__ornament--two" aria-hidden="true" />
      </aside>

      <section className="auth-panel__main" aria-labelledby="auth-heading">
        <div className="auth-panel__mobile-brand">
          <span className="auth-panel__mark" aria-hidden="true">i.</span>
          <span>invitation studio</span>
        </div>

        <div className="auth-panel__form-wrap">
          <p className="auth-panel__eyebrow auth-panel__form-eyebrow">
            {isSignIn ? "YOUR SPACE, READY WHEN YOU ARE" : isSignUp ? "BEGIN SOMETHING PERSONAL" : "ACCOUNT RECOVERY"}
          </p>

          <h2 id="auth-heading">
            {isSignIn ? "Welcome back." : isSignUp ? "Create your space." : "Let's get you back in."}
          </h2>

          <p className="auth-panel__description">
            {isSignIn
              ? "Sign in to pick up where you left off."
              : isSignUp
                ? "A little space for the invitations you make."
                : "Enter your email and we'll send you a secure recovery link."}
          </p>

          <form className="auth-panel__form" onSubmit={handleSubmit}>
            <div className="auth-panel__field">
              <label htmlFor="auth-email">Email address</label>
              <input
                id="auth-email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={loading}
              />
            </div>

            {!isRecover && (
              <div className="auth-panel__field">
                <div className="auth-panel__label-row">
                  <label htmlFor="auth-password">Password</label>
                  {isSignIn && (
                    <button
                      className="auth-panel__text-button"
                      type="button"
                      onClick={() => changeMode("recover")}
                      disabled={loading}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="auth-panel__password-wrap">
                  <input
                    id="auth-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    placeholder={isSignUp ? "At least 6 characters" : "Enter your password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={6}
                    required
                    disabled={loading}
                  />
                  <button
                    className="auth-panel__password-toggle"
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    disabled={loading}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            )}

            {error && <p className="auth-panel__notice auth-panel__notice--error" role="alert">{error}</p>}
            {message && <p className="auth-panel__notice auth-panel__notice--success" role="status">{message}</p>}

            <button className="auth-panel__submit" type="submit" disabled={loading}>
              <span>
                {loading
                  ? "Please wait…"
                  : isSignIn
                    ? "Sign in"
                    : isSignUp
                      ? "Create account"
                      : "Send recovery link"}
              </span>
              {!loading && <span className="auth-panel__submit-arrow" aria-hidden="true">↗</span>}
            </button>
          </form>

          {isRecover && (
            <button
              type="button"
              className="auth-panel__back"
              onClick={() => changeMode("signin")}
              disabled={loading}
            >
              <span aria-hidden="true">←</span> Back to sign in
            </button>
          )}

          {!isRecover && (
            <p className="auth-panel__account-switch">
              {isSignIn ? "New to the studio?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => changeMode(isSignIn ? "signup" : "signin")}
                disabled={loading}
              >
                {isSignIn ? "Create an account" : "Sign in"}
              </button>
            </p>
          )}

          <p className="auth-panel__privacy">
            Your invitations are yours. Sign in to manage them securely.
          </p>
        </div>
      </section>
    </main>
  );
}

export function PasswordRecoveryPanel({ onComplete }: PasswordRecoveryPanelProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
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
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
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
      const { error: signoutError } = await supabase.auth.signOut();
      if (signoutError) throw signoutError;
      onComplete();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to return to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-panel auth-panel--recovery">
      <aside className="auth-panel__story" aria-label="Invitation Studio">
        <a className="auth-panel__wordmark" href="/" aria-label="Invitation Studio home">
          <span className="auth-panel__mark" aria-hidden="true">i.</span>
          <span>invitation studio</span>
        </a>
        <div className="auth-panel__story-copy">
          <p className="auth-panel__eyebrow">A LITTLE RESET</p>
          <h1>Every good thing deserves <em>a way back.</em></h1>
          <p className="auth-panel__story-description">Secure your space and return to the plans you're making.</p>
        </div>
        <div className="auth-panel__signature" aria-hidden="true">
          <span className="auth-panel__signature-line" />
          <span>Made with intention.</span>
        </div>
        <span className="auth-panel__ornament auth-panel__ornament--one" aria-hidden="true" />
        <span className="auth-panel__ornament auth-panel__ornament--two" aria-hidden="true" />
      </aside>

      <section className="auth-panel__main" aria-labelledby="recovery-heading">
        <div className="auth-panel__mobile-brand">
          <span className="auth-panel__mark" aria-hidden="true">i.</span>
          <span>invitation studio</span>
        </div>
        <div className="auth-panel__form-wrap">
          <p className="auth-panel__eyebrow auth-panel__form-eyebrow">
            {success ? "ALL SET" : "SECURE YOUR ACCOUNT"}
          </p>
          <h2 id="recovery-heading">{success ? "Password updated." : "Choose a new password."}</h2>
          <p className="auth-panel__description">
            {success
              ? "Your password has been changed. You can sign in with it now."
              : "Choose a new password for your account."}
          </p>

          {!success ? (
            <form className="auth-panel__form" onSubmit={handleSubmit}>
              <div className="auth-panel__field">
                <label htmlFor="new-password">New password</label>
                <div className="auth-panel__password-wrap">
                  <input
                    id="new-password"
                    type={showPasswords ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={6}
                    required
                    disabled={loading}
                  />
                  <button
                    className="auth-panel__password-toggle"
                    type="button"
                    onClick={() => setShowPasswords((visible) => !visible)}
                    aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
                    aria-pressed={showPasswords}
                    disabled={loading}
                  >
                    {showPasswords ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div className="auth-panel__field">
                <label htmlFor="confirm-password">Confirm new password</label>
                <input
                  id="confirm-password"
                  type={showPasswords ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Enter the password again"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={6}
                  required
                  disabled={loading}
                />
              </div>
              {error && <p className="auth-panel__notice auth-panel__notice--error" role="alert">{error}</p>}
              <button className="auth-panel__submit" type="submit" disabled={loading}>
                <span>{loading ? "Updating password…" : "Update password"}</span>
                {!loading && <span className="auth-panel__submit-arrow" aria-hidden="true">↗</span>}
              </button>
            </form>
          ) : (
            <>
              {error && <p className="auth-panel__notice auth-panel__notice--error" role="alert">{error}</p>}
              <button className="auth-panel__submit" type="button" onClick={handleReturnToSignIn} disabled={loading}>
                <span>{loading ? "Please wait…" : "Return to sign in"}</span>
                {!loading && <span className="auth-panel__submit-arrow" aria-hidden="true">↗</span>}
              </button>
            </>
          )}
          <p className="auth-panel__privacy">Your invitations are yours. Keep your account secure.</p>
        </div>
      </section>
    </main>
  );
}
