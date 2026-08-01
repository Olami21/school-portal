'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const loginEmail = identifier.includes('@')
      ? identifier
      : `${identifier.toLowerCase()}@school.internal`;

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error) {
      setError('Incorrect login details. Please check and try again.');
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError('Login failed. Please try again.');
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'admin') router.push('/admin');
    else if (profile?.role === 'teacher') router.push('/teacher');
    else if (profile?.role === 'student') router.push('/student');
    else {
      setError('No role assigned to this account.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4 py-12">
      {/* subtle radial glow behind the card */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(201,162,39,0.12),transparent_60%)]" />

      <div className="relative w-full max-w-sm">
        {/* Seal / crest */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-b from-gold-300 to-gold-600 flex items-center justify-center shadow-lg ring-4 ring-gold-500/20">
            <span className="font-display font-semibold text-navy-950 text-sm tracking-wide">WLMS</span>
          </div>
        </div>

        <h1 className="font-display text-2xl text-center text-white mb-1">
          Wonderland Model School
        </h1>
        <p className="text-center text-navy-300 text-sm mb-8 tracking-wide">
          Results &amp; Records Portal
        </p>

        <form
          onSubmit={handleLogin}
          className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 space-y-5"
        >
          <div>
            <label className="block text-xs font-medium text-slate uppercase tracking-wide mb-1.5">
              Email or Admission Number
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              placeholder="e.g. WLMS/2026/001"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate uppercase tracking-wide mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-navy-900 hover:bg-navy-800 text-white font-medium text-sm py-3 rounded-lg transition-colors disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-navy-400 text-xs mt-6">
          Having trouble logging in? Contact the school office.
        </p>
      </div>
    </div>
  );
}