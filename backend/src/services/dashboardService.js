const pool = require('../config/db');

async function getSummary() {
  const [[users]] = await pool.query('SELECT COUNT(*) AS total FROM users');
  const [[sites]] = await pool.query('SELECT COUNT(*) AS total FROM sites');
  const [[products]] = await pool.query('SELECT COUNT(*) AS total FROM products');
  const [[inventory]] = await pool.query('SELECT COALESCE(SUM(quantity),0) AS total FROM inventory');
  return {
    users: Number(users.total),
    sites: Number(sites.total),
    products: Number(products.total),
    inventoryUnits: Number(inventory.total),
    orders: 0,
    sales: 0
  };
}

module.exports = {
  getSummary
};