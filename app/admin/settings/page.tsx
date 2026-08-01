'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SchoolSettingsPage() {
  const [settingsId, setSettingsId] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('school_settings').select('*').single();
      if (data) {
        setSettingsId(data.id);
        setSchoolName(data.school_name || '');
        setAddress(data.address || '');
        setPhone(data.phone || '');
        setEmail(data.email || '');
        setLogoUrl(data.logo_url || '');
        setSignatureUrl(data.signature_url || '');
      }
    };
    load();
  }, []);

  const uploadFile = async (file: File, prefix: string) => {
    const fileName = `${prefix}-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('branding').upload(fileName, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('branding').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      let newLogoUrl = logoUrl;
      let newSignatureUrl = signatureUrl;

      if (logoFile) newLogoUrl = await uploadFile(logoFile, 'logo');
      if (signatureFile) newSignatureUrl = await uploadFile(signatureFile, 'signature');

      const { error: updateError } = await supabase
        .from('school_settings')
        .update({
          school_name: schoolName,
          address,
          phone,
          email,
          logo_url: newLogoUrl,
          signature_url: newSignatureUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settingsId);

      if (updateError) throw updateError;

      setLogoUrl(newLogoUrl);
      setSignatureUrl(newSignatureUrl);
      setSuccess('Settings saved.');
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    }

    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '500px', margin: '40px auto', padding: '20px' }}>
      <button onClick={() => router.push('/admin')} style={{ marginBottom: '20px', padding: '8px 16px' }}>
        ← Back to Dashboard
      </button>

      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>School Settings</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>School Name</label>
          <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Address</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Phone</label>
          <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>School Logo</label><br />
          {logoUrl && <img src={logoUrl} alt="Current logo" width={60} style={{ marginBottom: '8px' }} />}
          <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Principal's Signature</label><br />
          {signatureUrl && <img src={signatureUrl} alt="Current signature" width={100} style={{ marginBottom: '8px' }} />}
          <input type="file" accept="image/*" onChange={(e) => setSignatureFile(e.target.files?.[0] || null)} />
        </div>

        {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}
        {success && <p style={{ color: 'green', marginBottom: '10px' }}>{success}</p>}

        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', background: '#000', color: '#fff' }}>
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}