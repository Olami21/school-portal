'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Option = { id: string; name: string };
type Student = { id: string; full_name: string; admission_no: string };
const inputClass = 'w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent';
const labelClass = 'block text-xs font-medium text-slate uppercase tracking-wide mb-1.5';

export default function AddCommentPage() {
  const [terms, setTerms] = useState<Option[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [termId, setTermId] = useState('');
  const [classId, setClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadOptions = async () => {
      const { data: termData } = await supabase.from('terms').select('id, name').order('name');
      const { data: classData } = await supabase.from('classes').select('id, name').order('name');
      setTerms(termData || []);
      setClasses(classData || []);
    };
    loadOptions();
  }, []);

  useEffect(() => {
    if (!classId) { setStudents([]); return; }
    const loadStudents = async () => {
      const { data } = await supabase
        .from('class_enrollments')
        .select('student_id, students(id, full_name, admission_no)')
        .eq('class_id', classId);
      setStudents((data || []).map((row: any) => row.students).filter(Boolean));
    };
    loadStudents();
  }, [classId]);

  useEffect(() => {
    if (!studentId || !termId) { setComment(''); return; }
    const loadComment = async () => {
      const { data } = await supabase
        .from('report_comments').select('class_teacher_comment')
        .eq('student_id', studentId).eq('term_id', termId).maybeSingle();
      setComment(data?.class_teacher_comment || '');
    };
    loadComment();
  }, [studentId, termId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!studentId || !termId) { setError('Please select term and student.'); return; }
    setLoading(true);

    const { error: upsertError } = await supabase
      .from('report_comments')
      .upsert({ student_id: studentId, term_id: termId, class_teacher_comment: comment }, { onConflict: 'student_id,term_id' });
    setLoading(false);

    if (upsertError) setError(upsertError.message); else setSuccess('Comment saved.');
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
        <h1 className="font-display text-2xl text-navy-900 mb-1">Add Comment</h1>
        <p className="text-slate text-sm mb-6">Write a short remark for a student's result.</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Term</label>
              <select value={termId} onChange={(e) => setTermId(e.target.value)} className={inputClass}>
                <option value="">Select Term</option>
                {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Class</label>
              <select value={classId} onChange={(e) => { setClassId(e.target.value); setStudentId(''); }} className={inputClass}>
                <option value="">Select Class</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Student</label>
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={inputClass}>
              <option value="">Select Student</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.admission_no})</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Comment (optional)</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className={inputClass} />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          {success && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{success}</p>}

          <button type="submit" disabled={loading} className="w-full bg-navy-900 hover:bg-navy-800 text-white font-medium text-sm py-3 rounded-lg transition-colors disabled:opacity-60">
            {loading ? 'Saving...' : 'Save Comment'}
          </button>
        </form>
      </main>
    </div>
  );
}