import { Response } from "express";

export function setAuthCookies(
  res: Response,
  opts: {
    accessToken: string;
    refreshToken: string;
    secure: boolean;
    sameSite: "lax" | "strict" | "none";
    domain?: string;
  }
) {
  const common = {
    httpOnly: true,
    secure: opts.secure,
    sameSite: opts.sameSite,
    domain: opts.domain,
    path: "/"
  } as const;

  res.cookie("access_token", opts.accessToken, {
    ...common,
    maxAge: 10 * 60 * 1000
  });

  res.cookie("refresh_token", opts.refreshToken, {
    ...common,
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
}

export function clearAuthCookies(
  res: Response,
  opts: { secure: boolean; sameSite: "lax" | "strict" | "none"; domain?: string }
) {
  const common = {
    httpOnly: true,
    secure: opts.secure,
    sameSite: opts.sameSite,
    domain: opts.domain,
    path: "/"
  } as const;

  res.clearCookie("access_token", common);
  res.clearCookie("refresh_token", common);
}