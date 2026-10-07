require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./config/db');
const permissions = [['DASHBOARD_READ', 'View dashboard'], ['USERS_READ', 'List users'], ['USERS_CREATE', 'Create users'], ['USERS_UPDATE', 'Update users'], ['SITES_READ', 'List sites'], ['SITES_CREATE', 'Create sites'], ['SITES_UPDATE', 'Update sites'], ['PRODUCTS_READ', 'List products'], ['PRODUCTS_CREATE', 'Create products'], ['PRODUCTS_UPDATE', 'Update products'], ['SUPPLIERS_READ', 'List suppliers'], ['SUPPLIERS_CREATE', 'Create suppliers'], ['SUPPLIERS_UPDATE', 'Update suppliers'], ['PRODUCT_TYPES_READ', 'List product types'], ['PRODUCT_TYPES_CREATE', 'Create product types'], ['PRODUCT_TYPES_UPDATE', 'Update product types'], ['INVENTORY_READ', 'View inventory'], ['INVENTORY_INCREMENT', 'Increment inventory']];
const roles = [['Administrador', 'Full administrative access'], ['Mesero', 'Waiter role'], ['Cajero', 'Cashier role']];
async function seed() {
  for (const [name, description] of roles) await pool.query(`INSERT INTO roles(name,description) VALUES(?,?) ON DUPLICATE KEY UPDATE description=VALUES(description)`, [name, description]);
  for (const [name, description] of permissions) await pool.query(`INSERT INTO permissions(name,description) VALUES(?,?) ON DUPLICATE KEY UPDATE description=VALUES(description)`, [name, description]);
  const [[admin]] = await pool.query(`SELECT role_id FROM roles WHERE name='Administrador'`);
  const [[waiter]] = await pool.query(`SELECT role_id FROM roles WHERE name='Mesero'`);
  const [[cashier]] = await pool.query(`SELECT role_id FROM roles WHERE name='Cajero'`);
  const [all] = await pool.query(`SELECT permission_id FROM permissions`);
  for (const p of all) await pool.query(`INSERT IGNORE INTO role_permissions(role_id,permission_id) VALUES(?,?)`, [admin.role_id, p.permission_id]);
  const roleMap = {
    Mesero: ['DASHBOARD_READ', 'PRODUCTS_READ', 'INVENTORY_READ'],
    Cajero: ['DASHBOARD_READ', 'PRODUCTS_READ', 'INVENTORY_READ', 'INVENTORY_INCREMENT']
  };
  for (const [roleName, names] of Object.entries(roleMap)) {
    const roleId = roleName === 'Mesero' ? waiter.role_id : cashier.role_id;
    for (const n of names) {
      const [[p]] = await pool.query(`SELECT permission_id FROM permissions WHERE name=?`, [n]);
      await pool.query(`INSERT IGNORE INTO role_permissions(role_id,permission_id) VALUES(?,?)`, [roleId, p.permission_id]);
    }
  }
  let [[site]] = await pool.query(`SELECT site_id FROM sites WHERE code='HQ01'`);
  if (!site) {
    const [r] = await pool.query(`INSERT INTO sites(code,name,address,status) VALUES('HQ01','Main Site','Main address','ACTIVE')`);
    site = {
      site_id: r.insertId
    };
  }
  const sampleSites = [['BR01', 'Bogota Lounge', 'Calle 100 # 10-10', 'ACTIVE'], ['MD01', 'Medellin Lounge', 'Carrera 43 # 10-20', 'ACTIVE']];
  for (const s of sampleSites) await pool.query(`INSERT INTO sites(code,name,address,status) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),address=VALUES(address)`, s);
  const types = [['Bebidas', 'Beverages', 'ACTIVE'], ['Snacks', 'Snacks and food', 'ACTIVE'], ['Licores', 'Liquors', 'ACTIVE']];
  for (const t of types) await pool.query(`INSERT INTO product_types(name,description,status) VALUES(?,?,?) ON DUPLICATE KEY UPDATE description=VALUES(description)`, t);
  const suppliers = [['Distribuciones Andinas', '3001112233', 'ACTIVE'], ['Bebidas Colombia', '3002223344', 'ACTIVE'], ['Licores Nacionales', '3003334455', 'ACTIVE']];
  for (const s of suppliers) await pool.query(`INSERT INTO suppliers(name,contact,status) VALUES(?,?,?) ON DUPLICATE KEY UPDATE contact=VALUES(contact), status=VALUES(status)`, s);
  const [[beerType]] = await pool.query(`SELECT product_type_id FROM product_types WHERE name='Bebidas'`);
  const [[liqType]] = await pool.query(`SELECT product_type_id FROM product_types WHERE name='Licores'`);
  const [[sup1]] = await pool.query(`SELECT supplier_id FROM suppliers ORDER BY supplier_id LIMIT 1`);
  const [[sup2]] = await pool.query(`SELECT supplier_id FROM suppliers ORDER BY supplier_id LIMIT 1 OFFSET 1`);
  const [[sup3]] = await pool.query(`SELECT supplier_id FROM suppliers ORDER BY supplier_id LIMIT 1 OFFSET 2`);
  const productRows = [['P001', 'Cerveza Club Colombia', 'unit', 'unit', beerType.product_type_id, sup1.supplier_id, 7000, 'ACTIVE'], ['P002', 'Coca Cola', 'unit', 'unit', beerType.product_type_id, sup2.supplier_id, 5000, 'ACTIVE'], ['P003', 'Whisky', 'bottle', 'glass', liqType.product_type_id, sup3.supplier_id, 125000, 'ACTIVE']];
  for (const p of productRows) {
    const [[existing]] = await pool.query(`SELECT product_id FROM products WHERE code=?`, [p[0]]);
    if (!existing) {
      const [r] = await pool.query(`INSERT INTO products(code,name,purchase_unit,sale_unit,product_type_id,supplier_id,sale_price,status) VALUES(?,?,?,?,?,?,?,?)`, p);
      const [sites] = await pool.query(`SELECT site_id FROM sites WHERE status='ACTIVE'`);
      for (const st of sites) await pool.query(`INSERT IGNORE INTO inventory(site_id,product_id,quantity) VALUES(?,?,?)`, [st.site_id, r.insertId, 0]);
    }
  }
  const sampleInventory = [['HQ01', 'P001', 80], ['HQ01', 'P002', 50], ['BR01', 'P001', 45], ['BR01', 'P002', 60], ['MD01', 'P001', 30]];
  for (const [code, pcode, q] of sampleInventory) {
    const [[st]] = await pool.query(`SELECT site_id FROM sites WHERE code=?`, [code]);
    const [[pr]] = await pool.query(`SELECT product_id FROM products WHERE code=?`, [pcode]);
    if (st && pr) await pool.query(`UPDATE inventory SET quantity=? WHERE site_id=? AND product_id=?`, [q, st.site_id, pr.product_id]);
  }
  const accounts = [['ADMIN001', 'System Administrator', 'Admin123*', admin.role_id, site.site_id], ['WAITER001', 'Main Waiter', 'Waiter123*', waiter.role_id, site.site_id], ['CASHIER001', 'Main Cashier', 'Cashier123*', cashier.role_id, site.site_id]];
  for (const a of accounts) {
    const [rows] = await pool.query(`SELECT user_id FROM users WHERE code=?`, [a[0]]);
    if (!rows.length) {
      const hash = await bcrypt.hash(a[2], 10);
      await pool.query(`INSERT INTO users(code,name,password_hash,role_id,site_id,status) VALUES(?,?,?,?,?,'ACTIVE')`, [a[0], a[1], hash, a[3], a[4]]);
    }
  }
  console.log('Seed completed.');
  console.log('ADMIN001 / Admin123*');
  console.log('WAITER001 / Waiter123*');
  console.log('CASHIER001 / Cashier123*');
}
seed().catch(e => {
  console.error(e);
  process.exitCode = 1;
}).finally(() => pool.end());
