'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const inputClass = 'w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent';
const labelClass = 'block text-xs font-medium text-slate uppercase tracking-wide mb-1.5';

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
        .update({ school_name: schoolName, address, phone, email, logo_url: newLogoUrl, signature_url: newSignatureUrl, updated_at: new Date().toISOString() })
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
    <div className="min-h-screen bg-paper">
      <header className="bg-navy-900">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button onClick={() => router.push('/admin')} className="text-navy-200 hover:text-white text-sm">← Dashboard</button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-b from-gold-300 to-gold-600 flex items-center justify-center">
            <span className="font-display font-semibold text-navy-950 text-[9px]">WLMS</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="font-display text-2xl text-navy-900 mb-1">School Settings</h1>
        <p className="text-slate text-sm mb-6">Update branding used across printed results.</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
          <div>
            <label className={labelClass}>School Name</label>
            <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Address</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>School Logo</label>
            {logoUrl && <img src={logoUrl} alt="Current logo" width={60} className="mb-2 rounded" />}
            <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="text-sm text-slate" />
          </div>

          <div>
            <label className={labelClass}>Principal's Signature</label>
            {signatureUrl && <img src={signatureUrl} alt="Current signature" width={100} className="mb-2" />}
            <input type="file" accept="image/*" onChange={(e) => setSignatureFile(e.target.files?.[0] || null)} className="text-sm text-slate" />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          {success && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{success}</p>}

          <button type="submit" disabled={loading} className="w-full bg-navy-900 hover:bg-navy-800 text-white font-medium text-sm py-3 rounded-lg transition-colors disabled:opacity-60">
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </main>
    </div>
  );
}