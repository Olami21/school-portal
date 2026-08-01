'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Option = { id: string; name: string };
type ScoreRow = {
  subject_name: string;
  subject_id: string;
  ca1: number | null;
  ca2: number | null;
  exam: number | null;
  total: number;
  grade: string;
  remark: string;
  classHighest: number | null;
};

function principalComment(average: number): string {
  if (average >= 70) return 'Excellent performance. Keep up the good work.';
  if (average >= 60) return 'Very good performance this term.';
  if (average >= 50) return 'Good performance. Keep improving.';
  if (average >= 40) return 'Average performance. You can improve on your performance next term.';
  return 'Poor performance. Serious improvement is needed next term.';
}

export default function TeacherPrintResultPage() {
  const [students, setStudents] = useState<{ id: string; full_name: string; admission_no: string }[]>([]);
  const [terms, setTerms] = useState<Option[]>([]);
  const [studentId, setStudentId] = useState('');
  const [termId, setTermId] = useState('');

  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [teacherComment, setTeacherComment] = useState('');
  const [school, setSchool] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadOptions = async () => {
      const { data: studentData } = await supabase.from('students').select('id, full_name, admission_no').order('full_name');
      setStudents(studentData || []);

      const { data: termData } = await supabase.from('terms').select('id, name').order('name');
      setTerms(termData || []);

      const { data: schoolData } = await supabase.from('school_settings').select('*').single();
      setSchool(schoolData);
    };
    loadOptions();
  }, []);

  const handleGenerate = async () => {
    if (!studentId || !termId) return;

    const { data: student } = await supabase
      .from('students')
      .select('full_name, admission_no, gender')
      .eq('id', studentId)
      .single();
    setStudentInfo(student);

    const { data: term } = await supabase.from('terms').select('session_id').eq('id', termId).single();

    const { data: enrollment } = await supabase
      .from('class_enrollments')
      .select('class_id')
      .eq('student_id', studentId)
      .eq('session_id', term?.session_id)
      .single();

    const classId = enrollment?.class_id;

    const { data: components } = await supabase
      .from('score_components')
      .select('component, score, subject_id, subjects(name)')
      .eq('student_id', studentId)
      .eq('term_id', termId);

    const { data: gradingScale } = await supabase.from('grading_scale').select('min_score, max_score, grade, remark');

    const bySubject: Record<string, any> = {};
    (components || []).forEach((c: any) => {
      const name = c.subjects?.name || 'Unknown';
      if (!bySubject[name]) bySubject[name] = { ca1: null, ca2: null, exam: null, subject_id: c.subject_id };
      if (c.component === 'CA1') bySubject[name].ca1 = c.score;
      if (c.component === 'CA2') bySubject[name].ca2 = c.score;
      if (c.component === 'EXAM') bySubject[name].exam = c.score;
    });

    let classmateIds: string[] = [];
    if (classId) {
      const { data: classmates } = await supabase
        .from('class_enrollments')
        .select('student_id')
        .eq('class_id', classId)
        .eq('session_id', term?.session_id);
      classmateIds = (classmates || []).map((c: any) => c.student_id);
    }

    const result: ScoreRow[] = [];
    for (const [name, vals] of Object.entries(bySubject) as any) {
      const total = (vals.ca1 || 0) + (vals.ca2 || 0) + (vals.exam || 0);
      const band = (gradingScale || []).find((g: any) => total >= g.min_score && total <= g.max_score);

      let classHighest: number | null = null;
      if (classmateIds.length > 0) {
        const { data: classScores } = await supabase
          .from('score_components')
          .select('student_id, score')
          .eq('subject_id', vals.subject_id)
          .eq('term_id', termId)
          .in('student_id', classmateIds);

        const totalsByStudent: Record<string, number> = {};
        (classScores || []).forEach((c: any) => {
          totalsByStudent[c.student_id] = (totalsByStudent[c.student_id] || 0) + c.score;
        });
        const allTotals = Object.values(totalsByStudent);
        classHighest = allTotals.length > 0 ? Math.max(...allTotals) : null;
      }

      result.push({
        subject_name: name,
        subject_id: vals.subject_id,
        ca1: vals.ca1,
        ca2: vals.ca2,
        exam: vals.exam,
        total,
        grade: band?.grade || '-',
        remark: band?.remark || '-',
        classHighest,
      });
    }

    setRows(result);

    const { data: commentData } = await supabase
      .from('report_comments')
      .select('class_teacher_comment')
      .eq('student_id', studentId)
      .eq('term_id', termId)
      .maybeSingle();
    setTeacherComment(commentData?.class_teacher_comment || '');

    setLoaded(true);
  };

  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);
  const average = rows.length > 0 ? grandTotal / rows.length : 0;

  const verifyUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/verify?student=${studentId}&term=${termId}` : '';
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verifyUrl)}`;

  return (
    <div style={{ maxWidth: '700px', margin: '20px auto', padding: '20px' }}>
      <div className="no-print">
        <button onClick={() => router.push('/teacher')} style={{ marginBottom: '20px', padding: '8px 16px' }}>
          ← Back to Dashboard
        </button>

        <h1 style={{ fontSize: '22px', marginBottom: '15px' }}>Print Result</h1>

        <div style={{ marginBottom: '10px' }}>
          <label>Student: </label>
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} style={{ padding: '6px', marginLeft: '8px' }}>
            <option value="">Select Student</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.admission_no})</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Term: </label>
          <select value={termId} onChange={(e) => setTermId(e.target.value)} style={{ padding: '6px', marginLeft: '8px' }}>
            <option value="">Select Term</option>
            {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <button onClick={handleGenerate} style={{ padding: '10px 20px', background: '#000', color: '#fff', marginRight: '10px' }}>
          Generate
        </button>

        {loaded && (
          <button onClick={() => window.print()} style={{ padding: '10px 20px', background: '#0a0', color: '#fff' }}>
            Print / Save as PDF
          </button>
        )}

        <hr style={{ margin: '20px 0' }} />
      </div>

      {loaded && studentInfo && (
        <div style={{ border: '2px solid #000', padding: '25px' }}>
          <div style={{ textAlign: 'center', marginBottom: '15px' }}>
            {school?.logo_url && <img src={school.logo_url} alt="School Logo" width={60} style={{ marginBottom: '8px' }} />}
            <h2 style={{ margin: 0 }}>{school?.school_name || 'School Name'}</h2>
            {school?.address && <p style={{ margin: '4px 0', fontSize: '13px' }}>{school.address}</p>}
            {(school?.phone || school?.email) && (
              <p style={{ margin: '4px 0', fontSize: '13px' }}>
                {school?.phone && `Tel: ${school.phone}`} {school?.email && `| Email: ${school.email}`}
              </p>
            )}
            <h3 style={{ marginTop: '10px' }}>TERM REPORT SHEET</h3>
          </div>

          <table style={{ width: '100%', marginBottom: '15px', fontSize: '14px' }}>
            <tbody>
              <tr>
                <td><strong>Name:</strong> {studentInfo.full_name}</td>
                <td><strong>Gender:</strong> {studentInfo.gender || '-'}</td>
              </tr>
              <tr>
                <td><strong>Admission No:</strong> {studentInfo.admission_no}</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '15px' }}>
            <thead>
              <tr style={{ background: '#eee' }}>
                <th style={{ border: '1px solid #000', padding: '5px' }}>Subject</th>
                <th style={{ border: '1px solid #000', padding: '5px' }}>1st CA</th>
                <th style={{ border: '1px solid #000', padding: '5px' }}>2nd CA</th>
                <th style={{ border: '1px solid #000', padding: '5px' }}>Exam</th>
                <th style={{ border: '1px solid #000', padding: '5px' }}>Total</th>
                <th style={{ border: '1px solid #000', padding: '5px' }}>Class Highest</th>
                <th style={{ border: '1px solid #000', padding: '5px' }}>Grade</th>
                <th style={{ border: '1px solid #000', padding: '5px' }}>Remark</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.subject_name}>
                  <td style={{ border: '1px solid #000', padding: '5px' }}>{r.subject_name}</td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{r.ca1 ?? '-'}</td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{r.ca2 ?? '-'}</td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{r.exam ?? '-'}</td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{r.total}</td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{r.classHighest ?? '-'}</td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{r.grade}</td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{r.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p><strong>Grand Total:</strong> {grandTotal} &nbsp;&nbsp; <strong>Average:</strong> {average.toFixed(1)}%</p>

          <table style={{ width: '100%', marginTop: '15px', fontSize: '13px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '6px', border: '1px solid #000', width: '30%' }}><strong>Class Teacher's Comment</strong></td>
                <td style={{ padding: '6px', border: '1px solid #000' }}>{teacherComment || '-'}</td>
              </tr>
              <tr>
                <td style={{ padding: '6px', border: '1px solid #000' }}><strong>Principal's Comment</strong></td>
                <td style={{ padding: '6px', border: '1px solid #000' }}>{principalComment(average)}</td>
              </tr>
            </tbody>
          </table>

          <p style={{ fontSize: '11px', textAlign: 'center', marginTop: '20px' }}>
            This is a computer generated report sheet and is deemed authentic if devoid of alterations.
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '15px' }}>
            <div>
              {school?.signature_url ? (
                <img src={school.signature_url} alt="Principal's Signature" height={50} />
              ) : (
                <p style={{ margin: 0 }}>___________________</p>
              )}
              <p style={{ margin: 0, fontSize: '12px' }}>Principal's Signature</p>
            </div>
            <img src={qrImageUrl} alt="Verification QR Code" width={100} height={100} />
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}