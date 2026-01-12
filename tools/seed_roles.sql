-- ===============================
-- SEED: ROLES PARA DAGRD
-- ===============================

-- Rol Usuario DAGRD (default)
INSERT INTO roles (id, name, description, is_active, is_default, system, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Usuario',
    'Rol por defecto para usuarios registrados en DAGRD',
    true,
    true,
    'DAGRD',
    NOW(),
    NOW()
);

-- Rol Administrador DAGRD
INSERT INTO roles (id, name, description, is_active, is_default, system, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Administrador',
    'Rol con privilegios administrativos totales en DAGRD',
    true,
    false,
    'DAGRD',
    NOW(),
    NOW()
);

-- ===============================
-- SEED: ROLES PARA SICGEM
-- ===============================

-- Rol Usuario SICGEM (default)
INSERT INTO roles (id, name, description, is_active, is_default, system, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Usuario',
    'Rol por defecto para usuarios registrados en SICGEM',
    true,
    true,
    'SICGEM',
    NOW(),
    NOW()
);

-- Rol Administrador SICGEM
INSERT INTO roles (id, name, description, is_active, is_default, system, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Administrador',
    'Rol con privilegios administrativos totales en SICGEM',
    true,
    false,
    'SICGEM',
    NOW(),
    NOW()
);