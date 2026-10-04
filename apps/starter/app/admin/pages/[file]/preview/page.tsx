import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BlockRenderer } from "@staark/theme-kit";

import { StaarkImage } from "@/components/StaarkImage";
import {
  adminPagesUsePostgres,
  getPostgresAdminSiteSettings,
  readPostgresAdminPage,
} from "@/lib/admin-page-postgres";
import { getSession, isSessionActive } from "@/lib/auth";
import { hydrateVerticalPage } from "@/lib/vertical-content";
import { resolveThemeRuntime } from "@/staark.config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Draft preview",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

type Ctx = {
  params: Promise<{
    file: string;
  }>;
};

export default async function DraftPreviewPage({
  params,
}: Ctx) {
  const session = await getSession();

  if (!isSessionActive(session)) {
    redirect("/admin/login");
  }

  if (!adminPagesUsePostgres()) {
    notFound();
  }

  const { file } = await params;

  const [site, record] = await Promise.all([
    getPostgresAdminSiteSettings(),
    readPostgresAdminPage(file),
  ]);

  if (!record) {
    notFound();
  }

  const runtime =
    resolveThemeRuntime(
      site.theme.family,
    );

  const hydratedPage =
    await hydrateVerticalPage(
      site,
      record.page,
    );

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 12,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 999999,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "9px 14px",
          borderRadius: 999,
          background: "rgba(15, 23, 42, 0.94)",
          color: "#fff",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: 13,
          lineHeight: 1,
          boxShadow:
            "0 8px 30px rgba(0,0,0,.25)",
          backdropFilter: "blur(12px)",
        }}
      >
        <strong>Draft preview</strong>

        <span
          style={{
            opacity: 0.7,
          }}
        >
          Not published
        </span>

        <a
          href={`/admin/pages/${file}`}
          style={{
            color: "#93c5fd",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          Back to editor
        </a>
      </div>

      <BlockRenderer
        blocks={hydratedPage.blocks}
        site={site}
        theme={runtime.theme}
        registry={runtime.registry}
        image={StaarkImage}
      />
    </>
  );
}
