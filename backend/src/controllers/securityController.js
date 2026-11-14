
const securityService = require('../services/securityService');

// ============================================================
// GET SECURITY OVERVIEW
// Only authorized administrators can access this information.
// ============================================================

async function overview(req, res, next) {
    try {
        const result = await securityService.getSecurityOverview(
            req.user.user_id,
            req.authSessionId
        );

        if (!result.currentSession ||
            result.currentSession.status !== 'ACTIVE') {
            return res.status(401).json({
                message: 'The current session is not active.'
            });
        }

        return res.json(result);
    } catch (error) {
        next(error);
    }
}

module.exports = {
    overview
};
