import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import LoginPage from '@/components/login'

export default async function Login() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return <LoginPage />
}
