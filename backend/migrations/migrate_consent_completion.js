const pool = require('../config/database');

async function migrateConsentCompletion() {
  console.log('=== STARTING CONSENT COMPLETION DATABASE MIGRATION ===\n');

  const connection = await pool.getConnection();

  try {
    // 1. Expand consent_records status ENUM to include 'EXPIRED'
    console.log('1. Expanding `consent_records.status` ENUM to include EXPIRED...');
    await connection.query(`
      ALTER TABLE consent_records
      MODIFY COLUMN status ENUM('GRANTED', 'DENIED', 'WITHDRAWN', 'EXPIRED') NOT NULL DEFAULT 'GRANTED';
    `);
    console.log('✓ `consent_records.status` ENUM expanded successfully.');

    // 2. Expand consent_history action ENUM / VARCHAR to support CONSENT_RENEWED & CONSENT_EXPIRED
    console.log('\n2. Verifying `consent_history` schema for lifecycle actions...');
    await connection.query(`
      ALTER TABLE consent_history
      MODIFY COLUMN action VARCHAR(100) NOT NULL;
    `);
    console.log('✓ `consent_history.action` updated to support CONSENT_RENEWED & CONSENT_EXPIRED.');

    // 3. Add performance index on expires_at and status
    console.log('\n3. Creating performance index for consent monitoring and expiry scanning...');
    const [idxCheck] = await connection.query(`
      SELECT INDEX_NAME 
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'consent_records' 
        AND INDEX_NAME = 'idx_consent_tenant_expiry'
    `);

    if (idxCheck.length === 0) {
      await connection.query(`
        CREATE INDEX idx_consent_tenant_expiry ON consent_records (tenant_id, status, expires_at);
      `);
      console.log('✓ Index `idx_consent_tenant_expiry` created.');
    } else {
      console.log('✓ Index `idx_consent_tenant_expiry` already exists.');
    }

    console.log('\n✅ CONSENT COMPLETION MIGRATION COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('\n❌ MIGRATION FAILED:', err);
    process.exit(1);
  } finally {
    connection.release();
    process.exit(0);
  }
}

migrateConsentCompletion();
