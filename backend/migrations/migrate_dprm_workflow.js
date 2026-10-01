const pool = require('../config/database');

async function migrateDPRMWorkflow() {
  console.log('=== STARTING DPRM WORKFLOW DATABASE MIGRATION ===\n');

  const connection = await pool.getConnection();

  try {
    // 1. Create dsr_history table for immutable state transition audit logging
    console.log('1. Creating `dsr_history` table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS dsr_history (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        tenant_id BIGINT UNSIGNED NOT NULL,
        dsr_id BIGINT UNSIGNED NOT NULL,
        previous_status VARCHAR(50) NOT NULL,
        new_status VARCHAR(50) NOT NULL,
        action VARCHAR(100) NOT NULL,
        performed_by BIGINT UNSIGNED NULL,
        performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT NULL,
        metadata JSON NULL,
        CONSTRAINT fk_dsr_history_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT fk_dsr_history_dsr FOREIGN KEY (dsr_id) REFERENCES data_subject_requests(id) ON DELETE CASCADE,
        CONSTRAINT fk_dsr_history_performer FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_dsr_history_dsr (tenant_id, dsr_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ `dsr_history` table created or verified.');

    // 2. Modify data_subject_requests table to add ENUM values and workflow columns
    console.log('\n2. Modifying `data_subject_requests` table schema for DPRM 7-stage workflow...');

    // Alter request_type ENUM safely
    await connection.query(`
      ALTER TABLE data_subject_requests 
      MODIFY COLUMN request_type ENUM(
        'ACCESS',
        'CORRECTION',
        'RECTIFICATION',
        'ERASURE',
        'CONSENT_WITHDRAWAL',
        'GRIEVANCE',
        'RESTRICTION',
        'PORTABILITY',
        'OBJECTION'
      ) NOT NULL DEFAULT 'ACCESS';
    `);
    console.log('✓ `request_type` ENUM expanded with BRD rights (ACCESS, CORRECTION, ERASURE, CONSENT_WITHDRAWAL, GRIEVANCE).');

    // Alter status ENUM safely
    await connection.query(`
      ALTER TABLE data_subject_requests 
      MODIFY COLUMN status ENUM(
        'SUBMITTED',
        'RECEIVED',
        'IDENTITY_VERIFICATION',
        'IN_REVIEW',
        'CASE_ASSIGNED',
        'IN_PROGRESS',
        'DATA_COLLECTION',
        'APPROVAL_PENDING',
        'RESPONSE_GENERATION',
        'CLOSED',
        'COMPLETED',
        'REJECTED',
        'CANCELLED'
      ) NOT NULL DEFAULT 'SUBMITTED';
    `);
    console.log('✓ `status` ENUM expanded with 7-stage workflow stages.');

    // Helper to add column if missing
    async function addColumnIfMissing(colName, colDef) {
      const [cols] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'data_subject_requests' 
          AND COLUMN_NAME = '${colName}'
      `);
      if (cols.length === 0) {
        await connection.query(`ALTER TABLE data_subject_requests ADD COLUMN ${colName} ${colDef};`);
        console.log(`  + Added column \`${colName}\``);
      } else {
        console.log(`  ✓ Column \`${colName}\` already exists`);
      }
    }

    await addColumnIfMissing('verification_status', "ENUM('NOT_STARTED', 'PENDING', 'VERIFIED', 'FAILED') NOT NULL DEFAULT 'NOT_STARTED'");
    await addColumnIfMissing('verified_by', "BIGINT UNSIGNED NULL");
    await addColumnIfMissing('verified_at', "DATETIME NULL");
    await addColumnIfMissing('verification_notes', "TEXT NULL");
    await addColumnIfMissing('data_collection_notes', "TEXT NULL");
    await addColumnIfMissing('data_collected_at', "DATETIME NULL");
    await addColumnIfMissing('approval_status', "ENUM('NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'NOT_STARTED'");
    await addColumnIfMissing('approved_by', "BIGINT UNSIGNED NULL");
    await addColumnIfMissing('approved_at', "DATETIME NULL");
    await addColumnIfMissing('approval_notes', "TEXT NULL");
    await addColumnIfMissing('response_summary', "TEXT NULL");
    await addColumnIfMissing('response_file_name', "VARCHAR(255) NULL");

    // Foreign keys for verified_by and approved_by
    const [fkVerified] = await connection.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'data_subject_requests' 
        AND CONSTRAINT_NAME = 'fk_dsr_verified_by'
    `);
    if (fkVerified.length === 0) {
      await connection.query(`
        ALTER TABLE data_subject_requests 
        ADD CONSTRAINT fk_dsr_verified_by FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL;
      `);
      console.log('✓ Added FK `fk_dsr_verified_by`');
    }

    const [fkApproved] = await connection.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'data_subject_requests' 
        AND CONSTRAINT_NAME = 'fk_dsr_approved_by'
    `);
    if (fkApproved.length === 0) {
      await connection.query(`
        ALTER TABLE data_subject_requests 
        ADD CONSTRAINT fk_dsr_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;
      `);
      console.log('✓ Added FK `fk_dsr_approved_by`');
    }

    console.log('\n✅ DPRM WORKFLOW DATABASE MIGRATION COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('\n❌ MIGRATION FAILED:', err);
    process.exit(1);
  } finally {
    connection.release();
    process.exit(0);
  }
}

migrateDPRMWorkflow();
