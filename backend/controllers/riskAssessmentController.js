const riskAssessmentService = require('../services/riskAssessmentService');

const VALID_ASSESSMENT_TYPES = ['INHERENT', 'RESIDUAL', 'TARGET'];
const VALID_RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

async function createAssessment(req, res) {
  try {
    const {
      tenant_id,
      risk_id,
      assessor_id,
      assessment_type,
      likelihood_score,
      impact_score,
      risk_level,
      notes
    } = req.body;

    if (tenant_id !== undefined && tenant_id !== null && Number(tenant_id) !== Number(req.user.tenantId)) {
      return res.status(400).json({ error: 'Tenant ID in request body conflicts with authenticated tenant' });
    }

    const tenantId = Number(req.user.tenantId);

    if (
      risk_id === undefined || risk_id === null ||
      assessor_id === undefined || assessor_id === null ||
      !assessment_type ||
      likelihood_score === undefined || likelihood_score === null ||
      impact_score === undefined || impact_score === null ||
      !risk_level
    ) {
      return res.status(400).json({
        error: 'Missing required fields: risk_id, assessor_id, assessment_type, likelihood_score, impact_score, risk_level'
      });
    }

    if (!VALID_ASSESSMENT_TYPES.includes(assessment_type)) {
      return res.status(400).json({
        error: `Invalid assessment_type. Allowed values: ${VALID_ASSESSMENT_TYPES.join(', ')}`
      });
    }

    if (!VALID_RISK_LEVELS.includes(risk_level)) {
      return res.status(400).json({
        error: `Invalid risk_level. Allowed values: ${VALID_RISK_LEVELS.join(', ')}`
      });
    }

    const likelihoodNum = Number(likelihood_score);
    const impactNum = Number(impact_score);

    if (!Number.isInteger(likelihoodNum) || likelihoodNum < 1 || likelihoodNum > 5) {
      return res.status(400).json({ error: 'likelihood_score must be an integer between 1 and 5' });
    }

    if (!Number.isInteger(impactNum) || impactNum < 1 || impactNum > 5) {
      return res.status(400).json({ error: 'impact_score must be an integer between 1 and 5' });
    }

    const created = await riskAssessmentService.createAssessment({
      tenant_id: tenantId,
      risk_id: Number(risk_id),
      assessor_id: Number(assessor_id),
      assessment_type,
      likelihood_score: likelihoodNum,
      impact_score: impactNum,
      risk_level,
      notes
    });

    return res.status(201).json({
      message: 'Risk assessment created successfully',
      data: created
    });

  } catch (error) {
    if (error.code === 'ERR_RISK_NOT_FOUND' || error.code === 'ERR_ASSESSOR_NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }
    console.error('Error creating risk assessment:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getAssessmentsByRisk(req, res) {
  try {
    const { riskId } = req.params;
    const tenantId = Number(req.user.tenantId);

    const assessments = await riskAssessmentService.getAssessmentsByRisk(riskId, tenantId);
    if (assessments === null) {
      return res.status(404).json({ error: 'Risk not found or does not belong to specified tenant' });
    }

    return res.status(200).json({ data: assessments });
  } catch (error) {
    console.error('Error fetching assessments by risk:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getAssessmentById(req, res) {
  try {
    const { id } = req.params;
    const tenantId = Number(req.user.tenantId);

    const assessment = await riskAssessmentService.getAssessmentById(id, tenantId);
    if (!assessment) {
      return res.status(404).json({ error: 'Risk assessment not found' });
    }

    return res.status(200).json({ data: assessment });
  } catch (error) {
    console.error('Error fetching assessment by ID:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getMatrixData(req, res) {
  try {
    const tenantId = Number(req.user.tenantId);
    const data = await riskAssessmentService.getLatestAssessmentsByTenant(tenantId);
    return res.status(200).json({ data });
  } catch (error) {
    console.error('Error fetching matrix data:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  createAssessment,
  getAssessmentsByRisk,
  getAssessmentById,
  getMatrixData
};
