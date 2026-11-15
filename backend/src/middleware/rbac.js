const requireAuth = (req, res, next) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required. Please sign in to continue.',
    });
    return;
  }
  next();
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please sign in to continue.',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: This resource requires one of the following roles: ${roles.join(', ')}.`,
      });
      return;
    }

    next();
  };
};

const requireVerifiedProvider = (req, res, next) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
    return;
  }

  if (req.user.role !== 'SERVICE_PROVIDER') {
    res.status(403).json({
      success: false,
      message: 'Forbidden: Only service providers can access this feature.',
    });
    return;
  }

  if (!req.user.isVerified) {
    res.status(403).json({
      success: false,
      message: 'Your service provider account is pending administrative verification. You will be able to perform this action once verified.',
      verificationPending: true,
    });
    return;
  }

  next();
};

const requireOnboarded = (req, res, next) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
    return;
  }

  if (!req.user.isOnboarded) {
    res.status(403).json({
      success: false,
      message: 'Please complete your initial role onboarding first.',
      needsOnboarding: true,
    });
    return;
  }

  next();
};

module.exports = {
  requireAuth,
  requireRole,
  requireVerifiedProvider,
  requireOnboarded,
};
