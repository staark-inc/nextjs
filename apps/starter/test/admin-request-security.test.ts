import assert from "node:assert/strict";
import test from "node:test";

import {
  validateAdminRequestOrigin,
} from "../lib/admin-request-security.ts";

function request(
  method: string,
  values: Record<string, string> = {},
) {
  const headers =
    new Headers(values);

  return {
    method,
    headers,
  };
}

const TRUST_PROXY = {
  STAARK_TRUST_PROXY:
    "1",
};

test(
  "safe admin methods do not require Origin",
  () => {
    assert.deepEqual(
      validateAdminRequestOrigin(
        request(
          "GET",
          {
            host:
              "origin.internal",
          },
        ),
        TRUST_PROXY,
      ),
      {
        ok: true,
      },
    );

    assert.deepEqual(
      validateAdminRequestOrigin(
        request(
          "HEAD",
        ),
        TRUST_PROXY,
      ),
      {
        ok: true,
      },
    );
  },
);

test(
  "same-origin tenant mutation is allowed",
  () => {
    assert.deepEqual(
      validateAdminRequestOrigin(
        request(
          "POST",
          {
            host:
              "origin.internal",

            "x-forwarded-host":
              "alexdack.staark.app",

            origin:
              "https://alexdack.staark.app",

            "sec-fetch-site":
              "same-origin",
          },
        ),
        TRUST_PROXY,
      ),
      {
        ok: true,
      },
    );
  },
);

test(
  "another tenant hostname is rejected",
  () => {
    const result =
      validateAdminRequestOrigin(
        request(
          "PUT",
          {
            host:
              "origin.internal",

            "x-forwarded-host":
              "alexdack.staark.app",

            origin:
              "https://other.staark.app",

            "sec-fetch-site":
              "same-origin",
          },
        ),
        TRUST_PROXY,
      );

    assert.equal(
      result.ok,
      false,
    );

    if (!result.ok) {
      assert.equal(
        result.code,
        "ADMIN_ORIGIN_FORBIDDEN",
      );
    }
  },
);

test(
  "same-site subdomain request is rejected by Fetch Metadata",
  () => {
    const result =
      validateAdminRequestOrigin(
        request(
          "POST",
          {
            host:
              "origin.internal",

            "x-forwarded-host":
              "alexdack.staark.app",

            origin:
              "https://other.staark.app",

            "sec-fetch-site":
              "same-site",
          },
        ),
        TRUST_PROXY,
      );

    assert.equal(
      result.ok,
      false,
    );

    if (!result.ok) {
      assert.equal(
        result.code,
        "ADMIN_FETCH_SITE_FORBIDDEN",
      );
    }
  },
);

test(
  "cross-site mutation is rejected",
  () => {
    const result =
      validateAdminRequestOrigin(
        request(
          "DELETE",
          {
            host:
              "origin.internal",

            "x-forwarded-host":
              "alexdack.staark.app",

            origin:
              "https://evil.example",

            "sec-fetch-site":
              "cross-site",
          },
        ),
        TRUST_PROXY,
      );

    assert.equal(
      result.ok,
      false,
    );

    if (!result.ok) {
      assert.equal(
        result.code,
        "ADMIN_FETCH_SITE_FORBIDDEN",
      );
    }
  },
);

test(
  "mutation without Origin or Referer fails closed",
  () => {
    const result =
      validateAdminRequestOrigin(
        request(
          "PATCH",
          {
            host:
              "origin.internal",

            "x-forwarded-host":
              "alexdack.staark.app",
          },
        ),
        TRUST_PROXY,
      );

    assert.equal(
      result.ok,
      false,
    );

    if (!result.ok) {
      assert.equal(
        result.code,
        "ADMIN_ORIGIN_REQUIRED",
      );
    }
  },
);

test(
  "same-origin Referer is accepted as fallback",
  () => {
    assert.deepEqual(
      validateAdminRequestOrigin(
        request(
          "POST",
          {
            host:
              "alexdack.staark.app",

            referer:
              "https://alexdack.staark.app/admin/media",
          },
        ),
        {},
      ),
      {
        ok: true,
      },
    );
  },
);

test(
  "forwarded host is ignored when proxy trust is disabled",
  () => {
    const result =
      validateAdminRequestOrigin(
        request(
          "POST",
          {
            host:
              "origin.internal",

            "x-forwarded-host":
              "alexdack.staark.app",

            origin:
              "https://alexdack.staark.app",
          },
        ),
        {},
      );

    assert.equal(
      result.ok,
      false,
    );

    if (!result.ok) {
      assert.equal(
        result.code,
        "ADMIN_ORIGIN_FORBIDDEN",
      );
    }
  },
);
