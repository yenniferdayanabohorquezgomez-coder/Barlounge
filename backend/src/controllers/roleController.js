const pool = require('../config/db');

async function list(req, res, next) {
    try {
        const [rows] = await pool.query(`SELECT role_id,name,description,status FROM roles WHERE status='ACTIVE' ORDER BY role_id`);
        res.json(rows);
    } catch (e) {
        next(e);
    }
}

module.exports = {
    list
};