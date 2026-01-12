export type SystemType = "DAGRD" | "SICGEM" | "PUBLIC";

export const SYSTEMS = ["DAGRD", "SICGEM", "PUBLIC"] as const;

export function isValidSystem(value: string): value is SystemType {
    return SYSTEMS.includes(value as SystemType);
}
