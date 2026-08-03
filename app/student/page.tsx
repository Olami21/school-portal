'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type ScoreRow = {
  subject_name: string;
  ca1: number | null;
  ca2: number | null;
  exam: number | null;
  total: number;
  grade: string;
  remark: string;
};
type TermOption = { id: string; label: string };

export default function StudentResultsPage() {
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [studentDbId, setStudentDbId] = useState('');
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [error, setError] = useState('');
  const router = useRouter();

  // Initial load: confirm role, get student id, load term list, default to active term
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles').select('full_name, role').eq('id', user.id).single();
      if (profile?.role !== 'student') { router.push('/login'); return; }
      setFullName(profile.full_name);

      const { data: student } = await supabase
        .from('students').select('id').eq('profile_id', user.id).single();
      if (!student) { setError('Student record not found.'); setLoading(false); return; }
      setStudentDbId(student.id);

      const { data: termData } = await supabase
        .from('terms')
        .select('id, name, is_active, sessions(name)')
        .order('name');

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

  // Load scores whenever the selected term changes
  useEffect(() => {
    if (!studentDbId || !selectedTermId) return;

    const loadScores = async () => {
      setLoading(true);
      setError('');

      const { data: components, error: compError } = await supabase
        .from('score_components')
        .select('component, score, max_score, subject_id, subjects(name)')
        .eq('student_id', studentDbId)
        .eq('term_id', selectedTermId);

      if (compError) { setError(compError.message); setLoading(false); return; }

      const { data: gradingScale } = await supabase
        .from('grading_scale').select('min_score, max_score, grade, remark');

      const bySubject: Record<string, any> = {};
      (components || []).forEach((c: any) => {
        const subjectName = c.subjects?.name || 'Unknown';
        if (!bySubject[subjectName]) bySubject[subjectName] = { ca1: null, ca2: null, exam: null };
        if (c.component === 'CA1') bySubject[subjectName].ca1 = c.score;
        if (c.component === 'CA2') bySubject[subjectName].ca2 = c.score;
        if (c.component === 'EXAM') bySubject[subjectName].exam = c.score;
      });

      const result: ScoreRow[] = Object.entries(bySubject).map(([subjectName, vals]: any) => {
        const total = (vals.ca1 || 0) + (vals.ca2 || 0) + (vals.exam || 0);
        const band = (gradingScale || []).find((g: any) => total >= g.min_score && total <= g.max_score);
        return {
          subject_name: subjectName,
          ca1: vals.ca1, ca2: vals.ca2, exam: vals.exam, total,
          grade: band?.grade || '-', remark: band?.remark || '-',
        };
      });

      setRows(result);
      setLoading(false);
    };
    loadScores();
  }, [studentDbId, selectedTermId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);
  const average = rows.length > 0 ? (grandTotal / rows.length).toFixed(1) : '0';

  const gradeColor = (grade: string) => {
    if (['A1'].includes(grade)) return 'bg-emerald-100 text-emerald-700';
    if (['B2', 'B3'].includes(grade)) return 'bg-blue-100 text-blue-700';
    if (['C4', 'C5', 'C6'].includes(grade)) return 'bg-amber-100 text-amber-700';
    if (['D7', 'E8'].includes(grade)) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-navy-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-b from-gold-300 to-gold-600 flex items-center justify-center flex-shrink-0">
              <span className="font-display font-semibold text-navy-950 text-[10px]">WLMS</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-white text-sm font-medium leading-tight">Wonderland Model School</p>
              <p className="text-navy-300 text-xs leading-tight">Student Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/student/fees')} className="text-xs font-medium text-gold-300 hover:text-gold-200">
              My Fees
            </button>
            <button onClick={handleLogout} className="text-xs font-medium border border-gold-500 text-gold-300 hover:bg-gold-500 hover:text-navy-950 rounded-lg px-3 py-1.5 transition-colors">
              Log Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="font-display text-2xl text-navy-900 mb-1">My Results</h1>
            <p className="text-slate text-sm">{fullName}</p>
          </div>
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

        {loading && <p className="text-slate text-sm">Loading...</p>}
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        {!loading && !error && rows.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-slate text-sm">
            No scores recorded for this term.
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-navy-900 text-white text-xs uppercase tracking-wide">
                      <th className="text-left px-4 py-3 font-medium">Subject</th>
                      <th className="text-center px-3 py-3 font-medium">1st CA</th>
                      <th className="text-center px-3 py-3 font-medium">2nd CA</th>
                      <th className="text-center px-3 py-3 font-medium">Exam</th>
                      <th className="text-center px-3 py-3 font-medium">Total</th>
                      <th className="text-center px-3 py-3 font-medium">Grade</th>
                      <th className="text-left px-4 py-3 font-medium">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {rows.map((r, i) => (
                      <tr key={r.subject_name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 font-sans text-navy-900">{r.subject_name}</td>
                        <td className="text-center px-3 py-3 text-slate">{r.ca1 ?? '–'}</td>
                        <td className="text-center px-3 py-3 text-slate">{r.ca2 ?? '–'}</td>
                        <td className="text-center px-3 py-3 text-slate">{r.exam ?? '–'}</td>
                        <td className="text-center px-3 py-3 font-semibold text-navy-900">{r.total}</td>
                        <td className="text-center px-3 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${gradeColor(r.grade)}`}>{r.grade}</span>
                        </td>
                        <td className="px-4 py-3 font-sans text-slate">{r.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                <p className="text-xs uppercase tracking-wide text-slate mb-1">Grand Total</p>
                <p className="font-mono text-2xl font-semibold text-navy-900">{grandTotal}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                <p className="text-xs uppercase tracking-wide text-slate mb-1">Average</p>
                <p className="font-mono text-2xl font-semibold text-gold-600">{average}%</p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
