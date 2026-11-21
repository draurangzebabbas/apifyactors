import HeroSection from '@/components/hero-section-one'
import Pricing from '@/components/pricing'
import FAQsThree from '@/components/faqs-3'
import Footer from '@/components/footer'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <HeroSection />
      <Pricing />
      <FAQsThree />
      <Footer />
    </div>
  )
}
