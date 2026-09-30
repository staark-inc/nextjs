import { disconnectPrismaClient } from "../lib/db/prisma";
import { resolveTenantContext } from "../lib/tenant-context";

const hostname = process.argv[2];

if (!hostname) {
  console.error(
    "Usage: pnpm --filter @staark/starter exec tsx scripts/resolve-tenant.ts <hostname>",
  );
  process.exit(1);
}

async function main() {
  const tenant = await resolveTenantContext(
    {
      host: hostname,
      forwardedHost: hostname,
    },
    {
      ...process.env,
      STAARK_TRUST_PROXY: "1",
      // The CLI should test the hostname mapping itself, not silently fall back.
      STAARK_TENANT_SITE_KEY_FALLBACK: "0",
    },
  );

  if (!tenant) {
    console.error(`No tenant found for hostname "${hostname}".`);
    process.exitCode = 2;
    return;
  }

  console.log(JSON.stringify(tenant, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrismaClient();
  });
