import HeroSection from '@/components/hero-section-one'
import Pricing from '@/components/pricing'
import FAQsThree from '@/components/faqs-3'
import Footer from '@/components/footer'
import { createClient } from '@/utils/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let activePlanId: string | null = null
  if (user) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan_id')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    activePlanId = sub?.plan_id ?? null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <HeroSection />
      <Pricing activePlanId={activePlanId} />
      <FAQsThree />
      <Footer />
    </div>
  )
}
