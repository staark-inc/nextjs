import assert from "node:assert/strict";
import test from "node:test";

import {
  managerRecoveryUsernameMatches,
  resolveManagerRecoveryConfig,
  verifyManagerRecoveryPassword,
  verifyManagerRecoveryTotp,
} from "../lib/manager-recovery.ts";

import {
  hashPassword,
} from "../lib/password.ts";

test(
  "Manager recovery is disabled by default",
  () => {
    assert.deepEqual(
      resolveManagerRecoveryConfig(
        {},
      ),
      {
        enabled: false,
      },
    );
  },
);

test(
  "Manager recovery rejects incomplete enabled configuration",
  () => {
    assert.throws(
      () =>
        resolveManagerRecoveryConfig(
          {
            STAARK_MANAGER_RECOVERY_ENABLED:
              "true",
          },
        ),
      /missing/i,
    );
  },
);

test(
  "Manager recovery resolves explicit configuration",
  () => {
    const config =
      resolveManagerRecoveryConfig(
        {
          STAARK_MANAGER_RECOVERY_ENABLED:
            "true",

          STAARK_MANAGER_RECOVERY_USERNAME:
            "support",

          STAARK_MANAGER_RECOVERY_PASSWORD_HASH:
            "scrypt-v1$abc$def",

          STAARK_MANAGER_RECOVERY_TOTP_SECRET:
            "JBSWY3DPEHPK3PXP",
        },
      );

    assert.equal(
      config.enabled,
      true,
    );

    if (!config.enabled) {
      return;
    }

    assert.equal(
      config.username,
      "support",
    );
  },
);

test(
  "Manager recovery username comparison is exact",
  () => {
    const config =
      resolveManagerRecoveryConfig(
        {
          STAARK_MANAGER_RECOVERY_ENABLED:
            "1",

          STAARK_MANAGER_RECOVERY_USERNAME:
            "manager",

          STAARK_MANAGER_RECOVERY_PASSWORD_HASH:
            "scrypt-v1$abc$def",

          STAARK_MANAGER_RECOVERY_TOTP_SECRET:
            "JBSWY3DPEHPK3PXP",
        },
      );

    assert.equal(
      managerRecoveryUsernameMatches(
        config,
        "manager",
      ),
      true,
    );

    assert.equal(
      managerRecoveryUsernameMatches(
        config,
        "Manager",
      ),
      false,
    );

    assert.equal(
      managerRecoveryUsernameMatches(
        config,
        "client@example.com",
      ),
      false,
    );
  },
);

test(
  "Manager recovery verifies scrypt password hashes",
  async () => {
    const password =
      "a-very-long-test-password";

    const hash =
      await hashPassword(
        password,
      );

    const config =
      resolveManagerRecoveryConfig(
        {
          STAARK_MANAGER_RECOVERY_ENABLED:
            "true",

          STAARK_MANAGER_RECOVERY_USERNAME:
            "manager",

          STAARK_MANAGER_RECOVERY_PASSWORD_HASH:
            hash,

          STAARK_MANAGER_RECOVERY_TOTP_SECRET:
            "JBSWY3DPEHPK3PXP",
        },
      );

    assert.equal(
      config.enabled,
      true,
    );

    if (!config.enabled) {
      return;
    }

    assert.equal(
      await verifyManagerRecoveryPassword(
        config,
        password,
      ),
      true,
    );

    assert.equal(
      await verifyManagerRecoveryPassword(
        config,
        "wrong-password",
      ),
      false,
    );

    assert.equal(
      verifyManagerRecoveryTotp(
        config,
        "not-a-code",
      ),
      false,
    );
  },
);
