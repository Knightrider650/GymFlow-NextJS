const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'gymflow_secret_key_2026';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'gymflow_refresh_secret_99';

const PLATFORM_ROLES = new Set(['cto', 'ceo', 'admin']);

const resolveScope = (user = {}) => {
  if (user.scope === 'platform' || user.scope === 'tenant') {
    return user.scope;
  }

  return PLATFORM_ROLES.has(user.role) ? 'platform' : 'tenant';
};

const resolveTenantId = (user = {}) => {
  return user.tenantId || user.tenant_id || user.gymId || user.gym_id || null;
};

/**
 * Authentication Middleware
 * Validates the Bearer token in the Authorization header.
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      ...decoded,
      scope: resolveScope(decoded),
      tenantId: resolveTenantId(decoded),
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Role-Based Access Control Middleware
 * @param {string[]} roles - Array of allowed roles
 */
const authorizeRoles = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

const authorizeScope = (scope) => {
  return (req, res, next) => {
    if (!req.user || resolveScope(req.user) !== scope) {
      return res.status(403).json({ error: 'Forbidden: Invalid access scope' });
    }
    next();
  };
};

const authorizePlatform = authorizeScope('platform');
const authorizeTenant = authorizeScope('tenant');

/**
 * Generate Access Token (Short-lived)
 */
const generateToken = (user) => {
  const scope = resolveScope(user);
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      scope,
      tenantId: resolveTenantId(user),
      gymId: user.gymId || user.gym_id || null,
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
};

/**
 * Generate Refresh Token (Long-lived)
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id, type: 'refresh' },
    REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Verify Refresh Token
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (err) {
    return null;
  }
};

module.exports = {
  authMiddleware,
  authorizeRoles,
  authorizeScope,
  authorizePlatform,
  authorizeTenant,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken
};
