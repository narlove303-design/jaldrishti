import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { db } from '../db.js';
import { JWT_SECRET, JWT_EXPIRES_IN, authenticateToken, recordAudit } from '../middleware/auth.js';
import { authRateLimiter, otpRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * In-memory stores for OTPs with expiration and attempt limiting
 * registrationOtps: contact -> { code, expiresAt, attempts, maxAttempts, pendingUser }
 * passwordResetOtps: contact -> { code, expiresAt, attempts, maxAttempts, userId }
 */
const registrationOtps = new Map();
const passwordResetOtps = new Map();

/**
 * Helper to generate a secure 6-digit numerical OTP
 */
function generateSecureOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Clean up expired OTPs periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of registrationOtps.entries()) {
    if (now > v.expiresAt) registrationOtps.delete(k);
  }
  for (const [k, v] of passwordResetOtps.entries()) {
    if (now > v.expiresAt) passwordResetOtps.delete(k);
  }
}, 60 * 1000).unref();

/**
 * POST /api/auth/login
 * User login with email or mobile and password
 */
router.post('/login', authRateLimiter, (req, res) => {
  const { email_or_mobile, password } = req.body;

  if (!email_or_mobile || !password) {
    return res.status(400).json({ error: 'Please enter your email/mobile and password.' });
  }

  const cleanContact = String(email_or_mobile).trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE LOWER(email_or_mobile) = ?').get(cleanContact);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials. User not found.' });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid credentials. Incorrect password.' });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, village: user.village },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  recordAudit(user.name, user.role, 'USER_LOGIN', 'Authentication', `Logged in successfully from ${req.ip || '127.0.0.1'}`);

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      name: user.name,
      email_or_mobile: user.email_or_mobile,
      role: user.role,
      village: user.village
    }
  });
});

/**
 * POST /api/auth/register
 * Step 1 of resident registration: generates dynamic cryptographically secure OTP
 */
router.post('/register', otpRateLimiter, (req, res) => {
  const { name, email_or_mobile, password, village } = req.body;

  if (!name || !email_or_mobile || !password || !village) {
    return res.status(400).json({ error: 'All fields (name, email/mobile, password, village) are required.' });
  }

  const cleanName = String(name).trim();
  const cleanContact = String(email_or_mobile).trim().toLowerCase();
  const cleanPass = String(password);

  if (cleanPass.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  if (!['Village A', 'Village B', 'Village C'].includes(village)) {
    return res.status(400).json({ error: 'Please select a valid village (Village A, Village B, or Village C).' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email_or_mobile) = ?').get(cleanContact);
  if (existing) {
    return res.status(400).json({ error: 'An account with this email/mobile already exists.' });
  }

  // Generate dynamic 6-digit cryptographically secure OTP
  const dynamicOtp = generateSecureOtp();
  registrationOtps.set(cleanContact, {
    code: dynamicOtp,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    attempts: 0,
    maxAttempts: 5,
    pendingUser: {
      name: cleanName,
      email_or_mobile: cleanContact,
      password_hash: bcrypt.hashSync(cleanPass, 10),
      role: 'Resident', // Public registrations are strictly restricted to Resident
      village
    }
  });

  res.json({
    message: 'Cryptographically generated OTP dispatched for resident registration.',
    contact: cleanContact,
    simulatedOtp: dynamicOtp, // Delivered to simulated gateway for verification
    expiresInMinutes: 10,
    note: 'In this simulation environment, OTP is dispatched to the simulation gateway. Please verify using this generated code.'
  });
});

/**
 * POST /api/auth/otp/verify
 * Step 2: verify OTP and finalize user creation
 */
router.post('/otp/verify', otpRateLimiter, (req, res) => {
  const { email_or_mobile, otp } = req.body;

  if (!email_or_mobile || !otp) {
    return res.status(400).json({ error: 'Email/mobile and OTP are required.' });
  }

  const cleanContact = String(email_or_mobile).trim().toLowerCase();
  const cleanOtp = String(otp).trim();

  const record = registrationOtps.get(cleanContact);
  if (!record || record.expiresAt < Date.now()) {
    registrationOtps.delete(cleanContact);
    return res.status(400).json({ error: 'OTP expired or not requested. Please request a new registration code.' });
  }

  if (record.attempts >= record.maxAttempts) {
    registrationOtps.delete(cleanContact);
    return res.status(429).json({ error: 'Maximum verification attempts exceeded. Please register again.' });
  }

  record.attempts += 1;

  if (cleanOtp !== record.code) {
    const remaining = record.maxAttempts - record.attempts;
    return res.status(400).json({
      error: `Invalid verification code. ${remaining} attempt(s) remaining.`
    });
  }

  // OTP verified successfully - finalize user record
  const { pendingUser } = record;
  const insertUser = db.prepare(`
    INSERT INTO users (name, email_or_mobile, password_hash, role, village)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = insertUser.run(
    pendingUser.name,
    pendingUser.email_or_mobile,
    pendingUser.password_hash,
    pendingUser.role,
    pendingUser.village
  );

  registrationOtps.delete(cleanContact);

  const token = jwt.sign(
    { id: Number(result.lastInsertRowid), role: pendingUser.role, village: pendingUser.village },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  recordAudit(pendingUser.name, pendingUser.role, 'USER_REGISTERED', 'Authentication', `New resident verified & registered for ${pendingUser.village}`);

  res.json({
    message: 'Registration verified and account created successfully.',
    token,
    user: {
      id: Number(result.lastInsertRowid),
      name: pendingUser.name,
      email_or_mobile: pendingUser.email_or_mobile,
      role: pendingUser.role,
      village: pendingUser.village
    }
  });
});

/**
 * POST /api/auth/forgot-password
 * Step 1: Issue OTP for password recovery
 */
router.post('/forgot-password', otpRateLimiter, (req, res) => {
  const { email_or_mobile } = req.body;
  if (!email_or_mobile) {
    return res.status(400).json({ error: 'Email or mobile is required.' });
  }

  const cleanContact = String(email_or_mobile).trim().toLowerCase();
  const user = db.prepare('SELECT id, name FROM users WHERE LOWER(email_or_mobile) = ?').get(cleanContact);
  
  if (!user) {
    return res.status(404).json({ error: 'No account registered with this contact information.' });
  }

  const recoveryOtp = generateSecureOtp();
  passwordResetOtps.set(cleanContact, {
    code: recoveryOtp,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    attempts: 0,
    maxAttempts: 5,
    userId: user.id
  });

  res.json({
    message: 'Password recovery OTP issued.',
    contact: cleanContact,
    simulatedOtp: recoveryOtp,
    expiresInMinutes: 10,
    note: 'In this simulation environment, your recovery code has been generated. Use this code to reset your password.'
  });
});

/**
 * POST /api/auth/reset-password
 * Step 2: Verify OTP and update password in database with bcrypt
 */
router.post('/reset-password', otpRateLimiter, (req, res) => {
  const { email_or_mobile, otp, new_password } = req.body;

  if (!email_or_mobile || !otp || !new_password) {
    return res.status(400).json({ error: 'Email/mobile, recovery OTP, and new password are required.' });
  }

  const cleanContact = String(email_or_mobile).trim().toLowerCase();
  const cleanOtp = String(otp).trim();
  const cleanNewPass = String(new_password);

  if (cleanNewPass.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
  }

  const record = passwordResetOtps.get(cleanContact);
  if (!record || record.expiresAt < Date.now()) {
    passwordResetOtps.delete(cleanContact);
    return res.status(400).json({ error: 'Password recovery OTP has expired or was not requested.' });
  }

  if (record.attempts >= record.maxAttempts) {
    passwordResetOtps.delete(cleanContact);
    return res.status(429).json({ error: 'Maximum recovery attempts exceeded. Please initiate a new recovery request.' });
  }

  record.attempts += 1;

  if (cleanOtp !== record.code) {
    const remaining = record.maxAttempts - record.attempts;
    return res.status(400).json({
      error: `Invalid recovery code. ${remaining} attempt(s) remaining.`
    });
  }

  // Hash new password using bcrypt
  const newHash = bcrypt.hashSync(cleanNewPass, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, record.userId);

  passwordResetOtps.delete(cleanContact);

  const user = db.prepare('SELECT name, role FROM users WHERE id = ?').get(record.userId);
  recordAudit(
    user?.name || cleanContact,
    user?.role || 'User',
    'PASSWORD_RESET_SUCCESS',
    'Authentication',
    `Password was securely reset using verified OTP.`
  );

  res.json({
    message: 'Password reset successfully. You may now sign in with your new credentials.'
  });
});

/**
 * GET /api/auth/me
 * Get current authenticated user session
 */
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

/**
 * GET /api/auth/demo-accounts
 * Helper endpoint returning demonstration test accounts
 */
router.get('/demo-accounts', (req, res) => {
  res.json({
    accounts: [
      {
        role: 'Administrator',
        name: 'Vikram Sharma (Chief Engineer)',
        email: 'admin@demo.local',
        password: 'Demo12345!',
        village: 'All',
        description: 'Full administrative access: User mgmt, GIS, Analytics, All 3 villages, Policy, Notices'
      },
      {
        role: 'Operating Staff',
        name: 'Harpreet Singh (Lead Operator)',
        email: 'operator@demo.local',
        password: 'Demo12345!',
        village: 'All',
        description: 'Operational access: Pump monitoring, safe simulated controls, Work orders, Alarms'
      },
      {
        role: 'Resident',
        name: 'Rajesh Patel (Village A)',
        email: 'resident@demo.local',
        password: 'Demo12345!',
        village: 'Village A',
        description: 'Village A Resident: Village water schedule, notice board, file/track complaints'
      },
      {
        role: 'Resident',
        name: 'Suman Verma (Village B)',
        email: 'resident.b@demo.local',
        password: 'Demo12345!',
        village: 'Village B',
        description: 'Village B Resident: Village water schedule, notice board, file/track complaints'
      },
      {
        role: 'Resident',
        name: 'Anil Kumar (Village C)',
        email: 'resident.c@demo.local',
        password: 'Demo12345!',
        village: 'Village C',
        description: 'Village C Resident: Active leak zone, low pressure advisory, file/track complaints'
      }
    ]
  });
});

export default router;
