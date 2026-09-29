const pool = require('../config/database');

/**
 * Service to handle Risk Register database operations
 */

async function checkUserInTenant(user_id, tenant_id) {
  const query = `SELECT id FROM users WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`;
  const [rows] = await pool.query(query, [user_id, tenant_id]);
  return rows.length > 0;
}

async function checkCategoryInTenant(category_id, tenant_id) {
  const query = `SELECT id FROM risk_categories WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`;
  const [rows] = await pool.query(query, [category_id, tenant_id]);
  return rows.length > 0;
}

async function createRisk({ tenant_id, risk_code, title, description, category_id, owner_id, status }) {
  const userValid = await checkUserInTenant(owner_id, tenant_id);
  if (!userValid) {
    const err = new Error('Invalid owner_id: user does not exist or does not belong to specified tenant');
    err.status = 400;
    throw err;
  }

  const categoryValid = await checkCategoryInTenant(category_id, tenant_id);
  if (!categoryValid) {
    const err = new Error('Invalid category_id: category does not exist or does not belong to specified tenant');
    err.status = 400;
    throw err;
  }

  const riskStatus = status || 'IDENTIFIED';
  const query = `
    INSERT INTO risks (tenant_id, risk_code, title, description, category_id, owner_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const [result] = await pool.query(query, [
    tenant_id,
    risk_code,
    title,
    description,
    category_id,
    owner_id,
    riskStatus
  ]);

  return getRiskById(result.insertId, tenant_id);
}

async function getRisksByTenant(tenant_id) {
  const query = `
    SELECT id, tenant_id, risk_code, title, description, category_id, owner_id, status, created_at, updated_at
    FROM risks
    WHERE tenant_id = ? AND deleted_at IS NULL
    ORDER BY id DESC
  `;
  const [rows] = await pool.query(query, [tenant_id]);
  return rows;
}

async function getRiskById(id, tenant_id = null) {
  let query = `
    SELECT id, tenant_id, risk_code, title, description, category_id, owner_id, status, created_at, updated_at
    FROM risks
    WHERE id = ? AND deleted_at IS NULL
  `;
  const params = [id];

  if (tenant_id) {
    query += ` AND tenant_id = ?`;
    params.push(tenant_id);
  }

  const [rows] = await pool.query(query, params);
  return rows.length ? rows[0] : null;
}

async function updateRisk(id, { title, description, category_id, owner_id, status, tenant_id }) {
  const existingRisk = await getRiskById(id, tenant_id);
  if (!existingRisk) {
    return null;
  }

  if (owner_id !== undefined && owner_id !== null) {
    const userValid = await checkUserInTenant(owner_id, tenant_id);
    if (!userValid) {
      const err = new Error('Invalid owner_id: user does not exist or does not belong to specified tenant');
      err.status = 400;
      throw err;
    }
  }

  if (category_id !== undefined && category_id !== null) {
    const categoryValid = await checkCategoryInTenant(category_id, tenant_id);
    if (!categoryValid) {
      const err = new Error('Invalid category_id: category does not exist or does not belong to specified tenant');
      err.status = 400;
      throw err;
    }
  }

  const updatedTitle = title !== undefined ? title : existingRisk.title;
  const updatedDesc = description !== undefined ? description : existingRisk.description;
  const updatedCategory = category_id !== undefined ? category_id : existingRisk.category_id;
  const updatedOwner = owner_id !== undefined ? owner_id : existingRisk.owner_id;
  const updatedStatus = status !== undefined ? status : existingRisk.status;

  const query = `
    UPDATE risks
    SET title = ?, description = ?, category_id = ?, owner_id = ?, status = ?
    WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
  `;
  await pool.query(query, [updatedTitle, updatedDesc, updatedCategory, updatedOwner, updatedStatus, id, tenant_id]);

  return getRiskById(id, tenant_id);
}

async function deleteRisk(id, tenant_id = null) {
  let query = `
    UPDATE risks
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE id = ? AND deleted_at IS NULL
  `;
  const params = [id];

  if (tenant_id) {
    query += ` AND tenant_id = ?`;
    params.push(tenant_id);
  }

  const [result] = await pool.query(query, params);
  return result.affectedRows > 0;
}

module.exports = {
  checkUserInTenant,
  checkCategoryInTenant,
  createRisk,
  getRisksByTenant,
  getRiskById,
  updateRisk,
  deleteRisk
};
