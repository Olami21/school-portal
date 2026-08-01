'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Option = { id: string; name: string };
type ScoreRow = {
  subject_name: string;
  ca1: number | null;
  ca2: number | null;
  exam: number | null;
  total: number;
  grade: string;
  remark: string;
};

export default function PrintResultPage() {
  const [students, setStudents] = useState<{ id: string; full_name: string; admission_no: string }[]>([]);
  const [terms, setTerms] = useState<Option[]>([]);
  const [studentId, setStudentId] = useState('');
  const [termId, setTermId] = useState('');

  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadOptions = async () => {
      const { data: studentData } = await supabase
        .from('students')
        .select('id, full_name, admission_no')
        .order('full_name');
      setStudents(studentData || []);

      const { data: termData } = await supabase.from('terms').select('id, name').order('name');
      setTerms(termData || []);
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

    const { data: components } = await supabase
      .from('score_components')
      .select('component, score, subjects(name)')
      .eq('student_id', studentId)
      .eq('term_id', termId);

    const { data: gradingScale } = await supabase
      .from('grading_scale')
      .select('min_score, max_score, grade, remark');

    const bySubject: Record<string, any> = {};
    (components || []).forEach((c: any) => {
      const name = c.subjects?.name || 'Unknown';
      if (!bySubject[name]) bySubject[name] = { ca1: null, ca2: null, exam: null };
      if (c.component === 'CA1') bySubject[name].ca1 = c.score;
      if (c.component === 'CA2') bySubject[name].ca2 = c.score;
      if (c.component === 'EXAM') bySubject[name].exam = c.score;
    });

    const result: ScoreRow[] = Object.entries(bySubject).map(([name, vals]: any) => {
      const total = (vals.ca1 || 0) + (vals.ca2 || 0) + (vals.exam || 0);
      const band = (gradingScale || []).find((g: any) => total >= g.min_score && total <= g.max_score);
      return {
        subject_name: name,
        ca1: vals.ca1,
        ca2: vals.ca2,
        exam: vals.exam,
        total,
        grade: band?.grade || '-',
        remark: band?.remark || '-',
      };
    });

    setRows(result);
    setLoaded(true);
  };

  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);
  const average = rows.length > 0 ? (grandTotal / rows.length).toFixed(1) : '0';

  const verifyUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/verify?student=${studentId}&term=${termId}`
      : '';
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verifyUrl)}`;

  return (
    <div style={{ maxWidth: '700px', margin: '20px auto', padding: '20px' }}>
      <div className="no-print">
        <button onClick={() => router.push('/admin')} style={{ marginBottom: '20px', padding: '8px 16px' }}>
          ← Back to Dashboard
        </button>

        <h1 style={{ fontSize: '22px', marginBottom: '15px' }}>Print Result</h1>

        <div style={{ marginBottom: '10px' }}>
          <label>Student: </label>
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} style={{ padding: '6px', marginLeft: '8px' }}>
            <option value="">Select Student</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.full_name} ({s.admission_no})</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Term: </label>
          <select value={termId} onChange={(e) => setTermId(e.target.value)} style={{ padding: '6px', marginLeft: '8px' }}>
            <option value="">Select Term</option>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
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
        <div style={{ border: '2px solid #000', padding: '25px', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: '15px' }}>
            <h2 style={{ margin: 0 }}>YOUR SCHOOL NAME</h2>
            <p style={{ margin: '4px 0', fontSize: '13px' }}>School Address Line</p>
            <p style={{ margin: '4px 0', fontSize: '13px' }}>Tel: xxx | Email: xxx</p>
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

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '15px' }}>
            <thead>
              <tr style={{ background: '#eee' }}>
                <th style={{ border: '1px solid #000', padding: '6px' }}>Subject</th>
                <th style={{ border: '1px solid #000', padding: '6px' }}>1st CA</th>
                <th style={{ border: '1px solid #000', padding: '6px' }}>2nd CA</th>
                <th style={{ border: '1px solid #000', padding: '6px' }}>Exam</th>
                <th style={{ border: '1px solid #000', padding: '6px' }}>Total</th>
                <th style={{ border: '1px solid #000', padding: '6px' }}>Grade</th>
                <th style={{ border: '1px solid #000', padding: '6px' }}>Remark</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.subject_name}>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{r.subject_name}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{r.ca1 ?? '-'}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{r.ca2 ?? '-'}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{r.exam ?? '-'}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{r.total}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{r.grade}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{r.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p><strong>Grand Total:</strong> {grandTotal} &nbsp;&nbsp; <strong>Average:</strong> {average}%</p>

          <p style={{ fontSize: '11px', textAlign: 'center', marginTop: '20px' }}>
            This is a computer generated report sheet and is deemed authentic if devoid of alterations.
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
            <div>
              <p style={{ margin: 0, fontSize: '12px' }}>___________________</p>
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