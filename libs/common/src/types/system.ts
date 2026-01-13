export type SystemType = "SPD" | "SICGEM" | "PUBLIC";

export const SYSTEMS = ["SPD", "SICGEM", "PUBLIC"] as const;

export function isValidSystem(value: string): value is SystemType {
    return SYSTEMS.includes(value as SystemType);
}
