'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
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

      if (profile?.role !== 'admin') {
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

  const links = [
    { label: 'Students List', path: '/admin/students-list' },
    { label: 'Add Student', path: '/admin/students' },
    { label: 'Create Student Login', path: '/admin/student-login' },
    { label: 'Add Teacher', path: '/admin/teachers' },
    { label: 'Print Result', path: '/admin/print-result' },
  ];

  return (
    <div style={{ padding: '40px' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>
        Admin Dashboard — Welcome, {fullName}
      </h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '30px' }}>
        {links.map((link) => (
          <button
            key={link.path}
            onClick={() => router.push(link.path)}
            style={{ padding: '12px 20px', background: '#000', color: '#fff' }}
          >
            {link.label}
          </button>
        ))}
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