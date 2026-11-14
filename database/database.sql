CREATE DATABASE IF NOT EXISTS barlounge CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE barlounge;
SHOW TABLES;

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
-- SEDES Y USUARIOS
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

-- ============================================================================
-- ETAPA 1 - MODELO INICIAL DE MESAS Y PEDIDOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS bar_tables (
    table_id INT AUTO_INCREMENT PRIMARY KEY,
    site_id INT NOT NULL,
    table_number INT NOT NULL,
    capacity INT NOT NULL DEFAULT 4,
    status ENUM('FREE', 'OCCUPIED', 'UNAVAILABLE')
        NOT NULL DEFAULT 'FREE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_tables_site
        FOREIGN KEY (site_id)
        REFERENCES sites(site_id),

    CONSTRAINT uq_table_number_site
        UNIQUE (site_id, table_number)
);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    site_id INT NOT NULL,
    table_id INT NOT NULL,
    waiter_id INT NOT NULL,
    status ENUM('OPEN', 'IN_PROGRESS', 'CANCELLED')
        NOT NULL DEFAULT 'OPEN',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_orders_site
        FOREIGN KEY (site_id)
        REFERENCES sites(site_id),

    CONSTRAINT fk_orders_table
        FOREIGN KEY (table_id)
        REFERENCES bar_tables(table_id),

    CONSTRAINT fk_orders_waiter
        FOREIGN KEY (waiter_id)
        REFERENCES users(user_id)
);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id)
        REFERENCES products(product_id),

    CONSTRAINT chk_order_item_quantity
        CHECK (quantity > 0)
);

CREATE INDEX idx_tables_site_status
    ON bar_tables(site_id, status);
CREATE INDEX idx_orders_site_status
    ON orders(site_id, status);
CREATE INDEX idx_order_items_order
    ON order_items(order_id);
CREATE INDEX idx_users_site ON users(site_id);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_products_type ON products(product_type_id);
CREATE INDEX idx_products_supplier ON products(supplier_id);
CREATE INDEX idx_inventory_site ON inventory(site_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

SHOW TABLES;

-- ============================================================================
-- ETAPA 2 - RECUPERACIÓN DE CONTRASEÑA, CORREO E ÍNDICES
-- Incluye la tabla de códigos temporales y las modificaciones de users.
-- ============================================================================
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

DESCRIBE users;

SHOW COLUMNS FROM users LIKE 'email';

SELECT
    site_id,
    code,
    name,
    status
FROM sites
ORDER BY site_id;

SELECT
    role_id,
    name,
    status
FROM roles
ORDER BY role_id;

-- ============================================================================
-- ETAPA 3 - MODELO DE MESAS Y PEDIDOS DEL SPRINT 4
-- Incluye dining_tables, bar_orders y bar_order_items, junto con permisos
-- y carga inicial de mesas.
-- ============================================================================
-- ============================================================
-- 1. TABLES
-- ============================================================
-- Cada mesa pertenece a una sede.
-- FREE: disponible para iniciar un pedido.
-- OCCUPIED: tiene un pedido abierto asociado.
-- ============================================================
CREATE TABLE IF NOT EXISTS dining_tables (

    table_id INT AUTO_INCREMENT PRIMARY KEY,

    site_id INT NOT NULL,

    table_number VARCHAR(10) NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'FREE',

    created_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_dining_table_site_number (
        site_id,
        table_number
    ),

    KEY idx_dining_tables_site_status (
        site_id,
        status
    ),

    CONSTRAINT fk_dining_tables_site
        FOREIGN KEY (site_id)
        REFERENCES sites(site_id)

);

-- ============================================================
-- 2. ORDERS
-- ============================================================
-- En Sprint 4, los pedidos permanecen OPEN.
-- El pago y el cierre definitivo corresponden al Sprint 5.
-- ============================================================
CREATE TABLE IF NOT EXISTS bar_orders (

    order_id INT AUTO_INCREMENT PRIMARY KEY,

    table_id INT NOT NULL,

    site_id INT NOT NULL,

    waiter_id INT NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',

    opened_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    closed_at DATETIME NULL,

    KEY idx_bar_orders_site_status (
        site_id,
        status
    ),

    KEY idx_bar_orders_table_status (
        table_id,
        status
    ),

    KEY idx_bar_orders_waiter (
        waiter_id
    ),

    CONSTRAINT fk_bar_orders_table
        FOREIGN KEY (table_id)
        REFERENCES dining_tables(table_id),

    CONSTRAINT fk_bar_orders_site
        FOREIGN KEY (site_id)
        REFERENCES sites(site_id),

    CONSTRAINT fk_bar_orders_waiter
        FOREIGN KEY (waiter_id)
        REFERENCES users(user_id)

);

-- ============================================================
-- 3. ORDER ITEMS
-- ============================================================
-- Cada fila representa un producto del pedido.
-- unit_price conserva el precio aplicado al agregarlo.
-- Un mismo producto no se duplica dentro del mismo pedido:
-- se actualiza su cantidad.
-- ============================================================
-- ============================================================
-- 3. PRODUCTOS DE LOS PEDIDOS DEL SPRINT 4
-- ============================================================
CREATE TABLE IF NOT EXISTS bar_order_items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,

    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,

    created_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_bar_order_items_order_product (
        order_id,
        product_id
    ),

    KEY idx_bar_order_items_product (product_id),

    CONSTRAINT fk_bar_order_items_order
        FOREIGN KEY (order_id)
        REFERENCES bar_orders(order_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_bar_order_items_product
        FOREIGN KEY (product_id)
        REFERENCES products(product_id),

    CONSTRAINT chk_bar_order_items_quantity
        CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS order_items (

    order_item_id INT AUTO_INCREMENT PRIMARY KEY,

    order_id INT NOT NULL,

    product_id INT NOT NULL,

    quantity INT NOT NULL,

    unit_price DECIMAL(12,2) NOT NULL,

    created_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_order_items_order_product (
        order_id,
        product_id
    ),

    KEY idx_order_items_product (
        product_id
    ),

    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id)
        REFERENCES bar_orders(order_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id)
        REFERENCES products(product_id)

);

-- ============================================================
-- 4. PERMISSIONS
-- ============================================================
-- Se crean los permisos utilizados por las rutas nuevas.
-- INSERT IGNORE evita duplicar permisos existentes.
-- ============================================================
INSERT IGNORE INTO permissions (
    name,
    description
)
VALUES
    (
        'TABLES_READ',
        'View table states'
    ),
    (
        'ORDERS_READ',
        'View open orders and order details'
    ),
    (
        'ORDERS_CREATE',
        'Create an open order for a free table'
    ),
    (
        'ORDERS_UPDATE',
        'Add products and update order quantities'
    ),
    (
        'ORDERS_REMOVE_ITEM',
        'Remove products from an open order'
    ),
    (
        'ORDERS_SAVE',
        'Save an open order'
    );


-- ============================================================
-- 5. ADMINISTRATOR PERMISSIONS
-- ============================================================
INSERT IGNORE INTO role_permissions (
    role_id,
    permission_id
)
SELECT
    r.role_id,
    p.permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Administrador'
  AND p.name IN (
      'TABLES_READ',
      'ORDERS_READ',
      'ORDERS_CREATE',
      'ORDERS_UPDATE',
      'ORDERS_REMOVE_ITEM',
      'ORDERS_SAVE'
  );

-- ============================================================
-- 6. WAITER PERMISSIONS
-- ============================================================
INSERT IGNORE INTO role_permissions (
    role_id,
    permission_id
)
SELECT
    r.role_id,
    p.permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Mesero'
  AND p.name IN (
      'TABLES_READ',
      'ORDERS_READ',
      'ORDERS_CREATE',
      'ORDERS_UPDATE',
      'ORDERS_REMOVE_ITEM',
      'ORDERS_SAVE'
  );

-- ============================================================
-- 7. INITIAL TABLES
-- ============================================================
-- Create tables 01-12 for each active site.
-- Existing table numbers will not be duplicated.
-- ============================================================
INSERT IGNORE INTO dining_tables (
    site_id,
    table_number,
    status
)
SELECT
    s.site_id,
    numbers.table_number,
    'FREE'
FROM sites s
CROSS JOIN (
    SELECT '01' AS table_number
    UNION ALL SELECT '02'
    UNION ALL SELECT '03'
    UNION ALL SELECT '04'
    UNION ALL SELECT '05'
    UNION ALL SELECT '06'
    UNION ALL SELECT '07'
    UNION ALL SELECT '08'
    UNION ALL SELECT '09'
    UNION ALL SELECT '10'
    UNION ALL SELECT '11'
    UNION ALL SELECT '12'
) AS numbers
WHERE s.status = 'ACTIVE';

-- ============================================================================
-- ETAPA 4 - CONSULTAS DE VERIFICACIÓN DEL MODELO OPERATIVO
-- Estas consultas muestran estructura, relaciones, permisos y cantidades.
-- Son consultas de revisión; no reemplazan la definición de las tablas.
-- ============================================================================
-- ============================================================
-- 8. VERIFY TABLES
-- ============================================================
SELECT
    t.table_id,
    s.name AS site,
    t.table_number,
    t.status
FROM dining_tables t
INNER JOIN sites s
    ON s.site_id = t.site_id
ORDER BY
    s.name,
    CAST(t.table_number AS UNSIGNED);
    
SELECT
    s.name AS site,
    COUNT(t.table_id) AS total_tables
FROM sites s
LEFT JOIN dining_tables t
    ON t.site_id = s.site_id
WHERE s.status = 'ACTIVE'
GROUP BY
    s.site_id,
    s.name
ORDER BY s.name;

SELECT 
    r.name AS role_name, p.name AS permission_name
FROM
    role_permissions rp
        INNER JOIN
    roles r ON r.role_id = rp.role_id
        INNER JOIN
    permissions p ON p.permission_id = rp.permission_id
WHERE
    p.name IN ('TABLES_READ' , 'ORDERS_READ',
        'ORDERS_CREATE',
        'ORDERS_UPDATE',
        'ORDERS_REMOVE_ITEM',
        'ORDERS_SAVE')
ORDER BY r.name , p.name;

SELECT
    dt.table_id,
    s.name AS site,
    dt.table_number,
    dt.status
FROM dining_tables dt
INNER JOIN sites s
    ON s.site_id = dt.site_id
ORDER BY
    s.name,
    CAST(dt.table_number AS UNSIGNED);

SHOW TABLES LIKE 'dining_tables';
SHOW TABLES LIKE 'bar_orders';
SHOW TABLES LIKE 'order_items';

SELECT
    p.name AS permission_name,
    r.name AS role_name
FROM role_permissions rp
INNER JOIN permissions p
    ON p.permission_id = rp.permission_id
INNER JOIN roles r
    ON r.role_id = rp.role_id
WHERE p.name IN (
    'TABLES_READ',
    'ORDERS_READ',
    'ORDERS_CREATE',
    'ORDERS_UPDATE',
    'ORDERS_REMOVE_ITEM',
    'ORDERS_SAVE'
)
ORDER BY r.name, p.name;

SHOW TABLES;
SHOW CREATE TABLE bar_tables;
SHOW CREATE TABLE dining_tables;
SHOW CREATE TABLE orders;
SHOW CREATE TABLE bar_orders;
SHOW CREATE TABLE order_items;

SELECT 'bar_tables' AS table_name, COUNT(*) AS total
FROM bar_tables

UNION ALL

SELECT 'dining_tables', COUNT(*)
FROM dining_tables

UNION ALL

SELECT 'orders', COUNT(*)
FROM orders

UNION ALL

SELECT 'bar_orders', COUNT(*)
FROM bar_orders

UNION ALL

SELECT 'order_items', COUNT(*)
FROM order_items;

SELECT
    s.site_id,
    s.name AS site_name,
    COUNT(dt.table_id) AS total_tables
FROM sites s
LEFT JOIN dining_tables dt
    ON dt.site_id = s.site_id
GROUP BY s.site_id, s.name
ORDER BY s.site_id;

SELECT
    table_id,
    site_id,
    table_number,
    status
FROM dining_tables
ORDER BY site_id, table_number;

SELECT
    r.name AS role_name,
    p.name AS permission_name
FROM role_permissions rp
INNER JOIN roles r
    ON r.role_id = rp.role_id
INNER JOIN permissions p
    ON p.permission_id = rp.permission_id
WHERE p.name IN (
    'TABLES_READ',
    'ORDERS_READ',
    'ORDERS_CREATE',
    'ORDERS_UPDATE',
    'ORDERS_REMOVE_ITEM',
    'ORDERS_SAVE'
)
ORDER BY r.name, p.name;

INSERT INTO dining_tables (site_id, table_number, status)
SELECT 2, numbers.table_number, 'FREE'
FROM (
    SELECT '01' AS table_number
    UNION ALL SELECT '02'
    UNION ALL SELECT '03'
    UNION ALL SELECT '04'
    UNION ALL SELECT '05'
    UNION ALL SELECT '06'
    UNION ALL SELECT '07'
    UNION ALL SELECT '08'
    UNION ALL SELECT '09'
    UNION ALL SELECT '10'
    UNION ALL SELECT '11'
    UNION ALL SELECT '12'
) AS numbers
WHERE NOT EXISTS (
    SELECT 1
    FROM dining_tables dt
    WHERE dt.site_id = 2
      AND dt.table_number = numbers.table_number
);

SELECT
    s.site_id,
    s.name AS site_name,
    COUNT(dt.table_id) AS total_tables
FROM sites s
LEFT JOIN dining_tables dt
    ON dt.site_id = s.site_id
GROUP BY
    s.site_id,
    s.name
ORDER BY s.site_id;

SELECT
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'barlounge'
  AND TABLE_NAME IN (
      'dining_tables',
      'bar_orders',
      'order_items'
  )
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, COLUMN_NAME;

DESCRIBE products;
DESCRIBE inventory;
DESCRIBE bar_orders;
DESCRIBE order_items;

SELECT
    product_id,
    code,
    name,
    sale_price,
    status
FROM products
ORDER BY name;

INSERT IGNORE INTO permissions (name, description)
VALUES (
    'ORDERS_CREATE',
    'Create an open order for a free table'
);

UPDATE permissions
SET status = 'ACTIVE'
WHERE name = 'ORDERS_CREATE';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
INNER JOIN permissions p
    ON p.name = 'ORDERS_CREATE'
WHERE r.name IN ('Administrador', 'Mesero');

SELECT
    r.name AS rol,
    p.name AS permiso,
    p.status AS estado
FROM role_permissions rp
INNER JOIN roles r
    ON r.role_id = rp.role_id
INNER JOIN permissions p
    ON p.permission_id = rp.permission_id
WHERE p.name = 'ORDERS_CREATE';

-- ============================================================================
-- ETAPA 5 - PRECIOS DE COMPRA Y ASIGNACIÓN DE PRODUCTOS
-- Añade purchase_price y los permisos de asignación por sede.
-- ============================================================================
ALTER TABLE products
ADD COLUMN purchase_price DECIMAL(12,2)
NOT NULL DEFAULT 0
AFTER sale_unit;

SHOW COLUMNS FROM products LIKE 'purchase_price';

SELECT
    product_id,
    code,
    name,
    purchase_price,
    sale_price,
    status
FROM products
ORDER BY product_id;

INSERT IGNORE INTO permissions (name, description)
VALUES
    (
        'PRODUCT_ASSIGNMENT_READ',
        'View products assigned to sites'
    ),
    (
        'PRODUCT_ASSIGNMENT_CREATE',
        'Assign catalog products to sites'
    ),
    (
        'PRODUCT_ASSIGNMENT_DELETE',
        'Remove products from site assignments'
    );

UPDATE permissions
SET status = 'ACTIVE'
WHERE name IN (
    'PRODUCT_ASSIGNMENT_READ',
    'PRODUCT_ASSIGNMENT_CREATE',
    'PRODUCT_ASSIGNMENT_DELETE'
);

INSERT IGNORE INTO role_permissions (
    role_id,
    permission_id
)
SELECT
    r.role_id,
    p.permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Administrador'
  AND p.name IN (
      'PRODUCT_ASSIGNMENT_READ',
      'PRODUCT_ASSIGNMENT_CREATE',
      'PRODUCT_ASSIGNMENT_DELETE'
  );
  
SELECT
    r.name AS role_name,
    p.name AS permission_name,
    p.status
FROM role_permissions rp
INNER JOIN roles r
    ON r.role_id = rp.role_id
INNER JOIN permissions p
    ON p.permission_id = rp.permission_id
WHERE p.name LIKE 'PRODUCT_ASSIGNMENT_%'
ORDER BY r.name, p.name;

SELECT
    site_id,
    COUNT(*) AS assigned_products,
    SUM(quantity = 0) AS zero_quantity,
    SUM(quantity > 0) AS stocked_products
FROM inventory
GROUP BY site_id
ORDER BY site_id;

-- ============================================================================
-- ETAPA 6 - SPRINT 5: PAGOS Y COMPROBANTES
-- Incluye pagos, encabezados de invoices y detalle invoice_items.
-- ============================================================================
-- =========================================================
-- SPRINT 5: PAYMENTS
-- =========================================================
CREATE TABLE IF NOT EXISTS order_payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    payment_method ENUM(
        'CASH',
        'CREDIT_CARD',
        'DEBIT_CARD'
    ) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    cash_received DECIMAL(12,2) NULL,
    change_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_status ENUM(
        'COMPLETED',
        'VOIDED'
    ) NOT NULL DEFAULT 'COMPLETED',
    processed_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_order_payment (order_id),
    KEY idx_payment_created (created_at),

    CONSTRAINT fk_payment_order
        FOREIGN KEY (order_id)
        REFERENCES bar_orders(order_id),

    CONSTRAINT fk_payment_user
        FOREIGN KEY (processed_by)
        REFERENCES users(user_id),

    CONSTRAINT chk_payment_total
        CHECK (total_amount >= 0),

    CONSTRAINT chk_payment_change
        CHECK (change_amount >= 0)
);

-- =========================================================
-- SPRINT 5: INVOICES
-- =========================================================
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(40) NOT NULL UNIQUE,
    order_id INT NOT NULL,
    payment_id INT NOT NULL,
    site_id INT NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    total DECIMAL(12,2) NOT NULL,
    issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_invoice_order (order_id),
    UNIQUE KEY uq_invoice_payment (payment_id),
    KEY idx_invoice_site_date (site_id, issued_at),

    CONSTRAINT fk_invoice_order
        FOREIGN KEY (order_id)
        REFERENCES bar_orders(order_id),

    CONSTRAINT fk_invoice_payment
        FOREIGN KEY (payment_id)
        REFERENCES order_payments(payment_id),

    CONSTRAINT fk_invoice_site
        FOREIGN KEY (site_id)
        REFERENCES sites(site_id),

    CONSTRAINT chk_invoice_subtotal
        CHECK (subtotal >= 0),

    CONSTRAINT chk_invoice_total
        CHECK (total >= 0)
);

-- =========================================================
-- SPRINT 5: INVOICE ITEM SNAPSHOTS
-- Preserve the information printed on the invoice.
-- =========================================================
CREATE TABLE IF NOT EXISTS invoice_items (
    invoice_item_id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    product_id INT NULL,
    product_code VARCHAR(30) NOT NULL,
    product_name VARCHAR(120) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    line_total DECIMAL(12,2) NOT NULL,

    KEY idx_invoice_items_invoice (invoice_id),

    CONSTRAINT fk_invoice_items_invoice
        FOREIGN KEY (invoice_id)
        REFERENCES invoices(invoice_id),

    CONSTRAINT fk_invoice_items_product
        FOREIGN KEY (product_id)
        REFERENCES products(product_id)
        ON DELETE SET NULL,

    CONSTRAINT chk_invoice_item_quantity
        CHECK (quantity > 0),

    CONSTRAINT chk_invoice_item_price
        CHECK (unit_price >= 0 AND line_total >= 0)
);

-- =========================================================
-- SPRINT 5: PERMISSIONS
-- =========================================================
INSERT IGNORE INTO permissions (name, description)
VALUES
    ('PAYMENTS_READ', 'View payment information'),
    ('PAYMENTS_CREATE', 'Process payments'),
    ('INVOICES_READ', 'View and print invoices'),
    ('ORDERS_CLOSE', 'Close paid orders and release tables');

UPDATE permissions
SET status = 'ACTIVE'
WHERE name IN (
    'PAYMENTS_READ',
    'PAYMENTS_CREATE',
    'INVOICES_READ',
    'ORDERS_CLOSE'
);

-- Administrator permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Administrador'
  AND p.name IN (
      'PAYMENTS_READ',
      'PAYMENTS_CREATE',
      'INVOICES_READ',
      'ORDERS_CLOSE'
  );

-- Cashier permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Cajero'
  AND p.name IN (
      'ORDERS_READ',
      'PAYMENTS_READ',
      'PAYMENTS_CREATE',
      'INVOICES_READ',
      'ORDERS_CLOSE'
  );

-- =========================================================
-- VERIFY THE NEW TABLES AND PERMISSIONS
-- =========================================================
SHOW TABLES LIKE 'order_payments';
SHOW TABLES LIKE 'invoices';
SHOW TABLES LIKE 'invoice_items';

SELECT name, status
FROM permissions
WHERE name IN (
    'PAYMENTS_READ',
    'PAYMENTS_CREATE',
    'INVOICES_READ',
    'ORDERS_CLOSE'
);

SHOW CREATE TABLE sites;
SHOW CREATE TABLE invoices;
SHOW CREATE TABLE invoice_items;
SHOW CREATE TABLE products;
SHOW CREATE TABLE users;
SHOW CREATE TABLE order_payments;

-- ============================================================================
-- ETAPA 7 - INFORMACIÓN COMERCIAL, TRIBUTARIA Y COPIAS HISTÓRICAS
-- Modifica sites e invoices para almacenar información del vendedor,
-- comprador, impuestos y datos históricos utilizados en los comprobantes.
-- ============================================================================
-- Datos legales del establecimiento.
ALTER TABLE sites
    ADD COLUMN legal_name VARCHAR(180) NULL,
    ADD COLUMN tax_id VARCHAR(30) NULL,
    ADD COLUMN tax_regime VARCHAR(100) NULL,
    ADD COLUMN is_vat_responsible TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN is_consumption_tax_responsible TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN is_vat_withholding_agent TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN printer_name VARCHAR(180) NULL,
    ADD COLUMN printer_tax_id VARCHAR(30) NULL,
    ADD COLUMN invoice_prefix VARCHAR(20) NULL,
    ADD COLUMN authorization_number VARCHAR(80) NULL,
    ADD COLUMN authorization_date DATE NULL,
    ADD COLUMN authorization_from BIGINT NULL,
    ADD COLUMN authorization_to BIGINT NULL;

-- Datos del comprador y valores tributarios guardados en la factura.
ALTER TABLE invoices
    ADD COLUMN buyer_name VARCHAR(180) NULL,
    ADD COLUMN buyer_document_type VARCHAR(20) NULL,
    ADD COLUMN buyer_document VARCHAR(40) NULL,
    ADD COLUMN tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN tax_description VARCHAR(255) NULL,
    ADD COLUMN payment_form VARCHAR(30) NULL;

-- Copia de los datos del vendedor para que una factura histórica
-- no cambie si posteriormente se actualizan los datos de la sede.
ALTER TABLE invoices
    ADD COLUMN seller_legal_name VARCHAR(180) NULL,
    ADD COLUMN seller_tax_id VARCHAR(30) NULL,
    ADD COLUMN seller_address VARCHAR(200) NULL,
    ADD COLUMN printer_name_snapshot VARCHAR(180) NULL,
    ADD COLUMN printer_tax_id_snapshot VARCHAR(30) NULL;
    
SELECT
    site_id,
    code,
    name,
    address,
    legal_name,
    tax_id,
    invoice_prefix,
    authorization_number,
    authorization_from,
    authorization_to
FROM sites;

-- ============================================================================
-- ETAPA 8 - CONSECUTIVOS INTERNOS DE COMPROBANTES
-- El archivo original contiene varias instrucciones CREATE TABLE IF NOT
-- EXISTS para invoice_sequences. Se conservan todas y en su orden original.
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_sequences (
    site_id INT NOT NULL PRIMARY KEY,
    next_number BIGINT UNSIGNED NOT NULL DEFAULT 1,
    CONSTRAINT fk_invoice_sequences_site
        FOREIGN KEY (site_id)
        REFERENCES sites(site_id)
);

INSERT IGNORE INTO invoice_sequences (site_id, next_number)
SELECT site_id, 1
FROM sites;

-- Numeración interna independiente para cada sede.
CREATE TABLE IF NOT EXISTS invoice_sequences (
    site_id INT NOT NULL PRIMARY KEY,
    next_number BIGINT UNSIGNED NOT NULL DEFAULT 1,
    CONSTRAINT fk_invoice_sequences_site
        FOREIGN KEY (site_id)
        REFERENCES sites(site_id)
);

-- Inicializar la secuencia de las sedes existentes.
INSERT IGNORE INTO invoice_sequences (site_id, next_number)
SELECT site_id, 1
FROM sites;

CREATE TABLE IF NOT EXISTS invoice_sequences (
    site_id INT NOT NULL PRIMARY KEY,
    next_number BIGINT UNSIGNED NOT NULL DEFAULT 1,
    CONSTRAINT fk_invoice_sequences_site
        FOREIGN KEY (site_id)
        REFERENCES sites(site_id)
);

INSERT IGNORE INTO invoice_sequences (site_id, next_number)
SELECT site_id, 1
FROM sites;

SHOW COLUMNS FROM invoices;

SHOW TABLES;

-- ============================================================================
-- ETAPA 9 - INSPECCIÓN DE ESTRUCTURA, REGISTROS Y RELACIONES
-- Consultas informativas sobre columnas, estados, claves foráneas y datos.
-- ============================================================================
-- Verificar la estructura real de las tablas
SELECT
    TABLE_NAME AS tabla,
    COLUMN_NAME AS columna,
    COLUMN_TYPE AS tipo,
    IS_NULLABLE AS permite_null,
    COLUMN_DEFAULT AS valor_predeterminado
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'barlounge'
AND TABLE_NAME IN (
    'sites',
    'users',
    'products',
    'inventory',
    'bar_tables',
    'orders',
    'order_items',
    'dining_tables',
    'bar_orders',
    'bar_order_items',
    'order_payments',
    'invoices',
    'invoice_items',
    'invoice_sequences'
)
ORDER BY TABLE_NAME, ORDINAL_POSITION;

SELECT 'bar_tables' AS tabla, COUNT(*) AS registros FROM bar_tables
UNION ALL
SELECT 'dining_tables', COUNT(*) FROM dining_tables
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL
SELECT 'bar_orders', COUNT(*) FROM bar_orders
UNION ALL
SELECT 'bar_order_items', COUNT(*) FROM bar_order_items
UNION ALL
SELECT 'order_payments', COUNT(*) FROM order_payments
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'invoice_items', COUNT(*) FROM invoice_items
UNION ALL
SELECT 'invoice_sequences', COUNT(*) FROM invoice_sequences
UNION ALL
SELECT 'inventory', COUNT(*) FROM inventory
UNION ALL
SELECT 'audit_logs', COUNT(*) FROM audit_logs;


-- =========================================
-- 2. ESTADOS DE LOS PEDIDOS ACTUALES
-- =========================================
SELECT
    status,
    COUNT(*) AS cantidad
FROM bar_orders
GROUP BY status;


-- =========================================
-- 3. ESTADOS DE LOS PEDIDOS ANTERIORES
-- =========================================
SELECT
    status,
    COUNT(*) AS cantidad
FROM orders
GROUP BY status;


-- =========================================
-- 4. ESTADOS DE LAS MESAS ACTUALES
-- =========================================
SELECT
    status,
    COUNT(*) AS cantidad
FROM dining_tables
GROUP BY status;


-- =========================================
-- 5. RELACIONES ENTRE LAS TABLAS
-- =========================================
SELECT
    TABLE_NAME AS tabla,
    COLUMN_NAME AS columna,
    CONSTRAINT_NAME AS restriccion,
    REFERENCED_TABLE_NAME AS tabla_referenciada,
    REFERENCED_COLUMN_NAME AS columna_referenciada
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'barlounge'
AND TABLE_NAME IN (
    'bar_orders',
    'bar_order_items',
    'dining_tables',
    'orders',
    'order_items',
    'order_payments',
    'invoices',
    'invoice_items'
)
AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, COLUMN_NAME;


-- =========================================
-- 6. COMPROBAR PEDIDOS ABIERTOS DUPLICADOS
-- =========================================
SELECT
    table_id,
    COUNT(*) AS pedidos_abiertos
FROM bar_orders
WHERE status = 'OPEN'
GROUP BY table_id
HAVING COUNT(*) > 1;


-- =========================================
-- 7. COMPROBAR INVENTARIO POR SEDE
-- =========================================
SELECT
    s.site_id,
    s.name AS sede,
    COUNT(i.inventory_id) AS productos_asignados,
    COALESCE(SUM(i.quantity), 0) AS unidades
FROM sites s
LEFT JOIN inventory i
    ON i.site_id = s.site_id
GROUP BY s.site_id, s.name
ORDER BY s.site_id;

-- ============================================================================
-- ETAPA 10 - DATOS DE COSTO Y FECHA EN LOS DETALLES DE COMPROBANTES
-- Añade y completa requested_at y purchase_price en invoice_items.
-- ============================================================================
-- Guardar cuándo se solicitó el producto
-- y cuál era su costo de compra.
ALTER TABLE invoice_items
    ADD COLUMN requested_at DATETIME NULL
        AFTER product_name,
    ADD COLUMN purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0
        AFTER unit_price;

-- Recuperar la fecha del producto desde el pedido.
-- Para facturas antiguas sin coincidencia, usar la fecha de factura.
UPDATE invoice_items ii
INNER JOIN invoices i
    ON i.invoice_id = ii.invoice_id
LEFT JOIN bar_order_items boi
    ON boi.order_id = i.order_id
    AND boi.product_id = ii.product_id
LEFT JOIN products p
    ON p.product_id = ii.product_id
SET
    ii.requested_at = COALESCE(boi.created_at, i.issued_at),
    ii.purchase_price = COALESCE(p.purchase_price, 0)
WHERE ii.requested_at IS NULL
   OR ii.purchase_price = 0;
   
-- Asegurar que todas las filas tengan fecha.
ALTER TABLE invoice_items
    MODIFY requested_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP;

-- Índice para acelerar los filtros por fecha.
CREATE INDEX idx_invoice_items_requested_at
    ON invoice_items(requested_at);
    
-- ============================================================================
-- ETAPA 11 - PERMISOS DE REPORTES Y AUDITORÍA
-- Registra REPORTS_READ y AUDIT_READ y sus asignaciones indicadas.
-- ============================================================================
INSERT IGNORE INTO permissions (
    name,
    description,
    status
)
VALUES (
    'REPORTS_READ',
    'View sales, inventory and best-selling product reports',
    'ACTIVE'
);

INSERT IGNORE INTO role_permissions (
    role_id,
    permission_id
)
SELECT
    r.role_id,
    p.permission_id
FROM roles r
INNER JOIN permissions p
    ON p.name = 'REPORTS_READ'
WHERE r.name = 'Administrador';

INSERT IGNORE INTO permissions (
    name,
    description,
    status
)
VALUES (
    'AUDIT_READ',
    'View system audit history',
    'ACTIVE'
);

INSERT IGNORE INTO role_permissions (
    role_id,
    permission_id
)
SELECT
    r.role_id,
    p.permission_id
FROM roles r
INNER JOIN permissions p
    ON p.name = 'AUDIT_READ'
WHERE r.name = 'Administrador';

-- ============================================================================
-- ETAPA 12 - SESIONES Y CIFRADO DE DATOS DEL COMPRADOR
-- auth_sessions controla sesiones. Los bloques finales comprueban si las
-- columnas cifradas existen antes de agregarlas a invoices.
-- ============================================================================
CREATE TABLE IF NOT EXISTS auth_sessions (
    session_id CHAR(36) NOT NULL PRIMARY KEY,
    user_id INT NOT NULL,
    last_activity DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_auth_sessions_user (user_id),
    INDEX idx_auth_sessions_expiration (expires_at),

    CONSTRAINT fk_auth_sessions_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- Columna cifrada para el nombre del comprador.
SET @exists_name = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'invoices'
      AND COLUMN_NAME = 'buyer_name_encrypted'
);

SET @sql_name = IF(
    @exists_name = 0,
    'ALTER TABLE invoices ADD COLUMN buyer_name_encrypted TEXT NULL',
    'SELECT "buyer_name_encrypted already exists" AS result'
);

PREPARE stmt_name FROM @sql_name;
EXECUTE stmt_name;
DEALLOCATE PREPARE stmt_name;


-- Columna cifrada para el documento del comprador.
SET @exists_document = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'invoices'
      AND COLUMN_NAME = 'buyer_document_encrypted'
);

SET @sql_document = IF(
    @exists_document = 0,
    'ALTER TABLE invoices ADD COLUMN buyer_document_encrypted TEXT NULL',
    'SELECT "buyer_document_encrypted already exists" AS result'
);

PREPARE stmt_document FROM @sql_document;
EXECUTE stmt_document;
DEALLOCATE PREPARE stmt_document;

-- Comprobar datos encriptados
SELECT
    invoice_id,
    invoice_number,
    buyer_name_encrypted,
    buyer_document_encrypted
FROM invoices
ORDER BY invoice_id DESC;