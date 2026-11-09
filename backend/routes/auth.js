import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { JWT_SECRET, authenticateToken, recordAudit } from '../middleware/auth.js';

const router = express.Router();

// In-memory simulated OTP store for demo purposes: contact -> { code, expiresAt, pendingUser }
const otpStore = new Map();

/**
 * POST /api/auth/login
 * User login with email or mobile and password
 */
router.post('/login', (req, res) => {
  const { email_or_mobile, password } = req.body;

  if (!email_or_mobile || !password) {
    return res.status(400).json({ error: 'Please enter your email/mobile and password.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE LOWER(email_or_mobile) = LOWER(?)').get(email_or_mobile.trim());
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
    { expiresIn: '7d' }
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
 * Step 1 of resident registration: generates simulated OTP (123456)
 */
router.post('/register', (req, res) => {
  const { name, email_or_mobile, password, village } = req.body;

  if (!name || !email_or_mobile || !password || !village) {
    return res.status(400).json({ error: 'All fields (name, email/mobile, password, village) are required.' });
  }

  if (!['Village A', 'Village B', 'Village C'].includes(village)) {
    return res.status(400).json({ error: 'Please select a valid village (Village A, Village B, or Village C).' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email_or_mobile) = LOWER(?)').get(email_or_mobile.trim());
  if (existing) {
    return res.status(400).json({ error: 'An account with this email/mobile already exists.' });
  }

  // Generate simulated OTP
  const demoOtp = '123456';
  otpStore.set(email_or_mobile.trim().toLowerCase(), {
    code: demoOtp,
    expiresAt: Date.now() + 10 * 60 * 1000,
    pendingUser: {
      name: name.trim(),
      email_or_mobile: email_or_mobile.trim(),
      password_hash: bcrypt.hashSync(password, 10),
      role: 'Resident', // Registrations are always Resident role
      village
    }
  });

  res.json({
    message: 'Simulated OTP generated successfully.',
    contact: email_or_mobile,
    simulatedOtp: demoOtp,
    note: 'In this demonstration, no real SMS or email is dispatched. Please verify with code 123456.'
  });
});

/**
 * POST /api/auth/otp/verify
 * Step 2: verify OTP and finalize user creation
 */
router.post('/otp/verify', (req, res) => {
  const { email_or_mobile, otp } = req.body;

  if (!email_or_mobile || !otp) {
    return res.status(400).json({ error: 'Email/mobile and OTP are required.' });
  }

  const record = otpStore.get(email_or_mobile.trim().toLowerCase());
  if (!record || record.expiresAt < Date.now()) {
    return res.status(400).json({ error: 'OTP expired or not requested. Please try again.' });
  }

  if (otp.trim() !== record.code) {
    return res.status(400).json({ error: 'Invalid verification code. Please use simulated OTP 123456.' });
  }

  // Create user
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

  otpStore.delete(email_or_mobile.trim().toLowerCase());

  const token = jwt.sign(
    { id: Number(result.lastInsertRowid), role: pendingUser.role, village: pendingUser.village },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  recordAudit(pendingUser.name, pendingUser.role, 'USER_REGISTERED', 'Authentication', `New resident registered for ${pendingUser.village}`);

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
 * Simulated password reset request
 */
router.post('/forgot-password', (req, res) => {
  const { email_or_mobile } = req.body;
  if (!email_or_mobile) {
    return res.status(400).json({ error: 'Email or mobile is required.' });
  }

  const user = db.prepare('SELECT id, name FROM users WHERE LOWER(email_or_mobile) = LOWER(?)').get(email_or_mobile.trim());
  if (!user) {
    return res.status(404).json({ error: 'No account registered with this contact.' });
  }

  res.json({
    message: 'Simulated password reset instructions issued.',
    simulatedOtp: '123456',
    note: 'In this demonstration environment, default demo credentials (Demo12345!) can always be used.'
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
