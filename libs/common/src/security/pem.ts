export function normalizePem(input: string): string {
  return input.replaceAll(String.raw`\n`, "\n").trim();
}