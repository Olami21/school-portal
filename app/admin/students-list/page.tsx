'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Student = {
  id: string;
  full_name: string;
  admission_no: string;
  gender: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  is_active: boolean;
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

      if (error) {
        setError(error.message);
      } else {
        setStudents(data || []);
      }
      setLoading(false);
    };

    loadStudents();
  }, []);

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '20px' }}>
      <button
        onClick={() => router.push('/admin')}
        style={{ marginBottom: '20px', padding: '8px 16px' }}
      >
        ← Back to Dashboard
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px' }}>Students ({students.length})</h1>
        <button
          onClick={() => router.push('/admin/students')}
          style={{ padding: '10px 20px', background: '#000', color: '#fff' }}
        >
          + Add Student
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #000', textAlign: 'left' }}>
              <th style={{ padding: '10px' }}>Name</th>
              <th style={{ padding: '10px' }}>Admission No</th>
              <th style={{ padding: '10px' }}>Gender</th>
              <th style={{ padding: '10px' }}>Parent</th>
              <th style={{ padding: '10px' }}>Phone</th>
              <th style={{ padding: '10px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid #ccc' }}>
                <td style={{ padding: '10px' }}>{s.full_name}</td>
                <td style={{ padding: '10px' }}>{s.admission_no}</td>
                <td style={{ padding: '10px' }}>{s.gender || '-'}</td>
                <td style={{ padding: '10px' }}>{s.parent_name || '-'}</td>
                <td style={{ padding: '10px' }}>{s.parent_phone || '-'}</td>
                <td style={{ padding: '10px' }}>{s.is_active ? 'Active' : 'Inactive'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && students.length === 0 && <p>No students yet.</p>}
    </div>
  );
}
