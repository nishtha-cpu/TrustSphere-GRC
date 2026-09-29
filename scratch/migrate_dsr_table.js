const mysql = require('c:/Users/CloudWire/Desktop/TrustSphere-GRC/backend/node_modules/mysql2/promise');
require('c:/Users/CloudWire/Desktop/TrustSphere-GRC/backend/node_modules/dotenv').config({ path: 'c:/Users/CloudWire/Desktop/TrustSphere-GRC/backend/.env' });

async function migrateDSRTable() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trustsphere'
  });

  try {
    console.log('--- Migrating DSR Table: data_subject_requests ---');

    await db.query(`
      CREATE TABLE IF NOT EXISTS data_subject_requests (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        tenant_id BIGINT UNSIGNED NOT NULL,
        request_reference VARCHAR(50) NOT NULL,
        data_subject_identifier VARCHAR(255) NOT NULL,
        user_id BIGINT UNSIGNED NULL,
        request_type ENUM('ACCESS', 'RECTIFICATION', 'ERASURE', 'RESTRICTION', 'PORTABILITY', 'OBJECTION') NOT NULL,
        status ENUM('RECEIVED', 'IN_REVIEW', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'RECEIVED',
        description TEXT NULL,
        received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        due_at DATETIME NULL,
        completed_at DATETIME NULL,
        assigned_to BIGINT UNSIGNED NULL,
        resolution_notes TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        CONSTRAINT fk_dsr_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT fk_dsr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_dsr_assigned FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT uk_dsr_tenant_ref UNIQUE (tenant_id, request_reference),
        INDEX idx_dsr_tenant_status (tenant_id, status),
        INDEX idx_dsr_tenant_type (tenant_id, request_type),
        INDEX idx_dsr_subject (tenant_id, data_subject_identifier)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ Table data_subject_requests created / verified successfully.');
    await db.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    if (db) await db.end();
    process.exit(1);
  }
}

migrateDSRTable();
