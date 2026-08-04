'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function VerifyContent() {
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
      if (!studentId || !termId) { setError('Invalid verification link.'); setLoading(false); return; }

      const { data: student, error: studentError } = await supabase
        .from('students').select('full_name, admission_no').eq('id', studentId).single();
      if (studentError || !student) { setError('Result not found.'); setLoading(false); return; }
      setStudentInfo(student);

      const { data: components } = await supabase
        .from('score_components').select('score, subject_id').eq('student_id', studentId).eq('term_id', termId);

      const bySubject: Record<string, number> = {};
      (components || []).forEach((c: any) => { bySubject[c.subject_id] = (bySubject[c.subject_id] || 0) + c.score; });
      const totals = Object.values(bySubject);
      const total = totals.reduce((sum, t) => sum + t, 0);
      setGrandTotal(total);
      setAverage(totals.length > 0 ? (total / totals.length).toFixed(1) : '0');
      setLoading(false);
    };
    load();
  }, [studentId, termId]);

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4 py-12">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(251,174,2,0.10),transparent_60%)]" />
      <div className="relative w-full max-w-sm">
        {loading && <p className="text-center text-navy-300 text-sm">Verifying...</p>}

        {!loading && error && (
          <div className="bg-white rounded-xl shadow-2xl p-8 text-center">
            <h1 className="font-display text-xl text-red-600 mb-2">Verification Failed</h1>
            <p className="text-slate text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && studentInfo && (
          <div className="bg-white rounded-xl shadow-2xl p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-emerald-600 text-2xl">✓</span>
            </div>
            <h1 className="font-display text-xl text-emerald-700 mb-1">Verified Authentic</h1>
            <p className="text-slate text-sm mb-6">This result matches our official records.</p>

            <div className="text-left space-y-2 text-sm border-t border-gray-100 pt-4">
              <p><span className="text-slate">Name:</span> <span className="font-medium text-navy-900">{studentInfo.full_name}</span></p>
              <p><span className="text-slate">Admission No:</span> <span className="font-mono font-medium text-navy-900">{studentInfo.admission_no}</span></p>
              <p><span className="text-slate">Grand Total:</span> <span className="font-mono font-medium text-navy-900">{grandTotal}</span></p>
              <p><span className="text-slate">Average:</span> <span className="font-mono font-medium text-gold-600">{average}%</span></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-navy-950 flex items-center justify-center text-navy-300 text-sm">Loading...</div>}>
      <VerifyContent />
    </Suspense>
  );
}