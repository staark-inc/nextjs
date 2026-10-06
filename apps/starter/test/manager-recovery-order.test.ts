import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const source =
  readFileSync(
    new URL(
      "../app/api/admin/auth/login/route.ts",
      import.meta.url,
    ),
    "utf8",
  );

test(
  "Manager recovery is evaluated before SaaS database authentication",
  () => {
    const recoveryMatch =
      source.indexOf(
        "managerRecoveryUsernameMatches(",
      );

    const saasLookup =
      source.indexOf(
        "await resolveSaasLoginAccount(",
      );

    assert.notEqual(
      recoveryMatch,
      -1,
      "Recovery username branch must exist.",
    );

    assert.notEqual(
      saasLookup,
      -1,
      "SaaS login lookup must exist.",
    );

    assert.ok(
      recoveryMatch <
        saasLookup,
      "Manager recovery must be evaluated before resolveSaasLoginAccount / Prisma.",
    );
  },
);

test(
  "Manager recovery creates a platform-scoped Manager session",
  () => {
    const recoveryStart =
      source.indexOf(
        "managerRecoveryUsernameMatches(",
      );

    const recoverySuccess =
      source.indexOf(
        'action:\n        "manager_recovery.success"',
      );

    const recoveryBlock =
      source.slice(
        recoveryStart,
        recoverySuccess >
          recoveryStart
          ? recoverySuccess
          : undefined,
      );

    assert.match(
      recoveryBlock,
      /session\.role\s*=\s*"manager"/,
    );

    assert.match(
      recoveryBlock,
      /session\.authScope\s*=\s*"platform"/,
    );

    assert.match(
      recoveryBlock,
      /session\.recoveryMode\s*=\s*true/,
    );
  },
);

test(
  "normal login clears the recovery session marker",
  () => {
    assert.match(
      source,
      /session\.recoveryMode\s*=\s*false/,
    );
  },
);
