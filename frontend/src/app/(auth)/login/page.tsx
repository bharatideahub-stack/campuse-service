'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

type AuthState = 'welcome' | 'signin' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  // Auth store actions and state
  const { login, register, isLoading } = useAuthStore();

  // Determine initial state based on query parameter or route path
  const [viewState, setViewState] = useState<AuthState>('welcome');

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Sign up fields
  const [fullName, setFullName] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Listen to changes in route/searchParams to switch views
  useEffect(() => {
    if (pathname === '/register') {
      setViewState('signup');
    } else {
      const view = searchParams.get('view');
      if (view === 'signup') {
        setViewState('signup');
      } else if (view === 'signin') {
        setViewState('signin');
      } else {
        setViewState('welcome');
      }
    }
  }, [pathname, searchParams]);


  // Handle Sign In submission
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      return toast.error('Please fill in all fields');
    }
    try {
      await login(email, password);
      const { user } = useAuthStore.getState();
      toast.success('Welcome back! 👋');
      router.push(user?.role === 'admin' ? '/admin' : '/feed');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Login failed. Please try again.';
      toast.error(msg);
    }
  };

  // Handle Sign Up submission
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      return toast.error('Please fill in all fields');
    }
    if (!agreeTerms) {
      return toast.error('You must agree to the processing of personal data');
    }
    if (password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }

    try {
      await register({
        name: fullName,
        email,
        password,
        hostel: '', // optional fields default to empty
        phone: '',  // optional fields default to empty
      });
      toast.success('Account created! Welcome to CampusHub 🎉');
      router.push('/feed');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Registration failed. Please try again.';
      toast.error(msg);
    }
  };

  // Update browser URL state without reloading
  const navigateTo = (state: AuthState) => {
    setViewState(state);
    if (state === 'signup') {
      window.history.pushState(null, '', '/register');
    } else if (state === 'signin') {
      window.history.pushState(null, '', '/login');
    } else {
      window.history.pushState(null, '', '/login?view=welcome');
    }
  };

  return (
    <div className="flex-1 flex flex-col relative bg-[#00104e] overflow-hidden select-none min-h-full">
      {/* 1. Organic Fluid Wavy Vector Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" preserveAspectRatio="none">
          {/* Base Navy Layer */}
          <rect width="400" height="800" fill="#000d3d" />
          {/* Fluid waves */}
          <path d="M 0 0 L 400 0 L 400 340 C 320 380, 240 220, 0 300 Z" fill="#0c1d6b" opacity="0.9" />
          <path d="M 0 0 L 400 0 L 400 270 C 310 320, 250 180, 0 230 Z" fill="#0023cc" opacity="0.65" />
          <path d="M 0 0 L 260 0 C 220 100, 90 70, 0 130 Z" fill="#001452" opacity="0.95" />
          {/* Dark bottom wave */}
          <path d="M 0 800 L 400 800 L 400 580 C 330 530, 200 680, 0 610 Z" fill="#00092c" />
          <path d="M 0 800 L 400 800 L 400 700 C 310 670, 250 780, 0 745 Z" fill="#000720" />
        </svg>
      </div>

      {/* 2. Floating Translucent Spheres */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
        {/* Top Left Dark Shadow Sphere */}
        <div className="absolute top-[8%] left-[8%] w-10 h-10 rounded-full bg-gradient-to-br from-[#0c1a52] to-[#040827] shadow-xl opacity-80" />
        
        {/* Middle Floating Glassmorphic Sphere */}
        <div className="absolute top-[21%] right-[22%] w-20 h-20 rounded-full bg-gradient-to-tr from-[#3875ff] via-[#6594ff] to-[#acc6ff] opacity-80 shadow-[inset_-3px_-3px_10px_rgba(0,0,0,0.15),0_10px_25px_rgba(37,99,235,0.4)] animate-[float_6s_ease-in-out_infinite]" />
        
        {/* Bottom Left Sphere */}
        <div className="absolute bottom-[22%] left-[8%] w-16 h-16 rounded-full bg-gradient-to-tr from-[#003cf2] to-[#4c7cff] shadow-[0_8px_20px_rgba(0,60,242,0.4)] opacity-95 animate-[float_5s_ease-in-out_infinite]" style={{ animationDelay: '1s' }} />
        
        {/* Bottom Right Large Dark Shadow Sphere */}
        <div className="absolute bottom-[10%] right-[10%] w-28 h-28 rounded-full bg-gradient-to-br from-[#030930] to-[#010312] shadow-2xl opacity-75" />
      </div>

      {/* Keyframe Float Animation (inlined via standard CSS style tags for reliability) */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-10px) scale(1.02); }
        }
      `}</style>

      {/* 3. Main Views Container */}
      <div className="relative z-20 flex-1 flex flex-col justify-end">
        <AnimatePresence mode="wait">
          {viewState === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="flex-1 flex flex-col justify-between p-7 pt-24 text-white"
            >
              {/* Title Section */}
              <div className="flex-1 flex flex-col justify-center items-center text-center mt-12">
                <h1 className="text-3xl font-extrabold tracking-tight mb-2 font-sans text-white drop-shadow-md">
                  Welcome Back!
                </h1>
                <p className="text-[#a5b4fc] text-sm max-w-[240px] leading-relaxed drop-shadow-sm font-medium">
                  Enter details to get your personal account
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4 mb-8">
                {/* Sign In Button */}
                <button
                  onClick={() => navigateTo('signin')}
                  className="w-full py-4 rounded-[22px] bg-[#002cf7] text-white font-bold text-sm tracking-wide shadow-[0_10px_25px_rgba(0,44,247,0.35)] active:scale-[0.98] transition-all hover:bg-[#0025d1] flex items-center justify-center gap-1.5 border border-transparent"
                >
                  Sign in
                  <span className="text-base font-light">→</span>
                </button>

                {/* Sign Up Button */}
                <button
                  onClick={() => navigateTo('signup')}
                  className="w-full py-4 rounded-[22px] bg-white text-[#002cf7] font-bold text-sm tracking-wide shadow-lg active:scale-[0.98] transition-all hover:bg-slate-50 flex items-center justify-center gap-1.5 border border-slate-100"
                >
                  Sign up
                  <span className="text-base font-light">→</span>
                </button>
              </div>
            </motion.div>
          )}

          {viewState === 'signup' && (
            <motion.div
              key="signup"
              initial={{ opacity: 0, y: 150 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 150 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="w-full bg-white rounded-t-[38px] p-6 pb-8 shadow-[0_-15px_40px_rgba(0,0,0,0.15)] flex flex-col z-30"
            >
              {/* Card Title */}
              <div className="text-center mt-2 mb-4">
                <h2 className="text-2xl font-bold text-[#002cf7] tracking-tight">
                  Get Started
                </h2>
              </div>

              {/* Form */}
              <form onSubmit={handleSignUp} className="space-y-4">
                {/* Full Name Input */}
                <div className="relative mt-5">
                  <label className="absolute left-4 top-0 -translate-y-1/2 bg-white px-1.5 text-xs font-semibold text-slate-500 tracking-wide z-10 transition-colors pointer-events-none">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter Full Name"
                    required
                    className="w-full px-4 py-3.5 border border-slate-200 rounded-[18px] text-[#081342] text-sm placeholder-slate-400 outline-none focus:border-[#002cf7] focus:ring-1 focus:ring-[#002cf7] transition-all bg-white font-medium shadow-sm"
                  />
                </div>

                {/* Email Input */}
                <div className="relative mt-5">
                  <label className="absolute left-4 top-0 -translate-y-1/2 bg-white px-1.5 text-xs font-semibold text-slate-500 tracking-wide z-10 transition-colors pointer-events-none">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter Email"
                    required
                    className="w-full px-4 py-3.5 border border-slate-200 rounded-[18px] text-[#081342] text-sm placeholder-slate-400 outline-none focus:border-[#002cf7] focus:ring-1 focus:ring-[#002cf7] transition-all bg-white font-medium shadow-sm"
                  />
                </div>

                {/* Password Input */}
                <div className="relative mt-5">
                  <label className="absolute left-4 top-0 -translate-y-1/2 bg-white px-1.5 text-xs font-semibold text-slate-500 tracking-wide z-10 transition-colors pointer-events-none">
                    Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Password"
                    required
                    className="w-full px-4 py-3.5 pr-12 border border-slate-200 rounded-[18px] text-[#081342] text-sm placeholder-slate-400 outline-none focus:border-[#002cf7] focus:ring-1 focus:ring-[#002cf7] transition-all bg-white font-medium shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Agreement Checkbox */}
                <div className="pt-2">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all mt-0.5 flex-shrink-0 ${
                      agreeTerms ? 'bg-[#002cf7] border-[#002cf7]' : 'border-slate-300 bg-white'
                    }`}>
                      {agreeTerms && (
                        <svg className="w-3 h-3 text-white stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-slate-600 font-semibold leading-relaxed">
                      i agree to the processing of{' '}
                      <span className="text-[#002cf7] underline hover:text-[#0025d1]">
                        personal data
                      </span>
                    </span>
                  </label>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 mt-2 rounded-[22px] bg-[#002cf7] text-white font-bold text-sm tracking-wide shadow-[0_10px_25px_rgba(0,44,247,0.35)] active:scale-[0.98] transition-all hover:bg-[#0025d1] flex items-center justify-center gap-1.5 disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Signing up…</>
                  ) : (
                    <>
                      Sign up
                      <span className="text-base font-light">→</span>
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-[1px] bg-slate-200" />
                <span className="text-xs text-slate-400 font-bold px-1 select-none">sign up with</span>
                <div className="flex-1 h-[1px] bg-slate-200" />
              </div>

              {/* Social Login Buttons */}
              <div className="flex justify-center gap-4">
                {/* Google */}
                <button type="button" className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm active:scale-95">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.85 2.99c.96-2.87 3.66-4.99 6.76-4.99z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.43h6.48c-.28 1.48-1.12 2.74-2.38 3.59l3.69 2.87c2.16-1.99 3.7-4.92 3.7-8.55z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.24 14.81c-.24-.72-.38-1.49-.38-2.31s.14-1.59.38-2.31L1.39 7.56C.5 9.36 0 11.4 0 13.5s.5 4.14 1.39 5.94l3.85-2.99z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.69-2.87c-1.02.68-2.33 1.09-3.92 1.09-3.1 0-5.8-2.12-6.76-4.99l-3.85 2.99C3.37 20.33 7.35 23 12 23z"
                    />
                  </svg>
                </button>
                {/* Facebook */}
                <button type="button" className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm active:scale-95">
                  <svg className="w-4.5 h-4.5 fill-[#1877F2]" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </button>
                {/* Twitter */}
                <button type="button" className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm active:scale-95">
                  <svg className="w-4.5 h-4.5 fill-[#1DA1F2]" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                </button>
              </div>

              {/* Bottom footer link */}
              <div className="text-center mt-5 mb-1">
                <p className="text-xs text-slate-400 font-bold select-none">
                  Already have an account?{' '}
                  <button
                    onClick={() => navigateTo('signin')}
                    className="text-[#002cf7] hover:underline font-extrabold focus:outline-none"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </motion.div>
          )}

          {viewState === 'signin' && (
            <motion.div
              key="signin"
              initial={{ opacity: 0, y: 150 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 150 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="w-full bg-white rounded-t-[38px] p-6 pb-8 shadow-[0_-15px_40px_rgba(0,0,0,0.15)] flex flex-col z-30"
            >
              {/* Card Title */}
              <div className="text-center mt-2 mb-4">
                <h2 className="text-2xl font-bold text-[#002cf7] tracking-tight">
                  Welcome Back
                </h2>
              </div>

              {/* Form */}
              <form onSubmit={handleSignIn} className="space-y-4">
                {/* Email Input */}
                <div className="relative mt-5">
                  <label className="absolute left-4 top-0 -translate-y-1/2 bg-white px-1.5 text-xs font-semibold text-slate-500 tracking-wide z-10 transition-colors pointer-events-none">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter Email"
                    required
                    className="w-full px-4 py-3.5 border border-slate-200 rounded-[18px] text-[#081342] text-sm placeholder-slate-400 outline-none focus:border-[#002cf7] focus:ring-1 focus:ring-[#002cf7] transition-all bg-white font-medium shadow-sm"
                  />
                </div>

                {/* Password Input */}
                <div className="relative mt-5">
                  <label className="absolute left-4 top-0 -translate-y-1/2 bg-white px-1.5 text-xs font-semibold text-slate-500 tracking-wide z-10 transition-colors pointer-events-none">
                    Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Password"
                    required
                    className="w-full px-4 py-3.5 pr-12 border border-slate-200 rounded-[18px] text-[#081342] text-sm placeholder-slate-400 outline-none focus:border-[#002cf7] focus:ring-1 focus:ring-[#002cf7] transition-all bg-white font-medium shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Checkbox and Forgot Password Link */}
                <div className="flex items-center justify-between pt-1 pb-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                      rememberMe ? 'bg-[#002cf7] border-[#002cf7]' : 'border-slate-300 bg-white'
                    }`}>
                      {rememberMe && (
                        <svg className="w-3 h-3 text-white stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-slate-600 font-bold">
                      Remember me
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => toast.error('Password recovery is not implemented yet')}
                    className="text-xs text-[#002cf7] hover:underline font-extrabold"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 mt-2 rounded-[22px] bg-[#002cf7] text-white font-bold text-sm tracking-wide shadow-[0_10px_25px_rgba(0,44,247,0.35)] active:scale-[0.98] transition-all hover:bg-[#0025d1] flex items-center justify-center gap-1.5 disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Signing in…</>
                  ) : (
                    <>
                      Sign in
                      <span className="text-base font-light">→</span>
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-[1px] bg-slate-200" />
                <span className="text-xs text-slate-400 font-bold px-1 select-none">sign in with</span>
                <div className="flex-1 h-[1px] bg-slate-200" />
              </div>

              {/* Social Login Buttons */}
              <div className="flex justify-center gap-4">
                {/* Google */}
                <button type="button" className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm active:scale-95">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.85 2.99c.96-2.87 3.66-4.99 6.76-4.99z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.43h6.48c-.28 1.48-1.12 2.74-2.38 3.59l3.69 2.87c2.16-1.99 3.7-4.92 3.7-8.55z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.24 14.81c-.24-.72-.38-1.49-.38-2.31s.14-1.59.38-2.31L1.39 7.56C.5 9.36 0 11.4 0 13.5s.5 4.14 1.39 5.94l3.85-2.99z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.69-2.87c-1.02.68-2.33 1.09-3.92 1.09-3.1 0-5.8-2.12-6.76-4.99l-3.85 2.99C3.37 20.33 7.35 23 12 23z"
                    />
                  </svg>
                </button>
                {/* Facebook */}
                <button type="button" className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm active:scale-95">
                  <svg className="w-4.5 h-4.5 fill-[#1877F2]" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </button>
                {/* Twitter */}
                <button type="button" className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm active:scale-95">
                  <svg className="w-4.5 h-4.5 fill-[#1DA1F2]" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                </button>
              </div>

              {/* Bottom footer link - exact text to match style */}
              <div className="text-center mt-5 mb-1">
                <p className="text-xs text-slate-400 font-bold select-none">
                  Don't have an account?{' '}
                  <button
                    onClick={() => navigateTo('signup')}
                    className="text-[#002cf7] hover:underline font-extrabold focus:outline-none"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
