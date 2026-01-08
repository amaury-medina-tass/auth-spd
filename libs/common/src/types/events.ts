export type OutboxEventName =
  | "Auth.UserCreated"
  | "Auth.UserDeactivated"
  | "Auth.UserRolesChanged"
  | "Auth.RolePermissionsChanged";

export type OutboxMessagePayload = Record<string, unknown>;

export interface OutboxEventEnvelope {
  id: string;
  name: OutboxEventName;
  occurredAt: string;
  payload: OutboxMessagePayload;
  requestId: string;
  correlationId?: string;
}