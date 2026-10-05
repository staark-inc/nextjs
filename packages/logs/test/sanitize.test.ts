import {
  test,
} from "node:test";

import assert from "node:assert/strict";

import {
  REDACTED_LOG_VALUE,
  isSensitiveLogKey,
  sanitizeLogMeta,
} from "../src/index.ts";

test(
  "sensitive log keys are detected",
  () => {
    assert.equal(
      isSensitiveLogKey(
        "authorization",
      ),
      true,
    );

    assert.equal(
      isSensitiveLogKey(
        "API_KEY",
      ),
      true,
    );

    assert.equal(
      isSensitiveLogKey(
        "clientSecret",
      ),
      true,
    );

    assert.equal(
      isSensitiveLogKey(
        "theme",
      ),
      false,
    );
  },
);

test(
  "sanitizeLogMeta recursively redacts secrets",
  () => {
    const result =
      sanitizeLogMeta({
        theme: "salong",
        password: "secret",
        nested: {
          authorization:
            "Bearer abc",
          safe: true,
          credentials: {
            private_key:
              "-----BEGIN...",
          },
        },
      });

    assert.deepEqual(result, {
      theme: "salong",
      password:
        REDACTED_LOG_VALUE,
      nested: {
        authorization:
          REDACTED_LOG_VALUE,
        safe: true,
        credentials: {
          private_key:
            REDACTED_LOG_VALUE,
        },
      },
    });
  },
);

test(
  "sanitizeLogMeta handles circular values",
  () => {
    const value: Record<
      string,
      unknown
    > = {
      name: "runtime",
    };

    value.self = value;

    const result =
      sanitizeLogMeta({
        value,
      });

    assert.deepEqual(result, {
      value: {
        name: "runtime",
        self: "[CIRCULAR]",
      },
    });
  },
);
