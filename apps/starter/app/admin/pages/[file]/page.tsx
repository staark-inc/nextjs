import path from "node:path";
import { notFound } from "next/navigation";
import {
  adminPagesUsePostgres,
  readPostgresAdminPage,
} from "@/lib/admin-page-postgres";
import { readContentJson } from "@/lib/storage";
import PageEditorClient, {
  type PageData,
} from "./PageEditorClient";

export const dynamic = "force-dynamic";

type Ctx = {
  params: Promise<{ file: string }>;
};

function safeLegacyFile(file: string): string | null {
  if (
    !file ||
    path.posix.basename(file) !== file ||
    !file.endsWith(".json")
  ) {
    return null;
  }

  return file;
}

async function loadPage(
  file: string,
): Promise<PageData | null> {
  if (adminPagesUsePostgres()) {
    const record =
      await readPostgresAdminPage(file);

    return record?.page
      ? (record.page as PageData)
      : null;
  }

  const legacyFile = safeLegacyFile(file);

  if (!legacyFile) {
    return null;
  }

  return readContentJson<PageData>(
    `pages/${legacyFile}`,
  );
}

export default async function PageEditorPage({
  params,
}: Ctx) {
  const { file } = await params;
  const page = await loadPage(file);

  if (!page) {
    notFound();
  }

  return (
    <PageEditorClient
      key={file}
      file={file}
      initialPage={page}
    />
  );
}
