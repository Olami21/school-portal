'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type TermOption = { id: string; label: string };
type Row = {
  student_id: string;
  full_name: string;
  admission_no: string;
  expected: number;
  paid: number;
  hasRecord: boolean;
};

export default function OutstandingFeesPage() {
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [termId, setTermId] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadTerms = async () => {
      const { data: termData } = await supabase
        .from('terms').select('id, name, is_active, sessions(name)').order('name');

      const termOptions: TermOption[] = (termData || []).map((t: any) => ({
        id: t.id,
        label: `${t.sessions?.name || ''} — ${t.name} Term`,
      }));
      setTerms(termOptions);

      const active = (termData || []).find((t: any) => t.is_active);
      setTermId(active?.id || termOptions[0]?.id || '');
    };
    loadTerms();
  }, []);

  useEffect(() => {
    if (!termId) return;
    const loadData = async () => {
      setLoading(true);

      const { data: students } = await supabase
        .from('students').select('id, full_name, admission_no').order('full_name');

      const { data: fees } = await supabase
        .from('fee_records').select('student_id, amount_expected, amount_paid').eq('term_id', termId);

      const feeMap: Record<string, { expected: number; paid: number }> = {};
      (fees || []).forEach((f: any) => {
        feeMap[f.student_id] = { expected: f.amount_expected, paid: f.amount_paid };
      });

      const combined: Row[] = (students || []).map((s: any) => ({
        student_id: s.id,
        full_name: s.full_name,
        admission_no: s.admission_no,
        expected: feeMap[s.id]?.expected ?? 0,
        paid: feeMap[s.id]?.paid ?? 0,
        hasRecord: !!feeMap[s.id],
      }));

      // Outstanding balances first, then fully paid, then not-yet-set
      combined.sort((a, b) => {
        const balA = a.expected - a.paid;
        const balB = b.expected - b.paid;
        if (!a.hasRecord && b.hasRecord) return 1;
        if (a.hasRecord && !b.hasRecord) return -1;
        return balB - balA;
      });

      setRows(combined);
      setLoading(false);
    };
    loadData();
  }, [termId]);

  const totalOutstanding = rows.reduce((sum, r) => sum + Math.max(r.expected - r.paid, 0), 0);
  const studentsOwing = rows.filter((r) => r.hasRecord && r.expected - r.paid > 0).length;

  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-navy-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button onClick={() => router.push('/admin')} className="text-navy-200 hover:text-white text-sm">← Dashboard</button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-b from-gold-300 to-gold-600 flex items-center justify-center">
            <span className="font-display font-semibold text-navy-950 text-[9px]">WLMS</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="font-display text-2xl text-navy-900 mb-1">Outstanding Fees</h1>
            <p className="text-slate text-sm">See every student's fee status at a glance.</p>
          </div>
          <div className="w-full sm:w-64">
            <label className="block text-xs font-medium text-slate uppercase tracking-wide mb-1.5">Term</label>
            <select
              value={termId}
              onChange={(e) => setTermId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              {terms.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
            <p className="text-xs uppercase tracking-wide text-slate mb-1">Students Owing</p>
            <p className="font-mono text-2xl font-semibold text-red-600">{studentsOwing}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
            <p className="text-xs uppercase tracking-wide text-slate mb-1">Total Outstanding</p>
            <p className="font-mono text-2xl font-semibold text-red-600">₦{totalOutstanding.toLocaleString()}</p>
          </div>
        </div>

        {loading && <p className="text-slate text-sm">Loading...</p>}

        {!loading && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-navy-900 text-white text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3 font-medium">Name</th>
                    <th className="text-left px-4 py-3 font-medium">Admission No</th>
                    <th className="text-right px-4 py-3 font-medium">Expected</th>
                    <th className="text-right px-4 py-3 font-medium">Paid</th>
                    <th className="text-right px-4 py-3 font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {rows.map((r, i) => {
                    const balance = r.expected - r.paid;
                    return (
                      <tr key={r.student_id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 font-sans text-navy-900">{r.full_name}</td>
                        <td className="px-4 py-3 text-slate">{r.admission_no}</td>
                        {!r.hasRecord ? (
                          <td colSpan={3} className="px-4 py-3 text-slate text-center font-sans italic">Not set</td>
                        ) : (
                          <>
                            <td className="text-right px-4 py-3 text-slate">₦{r.expected.toLocaleString()}</td>
                            <td className="text-right px-4 py-3 text-emerald-600">₦{r.paid.toLocaleString()}</td>
                            <td className={`text-right px-4 py-3 font-semibold ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                              ₦{Math.abs(balance).toLocaleString()}{balance < 0 ? ' (over)' : ''}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
