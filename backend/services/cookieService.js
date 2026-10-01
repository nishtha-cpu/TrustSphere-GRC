const pool = require('../config/database');
const { logSystemEvent } = require('./systemAuditService');

async function listCookies(tenantId, filters = {}) {
  let query = `SELECT * FROM cookie_inventory WHERE tenant_id = ?`;
  const params = [tenantId];

  if (filters.category) {
    query += ` AND category = ?`;
    params.push(filters.category);
  }

  if (filters.party_type) {
    query += ` AND party_type = ?`;
    params.push(filters.party_type);
  }

  if (filters.search) {
    query += ` AND (name LIKE ? OR domain LIKE ? OR provider LIKE ?)`;
    const pattern = `%${filters.search.trim()}%`;
    params.push(pattern, pattern, pattern);
  }

  query += ` ORDER BY id DESC`;
  const [rows] = await pool.query(query, params);
  return rows;
}

async function addCookie(actingUserId, tenantId, data, reqContext = {}) {
  const {
    name,
    domain,
    provider,
    party_type = 'FIRST_PARTY',
    category = 'ESSENTIAL',
    duration = 'Session',
    description,
    source = 'MANUAL'
  } = data;

  if (!name || !name.trim() || !domain || !domain.trim()) {
    const err = new Error('name and domain are required');
    err.status = 400;
    throw err;
  }

  const [res] = await pool.query(
    `INSERT INTO cookie_inventory
     (tenant_id, name, domain, provider, party_type, category, duration, description, source, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
    [
      tenantId,
      name.trim(),
      domain.trim(),
      provider ? provider.trim() : domain.trim(),
      party_type,
      category,
      duration || 'Session',
      description || null,
      source || 'MANUAL'
    ]
  );

  await logSystemEvent(tenantId, actingUserId, null, 'ADD_COOKIE', 'COOKIE', 'COOKIE', res.insertId, { name, domain }, reqContext);

  const [rows] = await pool.query(`SELECT * FROM cookie_inventory WHERE id = ? AND tenant_id = ?`, [res.insertId, tenantId]);
  return rows[0];
}

async function recordCookieConsent(tenantId, data, reqContext = {}) {
  const {
    session_identifier,
    essential_accepted = true,
    functional_accepted = false,
    performance_accepted = false,
    analytics_accepted = false,
    advertising_accepted = false,
    geo_location,
    language = 'en'
  } = data;

  if (!session_identifier || !session_identifier.trim()) {
    const err = new Error('session_identifier is required');
    err.status = 400;
    throw err;
  }

  const [res] = await pool.query(
    `INSERT INTO cookie_consents
     (tenant_id, session_identifier, essential_accepted, functional_accepted, performance_accepted, analytics_accepted, advertising_accepted, ip_address, user_agent, geo_location, language)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tenantId,
      session_identifier.trim(),
      Boolean(essential_accepted),
      Boolean(functional_accepted),
      Boolean(performance_accepted),
      Boolean(analytics_accepted),
      Boolean(advertising_accepted),
      reqContext.ip || null,
      reqContext.userAgent || null,
      geo_location || null,
      language || 'en'
    ]
  );

  return { id: res.insertId, session_identifier, consented_at: new Date().toISOString() };
}

async function getCookieAnalytics(tenantId) {
  // Inventory Counts by Category
  const [inventoryRows] = await pool.query(
    `SELECT category, COUNT(*) AS count
     FROM cookie_inventory
     WHERE tenant_id = ? AND status = 'ACTIVE'
     GROUP BY category`,
    [tenantId]
  );

  // Banner Consent Statistics
  const [statsRows] = await pool.query(
    `SELECT 
       COUNT(*) AS total_sessions,
       SUM(CASE WHEN analytics_accepted = 1 OR advertising_accepted = 1 THEN 1 ELSE 0 END) AS full_consents,
       SUM(CASE WHEN analytics_accepted = 0 AND advertising_accepted = 0 THEN 1 ELSE 0 END) AS essential_only
     FROM cookie_consents
     WHERE tenant_id = ?`,
    [tenantId]
  );

  const totalInventory = inventoryRows.reduce((acc, r) => acc + Number(r.count), 0);
  const stats = statsRows[0] || {};
  const totalSessions = Number(stats.total_sessions || 0);
  const consentRate = totalSessions > 0 ? Math.round((Number(stats.full_consents || 0) / totalSessions) * 100) : 0;

  return {
    total_cookies: totalInventory,
    categories: inventoryRows.map(r => ({ category: r.category, count: Number(r.count) })),
    analytics: {
      total_sessions: totalSessions,
      full_consents: Number(stats.full_consents || 0),
      essential_only: Number(stats.essential_only || 0),
      consent_rate_percentage: consentRate
    }
  };
}

module.exports = {
  listCookies,
  addCookie,
  recordCookieConsent,
  getCookieAnalytics
};
