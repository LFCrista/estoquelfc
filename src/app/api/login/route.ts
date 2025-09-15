import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    .select('role, status')
    .eq('id', user.id)
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

  // Se passou, retorna dados do usuário + role/status
  return NextResponse.json({
    user: {
      ...user,
      role: profile.role,
      status: profile.status,
    },
  })
}
