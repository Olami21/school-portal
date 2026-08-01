'use client';

import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  const audiences = [
    {
      label: 'Students & Parents',
      desc: 'Check term results, scores, and grades using your admission number.',
    },
    {
      label: 'Teachers',
      desc: 'Enter scores, add remarks, and print result sheets for your students.',
    },
    {
      label: 'Admin',
      desc: 'Manage students, staff, and school records.',
    },
  ];

  return (
    <div className="min-h-screen bg-navy-950">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(201,162,39,0.10),transparent_55%)]" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-b from-gold-300 to-gold-600 flex items-center justify-center shadow-lg ring-4 ring-gold-500/20">
              <span className="font-display font-semibold text-navy-950 text-sm tracking-wide">WLMS</span>
            </div>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl text-white mb-3">
            Wonderland Model School
          </h1>
          <p className="text-navy-300 text-base sm:text-lg max-w-md mx-auto mb-8">
            The official portal for results, records, and academic reports —
            all in one place.
          </p>

          <button
            onClick={() => router.push('/login')}
            className="bg-gold-500 hover:bg-gold-600 text-navy-950 font-semibold text-sm px-8 py-3 rounded-lg transition-colors"
          >
            Log In
          </button>
        </div>

        {/* Audience cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {audiences.map((a) => (
            <div
              key={a.label}
              className="bg-white/5 border border-white/10 rounded-xl p-6 text-center backdrop-blur-sm"
            >
              <h3 className="font-display text-lg text-gold-300 mb-2">{a.label}</h3>
              <p className="text-navy-300 text-sm leading-relaxed">{a.desc}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-navy-400 text-xs mt-16">
          © {new Date().getFullYear()} Wonderland Model School. All rights reserved.
        </p>
      </div>
    </div>
  );
}