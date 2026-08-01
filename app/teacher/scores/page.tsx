'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Option = { id: string; name: string };
type Subject = { id: string; name: string; level: string };
type Student = { id: string; full_name: string; admission_no: string };

export default function ScoreEntryPage() {
  const [terms, setTerms] = useState<Option[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [visibleSubjects, setVisibleSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [termId, setTermId] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [studentId, setStudentId] = useState('');

  const [ca1, setCa1] = useState('');
  const [ca2, setCa2] = useState('');
  const [exam, setExam] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadOptions = async () => {
      const { data: termData } = await supabase.from('terms').select('id, name').order('name');
      const { data: classData } = await supabase.from('classes').select('id, name').order('name');
      const { data: subjectData } = await supabase.from('subjects').select('id, name, level').order('name');

      setTerms(termData || []);
      setClasses(classData || []);
      setAllSubjects(subjectData || []);
    };
    loadOptions();
  }, []);

  // Filter subjects whenever class changes, and load that class's students
  useEffect(() => {
    if (!classId) {
      setStudents([]);
      setVisibleSubjects([]);
      return;
    }

    const selectedClass = classes.find((c) => c.id === classId);
    const isJunior = selectedClass?.name?.toUpperCase().startsWith('JSS');
    const isSenior = selectedClass?.name?.toUpperCase().startsWith('SSS') || selectedClass?.name?.toUpperCase().startsWith('SS');

    const filtered = allSubjects.filter((s) => {
      if (s.level === 'both') return true;
      if (isJunior) return s.level === 'junior';
      if (isSenior) return s.level === 'senior';
      return true; // fallback: show everything if class name doesn't match a known pattern
    });
    setVisibleSubjects(filtered);
    setSubjectId('');

    const loadStudents = async () => {
      const { data } = await supabase
        .from('class_enrollments')
        .select('student_id, students(id, full_name, admission_no)')
        .eq('class_id', classId);

      setStudents((data || []).map((row: any) => row.students).filter(Boolean));
    };
    loadStudents();
  }, [classId, classes, allSubjects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!termId || !subjectId || !studentId) {
      setError('Please select term, subject, and student.');
      return;
    }

    setLoading(true);

    const components = [
      { component: 'CA1', score: ca1, max_score: 20 },
      { component: 'CA2', score: ca2, max_score: 20 },
      { component: 'EXAM', score: exam, max_score: 60 },
    ];

    for (const c of components) {
      if (c.score === '') continue;

      const { error: upsertError } = await supabase
        .from('score_components')
        .upsert(
          {
            student_id: studentId,
            subject_id: subjectId,
            term_id: termId,
            component: c.component,
            score: parseFloat(c.score),
            max_score: c.max_score,
          },
          { onConflict: 'student_id,subject_id,term_id,component' }
        );

      if (upsertError) {
        setError(upsertError.message);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    setSuccess('Scores saved.');
    setCa1('');
    setCa2('');
    setExam('');
  };

  return (
    <div style={{ maxWidth: '500px', margin: '40px auto', padding: '20px' }}>
      <button onClick={() => router.push('/teacher')} style={{ marginBottom: '20px', padding: '8px 16px' }}>
        ← Back to Dashboard
      </button>

      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>Enter Scores</h1>

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
          <select value={classId} onChange={(e) => setClassId(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px' }}>
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
          <label>Subject</label>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px' }}>
            <option value="">Select Subject</option>
            {visibleSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <div style={{ flex: 1 }}>
            <label>1st CA (20)</label>
            <input type="number" value={ca1} onChange={(e) => setCa1(e.target.value)} min="0" max="20"
              style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label>2nd CA (20)</label>
            <input type="number" value={ca2} onChange={(e) => setCa2(e.target.value)} min="0" max="20"
              style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Exam (60)</label>
            <input type="number" value={exam} onChange={(e) => setExam(e.target.value)} min="0" max="60"
              style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
          </div>
        </div>

        {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}
        {success && <p style={{ color: 'green', marginBottom: '10px' }}>{success}</p>}

        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', background: '#000', color: '#fff' }}>
          {loading ? 'Saving...' : 'Save Scores'}
        </button>
      </form>
    </div>
  );
}