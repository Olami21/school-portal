'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Option = { id: string; name: string };
type ScoreRow = {
  subject_name: string; subject_id: string; ca1: number | null; ca2: number | null; exam: number | null;
  total: number; grade: string; remark: string; classHighest: number | null;
};

function principalComment(average: number): string {
  if (average >= 70) return 'Excellent performance. Keep up the good work.';
  if (average >= 60) return 'Very good performance this term.';
  if (average >= 50) return 'Good performance. Keep improving.';
  if (average >= 40) return 'Average performance. You can improve on your performance next term.';
  return 'Poor performance. Serious improvement is needed next term.';
}

export default function PrintResultPage() {
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
    const { data: student } = await supabase.from('students').select('full_name, admission_no, gender').eq('id', studentId).single();
    setStudentInfo(student);

    const { data: term } = await supabase.from('terms').select('session_id').eq('id', termId).single();
    const { data: enrollment } = await supabase.from('class_enrollments').select('class_id').eq('student_id', studentId).eq('session_id', term?.session_id).single();
    const classId = enrollment?.class_id;

    const { data: components } = await supabase
      .from('score_components').select('component, score, subject_id, subjects(name)')
      .eq('student_id', studentId).eq('term_id', termId);
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
      const { data: classmates } = await supabase.from('class_enrollments').select('student_id').eq('class_id', classId).eq('session_id', term?.session_id);
      classmateIds = (classmates || []).map((c: any) => c.student_id);
    }

    const result: ScoreRow[] = [];
    for (const [name, vals] of Object.entries(bySubject) as any) {
      const total = (vals.ca1 || 0) + (vals.ca2 || 0) + (vals.exam || 0);
      const band = (gradingScale || []).find((g: any) => total >= g.min_score && total <= g.max_score);
      let classHighest: number | null = null;
      if (classmateIds.length > 0) {
        const { data: classScores } = await supabase.from('score_components').select('student_id, score').eq('subject_id', vals.subject_id).eq('term_id', termId).in('student_id', classmateIds);
        const totalsByStudent: Record<string, number> = {};
        (classScores || []).forEach((c: any) => { totalsByStudent[c.student_id] = (totalsByStudent[c.student_id] || 0) + c.score; });
        const allTotals = Object.values(totalsByStudent);
        classHighest = allTotals.length > 0 ? Math.max(...allTotals) : null;
      }
      result.push({ subject_name: name, subject_id: vals.subject_id, ca1: vals.ca1, ca2: vals.ca2, exam: vals.exam, total, grade: band?.grade || '-', remark: band?.remark || '-', classHighest });
    }
    setRows(result);

    const { data: commentData } = await supabase.from('report_comments').select('class_teacher_comment').eq('student_id', studentId).eq('term_id', termId).maybeSingle();
    setTeacherComment(commentData?.class_teacher_comment || '');
    setLoaded(true);
  };

  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);
  const average = rows.length > 0 ? grandTotal / rows.length : 0;
  const verifyUrl = typeof window !== 'undefined' ? `${window.location.origin}/verify?student=${studentId}&term=${termId}` : '';
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verifyUrl)}`;

  return (
    <div className="min-h-screen bg-paper">
      <div className="no-print">
        <header className="bg-navy-900">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <button onClick={() => router.push('/admin')} className="text-navy-200 hover:text-white text-sm">← Dashboard</button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-b from-gold-300 to-gold-600 flex items-center justify-center">
              <span className="font-display font-semibold text-navy-950 text-[9px]">WLMS</span>
            </div>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
          <h1 className="font-display text-2xl text-navy-900 mb-4">Print Result</h1>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate uppercase tracking-wide mb-1.5">Student</label>
                <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500">
                  <option value="">Select Student</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.admission_no})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate uppercase tracking-wide mb-1.5">Term</label>
                <select value={termId} onChange={(e) => setTermId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500">
                  <option value="">Select Term</option>
                  {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleGenerate} className="flex-1 bg-navy-900 hover:bg-navy-800 text-white font-medium text-sm py-2.5 rounded-lg transition-colors">
                Generate
              </button>
              {loaded && (
                <button onClick={() => window.print()} className="flex-1 bg-gold-500 hover:bg-gold-600 text-navy-950 font-semibold text-sm py-2.5 rounded-lg transition-colors">
                  Print / Save as PDF
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {loaded && studentInfo && (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-8">
          <div className="border-2 border-navy-900 rounded-lg p-6 bg-white">
            <div className="text-center mb-4 border-b-2 border-gold-500 pb-4">
              {school?.logo_url && <img src={school.logo_url} alt="School Logo" width={60} className="mx-auto mb-2" />}
              <h2 className="font-display text-xl text-navy-900">{school?.school_name || 'School Name'}</h2>
              {school?.address && <p className="text-xs text-slate mt-1">{school.address}</p>}
              {(school?.phone || school?.email) && (
                <p className="text-xs text-slate">{school?.phone && `Tel: ${school.phone}`} {school?.email && `| Email: ${school.email}`}</p>
              )}
              <h3 className="font-display text-sm text-gold-600 mt-2 tracking-wide">TERM REPORT SHEET</h3>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              <p><strong>Name:</strong> {studentInfo.full_name}</p>
              <p><strong>Gender:</strong> {studentInfo.gender || '-'}</p>
              <p><strong>Admission No:</strong> {studentInfo.admission_no}</p>
            </div>

            <div className="overflow-x-auto mb-4">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-navy-900 text-white">
                    <th className="border border-navy-900 px-2 py-2 text-left">Subject</th>
                    <th className="border border-navy-900 px-2 py-2">1st CA</th>
                    <th className="border border-navy-900 px-2 py-2">2nd CA</th>
                    <th className="border border-navy-900 px-2 py-2">Exam</th>
                    <th className="border border-navy-900 px-2 py-2">Total</th>
                    <th className="border border-navy-900 px-2 py-2">Class Highest</th>
                    <th className="border border-navy-900 px-2 py-2">Grade</th>
                    <th className="border border-navy-900 px-2 py-2">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.subject_name}>
                      <td className="border border-gray-300 px-2 py-1.5">{r.subject_name}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center font-mono">{r.ca1 ?? '-'}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center font-mono">{r.ca2 ?? '-'}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center font-mono">{r.exam ?? '-'}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center font-mono font-semibold">{r.total}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center font-mono">{r.classHighest ?? '-'}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center font-semibold">{r.grade}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center">{r.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-sm mb-3"><strong>Grand Total:</strong> {grandTotal} &nbsp;&nbsp; <strong>Average:</strong> {average.toFixed(1)}%</p>

            <table className="w-full text-xs border-collapse mb-4">
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-2 py-2 w-1/3 bg-gray-50"><strong>Class Teacher's Comment</strong></td>
                  <td className="border border-gray-300 px-2 py-2">{teacherComment || '-'}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-2 py-2 bg-gray-50"><strong>Principal's Comment</strong></td>
                  <td className="border border-gray-300 px-2 py-2">{principalComment(average)}</td>
                </tr>
              </tbody>
            </table>

            <p className="text-xs text-center text-slate mb-4">This is a computer generated report sheet and is deemed authentic if devoid of alterations.</p>

            <div className="flex justify-between items-end">
              <div>
                {school?.signature_url ? <img src={school.signature_url} alt="Signature" height={50} /> : <p className="text-sm">___________________</p>}
                <p className="text-xs text-slate">Principal's Signature</p>
              </div>
              <img src={qrImageUrl} alt="Verification QR" width={90} height={90} />
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}