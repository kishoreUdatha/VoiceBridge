import { Router } from 'express';
import { body } from 'express-validator';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate';
import { authenticate } from '../middlewares/auth';
import { rateLimiters } from '../services/rate-limit.service';

const router = Router();

// Validation rules
const registerValidation = [
  body('organizationName')
    .trim()
    .notEmpty()
    .withMessage('Organization name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Organization name must be between 2 and 100 characters'),
  body('organizationSlug')
    .trim()
    .notEmpty()
    .withMessage('Organization slug is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Organization slug must be between 2 and 50 characters')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Organization slug can only contain lowercase letters, numbers, and hyphens'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('phone').optional().trim().isMobilePhone('any').withMessage('Invalid phone number'),
  body('planId')
    .optional()
    .isIn(['free', 'starter', 'growth', 'business', 'enterprise'])
    .withMessage('Invalid plan selected'),
];

const loginValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

// refreshToken validation removed - tokens are now in httpOnly cookies
// The controller handles both cookie and body (for backward compatibility)

const forgotPasswordValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
];

const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
];

// Routes
router.post('/register', rateLimiters.authRegister, validate(registerValidation), authController.register.bind(authController));
router.post('/login', validate(loginValidation), authController.login.bind(authController));
router.post('/refresh-token', authController.refreshToken.bind(authController));
router.post('/logout', authenticate, authController.logout.bind(authController));
router.post('/forgot-password', rateLimiters.authPasswordReset, validate(forgotPasswordValidation), authController.forgotPassword.bind(authController));
router.post('/reset-password', rateLimiters.authPasswordReset, validate(resetPasswordValidation), authController.resetPassword.bind(authController));
router.post('/change-password', authenticate, validate(changePasswordValidation), authController.changePassword.bind(authController));
router.get('/me', authenticate, authController.me.bind(authController));

export default router;
