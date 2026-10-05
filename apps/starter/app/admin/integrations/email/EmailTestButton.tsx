"use client";

import {
  useState,
} from "react";

export default function EmailTestButton() {
  const [
    sending,
    setSending,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState<{
      ok: boolean;
      text: string;
    } | null>(
      null,
    );

  async function send() {
    setSending(
      true,
    );

    setMessage(
      null,
    );

    try {
      const response =
        await fetch(
          "/api/admin/mail/test",
          {
            method:
              "POST",
          },
        );

      const data =
        await response
          .json()
          .catch(
            () => ({}),
          ) as {
          error?: string;
          deliveredTo?: string;
        };

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ??
          "Could not send test email.",
        );
      }

      setMessage({
        ok:
          true,

        text:
          data.deliveredTo
            ? `Test email sent to ${data.deliveredTo}.`
            : "Test email sent.",
      });
    } catch (
      error
    ) {
      setMessage({
        ok:
          false,

        text:
          error instanceof Error
            ? error.message
            : "Could not send test email.",
      });
    } finally {
      setSending(
        false,
      );
    }
  }

  return (
    <div
      style={{
        display:
          "grid",

        gap:
          8,
      }}
    >
      <button
        type="button"
        className="sa-btn sa-btn--primary"
        disabled={
          sending
        }
        onClick={
          () =>
            void send()
        }
      >
        {sending
          ? "Sending…"
          : "Send test email"}
      </button>

      {message ? (
        <span
          className={
            message.ok
              ? "sa-plan-status sa-plan-status--success"
              : "sa-analytics-google-warning"
          }
        >
          {message.text}
        </span>
      ) : null}
    </div>
  );
}
