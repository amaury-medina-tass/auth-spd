-- Insertar Rol Usuario (Marcado como default)
INSERT INTO roles (id, name, description, is_active, is_default, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Usuario',
    'Rol por defecto para usuarios registrados',
    true,
    true,
    NOW(),
    NOW()
);

-- Insertar Rol Administrador
INSERT INTO roles (id, name, description, is_active, is_default, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Administrador',
    'Rol con privilegios administrativos totales',
    true,
    false,
    NOW(),
    NOW()
);