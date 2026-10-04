export const MAX_MEDIA_FILE_BYTES =
  10 * 1024 * 1024;

export const MAX_MEDIA_FILES_PER_REQUEST =
  10;

export const MAX_MEDIA_TOTAL_BYTES =
  25 * 1024 * 1024;

/**
 * Multipart adds boundaries/headers on top of the actual files.
 * Reject obviously oversized bodies before req.formData() allocates them.
 */
export const MAX_MEDIA_MULTIPART_BYTES =
  27 * 1024 * 1024;

export type MediaUploadShape = {
  name: string;
  size: number;
};

export type MediaUploadBatchResult =
  | {
      ok: true;
      totalBytes: number;
    }
  | {
      ok: false;
      status: 400 | 413 | 415;
      code:
        | "NO_FILES"
        | "TOO_MANY_FILES"
        | "EMPTY_FILE"
        | "FILE_TOO_LARGE"
        | "REQUEST_TOO_LARGE"
        | "UNSUPPORTED_IMAGE";
      error: string;
    };

const UPLOAD_EXTENSION =
  /\.(jpg|jpeg|png|gif|webp|avif|ico)$/i;

function extension(
  name: string,
): string {
  const match =
    /\.([a-z0-9]+)$/i.exec(
      name,
    );

  return match?.[1]
    ?.toLowerCase() ??
    "";
}

export function validateMediaUploadBatch(
  files: readonly MediaUploadShape[],
): MediaUploadBatchResult {
  if (!files.length) {
    return {
      ok: false,
      status: 400,
      code: "NO_FILES",
      error: "No files uploaded.",
    };
  }

  if (
    files.length >
    MAX_MEDIA_FILES_PER_REQUEST
  ) {
    return {
      ok: false,
      status: 413,
      code:
        "TOO_MANY_FILES",
      error:
        `Upload at most ${MAX_MEDIA_FILES_PER_REQUEST} images at a time.`,
    };
  }

  let totalBytes = 0;

  for (const file of files) {
    if (file.size <= 0) {
      return {
        ok: false,
        status: 400,
        code: "EMPTY_FILE",
        error:
          `${file.name} is empty.`,
      };
    }

    if (
      file.size >
      MAX_MEDIA_FILE_BYTES
    ) {
      return {
        ok: false,
        status: 413,
        code:
          "FILE_TOO_LARGE",
        error:
          `${file.name} is larger than 10 MB.`,
      };
    }

    if (
      !UPLOAD_EXTENSION.test(
        file.name,
      )
    ) {
      return {
        ok: false,
        status: 415,
        code:
          "UNSUPPORTED_IMAGE",
        error:
          `${file.name} is not a supported raster image.`,
      };
    }

    totalBytes += file.size;

    if (
      totalBytes >
      MAX_MEDIA_TOTAL_BYTES
    ) {
      return {
        ok: false,
        status: 413,
        code:
          "REQUEST_TOO_LARGE",
        error:
          "The combined upload is larger than 25 MB.",
      };
    }
  }

  return {
    ok: true,
    totalBytes,
  };
}

function ascii(
  bytes: Uint8Array,
  start: number,
  length: number,
): string {
  let value = "";

  for (
    let i = start;
    i < start + length &&
    i < bytes.length;
    i += 1
  ) {
    value +=
      String.fromCharCode(
        bytes[i]!,
      );
  }

  return value;
}

function isJpeg(
  bytes: Uint8Array,
): boolean {
  return (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  );
}

function isPng(
  bytes: Uint8Array,
): boolean {
  const signature = [
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
  ];

  return (
    bytes.length >=
      signature.length &&
    signature.every(
      (value, index) =>
        bytes[index] === value,
    )
  );
}

function isGif(
  bytes: Uint8Array,
): boolean {
  const head =
    ascii(
      bytes,
      0,
      6,
    );

  return (
    head === "GIF87a" ||
    head === "GIF89a"
  );
}

function isWebp(
  bytes: Uint8Array,
): boolean {
  return (
    bytes.length >= 12 &&
    ascii(
      bytes,
      0,
      4,
    ) === "RIFF" &&
    ascii(
      bytes,
      8,
      4,
    ) === "WEBP"
  );
}

function isIco(
  bytes: Uint8Array,
): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x00 &&
    bytes[1] === 0x00 &&
    bytes[2] === 0x01 &&
    bytes[3] === 0x00
  );
}

function isAvif(
  bytes: Uint8Array,
): boolean {
  if (
    bytes.length < 12 ||
    ascii(
      bytes,
      4,
      4,
    ) !== "ftyp"
  ) {
    return false;
  }

  const end =
    Math.min(
      bytes.length,
      64,
    );

  for (
    let offset = 8;
    offset + 4 <= end;
    offset += 4
  ) {
    const brand =
      ascii(
        bytes,
        offset,
        4,
      );

    if (
      brand === "avif" ||
      brand === "avis"
    ) {
      return true;
    }
  }

  return false;
}

export function imageBytesMatchExtension(
  name: string,
  bytes: Uint8Array,
): boolean {
  switch (
    extension(name)
  ) {
    case "jpg":
    case "jpeg":
      return isJpeg(bytes);

    case "png":
      return isPng(bytes);

    case "gif":
      return isGif(bytes);

    case "webp":
      return isWebp(bytes);

    case "avif":
      return isAvif(bytes);

    case "ico":
      return isIco(bytes);

    default:
      return false;
  }
}
