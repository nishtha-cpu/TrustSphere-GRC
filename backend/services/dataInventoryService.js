const pool = require('../config/database');
const { logSystemEvent } = require('./systemAuditService');

async function listDataAssets(tenantId, filters = {}) {
  let query = `
    SELECT a.*, u.email AS owner_email
    FROM data_assets a
    LEFT JOIN users u ON a.owner_id = u.id
    WHERE a.tenant_id = ? AND a.deleted_at IS NULL
  `;
  const params = [tenantId];

  if (filters.sensitivity_level) {
    query += ` AND a.sensitivity_level = ?`;
    params.push(filters.sensitivity_level);
  }

  if (filters.status) {
    query += ` AND a.status = ?`;
    params.push(filters.status);
  }

  if (filters.search) {
    query += ` AND (a.asset_name LIKE ? OR a.system_source LIKE ? OR a.location LIKE ?)`;
    const pattern = `%${filters.search.trim()}%`;
    params.push(pattern, pattern, pattern);
  }

  query += ` ORDER BY a.id DESC`;
  const [rows] = await pool.query(query, params);
  return rows;
}

async function addDataAsset(actingUserId, tenantId, data, reqContext = {}) {
  const {
    asset_name,
    asset_type,
    system_source,
    owner_id,
    data_categories,
    sensitivity_level = 'INTERNAL',
    location,
    classification = 'General Data',
    retention_policy,
    access_info
  } = data;

  if (!asset_name || !asset_name.trim() || !asset_type || !system_source || !retention_policy || !location) {
    const err = new Error('asset_name, asset_type, system_source, location, and retention_policy are required');
    err.status = 400;
    throw err;
  }

  const [res] = await pool.query(
    `INSERT INTO data_assets
     (tenant_id, asset_name, asset_type, system_source, owner_id, data_categories, sensitivity_level, location, classification, retention_policy, access_info, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
    [
      tenantId,
      asset_name.trim(),
      asset_type.trim(),
      system_source.trim(),
      owner_id || actingUserId || null,
      data_categories || 'Customer Details, Logs',
      sensitivity_level,
      location.trim(),
      classification,
      retention_policy.trim(),
      access_info || null
    ]
  );

  const assetId = res.insertId;
  await logSystemEvent(tenantId, actingUserId, null, 'ADD_DATA_ASSET', 'DATA_INVENTORY', 'DATA_ASSET', assetId, { asset_name }, reqContext);

  const [rows] = await pool.query(`SELECT * FROM data_assets WHERE id = ? AND tenant_id = ?`, [assetId, tenantId]);
  return rows[0];
}

async function listDataFlows(tenantId, filters = {}) {
  let query = `
    SELECT f.*, 
           sa.asset_name AS source_asset_name, sa.system_source AS source_system,
           ta.asset_name AS target_asset_name, ta.system_source AS target_system,
           r.ropa_code, r.activity_name AS ropa_activity_name
    FROM data_flows f
    JOIN data_assets sa ON f.source_asset_id = sa.id
    LEFT JOIN data_assets ta ON f.target_asset_id = ta.id
    LEFT JOIN ropa_records r ON f.ropa_id = r.id
    WHERE f.tenant_id = ?
  `;
  const params = [tenantId];

  if (filters.source_asset_id) {
    query += ` AND f.source_asset_id = ?`;
    params.push(filters.source_asset_id);
  }

  query += ` ORDER BY f.id DESC`;
  const [rows] = await pool.query(query, params);
  return rows;
}

async function addDataFlow(actingUserId, tenantId, data, reqContext = {}) {
  const {
    flow_name,
    source_asset_id,
    target_asset_id,
    ropa_id,
    recipient_name,
    transfer_mechanism,
    encryption_status = 'Encrypted in Transit (TLS 1.3)'
  } = data;

  if (!flow_name || !source_asset_id || !recipient_name || !transfer_mechanism) {
    const err = new Error('flow_name, source_asset_id, recipient_name, and transfer_mechanism are required');
    err.status = 400;
    throw err;
  }

  const [res] = await pool.query(
    `INSERT INTO data_flows
     (tenant_id, flow_name, source_asset_id, target_asset_id, ropa_id, recipient_name, transfer_mechanism, encryption_status, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
    [
      tenantId,
      flow_name.trim(),
      source_asset_id,
      target_asset_id || null,
      ropa_id || null,
      recipient_name.trim(),
      transfer_mechanism.trim(),
      encryption_status
    ]
  );

  await logSystemEvent(tenantId, actingUserId, null, 'ADD_DATA_FLOW', 'DATA_INVENTORY', 'DATA_FLOW', res.insertId, { flow_name }, reqContext);

  const [rows] = await pool.query(`SELECT * FROM data_flows WHERE id = ? AND tenant_id = ?`, [res.insertId, tenantId]);
  return rows[0];
}

module.exports = {
  listDataAssets,
  addDataAsset,
  listDataFlows,
  addDataFlow
};
