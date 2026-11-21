import Link from 'next/link'
import { LogoIcon } from '@/components/logo'
import Footer from '@/components/footer'

export const metadata = {
  title: 'About — TrafficFlow',
  description: 'Learn about TrafficFlow, the automated headless browser platform for authentic website traffic, Google SERP organic clicks, and referral generation.',
}

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoIcon className="size-7" />
            <span className="font-bold tracking-tight text-lg">TrafficFlow</span>
          </Link>
          <Link href="/" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
            ← Back to Home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-20">
        <div className="mb-12">
          <span className="text-primary text-xs font-semibold uppercase tracking-widest">About</span>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Authentic Website Traffic & SERP Automation</h1>
          <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
            TrafficFlow was built to deliver genuine, high-fidelity website engagement that registers accurately in analytics platforms and helps publishers, digital marketers, and SEO agencies test, optimize, and rank at scale.
          </p>
        </div>

        <div className="space-y-10 text-[15px] leading-relaxed">
          <section>
            <h2 className="mb-3 text-xl font-semibold">What is TrafficFlow?</h2>
            <p className="text-muted-foreground">
              TrafficFlow is a cloud-based traffic automation platform powered by real headless Chromium browsers running on global residential proxy networks. Unlike low-quality scrapers or curl scripts that bounce immediately, our sessions execute complete JavaScript applications, simulate realistic mouse movements, scroll down pages naturally, and interact with internal navigation.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Engineered for Accuracy & Safety</h2>
            <p className="text-muted-foreground">
              Every traffic batch is designed to mimic authentic human behavior. You can customize dwell times from 15 to 120 seconds, configure device types across Desktop Chrome and Mobile iOS/Android, and distribute visits across customizable day/night curves with randomized human jitter to prevent artificial traffic spikes.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Google SERP Click Simulation</h2>
            <p className="text-muted-foreground">
              Our specialized Google SERP mode automates live Google searches for your keywords, locates your domain in the top 20 organic search results, and clicks through naturally. This helps search engines register authentic organic search volume and click-through interest for your target pages.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">How it works</h2>
            <ol className="text-muted-foreground list-decimal space-y-2 pl-5">
              <li>Create your free TrafficFlow account.</li>
              <li>Top up credits using our flexible pay-as-you-go pricing ($1 = 1,000 visits).</li>
              <li>Configure your target URLs, traffic channel (SERP, Referral, or Direct), and dwell settings.</li>
              <li>Launch your campaign and watch real-time batch execution with full diagnostics in your dashboard.</li>
            </ol>
          </section>
        </div>

        <div className="mt-14 pt-8 border-t flex items-center justify-between">
          <Link href="/dashboard" className="text-primary font-medium hover:underline text-sm">
            Launch your first campaign →
          </Link>
          <Link href="/#pricing" className="text-muted-foreground hover:text-foreground text-sm">
            View Pricing
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}
