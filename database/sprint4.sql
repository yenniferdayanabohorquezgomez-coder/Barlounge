USE barlounge;

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
-- 3. PRODUCTOS DE LOS PEDIDOS
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