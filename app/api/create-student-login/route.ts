import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { studentId } = await req.json();

    if (!studentId) {
      return NextResponse.json({ error: 'Missing student ID.' }, { status: 400 });
    }

    // Look up the student's admission number and name
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, full_name, admission_no')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 400 });
    }

    // Auto-generate credentials: admission number is both username and password
    const internalEmail = `${student.admission_no.toLowerCase()}@school.internal`;
    const password = student.admission_no;

    // 1. Create the login
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password,
      email_confirm: true,
    });

    if (userError || !userData.user) {
      return NextResponse.json({ error: userError?.message || 'Failed to create login.' }, { status: 400 });
    }

    const userId = userData.user.id;

    // 2. Create the profile row (role = student)
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: userId,
      role: 'student',
      full_name: student.full_name,
    });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    // 3. Link the student record to this new login
    const { error: linkError } = await supabaseAdmin
      .from('students')
      .update({ profile_id: userId })
      .eq('id', studentId);

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      username: student.admission_no,
      password: student.admission_no,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unexpected error.' }, { status: 500 });
  }
}