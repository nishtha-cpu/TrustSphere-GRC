const pool = require('../config/database');

async function getComplianceDashboard(tenantId) {
  // 1. Consent Statistics
  const [consentRows] = await pool.query(
    `SELECT 
       COUNT(*) AS total_consents,
       SUM(CASE WHEN status = 'GRANTED' THEN 1 ELSE 0 END) AS active_consents,
       SUM(CASE WHEN status = 'WITHDRAWN' THEN 1 ELSE 0 END) AS withdrawn_consents,
       SUM(CASE WHEN status = 'EXPIRED' THEN 1 ELSE 0 END) AS expired_consents
     FROM consent_records WHERE tenant_id = ? AND deleted_at IS NULL`,
    [tenantId]
  );
  const c = consentRows[0] || {};

  // 2. DSR / DPRM Statistics
  const [dsrRows] = await pool.query(
    `SELECT 
       COUNT(*) AS total_dsrs,
       SUM(CASE WHEN status IN ('SUBMITTED', 'VERIFIED', 'CASE_ASSIGNED', 'DATA_COLLECTION', 'APPROVAL_GATE', 'RESPONSE_GENERATION', 'RECEIVED', 'IN_REVIEW', 'IN_PROGRESS') THEN 1 ELSE 0 END) AS pending_dsrs,
       SUM(CASE WHEN status = 'CLOSED' OR status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_dsrs
     FROM data_subject_requests WHERE tenant_id = ? AND deleted_at IS NULL`,
    [tenantId]
  );
  const d = dsrRows[0] || {};

  // 3. DPIA Statistics
  const [dpiaRows] = await pool.query(
    `SELECT 
       COUNT(*) AS total_dpias,
       SUM(CASE WHEN status IN ('DRAFT', 'IN_REVIEW', 'REMEDIATION_REQUIRED') THEN 1 ELSE 0 END) AS open_dpias,
       SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approved_dpias,
       SUM(CASE WHEN risk_level IN ('HIGH', 'CRITICAL') THEN 1 ELSE 0 END) AS high_risk_dpias
     FROM dpia_assessments WHERE tenant_id = ? AND deleted_at IS NULL`,
    [tenantId]
  );
  const dp = dpiaRows[0] || {};

  // 4. TPRM / Vendor Statistics
  const [vendorRows] = await pool.query(
    `SELECT 
       COUNT(*) AS total_vendors,
       SUM(CASE WHEN risk_classification IN ('HIGH', 'CRITICAL') THEN 1 ELSE 0 END) AS high_risk_vendors,
       AVG(CASE WHEN risk_classification = 'LOW' THEN 90 WHEN risk_classification = 'MEDIUM' THEN 75 WHEN risk_classification = 'HIGH' THEN 50 ELSE 30 END) AS avg_vendor_score
     FROM vendors WHERE tenant_id = ? AND deleted_at IS NULL`,
    [tenantId]
  );
  const v = vendorRows[0] || {};

  // 5. Privacy Incidents
  const [incidentRows] = await pool.query(
    `SELECT 
       COUNT(*) AS total_incidents,
       SUM(CASE WHEN status != 'CLOSED' THEN 1 ELSE 0 END) AS active_incidents,
       SUM(CASE WHEN severity IN ('HIGH', 'CRITICAL') AND status != 'CLOSED' THEN 1 ELSE 0 END) AS critical_incidents
     FROM privacy_incidents WHERE tenant_id = ? AND deleted_at IS NULL`,
    [tenantId]
  );
  const inc = incidentRows[0] || {};

  // 6. RoPA & Data Assets
  const [ropaRows] = await pool.query(`SELECT COUNT(*) AS count FROM ropa_records WHERE tenant_id = ? AND deleted_at IS NULL`, [tenantId]);
  const [assetRows] = await pool.query(`SELECT COUNT(*) AS count FROM data_assets WHERE tenant_id = ? AND deleted_at IS NULL`, [tenantId]);

  // Calculate Real Dynamic Scores
  const privacyScore = Math.min(100, Math.max(0, Math.round(
    85 - (Number(inc.active_incidents || 0) * 10) - (Number(dp.high_risk_dpias || 0) * 5) + (Number(c.active_consents || 0) > 0 ? 5 : 0)
  )));

  const dpdpScore = Math.min(100, Math.max(0, Math.round(
    90 - (Number(d.pending_dsrs || 0) * 4) - (Number(inc.active_incidents || 0) * 8)
  )));

  const vendorScore = Math.round(Number(v.avg_vendor_score || 80));

  return {
    kpi: {
      privacy_compliance_score: privacyScore,
      dpdp_compliance_score: dpdpScore,
      vendor_risk_score: vendorScore,
      open_assessments: Number(dp.open_dpias || 0),
      pending_dsrs: Number(d.pending_dsrs || 0),
      active_incidents: Number(inc.active_incidents || 0),
      active_consents: Number(c.active_consents || 0),
      high_risk_findings: Number(dp.high_risk_dpias || 0) + Number(v.high_risk_vendors || 0) + Number(inc.critical_incidents || 0)
    },
    consents: {
      total: Number(c.total_consents || 0),
      active: Number(c.active_consents || 0),
      withdrawn: Number(c.withdrawn_consents || 0),
      expired: Number(c.expired_consents || 0)
    },
    dsrs: {
      total: Number(d.total_dsrs || 0),
      pending: Number(d.pending_dsrs || 0),
      completed: Number(d.completed_dsrs || 0)
    },
    dpias: {
      total: Number(dp.total_dpias || 0),
      open: Number(dp.open_dpias || 0),
      approved: Number(dp.approved_dpias || 0),
      high_risk: Number(dp.high_risk_dpias || 0)
    },
    vendors: {
      total: Number(v.total_vendors || 0),
      high_risk: Number(v.high_risk_vendors || 0)
    },
    incidents: {
      total: Number(inc.total_incidents || 0),
      active: Number(inc.active_incidents || 0),
      critical: Number(inc.critical_incidents || 0)
    },
    governance: {
      ropa_count: Number(ropaRows[0]?.count || 0),
      data_asset_count: Number(assetRows[0]?.count || 0)
    }
  };
}

module.exports = {
  getComplianceDashboard
};
