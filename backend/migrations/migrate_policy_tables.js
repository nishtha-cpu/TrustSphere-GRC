const pool = require('../config/database');

async function migratePolicyTables() {
  console.log('=== STARTING POLICY MANAGEMENT DATABASE MIGRATION (STEP 8A) ===\n');

  const connection = await pool.getConnection();

  try {
    // 1. Create policies table (without foreign key to policy_versions to prevent circular dependency during creation)
    console.log('1. Creating `policies` table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS policies (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        tenant_id BIGINT UNSIGNED NOT NULL,
        policy_code VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        policy_type ENUM(
          'INFORMATION_SECURITY',
          'PRIVACY',
          'ACCESS_CONTROL',
          'INCIDENT_RESPONSE',
          'BUSINESS_CONTINUITY',
          'DATA_RETENTION',
          'ACCEPTABLE_USE',
          'THIRD_PARTY',
          'OTHER'
        ) NOT NULL DEFAULT 'INFORMATION_SECURITY',
        owner_id BIGINT UNSIGNED NOT NULL,
        status ENUM(
          'DRAFT',
          'UNDER_REVIEW',
          'APPROVED',
          'PUBLISHED',
          'ARCHIVED'
        ) NOT NULL DEFAULT 'DRAFT',
        current_version_id BIGINT UNSIGNED NULL,
        review_date DATE NULL,
        effective_date DATE NULL,
        expiry_date DATE NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        CONSTRAINT fk_policies_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
        CONSTRAINT fk_policies_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT,
        CONSTRAINT uk_policies_tenant_code UNIQUE (tenant_id, policy_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ `policies` table created or already exists.');

    // 2. Create policy_versions table
    console.log('\n2. Creating `policy_versions` table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS policy_versions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        tenant_id BIGINT UNSIGNED NOT NULL,
        policy_id BIGINT UNSIGNED NOT NULL,
        version_number INT NOT NULL DEFAULT 1,
        version_label VARCHAR(20) NOT NULL DEFAULT '1.0',
        content LONGTEXT NOT NULL,
        change_summary TEXT,
        created_by BIGINT UNSIGNED NOT NULL,
        reviewed_by BIGINT UNSIGNED NULL,
        approved_by BIGINT UNSIGNED NULL,
        approved_at DATETIME NULL,
        published_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        CONSTRAINT fk_policy_versions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
        CONSTRAINT fk_policy_versions_policy FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE CASCADE,
        CONSTRAINT fk_policy_versions_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
        CONSTRAINT fk_policy_versions_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE RESTRICT,
        CONSTRAINT fk_policy_versions_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE RESTRICT,
        CONSTRAINT uk_policy_versions_tenant_policy_version UNIQUE (tenant_id, policy_id, version_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ `policy_versions` table created or already exists.');

    // 3. Add current_version_id foreign key constraint to policies table safely
    console.log('\n3. Checking and adding foreign key `fk_policies_current_version` on `policies.current_version_id`...');
    const [fkCheck] = await connection.query(`
      SELECT CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'policies'
        AND CONSTRAINT_NAME = 'fk_policies_current_version'
    `);

    if (fkCheck.length === 0) {
      await connection.query(`
        ALTER TABLE policies
        ADD CONSTRAINT fk_policies_current_version
        FOREIGN KEY (current_version_id) REFERENCES policy_versions(id)
        ON DELETE SET NULL;
      `);
      console.log('✓ Added foreign key `fk_policies_current_version`.');
    } else {
      console.log('✓ Foreign key `fk_policies_current_version` already exists.');
    }

    // 4. Create performance indexes
    console.log('\n4. Creating database performance indexes...');
    const indexesToCreate = [
      { name: 'idx_policies_tenant_status', table: 'policies', cols: '(tenant_id, status)' },
      { name: 'idx_policies_tenant_type', table: 'policies', cols: '(tenant_id, policy_type)' },
      { name: 'idx_policies_owner', table: 'policies', cols: '(owner_id)' },
      { name: 'idx_policies_review_date', table: 'policies', cols: '(review_date)' },
      { name: 'idx_policies_deleted_at', table: 'policies', cols: '(deleted_at)' },
      { name: 'idx_policy_versions_policy_tenant', table: 'policy_versions', cols: '(tenant_id, policy_id)' },
      { name: 'idx_policy_versions_deleted_at', table: 'policy_versions', cols: '(deleted_at)' }
    ];

    for (const idx of indexesToCreate) {
      const [idxRows] = await connection.query(`
        SELECT INDEX_NAME 
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = '${idx.table}' 
          AND INDEX_NAME = '${idx.name}'
      `);

      if (idxRows.length === 0) {
        await connection.query(`CREATE INDEX ${idx.name} ON ${idx.table} ${idx.cols};`);
        console.log(`✓ Index \`${idx.name}\` created on \`${idx.table}\`.`);
      } else {
        console.log(`✓ Index \`${idx.name}\` already exists.`);
      }
    }

    console.log('\n✅ POLICY MANAGEMENT MIGRATION COMPLETED SUCCESSFULLY!');

  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error);
    process.exit(1);
  } finally {
    connection.release();
    process.exit(0);
  }
}

migratePolicyTables();
