import {
  resolveAdminRole,
} from "@staark/platform/server";
import { getSession } from "@/lib/auth";
import ThemeManagerClient from "./ThemeManagerClient";

export const dynamic = "force-dynamic";

export default async function ThemesPage() {
  const session = await getSession();

  const role = resolveAdminRole(
    session.role,
  );

  return (
    <ThemeManagerClient
      clientMode={role !== "manager"}
    />
  );
}
