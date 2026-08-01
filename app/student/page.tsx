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

export default function StudentResultsPage() {
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'student') {
        router.push('/login');
        return;
      }
      setFullName(profile.full_name);

      // Find this student's own record
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      if (!student) {
        setError('Student record not found.');
        setLoading(false);
        return;
      }

      // Get the active term
      const { data: term } = await supabase
        .from('terms')
        .select('id')
        .eq('is_active', true)
        .single();

      if (!term) {
        setError('No active term set.');
        setLoading(false);
        return;
      }

      // Pull raw score components for this student + active term
      const { data: components, error: compError } = await supabase
        .from('score_components')
        .select('component, score, max_score, subject_id, subjects(name)')
        .eq('student_id', student.id)
        .eq('term_id', term.id);

      if (compError) {
        setError(compError.message);
        setLoading(false);
        return;
      }

      // Pull the grading scale once
      const { data: gradingScale } = await supabase
        .from('grading_scale')
        .select('min_score, max_score, grade, remark');

      // Group components by subject
      const bySubject: Record<string, any> = {};
      (components || []).forEach((c: any) => {
        const subjectName = c.subjects?.name || 'Unknown';
        if (!bySubject[subjectName]) {
          bySubject[subjectName] = { ca1: null, ca2: null, exam: null };
        }
        if (c.component === 'CA1') bySubject[subjectName].ca1 = c.score;
        if (c.component === 'CA2') bySubject[subjectName].ca2 = c.score;
        if (c.component === 'EXAM') bySubject[subjectName].exam = c.score;
      });

      const result: ScoreRow[] = Object.entries(bySubject).map(([subjectName, vals]: any) => {
        const total = (vals.ca1 || 0) + (vals.ca2 || 0) + (vals.exam || 0);
        const band = (gradingScale || []).find(
          (g: any) => total >= g.min_score && total <= g.max_score
        );
        return {
          subject_name: subjectName,
          ca1: vals.ca1,
          ca2: vals.ca2,
          exam: vals.exam,
          total,
          grade: band?.grade || '-',
          remark: band?.remark || '-',
        };
      });

      setRows(result);
      setLoading(false);
    };

    load();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);
  const average = rows.length > 0 ? (grandTotal / rows.length).toFixed(1) : '0';

  if (loading) return <p style={{ padding: '40px' }}>Loading...</p>;

  return (
    <div style={{ maxWidth: '700px', margin: '40px auto', padding: '20px' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '5px' }}>My Results</h1>
      <p style={{ marginBottom: '20px', color: '#555' }}>{fullName}</p>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!error && rows.length === 0 && <p>No scores entered yet.</p>}

      {!error && rows.length > 0 && (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #000', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Subject</th>
                <th style={{ padding: '8px' }}>1st CA</th>
                <th style={{ padding: '8px' }}>2nd CA</th>
                <th style={{ padding: '8px' }}>Exam</th>
                <th style={{ padding: '8px' }}>Total</th>
                <th style={{ padding: '8px' }}>Grade</th>
                <th style={{ padding: '8px' }}>Remark</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.subject_name} style={{ borderBottom: '1px solid #ccc' }}>
                  <td style={{ padding: '8px' }}>{r.subject_name}</td>
                  <td style={{ padding: '8px' }}>{r.ca1 ?? '-'}</td>
                  <td style={{ padding: '8px' }}>{r.ca2 ?? '-'}</td>
                  <td style={{ padding: '8px' }}>{r.exam ?? '-'}</td>
                  <td style={{ padding: '8px' }}>{r.total}</td>
                  <td style={{ padding: '8px' }}>{r.grade}</td>
                  <td style={{ padding: '8px' }}>{r.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p><strong>Grand Total:</strong> {grandTotal}</p>
          <p><strong>Average:</strong> {average}%</p>
        </>
      )}

      <button
        onClick={handleLogout}
        style={{ marginTop: '30px', padding: '10px 20px', background: '#333', color: '#fff' }}
      >
        Log Out
      </button>
    </div>
  );
}