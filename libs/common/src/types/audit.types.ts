/**
 * Audit Log Types and Constants
 * Estructura estandarizada para logs de auditoría en CosmosDB
 */

// === Enum de Acciones ===
export enum AuditAction {
    // ========================
    // AUTH-SPD (Sistema de Auth)
    // ========================

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

    // ========================
    // SPD-CORE — MASTERS
    // ========================

    // Variables
    VARIABLE_CREATED = "VARIABLE_CREATED",
    VARIABLE_UPDATED = "VARIABLE_UPDATED",
    VARIABLE_DELETED = "VARIABLE_DELETED",

    // Variable Ubicaciones
    VARIABLE_LOCATION_ADDED = "VARIABLE_LOCATION_ADDED",
    VARIABLE_LOCATION_REMOVED = "VARIABLE_LOCATION_REMOVED",

    // Metas de Variable
    VARIABLE_GOAL_CREATED = "VARIABLE_GOAL_CREATED",
    VARIABLE_GOAL_UPDATED = "VARIABLE_GOAL_UPDATED",
    VARIABLE_GOAL_DELETED = "VARIABLE_GOAL_DELETED",

    // Cuatrienios de Variable
    VARIABLE_QUADRENNIUM_CREATED = "VARIABLE_QUADRENNIUM_CREATED",
    VARIABLE_QUADRENNIUM_UPDATED = "VARIABLE_QUADRENNIUM_UPDATED",
    VARIABLE_QUADRENNIUM_DELETED = "VARIABLE_QUADRENNIUM_DELETED",

    // Ubicaciones
    LOCATION_CREATED = "LOCATION_CREATED",

    // Actividades MGA
    MGA_ACTIVITY_CREATED = "MGA_ACTIVITY_CREATED",
    MGA_ACTIVITY_UPDATED = "MGA_ACTIVITY_UPDATED",
    MGA_DETAILED_RELATION_ADDED = "MGA_DETAILED_RELATION_ADDED",
    MGA_DETAILED_RELATION_REMOVED = "MGA_DETAILED_RELATION_REMOVED",

    // Actividades Detalladas
    DETAILED_ACTIVITY_CREATED = "DETAILED_ACTIVITY_CREATED",
    DETAILED_ACTIVITY_UPDATED = "DETAILED_ACTIVITY_UPDATED",
    DETAILED_ACTIVITY_DELETED = "DETAILED_ACTIVITY_DELETED",

    // Modificaciones Presupuestales
    BUDGET_MODIFICATION_CREATED = "BUDGET_MODIFICATION_CREATED",

    // Fórmulas
    FORMULA_CREATED = "FORMULA_CREATED",
    FORMULA_UPDATED = "FORMULA_UPDATED",

    // Indicadores Plan de Acción
    ACTION_INDICATOR_CREATED = "ACTION_INDICATOR_CREATED",
    ACTION_INDICATOR_UPDATED = "ACTION_INDICATOR_UPDATED",
    ACTION_INDICATOR_DELETED = "ACTION_INDICATOR_DELETED",

    // Metas Indicador Plan de Acción
    ACTION_INDICATOR_GOAL_CREATED = "ACTION_INDICATOR_GOAL_CREATED",
    ACTION_INDICATOR_GOAL_UPDATED = "ACTION_INDICATOR_GOAL_UPDATED",
    ACTION_INDICATOR_GOAL_DELETED = "ACTION_INDICATOR_GOAL_DELETED",

    // Cuatrienios Indicador Plan de Acción
    ACTION_INDICATOR_QUADRENNIUM_CREATED = "ACTION_INDICATOR_QUADRENNIUM_CREATED",
    ACTION_INDICATOR_QUADRENNIUM_UPDATED = "ACTION_INDICATOR_QUADRENNIUM_UPDATED",
    ACTION_INDICATOR_QUADRENNIUM_DELETED = "ACTION_INDICATOR_QUADRENNIUM_DELETED",

    // Ubicaciones Indicador Plan de Acción
    ACTION_INDICATOR_LOCATION_ADDED = "ACTION_INDICATOR_LOCATION_ADDED",
    ACTION_INDICATOR_LOCATION_REMOVED = "ACTION_INDICATOR_LOCATION_REMOVED",

    // Relaciones Variable ↔ Indicador Plan de Acción
    VARIABLE_ACTION_ASSOCIATED = "VARIABLE_ACTION_ASSOCIATED",
    VARIABLE_ACTION_DISASSOCIATED = "VARIABLE_ACTION_DISASSOCIATED",

    // Relaciones Proyecto ↔ Indicador Plan de Acción
    PROJECT_ACTION_INDICATOR_ASSOCIATED = "PROJECT_ACTION_INDICATOR_ASSOCIATED",
    PROJECT_ACTION_INDICATOR_DISASSOCIATED = "PROJECT_ACTION_INDICATOR_DISASSOCIATED",

    // Indicadores Plan Indicativo
    INDICATIVE_INDICATOR_CREATED = "INDICATIVE_INDICATOR_CREATED",
    INDICATIVE_INDICATOR_UPDATED = "INDICATIVE_INDICATOR_UPDATED",
    INDICATIVE_INDICATOR_DELETED = "INDICATIVE_INDICATOR_DELETED",

    // Metas Indicador Plan Indicativo
    INDICATIVE_INDICATOR_GOAL_CREATED = "INDICATIVE_INDICATOR_GOAL_CREATED",
    INDICATIVE_INDICATOR_GOAL_UPDATED = "INDICATIVE_INDICATOR_GOAL_UPDATED",
    INDICATIVE_INDICATOR_GOAL_DELETED = "INDICATIVE_INDICATOR_GOAL_DELETED",

    // Cuatrienios Indicador Plan Indicativo
    INDICATIVE_INDICATOR_QUADRENNIUM_CREATED = "INDICATIVE_INDICATOR_QUADRENNIUM_CREATED",
    INDICATIVE_INDICATOR_QUADRENNIUM_UPDATED = "INDICATIVE_INDICATOR_QUADRENNIUM_UPDATED",
    INDICATIVE_INDICATOR_QUADRENNIUM_DELETED = "INDICATIVE_INDICATOR_QUADRENNIUM_DELETED",

    // Ubicaciones Indicador Plan Indicativo
    INDICATIVE_INDICATOR_LOCATION_ADDED = "INDICATIVE_INDICATOR_LOCATION_ADDED",
    INDICATIVE_INDICATOR_LOCATION_REMOVED = "INDICATIVE_INDICATOR_LOCATION_REMOVED",

    // Relaciones Variable ↔ Indicador Plan Indicativo
    VARIABLE_INDICATIVE_ASSOCIATED = "VARIABLE_INDICATIVE_ASSOCIATED",
    VARIABLE_INDICATIVE_DISASSOCIATED = "VARIABLE_INDICATIVE_DISASSOCIATED",

    // ========================
    // SPD-CORE — FINANCIAL
    // ========================

    // Proyectos
    PROJECT_CREATED = "PROJECT_CREATED",

    // Fuentes de Financiación
    FUNDING_SOURCE_CREATED = "FUNDING_SOURCE_CREATED",
    FUNDING_SOURCE_UPDATED = "FUNDING_SOURCE_UPDATED",
    FUNDING_SOURCE_DELETED = "FUNDING_SOURCE_DELETED",

    // POAI-PPA
    POAI_PPA_CREATED = "POAI_PPA_CREATED",
    POAI_PPA_UPDATED = "POAI_PPA_UPDATED",
    POAI_PPA_DELETED = "POAI_PPA_DELETED",

    // Posiciones CDP
    CDP_POSITION_OBSERVATIONS_UPDATED = "CDP_POSITION_OBSERVATIONS_UPDATED",
    CDP_POSITION_ACTIVITY_ASSOCIATED = "CDP_POSITION_ACTIVITY_ASSOCIATED",
    CDP_POSITION_ACTIVITY_DISASSOCIATED = "CDP_POSITION_ACTIVITY_DISASSOCIATED",

    // Consumo CDP (Financiamiento)
    CDP_FUNDING_CONSUMED = "CDP_FUNDING_CONSUMED",

    // ========================
    // SPD-CORE — SUB (Seguimiento)
    // ========================

    // Avances de Variable
    VARIABLE_ADVANCE_CREATED = "VARIABLE_ADVANCE_CREATED",
    VARIABLE_ADVANCE_UPDATED = "VARIABLE_ADVANCE_UPDATED",

    // Avances de Indicador
    INDICATOR_ADVANCE_CREATED = "INDICATOR_ADVANCE_CREATED",
    INDICATOR_ADVANCE_UPDATED = "INDICATOR_ADVANCE_UPDATED",

    // ========================
    // SPD-CORE — SAP SYNC
    // ========================

    SAP_SYNC_ENQUEUED = "SAP_SYNC_ENQUEUED",
    SAP_SYNC_COMPLETED = "SAP_SYNC_COMPLETED",
    SAP_SYNC_FAILED = "SAP_SYNC_FAILED",
}

// === Enum de Tipos de Entidad ===
export enum AuditEntityType {
    // Auth
    USER = "User",
    ROLE = "Role",
    ROLE_PERMISSIONS = "RolePermissions",
    USER_ROLE = "UserRole",
    MODULE = "Module",
    PERMISSION = "Permission",
    ACTION = "Action",

    // Masters
    VARIABLE = "Variable",
    VARIABLE_LOCATION = "VariableLocation",
    VARIABLE_GOAL = "VariableGoal",
    VARIABLE_QUADRENNIUM = "VariableQuadrennium",
    LOCATION = "Location",
    MGA_ACTIVITY = "MgaActivity",
    MGA_DETAILED_RELATION = "MgaDetailedRelation",
    DETAILED_ACTIVITY = "DetailedActivity",
    BUDGET_MODIFICATION = "BudgetModification",
    FORMULA = "Formula",
    ACTION_PLAN_INDICATOR = "ActionPlanIndicator",
    ACTION_PLAN_INDICATOR_GOAL = "ActionPlanIndicatorGoal",
    ACTION_PLAN_INDICATOR_QUADRENNIUM = "ActionPlanIndicatorQuadrennium",
    ACTION_PLAN_INDICATOR_LOCATION = "ActionPlanIndicatorLocation",
    VARIABLE_ACTION_RELATION = "VariableActionRelation",
    PROJECT_ACTION_INDICATOR_RELATION = "ProjectActionIndicatorRelation",
    INDICATIVE_PLAN_INDICATOR = "IndicativePlanIndicator",
    INDICATIVE_PLAN_INDICATOR_GOAL = "IndicativePlanIndicatorGoal",
    INDICATIVE_PLAN_INDICATOR_QUADRENNIUM = "IndicativePlanIndicatorQuadrennium",
    INDICATIVE_PLAN_INDICATOR_LOCATION = "IndicativePlanIndicatorLocation",
    VARIABLE_INDICATIVE_RELATION = "VariableIndicativeRelation",

    // Financial
    PROJECT = "Project",
    FUNDING_SOURCE = "FundingSource",
    POAI_PPA = "PoaiPpa",
    CDP_POSITION = "CdpPosition",
    CDP_FUNDING = "CdpFunding",

    // Sub (Seguimiento)
    VARIABLE_ADVANCE = "VariableAdvance",
    INDICATOR_ADVANCE = "IndicatorAdvance",

    // SAP
    SAP_SYNC = "SapSync",
}

// === Labels legibles por acción ===
export const ACTION_LABELS: Record<AuditAction, string> = {
    // Auth
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
    [AuditAction.PASSWORD_CHANGED]: "Contraseña Cambiada", // NOSONAR — UI label, not a credential
    [AuditAction.PASSWORD_RESET_REQUESTED]: "Recuperación de Contraseña", // NOSONAR
    [AuditAction.MODULE_CREATED]: "Módulo Creado",
    [AuditAction.MODULE_UPDATED]: "Módulo Actualizado",
    [AuditAction.MODULE_DELETED]: "Módulo Eliminado",
    [AuditAction.ACTION_CREATED]: "Acción Creada",
    [AuditAction.ACTION_UPDATED]: "Acción Actualizada",
    [AuditAction.ACTION_DELETED]: "Acción Eliminada",

    // Masters — Variables
    [AuditAction.VARIABLE_CREATED]: "Variable Creada",
    [AuditAction.VARIABLE_UPDATED]: "Variable Actualizada",
    [AuditAction.VARIABLE_DELETED]: "Variable Eliminada",
    [AuditAction.VARIABLE_LOCATION_ADDED]: "Ubicación de Variable Agregada",
    [AuditAction.VARIABLE_LOCATION_REMOVED]: "Ubicación de Variable Removida",
    [AuditAction.VARIABLE_GOAL_CREATED]: "Meta de Variable Creada",
    [AuditAction.VARIABLE_GOAL_UPDATED]: "Meta de Variable Actualizada",
    [AuditAction.VARIABLE_GOAL_DELETED]: "Meta de Variable Eliminada",
    [AuditAction.VARIABLE_QUADRENNIUM_CREATED]: "Cuatrienio de Variable Creado",
    [AuditAction.VARIABLE_QUADRENNIUM_UPDATED]: "Cuatrienio de Variable Actualizado",
    [AuditAction.VARIABLE_QUADRENNIUM_DELETED]: "Cuatrienio de Variable Eliminado",

    // Masters — Ubicaciones
    [AuditAction.LOCATION_CREATED]: "Ubicación Creada",

    // Masters — Actividades MGA
    [AuditAction.MGA_ACTIVITY_CREATED]: "Actividad MGA Creada",
    [AuditAction.MGA_ACTIVITY_UPDATED]: "Actividad MGA Actualizada",
    [AuditAction.MGA_DETAILED_RELATION_ADDED]: "Relación Detallada MGA Agregada",
    [AuditAction.MGA_DETAILED_RELATION_REMOVED]: "Relación Detallada MGA Removida",

    // Masters — Actividades Detalladas
    [AuditAction.DETAILED_ACTIVITY_CREATED]: "Actividad Detallada Creada",
    [AuditAction.DETAILED_ACTIVITY_UPDATED]: "Actividad Detallada Actualizada",
    [AuditAction.DETAILED_ACTIVITY_DELETED]: "Actividad Detallada Eliminada",

    // Masters — Modificaciones Presupuestales
    [AuditAction.BUDGET_MODIFICATION_CREATED]: "Modificación Presupuestal Creada",

    // Masters — Fórmulas
    [AuditAction.FORMULA_CREATED]: "Fórmula Creada",
    [AuditAction.FORMULA_UPDATED]: "Fórmula Actualizada",

    // Masters — Indicadores Plan de Acción
    [AuditAction.ACTION_INDICATOR_CREATED]: "Indicador de Plan de Acción Creado",
    [AuditAction.ACTION_INDICATOR_UPDATED]: "Indicador de Plan de Acción Actualizado",
    [AuditAction.ACTION_INDICATOR_DELETED]: "Indicador de Plan de Acción Eliminado",
    [AuditAction.ACTION_INDICATOR_GOAL_CREATED]: "Meta de Indicador (Plan de Acción) Creada",
    [AuditAction.ACTION_INDICATOR_GOAL_UPDATED]: "Meta de Indicador (Plan de Acción) Actualizada",
    [AuditAction.ACTION_INDICATOR_GOAL_DELETED]: "Meta de Indicador (Plan de Acción) Eliminada",
    [AuditAction.ACTION_INDICATOR_QUADRENNIUM_CREATED]: "Cuatrienio de Indicador (Plan de Acción) Creado",
    [AuditAction.ACTION_INDICATOR_QUADRENNIUM_UPDATED]: "Cuatrienio de Indicador (Plan de Acción) Actualizado",
    [AuditAction.ACTION_INDICATOR_QUADRENNIUM_DELETED]: "Cuatrienio de Indicador (Plan de Acción) Eliminado",
    [AuditAction.ACTION_INDICATOR_LOCATION_ADDED]: "Ubicación de Indicador (Plan de Acción) Agregada",
    [AuditAction.ACTION_INDICATOR_LOCATION_REMOVED]: "Ubicación de Indicador (Plan de Acción) Removida",
    [AuditAction.VARIABLE_ACTION_ASSOCIATED]: "Variable Asociada a Indicador de Plan de Acción",
    [AuditAction.VARIABLE_ACTION_DISASSOCIATED]: "Variable Desasociada de Indicador de Plan de Acción",
    [AuditAction.PROJECT_ACTION_INDICATOR_ASSOCIATED]: "Proyecto Asociado a Indicador de Plan de Acción",
    [AuditAction.PROJECT_ACTION_INDICATOR_DISASSOCIATED]: "Proyecto Desasociado de Indicador de Plan de Acción",

    // Masters — Indicadores Plan Indicativo
    [AuditAction.INDICATIVE_INDICATOR_CREATED]: "Indicador de Plan Indicativo Creado",
    [AuditAction.INDICATIVE_INDICATOR_UPDATED]: "Indicador de Plan Indicativo Actualizado",
    [AuditAction.INDICATIVE_INDICATOR_DELETED]: "Indicador de Plan Indicativo Eliminado",
    [AuditAction.INDICATIVE_INDICATOR_GOAL_CREATED]: "Meta de Indicador (Plan Indicativo) Creada",
    [AuditAction.INDICATIVE_INDICATOR_GOAL_UPDATED]: "Meta de Indicador (Plan Indicativo) Actualizada",
    [AuditAction.INDICATIVE_INDICATOR_GOAL_DELETED]: "Meta de Indicador (Plan Indicativo) Eliminada",
    [AuditAction.INDICATIVE_INDICATOR_QUADRENNIUM_CREATED]: "Cuatrienio de Indicador (Plan Indicativo) Creado",
    [AuditAction.INDICATIVE_INDICATOR_QUADRENNIUM_UPDATED]: "Cuatrienio de Indicador (Plan Indicativo) Actualizado",
    [AuditAction.INDICATIVE_INDICATOR_QUADRENNIUM_DELETED]: "Cuatrienio de Indicador (Plan Indicativo) Eliminado",
    [AuditAction.INDICATIVE_INDICATOR_LOCATION_ADDED]: "Ubicación de Indicador (Plan Indicativo) Agregada",
    [AuditAction.INDICATIVE_INDICATOR_LOCATION_REMOVED]: "Ubicación de Indicador (Plan Indicativo) Removida",
    [AuditAction.VARIABLE_INDICATIVE_ASSOCIATED]: "Variable Asociada a Indicador de Plan Indicativo",
    [AuditAction.VARIABLE_INDICATIVE_DISASSOCIATED]: "Variable Desasociada de Indicador de Plan Indicativo",

    // Financial — Proyectos
    [AuditAction.PROJECT_CREATED]: "Proyecto Creado",

    // Financial — Fuentes de Financiación
    [AuditAction.FUNDING_SOURCE_CREATED]: "Fuente de Financiación Creada",
    [AuditAction.FUNDING_SOURCE_UPDATED]: "Fuente de Financiación Actualizada",
    [AuditAction.FUNDING_SOURCE_DELETED]: "Fuente de Financiación Eliminada",

    // Financial — POAI-PPA
    [AuditAction.POAI_PPA_CREATED]: "POAI-PPA Creado",
    [AuditAction.POAI_PPA_UPDATED]: "POAI-PPA Actualizado",
    [AuditAction.POAI_PPA_DELETED]: "POAI-PPA Eliminado",

    // Financial — CDP
    [AuditAction.CDP_POSITION_OBSERVATIONS_UPDATED]: "Observaciones de Posición CDP Actualizadas",
    [AuditAction.CDP_POSITION_ACTIVITY_ASSOCIATED]: "Actividad Asociada a Posición CDP",
    [AuditAction.CDP_POSITION_ACTIVITY_DISASSOCIATED]: "Actividad Desasociada de Posición CDP",
    [AuditAction.CDP_FUNDING_CONSUMED]: "Financiamiento CDP Consumido",

    // Sub — Avances
    [AuditAction.VARIABLE_ADVANCE_CREATED]: "Avance de Variable Creado",
    [AuditAction.VARIABLE_ADVANCE_UPDATED]: "Avance de Variable Actualizado",
    [AuditAction.INDICATOR_ADVANCE_CREATED]: "Avance de Indicador Creado",
    [AuditAction.INDICATOR_ADVANCE_UPDATED]: "Avance de Indicador Actualizado",

    // SAP Sync
    [AuditAction.SAP_SYNC_ENQUEUED]: "Sincronización SAP Encolada",
    [AuditAction.SAP_SYNC_COMPLETED]: "Sincronización SAP Completada",
    [AuditAction.SAP_SYNC_FAILED]: "Sincronización SAP Fallida",
};

// === Labels legibles por campo ===
export const FIELD_LABELS: Record<string, string> = {
    // Auth
    email: "Correo Electrónico",
    first_name: "Nombre",
    last_name: "Apellido",
    document_number: "Número de Documento",
    is_active: "Estado Activo",
    password: "Contraseña", // NOSONAR — field display label, not a credential
    role: "Rol",
    permission: "Permiso",
    name: "Nombre",
    description: "Descripción",
    code: "Código",
    system: "Sistema",

    // SPD-Core - General
    observations: "Observaciones",
    year: "Año",
    month: "Mes",
    value: "Valor",
    startYear: "Año Inicio",
    endYear: "Año Fin",
    balance: "Saldo",
    budgetCeiling: "Techo Presupuestal",
    amount: "Monto",

    // SPD-Core - Variables & Indicators
    variableId: "ID de Variable",
    variableName: "Nombre de Variable",
    variableCode: "Código de Variable",
    indicatorId: "ID de Indicador",
    indicatorName: "Nombre de Indicador",
    indicatorCode: "Código de Indicador",
    formulaId: "ID de Fórmula",
    formulaExpression: "Expresión de Fórmula",
    calculatedValue: "Valor Calculado",
    baselineValue: "Valor Línea Base",
    measureUnit: "Unidad de Medida",

    // SPD-Core - Locations
    communeCode: "Código de Comuna",
    communeName: "Nombre de Comuna",
    address: "Dirección",
    locationId: "ID de Ubicación",

    // SPD-Core - Activities
    mgaActivityId: "ID Actividad MGA",
    detailedActivityId: "ID Actividad Detallada",
    rubricId: "ID de Rubro",
    rubricCode: "Código de Rubro",

    // SPD-Core - Financial
    projectId: "ID de Proyecto",
    projectCode: "Código de Proyecto",
    projectName: "Nombre de Proyecto",
    fundingSourceId: "ID Fuente de Financiación",
    fundingSourceName: "Nombre Fuente de Financiación",
    cdpNumber: "Número CDP",
    cdpPositionId: "ID Posición CDP",
    needId: "ID de Necesidad",
    poaiPpaId: "ID POAI-PPA",

    // SPD-Core - Budget Modifications
    modificationType: "Tipo de Modificación",
    sourceActivityId: "Actividad Origen",
    targetActivityId: "Actividad Destino",

    // SPD-Core - SAP
    sapContractNumber: "Número de Contrato SAP",
    fechaInicio: "Fecha Inicio",
    fechaFin: "Fecha Fin",
    itemsProcessed: "Ítems Procesados",
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

export interface AuditMetadata {
    // Roles
    name?: string;
    description?: string;
    is_default?: boolean;
    roleName?: string;
    
    // Permissions
    action?: string;
    actionName?: string;
    added?: number;
    removed?: number;
    total?: number;
    addedIds?: string[];
    removedIds?: string[];

    // Users
    email?: string;
    document_number?: string;
    code?: string;

    // SPD — Variables & Indicators
    variableId?: string;
    variableName?: string;
    variableCode?: string;
    indicatorId?: string;
    indicatorName?: string;
    indicatorCode?: string;
    year?: number;
    month?: number;
    value?: number;
    startYear?: number;
    endYear?: number;
    calculatedValue?: number;
    baselineValue?: number;
    measureUnit?: string;
    formulaId?: string;
    formulaExpression?: string;

    // SPD — Locations
    communeCode?: string;
    communeName?: string;
    locationId?: string;
    address?: string;

    // SPD — Activities
    mgaActivityId?: string;
    detailedActivityId?: string;
    rubricId?: string;
    rubricCode?: string;

    // SPD — Financial
    projectId?: string;
    projectCode?: string;
    projectName?: string;
    fundingSourceId?: string;
    fundingSourceName?: string;
    cdpNumber?: string;
    cdpPositionId?: string;
    needId?: string;
    poaiPpaId?: string;
    amount?: number;
    balance?: number;
    budgetCeiling?: number;

    // SPD — Budget Modifications
    modificationType?: string; // ADDITION | REDUCTION | TRANSFER | RECLASSIFICATION
    sourceActivityId?: string;
    targetActivityId?: string;

    // SPD — SAP Sync
    sapContractNumber?: string;
    fechaInicio?: string;
    fechaFin?: string;
    itemsProcessed?: number;

    // Allow other fields but prefer typed ones
    [key: string]: any;
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
    entityType: AuditEntityType;
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
    metadata?: AuditMetadata;
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
