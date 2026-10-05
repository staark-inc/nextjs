import {
  createFormsRoute,
} from "@staark/platform/server";

import {
  content,
} from "@/lib/staark";

import {
  authorizePublicFormSubmission,
  authorizePublicFormToken,
} from "@/lib/public-form-access";

const BOOKING_KINDS =
  [
    "booking",
  ] as const;

export const dynamic =
  "force-dynamic";

export const {
  GET,
  POST,
} = createFormsRoute(
  content,
  {
    acceptedKinds:
      BOOKING_KINDS,

    authorizeToken:
      (
        request,
        formId,
      ) =>
        authorizePublicFormToken(
          request,
          formId,
          BOOKING_KINDS,
        ),

    authorizeSubmission:
      (
        request,
        submission,
      ) =>
        authorizePublicFormSubmission(
          request,
          submission,
          BOOKING_KINDS,
        ),

  },
);
