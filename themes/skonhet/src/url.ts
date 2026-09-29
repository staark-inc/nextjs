/** Adds ?key=value to a link that may carry a #hash, e.g. "#boka" → "?tjanst=Gelé#boka". */
export function withParam(href: string, key: string, value: string): string {
  const [path, hash] = href.split("#");
  const sep = path!.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(value)}${hash !== undefined ? `#${hash}` : ""}`;
}
