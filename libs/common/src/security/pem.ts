export function normalizePem(input: string): string {
  return input.replace(/\\n/g, "\n").trim();
}