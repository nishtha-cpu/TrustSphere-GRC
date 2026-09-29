const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const pool = require('./config/database');
const riskRoutes = require('./routes/riskRoutes');
const riskAssessmentRoutes = require('./routes/riskAssessmentRoutes');
const auditRoutes = require('./routes/auditRoutes');
const auditTeamRoutes = require('./routes/auditTeamRoutes');
const auditFindingRoutes = require('./routes/auditFindingRoutes');
const capaRoutes = require('./routes/capaRoutes');
const evidenceRoutes = require('./routes/evidenceRoutes');
const policyRoutes = require('./routes/policyRoutes');
const policyVersionRoutes = require('./routes/policyVersionRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const consentRoutes = require('./routes/consentRoutes');
const dsrRoutes = require('./routes/dsrRoutes');

const app = express();
const PORT = 5000;

// Middleware to parse JSON request bodies
app.use(express.json());

// Health Check Route
app.get('/', (req, res) => {
  res.json({ message: 'TrustSphere backend is running' });
});

// Authentication API Routes
app.use('/api/auth', authRoutes);

// User & Role Management API Routes
app.use('/api', userRoutes);

// Consent & DSR Privacy Management API Routes
app.use('/api', consentRoutes);
app.use('/api', dsrRoutes);

// Risk Register API Routes
app.use('/api/risks', riskRoutes);



// Risk Assessment API Routes
app.use('/api/risk-assessments', riskAssessmentRoutes);

// Audit Management API Routes
app.use('/api/audits', auditRoutes);
app.use('/api/audits', auditTeamRoutes);
app.use('/api', auditFindingRoutes);
app.use('/api', capaRoutes);
app.use('/api', evidenceRoutes);

// Policy Management API Routes
app.use('/api/policies', policyRoutes);
app.use('/api/policy-versions', policyVersionRoutes);

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  try {
    const connection = await pool.getConnection();
    console.log('MySQL connected successfully');
    connection.release();
  } catch (error) {
    console.error('MySQL connection failed:', error.message);
  }
});
