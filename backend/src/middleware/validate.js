const { ZodError } = require('zod');

const validateRequest = (schema) => {
  return async (req, res, next) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorDetails = error.errors.map((e) => e.message).join('. ');
        res.status(400).json({
          success: false,
          message: errorDetails ? `Validation failed: ${errorDetails}` : 'Validation failed for submitted request data.',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
};

module.exports = {
  validateRequest,
};
