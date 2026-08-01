'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const router = useRouter();

  useEffect(() => {
    const loadProfile = async () => {
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

      if (profile) {
        setFullName(profile.full_name);
        setRole(profile.role);
      }

      setLoading(false);
    };

    loadProfile();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return <p style={{ padding: '40px' }}>Loading...</p>;
  }

  return (
    <div style={{ padding: '40px' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>
        Welcome, {fullName}
      </h1>
      <p style={{ marginBottom: '20px' }}>Role: {role}</p>
      <button
        onClick={handleLogout}
        style={{ padding: '10px 20px', background: '#000', color: '#fff' }}
      >
        Log Out
      </button>
    </div>
  );
}