'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Option = { id: string; name: string };
type Student = { id: string; full_name: string; admission_no: string };

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
    if (!classId) {
      setStudents([]);
      return;
    }
    const loadStudents = async () => {
      const { data } = await supabase
        .from('class_enrollments')
        .select('student_id, students(id, full_name, admission_no)')
        .eq('class_id', classId);

      setStudents((data || []).map((row: any) => row.students).filter(Boolean));
    };
    loadStudents();
  }, [classId]);

  // Load existing comment when student+term selected
  useEffect(() => {
    if (!studentId || !termId) {
      setComment('');
      return;
    }
    const loadComment = async () => {
      const { data } = await supabase
        .from('report_comments')
        .select('class_teacher_comment')
        .eq('student_id', studentId)
        .eq('term_id', termId)
        .maybeSingle();

      setComment(data?.class_teacher_comment || '');
    };
    loadComment();
  }, [studentId, termId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!studentId || !termId) {
      setError('Please select term and student.');
      return;
    }

    setLoading(true);

    const { error: upsertError } = await supabase
      .from('report_comments')
      .upsert(
        {
          student_id: studentId,
          term_id: termId,
          class_teacher_comment: comment,
        },
        { onConflict: 'student_id,term_id' }
      );

    setLoading(false);

    if (upsertError) {
      setError(upsertError.message);
    } else {
      setSuccess('Comment saved.');
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '40px auto', padding: '20px' }}>
      <button onClick={() => router.push('/teacher')} style={{ marginBottom: '20px', padding: '8px 16px' }}>
        ← Back to Dashboard
      </button>

      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>Add Comment</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>Term</label>
          <select value={termId} onChange={(e) => setTermId(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px' }}>
            <option value="">Select Term</option>
            {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Class</label>
          <select value={classId} onChange={(e) => { setClassId(e.target.value); setStudentId(''); }} style={{ width: '100%', padding: '8px', marginTop: '5px' }}>
            <option value="">Select Class</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Student</label>
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px' }}>
            <option value="">Select Student</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.admission_no})</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Comment (optional)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}
        {success && <p style={{ color: 'green', marginBottom: '10px' }}>{success}</p>}

        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', background: '#000', color: '#fff' }}>
          {loading ? 'Saving...' : 'Save Comment'}
        </button>
      </form>
    </div>
  );
}