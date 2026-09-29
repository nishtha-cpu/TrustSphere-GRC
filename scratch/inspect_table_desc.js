const mysql = require('c:/Users/CloudWire/Desktop/TrustSphere-GRC/backend/node_modules/mysql2/promise');
require('c:/Users/CloudWire/Desktop/TrustSphere-GRC/backend/node_modules/dotenv').config({ path: 'c:/Users/CloudWire/Desktop/TrustSphere-GRC/backend/.env' });

async function inspectTables() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trustsphere'
  });

  const [tCols] = await db.query('DESCRIBE tenants');
  console.log('--- tenants schema ---', tCols.map(c => ({ Field: c.Field, Type: c.Type })));

  const [uCols] = await db.query('DESCRIBE users');
  console.log('--- users schema ---', uCols.map(c => ({ Field: c.Field, Type: c.Type })));

  await db.end();
}

inspectTables();
