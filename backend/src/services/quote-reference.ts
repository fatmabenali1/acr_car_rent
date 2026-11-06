import { randomInt } from "node:crypto";

export function createQuoteReference(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return `${String(randomInt(0, 10_000)).padStart(4, "0")}${letters[randomInt(0, letters.length)]}${letters[randomInt(0, letters.length)]}`;
}
