import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import SignUpPage from '@/components/sign-up'

export default async function SignUp() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return <SignUpPage />
}
