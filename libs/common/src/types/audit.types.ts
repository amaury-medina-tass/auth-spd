/**
 * Audit Log Types and Constants
 * Estructura estandarizada para logs de auditoría en CosmosDB
 */

// === Enum de Acciones ===
export enum AuditAction {
    // Usuarios
    USER_CREATED = "USER_CREATED",
    USER_UPDATED = "USER_UPDATED",
    USER_DELETED = "USER_DELETED",
    USER_ACTIVATED = "USER_ACTIVATED",
    USER_DEACTIVATED = "USER_DEACTIVATED",

    // Roles
    ROLE_ASSIGNED = "ROLE_ASSIGNED",
    ROLE_UNASSIGNED = "ROLE_UNASSIGNED",
    ROLE_CREATED = "ROLE_CREATED",
    ROLE_UPDATED = "ROLE_UPDATED",
    ROLE_DELETED = "ROLE_DELETED",

    // Permisos
    PERMISSION_GRANTED = "PERMISSION_GRANTED",
    PERMISSION_REVOKED = "PERMISSION_REVOKED",

    // Auth
    LOGIN_SUCCESS = "LOGIN_SUCCESS",
    LOGIN_FAILED = "LOGIN_FAILED",
    LOGOUT = "LOGOUT",
    PASSWORD_CHANGED = "PASSWORD_CHANGED",
    PASSWORD_RESET_REQUESTED = "PASSWORD_RESET_REQUESTED",

    // Módulos
    MODULE_CREATED = "MODULE_CREATED",
    MODULE_UPDATED = "MODULE_UPDATED",
    MODULE_DELETED = "MODULE_DELETED",

    // Acciones
    ACTION_CREATED = "ACTION_CREATED",
    ACTION_UPDATED = "ACTION_UPDATED",
    ACTION_DELETED = "ACTION_DELETED",
}

// === Labels legibles por acción ===
export const ACTION_LABELS: Record<AuditAction, string> = {
    [AuditAction.USER_CREATED]: "Usuario Creado",
    [AuditAction.USER_UPDATED]: "Usuario Actualizado",
    [AuditAction.USER_DELETED]: "Usuario Eliminado",
    [AuditAction.USER_ACTIVATED]: "Usuario Activado",
    [AuditAction.USER_DEACTIVATED]: "Usuario Desactivado",
    [AuditAction.ROLE_ASSIGNED]: "Rol Asignado",
    [AuditAction.ROLE_UNASSIGNED]: "Rol Removido",
    [AuditAction.ROLE_CREATED]: "Rol Creado",
    [AuditAction.ROLE_UPDATED]: "Rol Actualizado",
    [AuditAction.ROLE_DELETED]: "Rol Eliminado",
    [AuditAction.PERMISSION_GRANTED]: "Permiso Otorgado",
    [AuditAction.PERMISSION_REVOKED]: "Permiso Revocado",
    [AuditAction.LOGIN_SUCCESS]: "Inicio de Sesión",
    [AuditAction.LOGIN_FAILED]: "Inicio de Sesión Fallido",
    [AuditAction.LOGOUT]: "Cierre de Sesión",
    [AuditAction.PASSWORD_CHANGED]: "Contraseña Cambiada",
    [AuditAction.PASSWORD_RESET_REQUESTED]: "Recuperación de Contraseña",
    [AuditAction.MODULE_CREATED]: "Módulo Creado",
    [AuditAction.MODULE_UPDATED]: "Módulo Actualizado",
    [AuditAction.MODULE_DELETED]: "Módulo Eliminado",
    [AuditAction.ACTION_CREATED]: "Acción Creada",
    [AuditAction.ACTION_UPDATED]: "Acción Actualizada",
    [AuditAction.ACTION_DELETED]: "Acción Eliminada",
};

// === Labels legibles por campo ===
export const FIELD_LABELS: Record<string, string> = {
    email: "Correo Electrónico",
    first_name: "Nombre",
    last_name: "Apellido",
    document_number: "Número de Documento",
    is_active: "Estado Activo",
    password: "Contraseña",
    role: "Rol",
    permission: "Permiso",
    name: "Nombre",
    description: "Descripción",
    code: "Código",
    system: "Sistema",
};

// === Interfaces ===
export interface AuditActor {
    id: string;
    email: string;
    name?: string;
}

export interface AuditChange {
    field: string;
    fieldLabel: string;
    oldValue: any;
    newValue: any;
}

export interface AuditError {
    code: string;
    message: string;
}

export interface AuditLogEntry {
    // Identificación
    id: string;
    timestamp: Date;

    // Acción
    action: AuditAction;
    actionLabel: string;
    success: boolean;

    // Entidad Afectada
    entityType: string;
    entityId: string;
    entityName?: string;

    // Actor (quién hizo la acción)
    actor?: AuditActor;

    // Contexto
    system?: string;
    ipAddress?: string;
    userAgent?: string;

    // Cambios Detallados (solo para updates)
    changes?: AuditChange[];

    // Error (solo si success = false)
    error?: AuditError;

    // Metadatos adicionales
    metadata?: Record<string, any>;
}

// === Helpers ===
export function getFieldLabel(field: string): string {
    return FIELD_LABELS[field] || field;
}

export function getActionLabel(action: AuditAction): string {
    return ACTION_LABELS[action] || action;
}

export function buildChanges(
    oldData: Record<string, any>,
    newData: Record<string, any>,
    fields: string[]
): AuditChange[] {
    const changes: AuditChange[] = [];

    for (const field of fields) {
        if (newData[field] !== undefined && oldData[field] !== newData[field]) {
            changes.push({
                field,
                fieldLabel: getFieldLabel(field),
                oldValue: oldData[field],
                newValue: newData[field],
            });
        }
    }

    return changes;
}
