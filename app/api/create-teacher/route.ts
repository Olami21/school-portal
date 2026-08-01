import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { fullName, email, password } = await req.json();

    if (!fullName || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // 1. Create the actual login
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (userError || !userData.user) {
      return NextResponse.json({ error: userError?.message || 'Failed to create user.' }, { status: 400 });
    }

    const userId = userData.user.id;

    // 2. Create the profile row (role = teacher)
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: userId,
      role: 'teacher',
      full_name: fullName,
    });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    // 3. Create the teacher record
    const { error: teacherError } = await supabaseAdmin.from('teachers').insert({
      profile_id: userId,
      full_name: fullName,
    });

    if (teacherError) {
      return NextResponse.json({ error: teacherError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unexpected error.' }, { status: 500 });
  }
}
