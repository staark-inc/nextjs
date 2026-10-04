import { getPrismaClient, disconnectPrismaClient } from "../lib/db/prisma";
import { deleteCloudflareCustomHostname } from "../lib/cloudflare-saas";

async function main() {
  const prisma = getPrismaClient();
  const now = new Date();

  const domains = await prisma.domain.findMany({
    where: {
      releasedAt: null,
      releaseAt: {
        lte: now,
      },
    },
    select: {
      id: true,
      type: true,
      hostname: true,
      providerHostnameId: true,
    },
  });

  console.log(`[domain-cleanup] found ${domains.length} domain(s) to release`);

  for (const domain of domains) {
    try {
      if (
        domain.type === "custom" &&
        domain.providerHostnameId
      ) {
        await deleteCloudflareCustomHostname(
          domain.providerHostnameId,
        );
      }

      await prisma.domain.update({
        where: {
          id: domain.id,
        },
        data: {
          releasedAt: now,
          primaryDomain: false,
          providerStatus: "released",
        },
      });

      console.log(`[domain-cleanup] released ${domain.hostname}`);
    } catch (error) {
      console.error(
        `[domain-cleanup] failed ${domain.hostname}`,
        error,
      );
    }
  }
}

main()
  .catch((error) => {
    console.error("[domain-cleanup] fatal", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrismaClient();
  });
