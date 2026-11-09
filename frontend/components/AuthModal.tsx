'use client';

import React, { useState } from 'react';
import { 
  LogIn, 
  UserPlus, 
  KeyRound, 
  Check, 
  AlertCircle, 
  ShieldCheck, 
  X,
  Droplets
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'otp' | 'forgot'>('login');

  // Form inputs
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [village, setVillage] = useState('Village A');
  const [otp, setOtp] = useState('123456');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(contact, password);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterInit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await apiRequest<{ simulatedOtp: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email_or_mobile: contact, password, village }),
      });
      setOtp(res.simulatedOtp || '123456');
      setInfo('Simulated OTP dispatched. In demonstration mode, use code 123456.');
      setMode('otp');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiRequest('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ email_or_mobile: contact, otp }),
      });
      await login(contact, password);
      onClose();
    } catch (err: any) {
      setError(err.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email_or_mobile: contact }),
      });
      setInfo('Demo password reset instructions issued. Default password is Demo12345!');
    } catch (err: any) {
      setError(err.message || 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (email: string) => {
    setContact(email);
    setPassword('Demo12345!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-navy-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-navy-700 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand */}
        <div className="text-center mb-5">
          <div className="inline-flex p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 mb-2">
            <Droplets className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-xl font-extrabold text-navy-900 dark:text-white">
            {mode === 'login' ? 'Sign in to JalDrishti' :
             mode === 'register' ? 'Register Village Resident Account' :
             mode === 'otp' ? 'Verify Simulated OTP' :
             'Recover Password'}
          </h2>
          <p className="text-xs text-slate-500">
            Smart Multi-Village Water Intelligence System
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-900">
            {error}
          </div>
        )}

        {info && (
          <div className="mb-4 p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 text-xs border border-teal-200 dark:border-teal-900">
            {info}
          </div>
        )}

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email or Mobile Number
              </label>
              <input
                type="text"
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="e.g., admin@demo.local"
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-between items-center text-[11px] pt-1">
              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="text-teal-600 dark:text-teal-400 font-semibold hover:underline"
              >
                Forgot password?
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-slate-600 dark:text-slate-400 hover:underline"
              >
                Need resident account?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow transition mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>

            {/* Quick Demo Credentials */}
            <div className="pt-3 border-t border-slate-100 dark:border-navy-800">
              <div className="text-[11px] text-slate-400 font-semibold mb-2">
                Quick 1-Click Demo Credentials:
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => fillDemo('admin@demo.local')}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-navy-700 text-left hover:bg-slate-50 dark:hover:bg-navy-800"
                >
                  <div className="font-bold text-slate-800 dark:text-slate-200">Admin</div>
                  <div className="text-[10px] text-slate-400 truncate">admin@demo.local</div>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('operator@demo.local')}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-navy-700 text-left hover:bg-slate-50 dark:hover:bg-navy-800"
                >
                  <div className="font-bold text-slate-800 dark:text-slate-200">Operator</div>
                  <div className="text-[10px] text-slate-400 truncate">operator@demo.local</div>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('resident@demo.local')}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-navy-700 text-left hover:bg-slate-50 dark:hover:bg-navy-800"
                >
                  <div className="font-bold text-slate-800 dark:text-slate-200">Resident A</div>
                  <div className="text-[10px] text-slate-400 truncate">resident@demo.local</div>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('resident.c@demo.local')}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-navy-700 text-left hover:bg-slate-50 dark:hover:bg-navy-800"
                >
                  <div className="font-bold text-slate-800 dark:text-slate-200">Resident C (Leak)</div>
                  <div className="text-[10px] text-slate-400 truncate">resident.c@demo.local</div>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterInit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Harpreet Kaur"
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mobile Number or Email *
              </label>
              <input
                type="text"
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="+91 98765 00000"
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Your Village *
              </label>
              <select
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
              >
                <option value="Village A">Village A (Shanti Nagar)</option>
                <option value="Village B">Village B (Kalyanpur)</option>
                <option value="Village C">Village C (Sundarpur)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Create Password *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-between items-center text-[11px] pt-1">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-teal-600 dark:text-teal-400 font-semibold hover:underline"
              >
                Back to Sign in
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow transition mt-2"
            >
              {loading ? 'Sending OTP...' : 'Send Simulated OTP'}
            </button>
          </form>
        )}

        {/* OTP Verification Form */}
        {mode === 'otp' && (
          <form onSubmit={handleOtpVerify} className="space-y-3.5 text-xs">
            <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl text-teal-800 dark:text-teal-200">
              Simulated OTP Verification: Enter <strong>123456</strong> to activate your resident account.
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white font-mono text-center text-lg tracking-widest"
              />
            </div>

            <div className="flex justify-between items-center text-[11px] pt-1">
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-slate-500 hover:underline"
              >
                Change mobile/email
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow transition mt-2"
            >
              {loading ? 'Verifying...' : 'Verify & Enter Portal'}
            </button>
          </form>
        )}

        {/* Forgot Password */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email or Mobile
              </label>
              <input
                type="text"
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Enter your registered contact"
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-between items-center text-[11px] pt-1">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-teal-600 dark:text-teal-400 font-semibold hover:underline"
              >
                Back to Sign in
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow transition mt-2"
            >
              {loading ? 'Processing...' : 'Send Recovery OTP'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
