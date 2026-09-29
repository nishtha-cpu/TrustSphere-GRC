const consentService = require('../services/consentService');

/**
 * ==========================================
 * CONSENT PURPOSES CONTROLLER
 * ==========================================
 */

async function getConsentPurposes(req, res) {
  try {
    const filters = {
      includeInactive: req.query.include_inactive === 'true',
      status: req.query.status,
      legal_basis: req.query.legal_basis,
      search: req.query.search
    };
    const purposes = await consentService.getConsentPurposes(req.user.tenantId, filters);
    return res.status(200).json({ data: purposes });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Error fetching consent purposes:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getConsentPurposeById(req, res) {
  try {
    const { id } = req.params;
    const purpose = await consentService.getConsentPurposeById(req.user.tenantId, id);
    if (!purpose) {
      return res.status(404).json({ error: 'Consent purpose not found' });
    }
    return res.status(200).json({ data: purpose });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Error fetching consent purpose by ID:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createConsentPurpose(req, res) {
  try {
    const purpose = await consentService.createConsentPurpose(req.user.tenantId, req.body);
    return res.status(201).json({
      message: 'Consent purpose created successfully',
      data: purpose
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Error creating consent purpose:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateConsentPurpose(req, res) {
  try {
    const { id } = req.params;
    const updated = await consentService.updateConsentPurpose(req.user.tenantId, id, req.body);
    return res.status(200).json({
      message: 'Consent purpose updated successfully',
      data: updated
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Error updating consent purpose:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteConsentPurpose(req, res) {
  try {
    const { id } = req.params;
    const result = await consentService.deleteConsentPurpose(req.user.tenantId, id);
    return res.status(200).json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Error deleting consent purpose:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * ==========================================
 * CONSENT RECORDS CONTROLLER
 * ==========================================
 */

async function getConsents(req, res) {
  try {
    const filters = {
      purpose_id: req.query.purpose_id,
      status: req.query.status,
      data_subject_identifier: req.query.data_subject_identifier,
      user_id: req.query.user_id,
      search: req.query.search
    };
    const consents = await consentService.getConsents(req.user.tenantId, filters);
    return res.status(200).json({ data: consents });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Error fetching consent records:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getConsentById(req, res) {
  try {
    const { id } = req.params;
    const consent = await consentService.getConsentById(req.user.tenantId, id);
    if (!consent) {
      return res.status(404).json({ error: 'Consent record not found' });
    }
    return res.status(200).json({ data: consent });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Error fetching consent record by ID:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createConsentRecord(req, res) {
  try {
    const reqContext = {
      ip: req.ip || req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent']
    };

    const consent = await consentService.createConsentRecord(
      req.user.userId,
      req.user.tenantId,
      req.body,
      reqContext
    );

    return res.status(201).json({
      message: 'Consent decision recorded successfully',
      data: consent
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Error creating consent record:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function withdrawConsent(req, res) {
  try {
    const { id } = req.params;
    const reqContext = {
      ip: req.ip || req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent']
    };

    const withdrawnConsent = await consentService.withdrawConsent(
      req.user.userId,
      req.user.tenantId,
      id,
      req.body,
      reqContext
    );

    return res.status(200).json({
      message: 'Consent withdrawn successfully',
      data: withdrawnConsent
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Error withdrawing consent:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * ==========================================
 * CONSENT HISTORY CONTROLLER (READ ONLY)
 * ==========================================
 */

async function getConsentHistory(req, res) {
  try {
    const { id } = req.params;
    const history = await consentService.getConsentHistory(req.user.tenantId, id);
    return res.status(200).json({ data: history });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Error fetching consent history:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getConsentPurposes,
  getConsentPurposeById,
  createConsentPurpose,
  updateConsentPurpose,
  deleteConsentPurpose,
  getConsents,
  getConsentById,
  createConsentRecord,
  withdrawConsent,
  getConsentHistory
};
