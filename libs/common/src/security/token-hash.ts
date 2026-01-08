import * as bcrypt from "bcrypt";

const TOKEN_SALT_ROUNDS = 10;

export async function hashToken(raw: string): Promise<string> {
  return bcrypt.hash(raw, TOKEN_SALT_ROUNDS);
}

export async function verifyToken(raw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(raw, hash);
}