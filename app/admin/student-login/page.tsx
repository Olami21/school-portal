'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Student = { id: string; full_name: string; admission_no: string; profile_id: string | null };

export default function CreateStudentLoginPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ username: string; password: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => { loadStudents(); }, []);

  const loadStudents = async () => {
    const { data } = await supabase.from('students').select('id, full_name, admission_no, profile_id').order('full_name');
    setStudents(data || []);
  };

  const handleCreate = async () => {
    setError('');
    setResult(null);
    if (!studentId) { setError('Please select a student.'); return; }
    setLoading(true);

    const res = await fetch('/api/create-student-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Something went wrong.');
    } else {
      setResult({ username: data.username, password: data.password });
      setStudentId('');
      loadStudents();
    }
  };

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
        <h1 className="font-display text-2xl text-navy-900 mb-1">Create Student Login</h1>
        <p className="text-slate text-sm mb-6">The student's admission number becomes both their username and password.</p>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate uppercase tracking-wide mb-1.5">Student</label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              <option value="">Select Student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.admission_no}) {s.profile_id ? '— already has login' : ''}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          {result && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-emerald-800 mb-1">Login created.</p>
              <p className="text-sm text-emerald-700">Username: <span className="font-mono font-semibold">{result.username}</span></p>
              <p className="text-sm text-emerald-700">Password: <span className="font-mono font-semibold">{result.password}</span></p>
            </div>
          )}

          <button onClick={handleCreate} disabled={loading} className="w-full bg-navy-900 hover:bg-navy-800 text-white font-medium text-sm py-3 rounded-lg transition-colors disabled:opacity-60">
            {loading ? 'Creating...' : 'Create Login'}
          </button>
        </div>
      </main>
    </div>
  );
}