'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type TermOption = { id: string; label: string };

export default function StudentFeesPage() {
  const [loading, setLoading] = useState(true);
  const [studentDbId, setStudentDbId] = useState('');
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [expected, setExpected] = useState(0);
  const [paid, setPaid] = useState(0);
  const [hasRecord, setHasRecord] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role !== 'student') { router.push('/login'); return; }

      const { data: student } = await supabase.from('students').select('id').eq('profile_id', user.id).single();
      if (!student) { setError('Student record not found.'); setLoading(false); return; }
      setStudentDbId(student.id);

      const { data: termData } = await supabase
        .from('terms').select('id, name, is_active, sessions(name)').order('name');

      const termOptions: TermOption[] = (termData || []).map((t: any) => ({
        id: t.id,
        label: `${t.sessions?.name || ''} — ${t.name} Term`,
      }));
      setTerms(termOptions);

      const active = (termData || []).find((t: any) => t.is_active);
      setSelectedTermId(active?.id || termOptions[0]?.id || '');
    };
    init();
  }, [router]);

  useEffect(() => {
    if (!studentDbId || !selectedTermId) return;
    const loadFee = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('fee_records')
        .select('amount_expected, amount_paid')
        .eq('student_id', studentDbId)
        .eq('term_id', selectedTermId)
        .maybeSingle();

      setExpected(data?.amount_expected || 0);
      setPaid(data?.amount_paid || 0);
      setHasRecord(!!data);
      setLoading(false);
    };
    loadFee();
  }, [studentDbId, selectedTermId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const balance = expected - paid;

  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-navy-900">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button onClick={() => router.push('/student')} className="text-navy-200 hover:text-white text-sm">← My Results</button>
          <button onClick={handleLogout} className="text-xs font-medium border border-gold-500 text-gold-300 hover:bg-gold-500 hover:text-navy-950 rounded-lg px-3 py-1.5 transition-colors">
            Log Out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <h1 className="font-display text-2xl text-navy-900">School Fees</h1>
          <div className="w-full sm:w-64">
            <label className="block text-xs font-medium text-slate uppercase tracking-wide mb-1.5">Term</label>
            <select
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              {terms.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        {loading && <p className="text-slate text-sm">Loading...</p>}

        {!loading && !error && !hasRecord && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-slate text-sm">
            No fee record has been set for this term yet.
          </div>
        )}

        {!loading && !error && hasRecord && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-xs uppercase tracking-wide text-slate mb-1">Amount Expected</p>
                <p className="font-mono text-xl font-semibold text-navy-900">₦{expected.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-xs uppercase tracking-wide text-slate mb-1">Amount Paid</p>
                <p className="font-mono text-xl font-semibold text-emerald-600">₦{paid.toLocaleString()}</p>
              </div>
            </div>

            <div className={`rounded-lg px-4 py-4 text-center ${balance > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
              <p className="text-xs uppercase tracking-wide mb-1 text-slate">Balance</p>
              <p className={`font-mono text-2xl font-bold ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                ₦{Math.abs(balance).toLocaleString()}
              </p>
              <p className="text-xs mt-1 text-slate">
                {balance > 0 ? 'Outstanding balance' : balance < 0 ? 'Overpaid' : 'Fully paid'}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
