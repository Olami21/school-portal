'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Option = { id: string; name: string };
type Student = { id: string; full_name: string; admission_no: string };

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent';
const labelClass = 'block text-xs font-medium text-slate uppercase tracking-wide mb-1.5';

export default function PromoteStudentsPage() {
  const [classes, setClasses] = useState<Option[]>([]);
  const [fromClassId, setFromClassId] = useState('');
  const [toClassId, setToClassId] = useState('');
  const [newSessionName, setNewSessionName] = useState('');
  const [activateSession, setActivateSession] = useState(true);

  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadClasses = async () => {
      const { data } = await supabase.from('classes').select('id, name').order('name');
      setClasses(data || []);
    };
    loadClasses();
  }, []);

  useEffect(() => {
    if (!fromClassId) { setStudents([]); return; }
    const loadStudents = async () => {
      const { data: activeSession } = await supabase.from('sessions').select('id').eq('is_active', true).single();
      if (!activeSession) return;

      const { data } = await supabase
        .from('class_enrollments')
        .select('student_id, students(id, full_name, admission_no)')
        .eq('class_id', fromClassId)
        .eq('session_id', activeSession.id);

      const list = (data || []).map((row: any) => row.students).filter(Boolean);
      setStudents(list);
      const initial: Record<string, boolean> = {};
      list.forEach((s: Student) => { initial[s.id] = true; });
      setSelected(initial);
    };
    loadStudents();
  }, [fromClassId]);

  const toggleStudent = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePromote = async () => {
    setError('');
    setSuccess('');

    if (!fromClassId || !toClassId || !newSessionName.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    const selectedIds = Object.entries(selected).filter(([, v]) => v).map(([id]) => id);
    if (selectedIds.length === 0) {
      setError('Select at least one student to promote.');
      return;
    }

    setLoading(true);

    try {
      let { data: session } = await supabase
        .from('sessions').select('id').eq('name', newSessionName.trim()).maybeSingle();

      let sessionId = session?.id;

      if (!sessionId) {
        const { data: newSession, error: sessionError } = await supabase
          .from('sessions')
          .insert({ name: newSessionName.trim(), is_active: false })
          .select('id')
          .single();
        if (sessionError) throw sessionError;
        sessionId = newSession.id;

        const { error: termError } = await supabase.from('terms').insert([
          { session_id: sessionId, name: '1st', is_active: false },
          { session_id: sessionId, name: '2nd', is_active: false },
          { session_id: sessionId, name: '3rd', is_active: false },
        ]);
        if (termError) throw termError;
      }

      if (activateSession) {
        await supabase.from('sessions').update({ is_active: false }).neq('id', sessionId);
        await supabase.from('terms').update({ is_active: false }).neq('session_id', sessionId);
        await supabase.from('sessions').update({ is_active: true }).eq('id', sessionId);
        await supabase.from('terms').update({ is_active: true }).eq('session_id', sessionId).eq('name', '1st');
      }

      const enrollments = selectedIds.map((studentId) => ({
        student_id: studentId,
        class_id: toClassId,
        session_id: sessionId,
      }));

      const { error: enrollError } = await supabase.from('class_enrollments').upsert(enrollments, { onConflict: 'student_id,session_id' });
      if (enrollError) throw enrollError;

      setSuccess(`${selectedIds.length} student(s) promoted successfully.`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-navy-900">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button onClick={() => router.push('/teacher')} className="text-navy-200 hover:text-white text-sm">← Dashboard</button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-b from-gold-300 to-gold-600 flex items-center justify-center">
            <span className="font-display font-semibold text-navy-950 text-[9px]">WLMS</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="font-display text-2xl text-navy-900 mb-1">Promote Students</h1>
        <p className="text-slate text-sm mb-6">Move students from one class into a new class and session.</p>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>From Class (current)</label>
              <select value={fromClassId} onChange={(e) => setFromClassId(e.target.value)} className={inputClass}>
                <option value="">Select Class</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>To Class (new)</label>
              <select value={toClassId} onChange={(e) => setToClassId(e.target.value)} className={inputClass}>
                <option value="">Select Class</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>New Session Name</label>
            <input
              type="text"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              placeholder="e.g. 2026/2027"
              className={inputClass}
            />
            <p className="text-xs text-slate mt-1">If this session doesn't exist yet, it will be created automatically.</p>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate">
            <input type="checkbox" checked={activateSession} onChange={(e) => setActivateSession(e.target.checked)} />
            Set this as the active session (starts 1st term)
          </label>
        </div>

        {fromClassId && students.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
            <h2 className="font-display text-lg text-navy-900 mb-3">Select Students ({students.length})</h2>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {students.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm text-slate py-1">
                  <input type="checkbox" checked={!!selected[s.id]} onChange={() => toggleStudent(s.id)} />
                  {s.full_name} ({s.admission_no})
                </label>
              ))}
            </div>
          </div>
        )}

        {fromClassId && students.length === 0 && (
          <p className="text-sm text-slate mb-6">No students currently enrolled in this class for the active session.</p>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>}
        {success && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-4">{success}</p>}

        <button
          onClick={handlePromote}
          disabled={loading}
          className="w-full bg-navy-900 hover:bg-navy-800 text-white font-medium text-sm py-3 rounded-lg transition-colors disabled:opacity-60"
        >
          {loading ? 'Promoting...' : 'Promote Selected Students'}
        </button>
      </main>
    </div>
  );
}
