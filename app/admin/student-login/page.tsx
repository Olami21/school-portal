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

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select('id, full_name, admission_no, profile_id')
      .order('full_name');
    setStudents(data || []);
  };

  const handleCreate = async () => {
    setError('');
    setResult(null);

    if (!studentId) {
      setError('Please select a student.');
      return;
    }

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
      loadStudents(); // refresh list so "already has login" updates
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '40px auto', padding: '20px' }}>
      <button
        onClick={() => router.push('/admin')}
        style={{ marginBottom: '20px', padding: '8px 16px' }}
      >
        ← Back to Dashboard
      </button>

      <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>Create Student Login</h1>
      <p style={{ marginBottom: '20px', color: '#555' }}>
        The student's admission number becomes both their username and password.
      </p>

      <div style={{ marginBottom: '15px' }}>
        <label>Student</label>
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          style={{ width: '100%', padding: '8px', marginTop: '5px' }}
        >
          <option value="">Select Student</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name} ({s.admission_no}) {s.profile_id ? '— already has login' : ''}
            </option>
          ))}
        </select>
      </div>

      {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}

      {result && (
        <div style={{ background: '#e6ffe6', padding: '15px', marginBottom: '15px', border: '1px solid green' }}>
          <p><strong>Login created.</strong></p>
          <p>Username: <strong>{result.username}</strong></p>
          <p>Password: <strong>{result.password}</strong></p>
        </div>
      )}

      <button
        onClick={handleCreate}
        disabled={loading}
        style={{ width: '100%', padding: '10px', background: '#000', color: '#fff' }}
      >
        {loading ? 'Creating...' : 'Create Login'}
      </button>
    </div>
  );
}