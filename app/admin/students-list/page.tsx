'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Student = {
  id: string; full_name: string; admission_no: string; gender: string | null;
  parent_name: string | null; parent_phone: string | null; is_active: boolean;
};

export default function StudentsListPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const loadStudents = async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, admission_no, gender, parent_name, parent_phone, is_active')
        .order('full_name', { ascending: true });
      if (error) setError(error.message); else setStudents(data || []);
      setLoading(false);
    };
    loadStudents();
  }, []);

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h1 className="font-display text-2xl text-navy-900">Students ({students.length})</h1>
          <button onClick={() => router.push('/admin/students')} className="bg-gold-500 hover:bg-gold-600 text-navy-950 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors">
            + Add Student
          </button>
        </div>

        {loading && <p className="text-slate text-sm">Loading...</p>}
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        {!loading && !error && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-navy-900 text-white text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3 font-medium">Name</th>
                    <th className="text-left px-4 py-3 font-medium">Admission No</th>
                    <th className="text-left px-4 py-3 font-medium">Gender</th>
                    <th className="text-left px-4 py-3 font-medium">Parent</th>
                    <th className="text-left px-4 py-3 font-medium">Phone</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-navy-900">{s.full_name}</td>
                      <td className="px-4 py-3 font-mono text-slate">{s.admission_no}</td>
                      <td className="px-4 py-3 text-slate">{s.gender || '-'}</td>
                      <td className="px-4 py-3 text-slate">{s.parent_name || '-'}</td>
                      <td className="px-4 py-3 text-slate">{s.parent_phone || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {students.length === 0 && <p className="text-center text-slate text-sm py-8">No students yet.</p>}
          </div>
        )}
      </main>
    </div>
  );
}