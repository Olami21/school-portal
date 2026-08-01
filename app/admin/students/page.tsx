'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Option = { id: string; name: string };

export default function AddStudentPage() {
  const [fullName, setFullName] = useState('');
  const [admissionNo, setAdmissionNo] = useState('');
  const [gender, setGender] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [classId, setClassId] = useState('');

  const [classes, setClasses] = useState<Option[]>([]);
  const [activeSessionId, setActiveSessionId] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadOptions = async () => {
      const { data: classData } = await supabase.from('classes').select('id, name').order('name');
      setClasses(classData || []);

      const { data: sessionData } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .single();

      if (sessionData) setActiveSessionId(sessionData.id);
    };
    loadOptions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!classId) {
      setError('Please select a class.');
      return;
    }
    if (!activeSessionId) {
      setError('No active session found. Set one as active in Supabase first.');
      return;
    }

    setLoading(true);

    // 1. Create the student
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .insert({
        full_name: fullName,
        admission_no: admissionNo,
        gender: gender,
        parent_name: parentName,
        parent_phone: parentPhone,
        parent_email: parentEmail,
      })
      .select('id')
      .single();

    if (studentError || !studentData) {
      setError(studentError?.message || 'Failed to create student.');
      setLoading(false);
      return;
    }

    // 2. Enroll them in the selected class for the active session
    const { error: enrollError } = await supabase.from('class_enrollments').insert({
      student_id: studentData.id,
      class_id: classId,
      session_id: activeSessionId,
    });

    setLoading(false);

    if (enrollError) {
      setError(`Student created, but enrollment failed: ${enrollError.message}`);
    } else {
      setSuccess('Student added and enrolled successfully.');
      setFullName('');
      setAdmissionNo('');
      setGender('');
      setParentName('');
      setParentPhone('');
      setParentEmail('');
      setClassId('');
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

      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>Add Student</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Admission Number</label>
          <input
            type="text"
            value={admissionNo}
            onChange={(e) => setAdmissionNo(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Class</label>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          >
            <option value="">Select Class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Gender</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          >
            <option value="">Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Parent Name</label>
          <input
            type="text"
            value={parentName}
            onChange={(e) => setParentName(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Parent Phone</label>
          <input
            type="text"
            value={parentPhone}
            onChange={(e) => setParentPhone(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Parent Email</label>
          <input
            type="email"
            value={parentEmail}
            onChange={(e) => setParentEmail(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}
        {success && <p style={{ color: 'green', marginBottom: '10px' }}>{success}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '10px', background: '#000', color: '#fff' }}
        >
          {loading ? 'Saving...' : 'Add Student'}
        </button>
      </form>
    </div>
  );
}