import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_MEDIA_FILE_BYTES,
  MAX_MEDIA_FILES_PER_REQUEST,
  MAX_MEDIA_TOTAL_BYTES,
  imageBytesMatchExtension,
  validateMediaUploadBatch,
} from "../lib/media-upload-policy.ts";

test(
  "normal image batch is accepted",
  () => {
    assert.deepEqual(
      validateMediaUploadBatch([
        {
          name: "one.png",
          size: 1024,
        },
        {
          name: "two.webp",
          size: 2048,
        },
      ]),
      {
        ok: true,
        totalBytes: 3072,
      },
    );
  },
);

test(
  "too many files are rejected",
  () => {
    const files =
      Array.from(
        {
          length:
            MAX_MEDIA_FILES_PER_REQUEST +
            1,
        },
        (_, index) => ({
          name:
            `image-${index}.png`,
          size: 1,
        }),
      );

    const result =
      validateMediaUploadBatch(
        files,
      );

    assert.equal(
      result.ok,
      false,
    );

    if (!result.ok) {
      assert.equal(
        result.code,
        "TOO_MANY_FILES",
      );
    }
  },
);

test(
  "oversized file is rejected",
  () => {
    const result =
      validateMediaUploadBatch([
        {
          name:
            "huge.jpg",
          size:
            MAX_MEDIA_FILE_BYTES +
            1,
        },
      ]);

    assert.equal(
      result.ok,
      false,
    );

    if (!result.ok) {
      assert.equal(
        result.code,
        "FILE_TOO_LARGE",
      );
    }
  },
);

test(
  "combined upload limit is enforced",
  () => {
    const result =
      validateMediaUploadBatch([
        {
          name: "a.jpg",
          size:
            9 * 1024 * 1024,
        },
        {
          name: "b.jpg",
          size:
            9 * 1024 * 1024,
        },
        {
          name: "c.jpg",
          size:
            8 * 1024 * 1024,
        },
      ]);

    assert.equal(
      result.ok,
      false,
    );

    if (!result.ok) {
      assert.equal(
        result.code,
        "REQUEST_TOO_LARGE",
      );
    }
  },
);

test(
  "SVG and unknown upload extensions are rejected",
  () => {
    const result =
      validateMediaUploadBatch([
        {
          name:
            "vector.svg",
          size: 100,
        },
      ]);

    assert.equal(
      result.ok,
      false,
    );

    if (!result.ok) {
      assert.equal(
        result.code,
        "UNSUPPORTED_IMAGE",
      );
    }
  },
);

test(
  "PNG signature must match PNG extension",
  () => {
    const png =
      new Uint8Array([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a,
      ]);

    assert.equal(
      imageBytesMatchExtension(
        "photo.png",
        png,
      ),
      true,
    );

    assert.equal(
      imageBytesMatchExtension(
        "photo.jpg",
        png,
      ),
      false,
    );
  },
);

test(
  "JPEG and WebP signatures are recognized",
  () => {
    assert.equal(
      imageBytesMatchExtension(
        "photo.jpeg",
        new Uint8Array([
          0xff,
          0xd8,
          0xff,
          0xe0,
        ]),
      ),
      true,
    );

    assert.equal(
      imageBytesMatchExtension(
        "photo.webp",
        new Uint8Array([
          0x52,
          0x49,
          0x46,
          0x46,
          0,
          0,
          0,
          0,
          0x57,
          0x45,
          0x42,
          0x50,
        ]),
      ),
      true,
    );
  },
);

test(
  "AVIF compatible brand is recognized",
  () => {
    const avif =
      new Uint8Array([
        0,
        0,
        0,
        24,
        0x66,
        0x74,
        0x79,
        0x70,
        0x61,
        0x76,
        0x69,
        0x66,
      ]);

    assert.equal(
      imageBytesMatchExtension(
        "photo.avif",
        avif,
      ),
      true,
    );
  },
);

test(
  "ICO header is recognized",
  () => {
    assert.equal(
      imageBytesMatchExtension(
        "favicon.ico",
        new Uint8Array([
          0,
          0,
          1,
          0,
          1,
          0,
        ]),
      ),
      true,
    );
  },
);
