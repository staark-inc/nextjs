import type {
  SubmissionKind,
} from "@staark/core";

import {
  resolvePublicContentConfig,
} from "./content-source";

import {
  getPrismaClient,
} from "./db/prisma";

import {
  resolveTenantContext,
  type TenantContext,
} from "./tenant-context";

import {
  evaluatePublicFormPolicy,
  type PublicFormPolicyCode,
} from "./public-form-policy";

type FormRegistry =
  Map<
    string,
    Set<SubmissionKind>
  >;

type SubmissionInput = {
  formId: string;
  kind: SubmissionKind;
};

function record(
  value: unknown,
): Record<string, unknown> | null {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  )
    ? value as Record<
        string,
        unknown
      >
    : null;
}

function formIds(
  value: unknown,
  out: Set<string>,
): void {
  if (
    Array.isArray(value)
  ) {
    for (
      const item of value
    ) {
      formIds(
        item,
        out,
      );
    }

    return;
  }

  const object =
    record(value);

  if (!object) {
    return;
  }

  const id =
    object.formId;

  if (
    typeof id === "string" &&
    /^[a-z0-9\-_]{1,64}$/.test(
      id,
    )
  ) {
    out.add(id);
  }

  for (
    const item of
      Object.values(object)
  ) {
    formIds(
      item,
      out,
    );
  }
}

function configuredKind(
  blockType: string,
  props: unknown,
): SubmissionKind {
  const object =
    record(props);

  const explicit =
    object?.kind;

  if (
    explicit === "contact" ||
    explicit === "lead" ||
    explicit === "booking"
  ) {
    return explicit;
  }

  const type =
    blockType
      .trim()
      .toLowerCase();

  if (
    type.includes("booking") ||
    type.includes("bokning") ||
    type.includes("reservation")
  ) {
    return "booking";
  }

  if (
    type.includes("lead")
  ) {
    return "lead";
  }

  return "contact";
}

async function registryForSite(
  siteId: string,
): Promise<FormRegistry> {
  const pages =
    await getPrismaClient()
      .page
      .findMany({
        where: {
          siteId,
          deletedAt: null,
        },

        select: {
          blocks: {
            select: {
              type: true,
              props: true,
            },
          },
        },
      });

  const registry:
    FormRegistry =
      new Map();

  for (
    const page of pages
  ) {
    for (
      const block of
        page.blocks
    ) {
      const ids =
        new Set<string>();

      formIds(
        block.props,
        ids,
      );

      if (!ids.size) {
        continue;
      }

      const kind =
        configuredKind(
          block.type,
          block.props,
        );

      for (
        const id of ids
      ) {
        const kinds =
          registry.get(id) ??
          new Set<
            SubmissionKind
          >();

        kinds.add(kind);
        registry.set(
          id,
          kinds,
        );
      }
    }
  }

  return registry;
}

function denied(
  code: PublicFormPolicyCode,
): Response {
  if (
    code ===
      "FORM_NOT_FOUND"
  ) {
    return Response.json(
      {
        ok: false,
        code,
        error:
          "This form is not available.",
      },
      {
        status: 404,
        headers: {
          "cache-control":
            "no-store",
        },
      },
    );
  }

  return Response.json(
    {
      ok: false,
      code,
      error:
        "This form is currently unavailable.",
    },
    {
      status: 403,
      headers: {
        "cache-control":
          "no-store",
      },
    },
  );
}

async function tenantForRequest(
  request: Request,
): Promise<TenantContext | null> {
  return resolveTenantContext({
    host:
      request.headers.get(
        "host",
      ),

    forwardedHost:
      request.headers.get(
        "x-forwarded-host",
      ),
  });
}

async function authorize(
  request: Request,
  formId: string,
  endpointKinds:
    readonly SubmissionKind[],
  requestedKind?:
    SubmissionKind,
): Promise<Response | null> {
  /*
   * Dedicated/local legacy deployments preserve the old behaviour.
   * Shared SaaS PostgreSQL runtime is always fail-closed.
   */
  if (
    resolvePublicContentConfig()
      .source !==
      "postgres"
  ) {
    return null;
  }

  const tenant =
    await tenantForRequest(
      request,
    );

  if (!tenant) {
    return denied(
      "SITE_UNAVAILABLE",
    );
  }

  const registry =
    await registryForSite(
      tenant.siteId,
    );

  const registeredKinds =
    [
      ...(
        registry.get(
          formId,
        ) ??
        new Set<
          SubmissionKind
        >()
      ),
    ];

  const result =
    evaluatePublicFormPolicy({
      publicAccess:
        tenant.publicAccess,

      entitlements:
        tenant.entitlements,

      registeredKinds,

      endpointKinds,

      requestedKind,
    });

  return result.ok
    ? null
    : denied(
        result.code,
      );
}

export async function authorizePublicFormToken(
  request: Request,
  formId: string,
  endpointKinds:
    readonly SubmissionKind[],
): Promise<Response | null> {
  return authorize(
    request,
    formId,
    endpointKinds,
  );
}

export async function authorizePublicFormSubmission(
  request: Request,
  submission:
    SubmissionInput,
  endpointKinds:
    readonly SubmissionKind[],
): Promise<Response | null> {
  return authorize(
    request,
    submission.formId,
    endpointKinds,
    submission.kind,
  );
}
