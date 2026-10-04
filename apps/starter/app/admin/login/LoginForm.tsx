"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./login.module.css";

type Notice = { tone: "info" | "warning" | "error"; text: string } | null;

type LoginFormProps = {
  /** Already sanitized on the server with safeAdminNext. */
  next: string;
  expired: boolean;
  revoked: boolean;
  siteName: string;
  host: string;
  siteUrl: string;
  supportEmail: string;
};

type LoginErrorBody = {
  code?: string;
  remaining?: number;
  retryAfter?: number;
};

function initialNotice(
  next: string,
  expired: boolean,
  revoked: boolean,
): Notice {
  if (revoked) {
    return {
      tone: "warning",
      text:
        "Your session was revoked or no longer belongs to this website. Sign in again.",
    };
  }

  if (expired) return { tone: "warning", text: "Your session expired. Sign in again to continue." };
  if (next !== "/admin") return { tone: "info", text: `Sign in to continue to ${next}.` };
  return null;
}

function formatWait(seconds: number): string {
  if (seconds >= 60) {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  return `${seconds} second${seconds === 1 ? "" : "s"}`;
}

export default function LoginForm({
  next,
  expired,
  revoked,
  siteName,
  host,
  siteUrl,
  supportEmail,
}: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] =
    useState<Notice>(
      () =>
        initialNotice(
          next,
          expired,
          revoked,
        ),
    );
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!lockedUntil) return;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= lockedUntil) {
        setLockedUntil(0);
        passwordRef.current?.focus();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockedUntil]);

  const locked = lockedUntil > now;
  const secondsLeft = locked ? Math.ceil((lockedUntil - now) / 1000) : 0;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading || locked) return;
    setLoading(true);

    let res: Response;
    try {
      res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          remember,
          ...(twoFactorRequired
            ? {
                twoFactorCode,
              }
            : {}),
        }),
      });
    } catch {
      setLoading(false);
      setNotice({ tone: "error", text: "Couldn't reach the server. Check your connection and try again." });
      return;
    }

    const body =
      (await res
        .json()
        .catch(() => ({}))) as
        LoginErrorBody;

    if (
      res.status === 202 &&
      body.code ===
        "two_factor_required"
    ) {
      setLoading(false);
      setTwoFactorRequired(true);
      setNotice({
        tone: "info",
        text:
          "Enter the 6-digit code from your authenticator app, or use a recovery code.",
      });
      return;
    }

    if (res.ok) {
      // Full navigation so the admin layout renders with the new session.
      window.location.assign(next);
      return;
    }

    setLoading(false);

    switch (res.status) {
      case 401: {
        if (
          body.code ===
          "two_factor_invalid"
        ) {
          setNotice({
            tone: "error",
            text:
              "That authentication code is not valid. Try again or use a recovery code.",
          });
          setTwoFactorCode("");
          break;
        }

        const remaining = typeof body.remaining === "number" ? body.remaining : null;
        const warning =
          remaining !== null && remaining <= 3
            ? ` ${remaining} attempt${remaining === 1 ? "" : "s"} left before a 10-minute pause.`
            : "";
        setNotice({ tone: "error", text: `That username and password don't match.${warning}` });
        setPassword("");
        passwordRef.current?.focus();
        break;
      }
      case 429: {
        const header = Number(res.headers.get("Retry-After"));
        const seconds = body.retryAfter ?? (Number.isFinite(header) && header > 0 ? header : 600);
        const current = Date.now();
        setNow(current);
        setLockedUntil(current + seconds * 1000);
        setNotice(null);
        setPassword("");
        break;
      }
      case 503:
        setNotice({
          tone: "error",
          text: "Sign-in isn't set up on this deployment. Set ADMIN_USERNAME, ADMIN_PASSWORD and ADMIN_SESSION_SECRET, then restart it.",
        });
        break;
      case 400:
        setNotice({ tone: "error", text: "Enter both a username and a password." });
        break;
      default:
        setNotice({ tone: "error", text: "The server couldn't sign you in. Try again in a moment." });
    }
  }

  const noticeClass =
    notice?.tone === "error" ? styles.noticeError : notice?.tone === "warning" ? styles.noticeWarning : styles.noticeInfo;

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.heading}>
        <h1>{siteName ? `Sign in to ${siteName}` : "Sign in to Staark Hub"}</h1>
        <p>{host ? `Manage pages, enquiries and bookings for ${host}.` : "Manage your website's pages, enquiries and bookings."}</p>
      </div>

      {locked ? (
        <div className={`${styles.notice} ${styles.noticeWarning}`} role="alert">
          Too many attempts. Try again in {formatWait(secondsLeft)}.
        </div>
      ) : notice ? (
        <div className={`${styles.notice} ${noticeClass}`} role={notice.tone === "info" ? "status" : "alert"}>
          {notice.text}
        </div>
      ) : null}

      <div className={styles.field}>
        <label htmlFor="admin-username">Username</label>
        <input
          id="admin-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          disabled={locked}
          required
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="admin-password">Password</label>
        <div className={styles.passwordWrap}>
          <input
            id="admin-password"
            ref={passwordRef}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={locked}
            required
          />
          <button
            type="button"
            className={styles.reveal}
            onClick={() => setShowPassword((value) => !value)}
            aria-pressed={showPassword}
            aria-controls="admin-password"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {twoFactorRequired ? (
        <div className={styles.field}>
          <label htmlFor="admin-two-factor">
            Authentication code
          </label>

          <input
            id="admin-two-factor"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={twoFactorCode}
            onChange={(event) =>
              setTwoFactorCode(
                event.target.value,
              )
            }
            placeholder="123456 or recovery code"
            autoFocus
            required
          />
        </div>
      ) : null}

      <label className={styles.remember}>
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          disabled={locked || loading}
        />
        <span>
          <strong>Remember me</strong>
          <small>Keep this device signed in for up to 30 days.</small>
        </span>
      </label>

      <button
        className={styles.submit}
        type="submit"
        disabled={
          loading ||
          locked ||
          !username ||
          !password ||
          (
            twoFactorRequired &&
            !twoFactorCode
          )
        }
      >
        {loading
          ? "Signing in…"
          : twoFactorRequired
            ? "Verify & sign in"
            : "Sign in"}
      </button>

      <p className={styles.hint}>
        {remember
          ? "This device will stay signed in for up to 30 days."
          : "For security, this session expires automatically after 12 hours."}
      </p>

      <div className={styles.help}>
        <span>Need help?</span>
        <div className={styles.helpActions}>
          <a
            href={`mailto:${supportEmail}?subject=${encodeURIComponent(`Staark Hub sign-in help${siteName ? ` — ${siteName}` : ""}`)}`}
          >
            Contact support
          </a>
          {siteUrl ? (
            <a href={siteUrl} target="_blank" rel="noopener noreferrer">
              Open website <span aria-hidden>↗</span>
            </a>
          ) : null}
        </div>
      </div>
    </form>
  );
}
