'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function TeacherDashboard() {
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: profile } = await supabase
        .from('profiles').select('full_name, role').eq('id', user.id).single();
      if (profile?.role !== 'teacher') { router.push('/login'); return; }
      setFullName(profile.full_name);
      setLoading(false);
    };
    check();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return <div className="min-h-screen bg-paper flex items-center justify-center text-slate">Loading...</div>;
  }

  const cards = [
    { title: 'Add Student', desc: 'Register a new student and assign their class.', path: '/teacher/students' },
    { title: 'Enter Scores', desc: 'Record CA1, CA2, and Exam scores per subject.', path: '/teacher/scores' },
    { title: 'Add Comment', desc: 'Write a short remark for a student\'s result.', path: '/teacher/comments' },
    { title: 'Print Result', desc: 'Generate a printable, QR-verified result sheet.', path: '/teacher/print-result' },
  ];

  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-navy-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-b from-gold-300 to-gold-600 flex items-center justify-center flex-shrink-0">
              <span className="font-display font-semibold text-navy-950 text-[10px]">WLMS</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-white text-sm font-medium leading-tight">Wonderland Model School</p>
              <p className="text-navy-300 text-xs leading-tight">Teacher Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-navy-200 text-sm">Welcome, {fullName}</span>
            <button
              onClick={handleLogout}
              className="text-xs font-medium border border-gold-500 text-gold-300 hover:bg-gold-500 hover:text-navy-950 rounded-lg px-3 py-1.5 transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="font-display text-2xl text-navy-900 mb-1">Teacher Dashboard</h1>
        <p className="text-slate text-sm mb-8">Manage students and enter results.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => (
            <button
              key={c.path}
              onClick={() => router.push(c.path)}
              className="group text-left bg-white rounded-xl border border-gray-200 hover:border-gold-500 hover:shadow-lg transition-all p-5 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-navy-900 to-gold-500" />
              <h3 className="font-display text-lg text-navy-900 mb-1">{c.title}</h3>
              <p className="text-sm text-slate mb-4">{c.desc}</p>
              <span className="text-xs font-medium text-gold-600 group-hover:translate-x-1 transition-transform inline-block">
                Open →
              </span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}