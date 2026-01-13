-- ===============================
-- SEED: ROLES PARA SPD
-- ===============================

-- Rol Usuario SPD (default)
INSERT INTO roles (id, name, description, is_active, is_default, system, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Usuario',
    'Rol por defecto para usuarios registrados en SPD',
    true,
    true,
    'SPD',
    NOW(),
    NOW()
);

-- Rol Administrador SPD
INSERT INTO roles (id, name, description, is_active, is_default, system, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Administrador',
    'Rol con privilegios administrativos totales en SPD',
    true,
    false,
    'SPD',
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