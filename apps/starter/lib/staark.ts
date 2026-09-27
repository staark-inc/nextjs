import {
  createStaarkContent,
  type StaarkContent,
} from "@staark/platform/server";
import { ensureLocalContentSeed } from "./storage";

const baseContent = createStaarkContent();

async function withLocalSeed<T>(run: () => Promise<T>): Promise<T> {
  if (baseContent.connection.source === "fixtures") {
    await ensureLocalContentSeed();
  }
  return run();
}

/**
 * One content client per server process, reused across requests.
 *
 * Fixture deployments bootstrap packaged seed content into the configured
 * storage driver before their first read. Hub deployments never seed locally.
 */
export const content: StaarkContent = {
  connection: baseContent.connection,
  getSite: () => withLocalSeed(() => baseContent.getSite()),
  getPages: () => withLocalSeed(() => baseContent.getPages()),
  getPage: (pagePath) => withLocalSeed(() => baseContent.getPage(pagePath)),
  submitForm: (submission) =>
    withLocalSeed(() => baseContent.submitForm(submission)),
};
