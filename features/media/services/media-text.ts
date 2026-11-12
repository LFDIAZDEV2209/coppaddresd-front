import type { MediaItem } from "../types";

const legacyBytes = new Map(
  Array.from("€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008dŽ\u008f\u0090‘’“”•–—˜™š›œ\u009džŸ").map(
    (character, index) => [character, 0x80 + index],
  ),
);
const tail = "[\\u0080-\\u00bf€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]";
const fragments = new RegExp(`(?:[ÂÃ]${tail}|â${tail}{2}|ð${tail}{3})`, "gu");
/** Repara fragmentos UTF-8 leídos como Latin-1/Windows-1252; conserva el resto del nombre. */
export function repairMediaText(value: string): string {
  let result = value;
  for (let pass = 0; pass < 2; pass++) {
    const next = result.replace(fragments, (fragment) => {
      try {
        const bytes = Uint8Array.from(
          Array.from(
            fragment,
            (character) =>
              legacyBytes.get(character) ?? character.charCodeAt(0),
          ),
        );
        return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch {
        return fragment;
      }
    });
    if (next === result) break;
    result = next;
  }
  return result;
}
export function normalizeMediaItem(item: MediaItem): MediaItem {
  return {
    ...item,
    title: repairMediaText(item.title),
    author: repairMediaText(item.author ?? ""),
    description:
      item.description === null ? null : repairMediaText(item.description),
    chapters: item.chapters?.map((chapter) => ({
      ...chapter,
      label: repairMediaText(chapter.label),
    })),
    takeaways: item.takeaways?.map(repairMediaText),
  };
}
