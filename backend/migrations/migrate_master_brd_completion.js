const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function runMigration() {
  let connection;
  try {
    console.log('Starting Master BRD Completion Migration...');

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'trustsphere',
      multipleStatements: true
    });

    console.log('Connected to MySQL database. Executing schema updates...');

    // 1. DPIA / Privacy Impact Assessment Tables
    await connection.query(`
      CREATE TABLE IF NOT EXISTS dpia_assessments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        assessment_number VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        purpose_id INT NULL,
        status ENUM('DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'REMEDIATION_REQUIRED') DEFAULT 'DRAFT',
        data_collection_score INT DEFAULT 0,
        data_processing_score INT DEFAULT 0,
        data_sharing_score INT DEFAULT 0,
        data_retention_score INT DEFAULT 0,
        security_controls_score INT DEFAULT 0,
        overall_risk_score INT DEFAULT 0,
        risk_level ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'LOW',
        reviewer_id INT NULL,
        reviewer_notes TEXT,
        executive_summary TEXT,
        created_by INT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        UNIQUE KEY uq_tenant_dpia_number (tenant_id, assessment_number),
        INDEX idx_dpia_tenant_status (tenant_id, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS dpia_remediations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        assessment_id INT NOT NULL,
        capa_id INT NULL,
        risk_item VARCHAR(255) NOT NULL,
        action_plan TEXT NOT NULL,
        owner_id INT NULL,
        target_date DATE NULL,
        status ENUM('OPEN', 'IN_PROGRESS', 'COMPLETED') DEFAULT 'OPEN',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_dpia_rem_tenant (tenant_id, assessment_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS dpia_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        assessment_id INT NOT NULL,
        previous_status VARCHAR(50),
        new_status VARCHAR(50),
        action VARCHAR(50) NOT NULL,
        performed_by INT NULL,
        performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        INDEX idx_dpia_hist_tenant (tenant_id, assessment_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Cookie Management Tables
    await connection.query(`
      CREATE TABLE IF NOT EXISTS cookie_inventory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        name VARCHAR(150) NOT NULL,
        domain VARCHAR(255) NOT NULL,
        provider VARCHAR(150) NOT NULL,
        party_type ENUM('FIRST_PARTY', 'THIRD_PARTY') DEFAULT 'FIRST_PARTY',
        category ENUM('ESSENTIAL', 'FUNCTIONAL', 'PERFORMANCE', 'ANALYTICS', 'ADVERTISING') DEFAULT 'ESSENTIAL',
        duration VARCHAR(100) DEFAULT 'Session',
        description TEXT,
        source VARCHAR(100) DEFAULT 'MANUAL',
        status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_cookie_tenant (tenant_id, category)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS cookie_consents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        session_identifier VARCHAR(150) NOT NULL,
        essential_accepted BOOLEAN DEFAULT TRUE,
        functional_accepted BOOLEAN DEFAULT FALSE,
        performance_accepted BOOLEAN DEFAULT FALSE,
        analytics_accepted BOOLEAN DEFAULT FALSE,
        advertising_accepted BOOLEAN DEFAULT FALSE,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        geo_location VARCHAR(100) NULL,
        language VARCHAR(10) DEFAULT 'en',
        consented_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_cookie_consent_tenant (tenant_id, session_identifier)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 3. Privacy Governance / RoPA (Records of Processing Activities) Tables
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ropa_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        ropa_code VARCHAR(50) NOT NULL,
        activity_name VARCHAR(255) NOT NULL,
        purpose_description TEXT NOT NULL,
        data_subject_categories TEXT NOT NULL,
        personal_data_categories TEXT NOT NULL,
        legal_basis VARCHAR(100) NOT NULL,
        data_sources VARCHAR(255) NULL,
        recipients TEXT NULL,
        data_sharing_details TEXT NULL,
        retention_period VARCHAR(100) NOT NULL,
        security_measures TEXT NULL,
        controller_name VARCHAR(255) NOT NULL,
        processor_name VARCHAR(255) NULL,
        dpo_contact VARCHAR(255) NULL,
        status ENUM('DRAFT', 'ACTIVE', 'ARCHIVED') DEFAULT 'ACTIVE',
        created_by INT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        UNIQUE KEY uq_tenant_ropa_code (tenant_id, ropa_code),
        INDEX idx_ropa_tenant (tenant_id, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS ropa_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        ropa_id INT NOT NULL,
        previous_status VARCHAR(50),
        new_status VARCHAR(50),
        action VARCHAR(50) NOT NULL,
        performed_by INT NULL,
        performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        INDEX idx_ropa_hist_tenant (tenant_id, ropa_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 4. Data Asset Inventory & Data Flows Tables
    await connection.query(`
      CREATE TABLE IF NOT EXISTS data_assets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        asset_name VARCHAR(255) NOT NULL,
        asset_type VARCHAR(100) NOT NULL,
        system_source VARCHAR(255) NOT NULL,
        owner_id INT NULL,
        data_categories TEXT NOT NULL,
        sensitivity_level ENUM('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED') DEFAULT 'INTERNAL',
        location VARCHAR(255) NOT NULL,
        classification VARCHAR(100) DEFAULT 'General Data',
        retention_policy VARCHAR(100) NOT NULL,
        access_info TEXT NULL,
        status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        INDEX idx_data_asset_tenant (tenant_id, sensitivity_level)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS data_flows (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        flow_name VARCHAR(255) NOT NULL,
        source_asset_id INT NOT NULL,
        target_asset_id INT NULL,
        ropa_id INT NULL,
        recipient_name VARCHAR(255) NOT NULL,
        transfer_mechanism VARCHAR(150) NOT NULL,
        encryption_status VARCHAR(100) DEFAULT 'Encrypted in Transit (TLS 1.3)',
        status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_data_flow_tenant (tenant_id, source_asset_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 5. Third-Party Risk Management (TPRM) Tables
    await connection.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        vendor_code VARCHAR(50) NOT NULL,
        vendor_name VARCHAR(255) NOT NULL,
        vendor_type VARCHAR(100) NOT NULL,
        status ENUM('ACTIVE', 'INACTIVE', 'UNDER_REVIEW', 'TERMINATED') DEFAULT 'ACTIVE',
        owner_id INT NULL,
        services_provided TEXT NOT NULL,
        data_handled TEXT NOT NULL,
        risk_classification ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
        contact_email VARCHAR(150) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        UNIQUE KEY uq_tenant_vendor_code (tenant_id, vendor_code),
        INDEX idx_vendor_tenant (tenant_id, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS tprm_assessments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        assessment_number VARCHAR(50) NOT NULL,
        vendor_id INT NOT NULL,
        sensitivity_score INT DEFAULT 0,
        compliance_exposure_score INT DEFAULT 0,
        security_controls_score INT DEFAULT 0,
        vendor_maturity_score INT DEFAULT 0,
        incident_history_score INT DEFAULT 0,
        overall_risk_score INT DEFAULT 0,
        risk_level ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'LOW',
        questionnaire_answers JSON NULL,
        status ENUM('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED') DEFAULT 'DRAFT',
        reviewed_by INT NULL,
        reviewed_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_tenant_tprm_number (tenant_id, assessment_number),
        INDEX idx_tprm_tenant (tenant_id, vendor_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS tprm_findings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        assessment_id INT NOT NULL,
        vendor_id INT NOT NULL,
        finding_title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
        remediation_plan TEXT NOT NULL,
        owner_id INT NULL,
        status ENUM('OPEN', 'IN_PROGRESS', 'CLOSED') DEFAULT 'OPEN',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tprm_finding_tenant (tenant_id, vendor_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 6. Privacy Incident Management Tables
    await connection.query(`
      CREATE TABLE IF NOT EXISTS privacy_incidents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        incident_number VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        discovery_date DATETIME NOT NULL,
        affected_data_categories TEXT NOT NULL,
        affected_subjects_count INT DEFAULT 0,
        severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
        classification VARCHAR(100) DEFAULT 'DATA_LEAK',
        status ENUM('IDENTIFICATION', 'CLASSIFICATION', 'INVESTIGATION', 'CONTAINMENT', 'NOTIFICATION', 'REMEDIATION', 'CLOSED') DEFAULT 'IDENTIFICATION',
        owner_id INT NULL,
        investigation_notes TEXT NULL,
        containment_actions TEXT NULL,
        notification_required BOOLEAN DEFAULT FALSE,
        notification_status VARCHAR(100) DEFAULT 'NOT_REQUIRED',
        closed_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        UNIQUE KEY uq_tenant_incident_number (tenant_id, incident_number),
        INDEX idx_incident_tenant (tenant_id, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS incident_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        incident_id INT NOT NULL,
        previous_status VARCHAR(50),
        new_status VARCHAR(50),
        action VARCHAR(50) NOT NULL,
        performed_by INT NULL,
        performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        INDEX idx_incident_hist_tenant (tenant_id, incident_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 7. Immutable System Audit Log Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS system_audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        user_id INT NULL,
        user_email VARCHAR(150) NULL,
        action VARCHAR(100) NOT NULL,
        module VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100) NULL,
        entity_id INT NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        details JSON NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_sys_audit_tenant (tenant_id, module, action)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('Master BRD Completion Schema Migration executed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

runMigration();
