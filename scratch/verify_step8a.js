const pool = require('../backend/config/database');
const http = require('http');

function request(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function verifyStep8a() {
  console.log('=== STEP 8A POLICY SCHEMA & REGRESSION VERIFICATION ===\n');

  try {
    // 1. Inspect `policies` schema
    console.log('1. Inspecting `policies` table schema...');
    const [policyCols] = await pool.query('DESCRIBE policies');
    console.log(`Columns count: ${policyCols.length}`);
    const colNames = policyCols.map(c => c.Field);
    console.log('Columns:', colNames.join(', '));

    const requiredPolicyFields = [
      'id', 'tenant_id', 'policy_code', 'title', 'description', 'policy_type',
      'owner_id', 'status', 'current_version_id', 'review_date', 'effective_date',
      'expiry_date', 'created_at', 'updated_at', 'deleted_at'
    ];
    const missingPolicyFields = requiredPolicyFields.filter(f => !colNames.includes(f));
    if (missingPolicyFields.length > 0) {
      throw new Error(`Missing required fields in policies table: ${missingPolicyFields.join(', ')}`);
    }

    // 2. Inspect `policy_versions` schema
    console.log('\n2. Inspecting `policy_versions` table schema...');
    const [versionCols] = await pool.query('DESCRIBE policy_versions');
    console.log(`Columns count: ${versionCols.length}`);
    const versionColNames = versionCols.map(c => c.Field);
    console.log('Columns:', versionColNames.join(', '));

    const requiredVersionFields = [
      'id', 'tenant_id', 'policy_id', 'version_number', 'version_label', 'content',
      'change_summary', 'created_by', 'reviewed_by', 'approved_by', 'approved_at',
      'published_at', 'created_at', 'updated_at', 'deleted_at'
    ];
    const missingVersionFields = requiredVersionFields.filter(f => !versionColNames.includes(f));
    if (missingVersionFields.length > 0) {
      throw new Error(`Missing required fields in policy_versions table: ${missingVersionFields.join(', ')}`);
    }

    // 3. Inspect Foreign Keys and Unique Constraints
    console.log('\n3. Inspecting Constraints and Unique Keys...');
    const [fkRows] = await pool.query(`
      SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('policies', 'policy_versions')
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    console.log(`Foreign Keys count: ${fkRows.length}`);
    fkRows.forEach(fk => {
      console.log(`  - ${fk.TABLE_NAME}.${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME} (${fk.CONSTRAINT_NAME})`);
    });

    const [ukRows] = await pool.query(`
      SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('policies', 'policy_versions')
        AND CONSTRAINT_NAME LIKE 'uk_%'
    `);
    console.log(`Unique Constraints count: ${ukRows.length}`);
    ukRows.forEach(uk => {
      console.log(`  - ${uk.TABLE_NAME}.${uk.COLUMN_NAME} (${uk.CONSTRAINT_NAME})`);
    });

    // 4. Verify No Dummy Data Was Inserted
    console.log('\n4. Verifying zero rows (no dummy data)...');
    const [[{ policyCount }]] = await pool.query('SELECT COUNT(*) AS policyCount FROM policies');
    const [[{ versionCount }]] = await pool.query('SELECT COUNT(*) AS versionCount FROM policy_versions');
    console.log(`policies count: ${policyCount}, policy_versions count: ${versionCount}`);
    if (policyCount !== 0 || versionCount !== 0) {
      throw new Error('Dummy data detected in policy tables!');
    }

    // 5. System Regression Check on Existing Modules
    console.log('\n5. Running regression checks on existing backend APIs...');
    const risksRes = await request({ hostname: 'localhost', port: 5000, path: '/api/risks?tenant_id=1', method: 'GET' });
    const matrixRes = await request({ hostname: 'localhost', port: 5000, path: '/api/risk-assessments/matrix?tenant_id=1', method: 'GET' });
    const auditsRes = await request({ hostname: 'localhost', port: 5000, path: '/api/audits?tenant_id=1', method: 'GET' });

    console.log(`- Risk Register API: Status ${risksRes.status}`);
    console.log(`- Risk Matrix API: Status ${matrixRes.status}`);
    console.log(`- Audits API: Status ${auditsRes.status}`);

    if (risksRes.status === 200 && matrixRes.status === 200 && auditsRes.status === 200) {
      console.log('\n✅ STEP 8A POLICY DATABASE SCHEMA & REGRESSION VERIFICATION PASSED!');
    } else {
      throw new Error('Regression failure detected in existing APIs!');
    }

  } catch (err) {
    console.error('\n❌ VERIFICATION FAILED:', err.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

verifyStep8a();
