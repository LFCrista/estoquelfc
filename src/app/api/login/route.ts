import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const { email, password } = await req.json()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // só no server!
  )

  // 1. Tenta logar
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message || 'Email ou senha inválidos' },
      { status: 400 }
    )
  }

  const user = data.user

  // 2. Busca o perfil do usuário
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, status') // Inclui o campo id
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json(
      { error: 'Perfil não encontrado. Contate o suporte.' },
      { status: 400 }
    )
  }

  // 3. Checa se está inativo
  if (profile.status === 'inativo') {
    return NextResponse.json(
      { error: 'Usuário está inativo. Contate o administrador.' },
      { status: 403 }
    )
  }

  // Define o token nos cookies
  (await
    // Define o token nos cookies
    cookies()).set('auth-token', user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });

  return NextResponse.json({
    user: {
      ...user,
      role: profile.role,
      status: profile.status,
      profileId: profile.id, 
    },
  })
}
