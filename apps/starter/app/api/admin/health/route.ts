import { NextResponse } from "next/server";

import {
  runSiteHealth,
} from "@/lib/admin-site-health";

import {
  appendAdminAction,
} from "@/lib/admin-audit";

import {
  requireAuth,
} from "../guard";

export async function GET() {
  const blocked =
    await requireAuth();

  if (blocked) {
    return blocked;
  }

  const startedAt =
    Date.now();

  await appendAdminAction({
    area: "health",
    action: "scan.started",
    message: "Site Health scan started.",
    resource: "site-health",
  });

  try {
    const report =
      await runSiteHealth();

    const durationMs =
      Date.now() -
      startedAt;

    const level =
      report.counts.errors > 0
        ? "error"
        : report.counts.warnings > 0
          ? "warning"
          : "info";

    await appendAdminAction({
      level,
      area: "health",
      action: "scan.completed",
      message:
        report.counts.errors > 0
          ? `Site Health scan completed with ${report.counts.errors} error(s) and ${report.counts.warnings} warning(s).`
          : report.counts.warnings > 0
            ? `Site Health scan completed with ${report.counts.warnings} warning(s).`
            : "Site Health scan completed successfully.",
      resource: "site-health",
      meta: {
        errors:
          report.counts.errors,

        warnings:
          report.counts.warnings,

        passed:
          report.counts.passed,

        checks:
          report.counts.checks,

        durationMs,
      },
    });

    return NextResponse.json(
      report,
    );
  } catch (error) {
    const durationMs =
      Date.now() -
      startedAt;

    const message =
      error instanceof Error &&
      error.message
        ? error.message
        : "Site health scan failed.";

    await appendAdminAction({
      level: "error",
      area: "health",
      action: "scan.failed",
      message:
        "Site Health scan failed.",
      resource: "site-health",
      meta: {
        durationMs,
        error: message,
      },
    });

    return NextResponse.json(
      {
        error:
          message,
      },
      {
        status: 500,
      },
    );
  }
}
