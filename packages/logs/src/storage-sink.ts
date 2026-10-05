import type {
  StaarkLogSink,
} from "./types.ts";

import type {
  StaarkLogStore,
} from "./store-types.ts";

export function createStorageLogSink(
  store: StaarkLogStore,
): StaarkLogSink {
  return {
    async write(entry) {
      await store.append(
        entry,
      );
    },
  };
}
