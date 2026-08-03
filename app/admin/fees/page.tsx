'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Option = { id: string; name: string };
type Student = { id: string; full_name: string; admission_no: string };

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent';
const labelClass = 'block text-xs font-medium text-slate uppercase tracking-wide mb-1.5';

export default function FeeRecordsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [terms, setTerms] = useState<(Option & { sessionLabel: string })[]>([]);
  const [studentId, setStudentId] = useState('');
  const [termId, setTermId] = useState('');

  const [amountExpected, setAmountExpected] = useState('');
  const [amountPaid, setAmountPaid] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadOptions = async () => {
      const { data: studentData } = await supabase.from('students').select('id, full_name, admission_no').order('full_name');
      setStudents(studentData || []);

      const { data: termData } = await supabase.from('terms').select('id, name, sessions(name)').order('name');
      setTerms((termData || []).map((t: any) => ({ id: t.id, name: t.name, sessionLabel: t.sessions?.name || '' })));
    };
    loadOptions();
  }, []);

  useEffect(() => {
    if (!studentId || !termId) {
      setAmountExpected('');
      setAmountPaid('');
      return;
    }
    const loadExisting = async () => {
      const { data } = await supabase
        .from('fee_records')
        .select('amount_expected, amount_paid')
        .eq('student_id', studentId)
        .eq('term_id', termId)
        .maybeSingle();

      setAmountExpected(data?.amount_expected?.toString() || '');
      setAmountPaid(data?.amount_paid?.toString() || '');
    };
    loadExisting();
  }, [studentId, termId]);

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (!studentId || !termId) {
      setError('Please select student and term.');
      return;
    }

    setLoading(true);

    const { error: upsertError } = await supabase
      .from('fee_records')
      .upsert(
        {
          student_id: studentId,
          term_id: termId,
          amount_expected: parseFloat(amountExpected) || 0,
          amount_paid: parseFloat(amountPaid) || 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,term_id' }
      );

    setLoading(false);

    if (upsertError) {
      setError(upsertError.message);
    } else {
      setSuccess('Fee record saved.');
    }
  };

  const balance = (parseFloat(amountExpected) || 0) - (parseFloat(amountPaid) || 0);

  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-navy-900">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button onClick={() => router.push('/admin')} className="text-navy-200 hover:text-white text-sm">← Dashboard</button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-b from-gold-300 to-gold-600 flex items-center justify-center">
            <span className="font-display font-semibold text-navy-950 text-[9px]">WLMS</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="font-display text-2xl text-navy-900 mb-1">Fee Records</h1>
        <p className="text-slate text-sm mb-6">Set what a student owes for a term, and record payments as they come in.</p>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
          <div>
            <label className={labelClass}>Student</label>
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={inputClass}>
              <option value="">Select Student</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.admission_no})</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Term</label>
            <select value={termId} onChange={(e) => setTermId(e.target.value)} className={inputClass}>
              <option value="">Select Term</option>
              {terms.map((t) => <option key={t.id} value={t.id}>{t.sessionLabel} — {t.name} Term</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Amount Expected (₦)</label>
              <input type="number" value={amountExpected} onChange={(e) => setAmountExpected(e.target.value)} min="0" className={`${inputClass} font-mono`} />
            </div>
            <div>
              <label className={labelClass}>Amount Paid (₦)</label>
              <input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} min="0" className={`${inputClass} font-mono`} />
            </div>
          </div>

          {studentId && termId && (
            <div className={`rounded-lg px-4 py-3 text-sm font-medium ${balance > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
              Balance: ₦{balance.toLocaleString()} {balance > 0 ? 'owed' : balance < 0 ? '(overpaid)' : '(fully paid)'}
            </div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          {success && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{success}</p>}

          <button onClick={handleSave} disabled={loading} className="w-full bg-navy-900 hover:bg-navy-800 text-white font-medium text-sm py-3 rounded-lg transition-colors disabled:opacity-60">
            {loading ? 'Saving...' : 'Save Fee Record'}
          </button>
        </div>
      </main>
    </div>
  );
}
