CREATE DATABASE IF NOT EXISTS barlounge CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE barlounge;

-- ================================
-- ROLES Y PERMISOS
-- ================================
CREATE TABLE IF NOT EXISTS roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    permission_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    description VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(role_id),
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(permission_id)
);

-- ================================
SEDES Y USUARIOS
-- ================================
CREATE TABLE IF NOT EXISTS sites (
    site_id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    site_id INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(role_id),
    CONSTRAINT fk_users_site FOREIGN KEY (site_id) REFERENCES sites(site_id)
);

-- ================================
-- CATÁLOGO
-- ================================
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    contact VARCHAR(150),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_types (
    product_type_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    purchase_unit VARCHAR(50) NOT NULL,
    sale_unit VARCHAR(50) NOT NULL,
    purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    product_type_id INT NOT NULL,
    supplier_id INT NOT NULL,
    sale_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_type FOREIGN KEY (product_type_id) REFERENCES product_types(product_type_id),
    CONSTRAINT fk_products_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
);

CREATE TABLE IF NOT EXISTS inventory (
    inventory_id INT AUTO_INCREMENT PRIMARY KEY,
    site_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_inventory_site_product (site_id, product_id),
    CONSTRAINT fk_inventory_site FOREIGN KEY (site_id) REFERENCES sites(site_id),
    CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- ================================
-- TRAZABILIDAD (se incorpora desde el inicio como transversal)
-- ================================
CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(80) NOT NULL,
    entity VARCHAR(80) NOT NULL,
    entity_id INT NULL,
    result VARCHAR(30) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_users_site ON users(site_id);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_products_type ON products(product_type_id);
CREATE INDEX idx_products_supplier ON products(supplier_id);
CREATE INDEX idx_inventory_site ON inventory(site_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

SHOW TABLES;

-- ============================================================
-- TABLA DE CÓDIGOS TEMPORALES
-- ============================================================

CREATE TABLE IF NOT EXISTS password_recovery_tokens (
    token_id INT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NOT NULL,

    -- Se guarda el hash del código, no el código original.
    code_hash VARCHAR(64) NOT NULL,

    -- Fecha/hora de expiración.
    expires_at DATETIME NOT NULL,

    -- Cuando se utiliza el código se registra aquí.
    used_at DATETIME NULL,

    created_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_recovery_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_recovery_user
    ON password_recovery_tokens(user_id);

CREATE INDEX idx_recovery_expiration
    ON password_recovery_tokens(expires_at);

CREATE INDEX idx_recovery_code_hash
    ON password_recovery_tokens(code_hash);

-- Agrega el correo del usuario.
ALTER TABLE users
ADD COLUMN email VARCHAR(191) NULL AFTER name;

-- Evita que dos usuarios tengan el mismo correo.
ALTER TABLE users
ADD UNIQUE KEY uq_users_email (email);

SHOW COLUMNS FROM users LIKE 'email';