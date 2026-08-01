'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function TeacherDashboard() {
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'teacher') {
        router.push('/login');
        return;
      }

      setFullName(profile.full_name);
      setLoading(false);
    };
    check();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <p style={{ padding: '40px' }}>Loading...</p>;

  return (
    <div style={{ padding: '40px' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>
        Teacher Dashboard — Welcome, {fullName}
      </h1>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        <button
          onClick={() => router.push('/teacher/scores')}
          style={{ padding: '10px 20px', background: '#000', color: '#fff' }}
        >
          Enter Scores
        </button>
      </div>

      <button
        onClick={handleLogout}
        style={{ padding: '10px 20px', background: '#333', color: '#fff' }}
      >
        Log Out
      </button>
    </div>
  );
}