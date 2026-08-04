'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Option = { id: string; name: string };
const inputClass = 'w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent';
const labelClass = 'block text-xs font-medium text-slate uppercase tracking-wide mb-1.5';

export default function TeacherAddStudentPage() {
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
      const { data: sessionData } = await supabase.from('sessions').select('id').eq('is_active', true).single();
      if (sessionData) setActiveSessionId(sessionData.id);
    };
    loadOptions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!classId) { setError('Please select a class.'); return; }
    if (!activeSessionId) { setError('No active session found.'); return; }

    setLoading(true);
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .insert({ full_name: fullName, admission_no: admissionNo, gender, parent_name: parentName, parent_phone: parentPhone, parent_email: parentEmail })
      .select('id').single();

    if (studentError || !studentData) {
      setError(studentError?.message || 'Failed to create student.');
      setLoading(false);
      return;
    }

    const { error: enrollError } = await supabase.from('class_enrollments').insert({ student_id: studentData.id, class_id: classId, session_id: activeSessionId });
    setLoading(false);

    if (enrollError) {
      setError(`Student created, but enrollment failed: ${enrollError.message}`);
    } else {
      setSuccess('Student added and enrolled successfully.');
      setFullName(''); setAdmissionNo(''); setGender(''); setParentName(''); setParentPhone(''); setParentEmail(''); setClassId('');
    }
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
        <h1 className="font-display text-2xl text-navy-900 mb-1">Add Student</h1>
        <p className="text-slate text-sm mb-6">Register a new student and assign their class.</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
          <div>
            <label className={labelClass}>Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Admission Number</label>
            <input type="text" value={admissionNo} onChange={(e) => setAdmissionNo(e.target.value)} required className={`${inputClass} font-mono`} />
          </div>
          <div>
            <label className={labelClass}>Class</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} required className={inputClass}>
              <option value="">Select Class</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Gender</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputClass}>
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Parent Name</label>
            <input type="text" value={parentName} onChange={(e) => setParentName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Parent Phone</label>
            <input type="text" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Parent Email</label>
            <input type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} className={inputClass} />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          {success && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{success}</p>}

          <button type="submit" disabled={loading} className="w-full bg-navy-900 hover:bg-navy-800 text-white font-medium text-sm py-3 rounded-lg transition-colors disabled:opacity-60">
            {loading ? 'Saving...' : 'Add Student'}
          </button>
        </form>
      </main>
    </div>
  );
}