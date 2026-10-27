require('dotenv').config();

const bcrypt = require('bcryptjs');
const pool = require('./config/db');

// ============================================================
// PERMISSIONS USED BY THE CURRENT ROUTES
// ============================================================

const permissions = [
    ['DASHBOARD_READ', 'View dashboard'],

    ['USERS_READ', 'List users'],
    ['USERS_CREATE', 'Create users'],
    ['USERS_UPDATE', 'Update users'],

    ['SITES_READ', 'List sites'],
    ['SITES_CREATE', 'Create sites'],
    ['SITES_UPDATE', 'Update sites'],

    ['PRODUCTS_READ', 'List products'],
    ['PRODUCTS_CREATE', 'Create products'],
    ['PRODUCTS_UPDATE', 'Update products'],

    [
        'PRODUCT_ASSIGNMENT_READ',
        'View products assigned to sites'
    ],
    [
        'PRODUCT_ASSIGNMENT_CREATE',
        'Assign catalog products to sites'
    ],
    [
        'PRODUCT_ASSIGNMENT_DELETE',
        'Remove products from site assignments'
    ],

    ['SUPPLIERS_READ', 'List suppliers'],
    ['SUPPLIERS_CREATE', 'Create suppliers'],
    ['SUPPLIERS_UPDATE', 'Update suppliers'],

    ['PRODUCT_TYPES_READ', 'List product types'],
    ['PRODUCT_TYPES_CREATE', 'Create product types'],
    ['PRODUCT_TYPES_UPDATE', 'Update product types'],

    ['INVENTORY_READ', 'View inventory'],
    ['INVENTORY_INCREMENT', 'Increment inventory'],

    ['TABLES_READ', 'View tables'],

    ['ORDERS_READ', 'View orders'],
    ['ORDERS_CREATE', 'Create orders'],
    ['ORDERS_UPDATE', 'Update orders'],
    ['ORDERS_REMOVE_ITEM', 'Remove items from orders'],
    ['ORDERS_SAVE', 'Save orders'],
    ['ORDERS_CANCEL', 'Cancel orders']
];

// ============================================================
// ROLES
// ============================================================

const roles = [
    ['Administrador', 'Full administrative access'],
    ['Mesero', 'Waiter role'],
    ['Cajero', 'Cashier role']
];

// ============================================================
// HELPERS
// ============================================================

async function getIdByName(table, idColumn, name) {
    const [rows] = await pool.query(
        `SELECT ${idColumn}
         FROM ${table}
         WHERE name = ?
         ORDER BY ${idColumn} ASC
         LIMIT 1`,
        [name]
    );

    return rows[0] ? rows[0][idColumn] : null;
}

async function ensureSupplier(name, contact) {
    const [rows] = await pool.query(
        `
        SELECT supplier_id
        FROM suppliers
        WHERE name = ?
        ORDER BY supplier_id ASC
        LIMIT 1
        `,
        [name]
    );

    if (rows.length) {
        await pool.query(
            `
            UPDATE suppliers
            SET contact = ?,
                status = 'ACTIVE'
            WHERE supplier_id = ?
            `,
            [contact, rows[0].supplier_id]
        );

        return rows[0].supplier_id;
    }

    const [result] = await pool.query(
        `
        INSERT INTO suppliers (
            name,
            contact,
            status
        )
        VALUES (?, ?, 'ACTIVE')
        `,
        [name, contact]
    );

    return result.insertId;
}

async function ensureSite(code, name, address) {
    const [rows] = await pool.query(
        `
        SELECT site_id
        FROM sites
        WHERE code = ?
        LIMIT 1
        `,
        [code]
    );

    if (rows.length) {
        // Preserve the existing site status and inventory.
        await pool.query(
            `
            UPDATE sites
            SET name = ?,
                address = ?
            WHERE site_id = ?
            `,
            [name, address, rows[0].site_id]
        );

        return rows[0].site_id;
    }

    const [result] = await pool.query(
        `
        INSERT INTO sites (
            code,
            name,
            address,
            status
        )
        VALUES (?, ?, ?, 'ACTIVE')
        `,
        [code, name, address]
    );

    return result.insertId;
}

async function ensureProduct(product) {
    const [rows] = await pool.query(
        `
        SELECT
            product_id,
            purchase_price,
            sale_price
        FROM products
        WHERE code = ?
        LIMIT 1
        `,
        [product.code]
    );

    // Create the catalog record only.
    // Do not create an inventory assignment here.
    if (!rows.length) {
        const [result] = await pool.query(
            `
            INSERT INTO products (
                code,
                name,
                purchase_unit,
                sale_unit,
                purchase_price,
                product_type_id,
                supplier_id,
                sale_price,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                product.code,
                product.name,
                product.purchaseUnit,
                product.saleUnit,
                product.purchasePrice,
                product.productTypeId,
                product.supplierId,
                product.salePrice,
                product.status
            ]
        );

        return result.insertId;
    }

    const existing = rows[0];

    // Repair zero-valued prices on these sample products only.
    // Never replace an existing non-zero price.
    if (
        Number(existing.purchase_price) === 0 ||
        Number(existing.sale_price) === 0
    ) {
        await pool.query(
            `
            UPDATE products
            SET
                purchase_price = CASE
                    WHEN purchase_price = 0 THEN ?
                    ELSE purchase_price
                END,
                sale_price = CASE
                    WHEN sale_price = 0 THEN ?
                    ELSE sale_price
                END
            WHERE product_id = ?
            `,
            [
                product.purchasePrice,
                product.salePrice,
                existing.product_id
            ]
        );
    }

    return existing.product_id;
}

// ============================================================
// MAIN SEED
// ============================================================

async function seed() {
    console.log('Starting BARLOUNGE seed...');

    // --------------------------------------------------------
    // 1. Create or activate roles
    // --------------------------------------------------------

    for (const [name, description] of roles) {
        await pool.query(
            `
            INSERT INTO roles (
                name,
                description,
                status
            )
            VALUES (?, ?, 'ACTIVE')
            ON DUPLICATE KEY UPDATE
                description = VALUES(description),
                status = 'ACTIVE'
            `,
            [name, description]
        );
    }

    // --------------------------------------------------------
    // 2. Create or activate permissions
    // --------------------------------------------------------

    for (const [name, description] of permissions) {
        await pool.query(
            `
            INSERT INTO permissions (
                name,
                description,
                status
            )
            VALUES (?, ?, 'ACTIVE')
            ON DUPLICATE KEY UPDATE
                description = VALUES(description),
                status = 'ACTIVE'
            `,
            [name, description]
        );
    }

    // --------------------------------------------------------
    // 3. Retrieve role IDs
    // --------------------------------------------------------

    const [[admin]] = await pool.query(
        `
        SELECT role_id
        FROM roles
        WHERE name = 'Administrador'
        LIMIT 1
        `
    );

    const [[waiter]] = await pool.query(
        `
        SELECT role_id
        FROM roles
        WHERE name = 'Mesero'
        LIMIT 1
        `
    );

    const [[cashier]] = await pool.query(
        `
        SELECT role_id
        FROM roles
        WHERE name = 'Cajero'
        LIMIT 1
        `
    );

    if (!admin || !waiter || !cashier) {
        throw new Error(
            'Could not create or retrieve the required roles.'
        );
    }

    // --------------------------------------------------------
    // 4. Give all active permissions to Administrator
    // --------------------------------------------------------

    const [allPermissions] = await pool.query(
        `
        SELECT permission_id
        FROM permissions
        WHERE status = 'ACTIVE'
        `
    );

    for (const permission of allPermissions) {
        await pool.query(
            `
            INSERT IGNORE INTO role_permissions (
                role_id,
                permission_id
            )
            VALUES (?, ?)
            `,
            [
                admin.role_id,
                permission.permission_id
            ]
        );
    }

    // --------------------------------------------------------
    // 5. Assign permissions to other roles
    // --------------------------------------------------------

    const rolePermissionNames = {
        Mesero: [
            'DASHBOARD_READ',
            'PRODUCTS_READ',
            'TABLES_READ',
            'ORDERS_READ',
            'ORDERS_CREATE',
            'ORDERS_UPDATE',
            'ORDERS_REMOVE_ITEM',
            'ORDERS_SAVE',
            'ORDERS_CANCEL'
        ],

        Cajero: [
            'DASHBOARD_READ',
            'PRODUCTS_READ',
            'INVENTORY_READ',
            'INVENTORY_INCREMENT'
        ]
    };

    const roleIds = {
        Mesero: waiter.role_id,
        Cajero: cashier.role_id
    };

    for (const [roleName, names] of Object.entries(
        rolePermissionNames
    )) {
        for (const permissionName of names) {
            const [[permission]] = await pool.query(
                `
                SELECT permission_id
                FROM permissions
                WHERE name = ?
                    AND status = 'ACTIVE'
                LIMIT 1
                `,
                [permissionName]
            );

            if (permission) {
                await pool.query(
                    `
                    INSERT IGNORE INTO role_permissions (
                        role_id,
                        permission_id
                    )
                    VALUES (?, ?)
                    `,
                    [
                        roleIds[roleName],
                        permission.permission_id
                    ]
                );
            }
        }
    }

    // --------------------------------------------------------
    // 6. Create sample sites
    //
    // Creating a site does not assign products to it.
    // --------------------------------------------------------

    await ensureSite(
        'HQ01',
        'Main Site',
        'Main address'
    );

    await ensureSite(
        'BR01',
        'Bogota Lounge',
        'Calle 100 # 10-10'
    );

    await ensureSite(
        'MD01',
        'Medellin Lounge',
        'Carrera 43 # 10-20'
    );

    // --------------------------------------------------------
    // 7. Create or activate product types
    // --------------------------------------------------------

    const productTypes = [
        ['Bebidas', 'Beverages'],
        ['Snacks', 'Snacks and food'],
        ['Licores', 'Liquors']
    ];

    for (const [name, description] of productTypes) {
        await pool.query(
            `
            INSERT INTO product_types (
                name,
                description,
                status
            )
            VALUES (?, ?, 'ACTIVE')
            ON DUPLICATE KEY UPDATE
                description = VALUES(description),
                status = 'ACTIVE'
            `,
            [name, description]
        );
    }

    // --------------------------------------------------------
    // 8. Create or update sample suppliers
    // --------------------------------------------------------

    const supplierIds = {
        distribuciones: await ensureSupplier(
            'Distribuciones Andinas',
            '3001112233'
        ),

        bebidas: await ensureSupplier(
            'Bebidas Colombia',
            '3002223344'
        ),

        licores: await ensureSupplier(
            'Licores Nacionales',
            '3003334455'
        )
    };

    // --------------------------------------------------------
    // 9. Retrieve product type IDs by name
    // --------------------------------------------------------

    const beerTypeId = await getIdByName(
        'product_types',
        'product_type_id',
        'Bebidas'
    );

    const liquorTypeId = await getIdByName(
        'product_types',
        'product_type_id',
        'Licores'
    );

    if (!beerTypeId || !liquorTypeId) {
        throw new Error(
            'Could not retrieve the sample product types.'
        );
    }

    // --------------------------------------------------------
    // 10. Create sample catalog products
    //
    // IMPORTANT:
    // These products are added to the catalog only.
    // No inventory records are created in this section.
    // --------------------------------------------------------

    const products = [
        {
            code: 'P001',
            name: 'Cerveza Club Colombia',
            purchaseUnit: 'unit',
            saleUnit: 'unit',
            purchasePrice: 3000,
            productTypeId: beerTypeId,
            supplierId: supplierIds.distribuciones,
            salePrice: 7000,
            status: 'ACTIVE'
        },

        {
            code: 'P002',
            name: 'Coca Cola',
            purchaseUnit: 'unit',
            saleUnit: 'unit',
            purchasePrice: 2000,
            productTypeId: beerTypeId,
            supplierId: supplierIds.bebidas,
            salePrice: 5000,
            status: 'ACTIVE'
        },

        {
            code: 'P003',
            name: 'Whisky',
            purchaseUnit: 'bottle',
            saleUnit: 'glass',
            purchasePrice: 70000,
            productTypeId: liquorTypeId,
            supplierId: supplierIds.licores,
            salePrice: 125000,
            status: 'ACTIVE'
        }
    ];

    for (const product of products) {
        await ensureProduct(product);
    }

    // --------------------------------------------------------
    // 11. Explicit sample assignments
    //
    // These five combinations are sample data only.
    // This does not assign every product to every site.
    // INSERT IGNORE preserves existing quantities on reruns.
    // --------------------------------------------------------

    const sampleInventory = [
        ['HQ01', 'P001', 80],
        ['HQ01', 'P002', 50],
        ['BR01', 'P001', 45],
        ['BR01', 'P002', 60],
        ['MD01', 'P001', 30]
    ];

    for (const [
        siteCode,
        productCode,
        quantity
    ] of sampleInventory) {
        const [[site]] = await pool.query(
            `
            SELECT site_id
            FROM sites
            WHERE code = ?
            LIMIT 1
            `,
            [siteCode]
        );

        const [[product]] = await pool.query(
            `
            SELECT product_id
            FROM products
            WHERE code = ?
            LIMIT 1
            `,
            [productCode]
        );

        if (site && product) {
            await pool.query(
                `
                INSERT IGNORE INTO inventory (
                    site_id,
                    product_id,
                    quantity
                )
                VALUES (?, ?, ?)
                `,
                [
                    site.site_id,
                    product.product_id,
                    quantity
                ]
            );
        }
    }

    // --------------------------------------------------------
    // 12. Create initial users if they do not exist
    // --------------------------------------------------------

    const [[mainSite]] = await pool.query(
        `
        SELECT site_id
        FROM sites
        WHERE code = 'HQ01'
        LIMIT 1
        `
    );

    const accounts = [
        [
            'ADMIN001',
            'System Administrator',
            'Admin123*',
            admin.role_id,
            mainSite.site_id
        ],

        [
            'WAITER001',
            'Main Waiter',
            'Waiter123*',
            waiter.role_id,
            mainSite.site_id
        ],

        [
            'CASHIER001',
            'Main Cashier',
            'Cashier123*',
            cashier.role_id,
            mainSite.site_id
        ]
    ];

    for (const [
        code,
        name,
        password,
        roleId,
        siteId
    ] of accounts) {
        const [[existingUser]] = await pool.query(
            `
            SELECT user_id
            FROM users
            WHERE code = ?
            LIMIT 1
            `,
            [code]
        );

        if (!existingUser) {
            const passwordHash = await bcrypt.hash(
                password,
                10
            );

            await pool.query(
                `
                INSERT INTO users (
                    code,
                    name,
                    password_hash,
                    role_id,
                    site_id,
                    status
                )
                VALUES (?, ?, ?, ?, ?, 'ACTIVE')
                `,
                [
                    code,
                    name,
                    passwordHash,
                    roleId,
                    siteId
                ]
            );
        }
    }

    console.log('Seed completed successfully.');
    console.log('Administrator: ADMIN001 / Admin123*');
    console.log('Waiter: WAITER001 / Waiter123*');
    console.log('Cashier: CASHIER001 / Cashier123*');
}

// ============================================================
// EXECUTION AND ERROR HANDLING
// ============================================================

seed()
    .catch((error) => {
        console.error('Seed failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });