const { body, param, query, validationResult } = require('express-validator');

// Middleware to check validation results
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Validation rules
const registerValidation = [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().notEmpty(),
    body('roleName').isIn(['ADMIN', 'GUARDIAN', 'STUDENT', 'VENDOR']),
    validate
];

const loginValidation = [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    validate
];

const addMoneyValidation = [
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
    validate
];

const payVendorValidation = [
    body('vendorId').isUUID(),
    body('amount').isFloat({ min: 0.01 }),
    body('description').optional().trim(),
    validate
];

const createRequestValidation = [
    body('amount').isFloat({ min: 0.01 }),
    body('reason').trim().notEmpty(),
    validate
];

const uuidParamValidation = [
    param('id').isUUID(),
    validate
];

const transferMoneyValidation = [
    body('studentId').isUUID(),
    body('amount').isFloat({ min: 0.01 }),
    body('description').optional().trim(),
    validate
];

const walletRuleValidation = [
    body('walletId').isUUID(),
    body('dailyLimit').optional().isFloat({ min: 0 }),
    body('allowedVendors').optional().isArray(),
    body('active').optional().isBoolean(),
    validate
];

module.exports = {
    validate,
    registerValidation,
    loginValidation,
    addMoneyValidation,
    payVendorValidation,
    createRequestValidation,
    uuidParamValidation,
    transferMoneyValidation,
    walletRuleValidation
};
