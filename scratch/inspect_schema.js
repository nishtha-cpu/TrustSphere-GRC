const pool = require('../backend/config/database');

async function inspect() {
  const [tenantCols] = await pool.query(`DESCRIBE tenants`);
  console.log('--- TENANTS ---');
  console.log(tenantCols.map(c => ({ Field: c.Field, Type: c.Type })));

  const [userCols] = await pool.query(`DESCRIBE users`);
  console.log('--- USERS ---');
  console.log(userCols.map(c => ({ Field: c.Field, Type: c.Type })));

  const [auditCols] = await pool.query(`DESCRIBE audits`);
  console.log('--- AUDITS ---');
  console.log(auditCols.map(c => ({ Field: c.Field, Type: c.Type })));

  process.exit(0);
}

inspect();
