const config = require("../config");

/**
 * Effective allowed domains for a user, mirroring the resolution logic in
 * validationMiddleware.validateEmailId:
 *   - "*"            -> the global configured list
 *   - array          -> that array
 *   - other string   -> single-domain list
 *   - unset          -> the global configured list
 */
const resolveDomainsForUser = (user) => {
  const userAllowedDomains = user && user.allowedDomains;
  if (Array.isArray(userAllowedDomains)) {
    return userAllowedDomains;
  }
  if (typeof userAllowedDomains === "string" && userAllowedDomains !== "*" && userAllowedDomains.length > 0) {
    return [userAllowedDomains];
  }
  return config.allowedDomains;
};

const configController = {
  // GET /api/config - client-facing runtime config (authenticated, any role).
  // Used by the frontend for per-email expiry countdowns and the domain picker.
  getConfig: (req, res) => {
    res.status(200).json({
      retentionDays: config.emailRetentionDays,
      domains: resolveDomainsForUser(req.user),
    });
  },
};

module.exports = { configController, resolveDomainsForUser };
