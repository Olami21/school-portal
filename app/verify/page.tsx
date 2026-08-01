'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get('student');
  const termId = searchParams.get('term');

  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [grandTotal, setGrandTotal] = useState(0);
  const [average, setAverage] = useState('0');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!studentId || !termId) {
        setError('Invalid verification link.');
        setLoading(false);
        return;
      }

      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('full_name, admission_no')
        .eq('id', studentId)
        .single();

      if (studentError || !student) {
        setError('Result not found.');
        setLoading(false);
        return;
      }
      setStudentInfo(student);

      const { data: components } = await supabase
        .from('score_components')
        .select('score, subject_id')
        .eq('student_id', studentId)
        .eq('term_id', termId);

      const bySubject: Record<string, number> = {};
      (components || []).forEach((c: any) => {
        bySubject[c.subject_id] = (bySubject[c.subject_id] || 0) + c.score;
      });

      const totals = Object.values(bySubject);
      const total = totals.reduce((sum, t) => sum + t, 0);
      setGrandTotal(total);
      setAverage(totals.length > 0 ? (total / totals.length).toFixed(1) : '0');

      setLoading(false);
    };

    load();
  }, [studentId, termId]);

  if (loading) return <p style={{ padding: '40px', textAlign: 'center' }}>Verifying...</p>;

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1 style={{ color: 'red' }}>Verification Failed</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '60px auto', padding: '30px', border: '2px solid green', textAlign: 'center' }}>
      <h1 style={{ color: 'green', marginBottom: '10px' }}>✓ Verified Authentic</h1>
      <p style={{ marginBottom: '20px' }}>This result matches our official records.</p>

      <p><strong>Name:</strong> {studentInfo.full_name}</p>
      <p><strong>Admission No:</strong> {studentInfo.admission_no}</p>
      <p><strong>Grand Total:</strong> {grandTotal}</p>
      <p><strong>Average:</strong> {average}%</p>
    </div>
  );
}