import Link from 'next/link'
import { LogoIcon } from '@/components/logo'
import Footer from '@/components/footer'

export const metadata = {
  title: 'Terms of Service — FBMonitor',
  description: 'Terms of Service for FBMonitor. Read our rules, limitations, and your rights as a subscriber.',
}

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoIcon className="size-6" />
            <span className="font-bold tracking-tight">FBMonitor</span>
          </Link>
          <Link href="/" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
            ← Back to Home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-20">
        <div className="mb-12">
          <span className="text-primary text-sm font-semibold uppercase tracking-widest">Legal</span>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Terms of Service</h1>
          <p className="text-muted-foreground mt-2 text-sm">Last updated: August 26, 2026</p>
        </div>

        <div className="space-y-8 text-[15px] leading-relaxed">

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By creating an account and using FBMonitor, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">2. Description of Service</h2>
            <p className="text-muted-foreground">
              FBMonitor is a community analytics platform that helps members of Facebook groups stay informed about activity in their communities. Users connect their own authorized Facebook accounts to sync content from groups they are already members of. The service provides keyword filtering, activity analytics, and insights dashboards. The service is provided on a subscription basis with plans defined at the time of purchase.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">3. Eligibility</h2>
            <p className="text-muted-foreground">
              You must be at least 18 years old to use FBMonitor. By using the service you represent that you meet this requirement. The service is intended for legitimate community management, research, and business intelligence purposes only.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">4. Your Responsibilities</h2>
            <ul className="text-muted-foreground list-disc space-y-1.5 pl-5">
              <li>You are solely responsible for ensuring you are an authorized member of every Facebook group you connect to FBMonitor.</li>
              <li>You must ensure your use of FBMonitor complies with Facebook's Terms of Service and applicable laws in your jurisdiction.</li>
              <li>You may only connect Facebook groups you personally have authorized access to. Do not attempt to access groups you are not a member of.</li>
              <li>You may not use FBMonitor to harass, stalk, spam, or harm any individual or group.</li>
              <li>You may not resell, redistribute, or sublicense access to the platform without written permission.</li>
              <li>You are responsible for keeping your account credentials and Facebook session secure.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">5. Subscriptions & Billing</h2>
            <ul className="text-muted-foreground list-disc space-y-1.5 pl-5">
              <li>Subscriptions are billed monthly through Polar, our payment provider.</li>
              <li>You may cancel at any time. Your access continues until the end of the current billing period.</li>
              <li>We do not offer refunds for partial billing periods unless required by law.</li>
              <li>We reserve the right to change pricing with 30 days notice to active subscribers.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">6. Acceptable Use</h2>
            <p className="text-muted-foreground">You agree NOT to use FBMonitor to:</p>
            <ul className="text-muted-foreground list-disc space-y-1.5 pl-5">
              <li>Collect data for illegal purposes or in violation of any privacy laws.</li>
              <li>Scrape groups you do not have permission to access.</li>
              <li>Attempt to reverse-engineer, decompile, or disrupt the platform.</li>
              <li>Exceed API or scraping limits in a way that degrades service for other users.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">7. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground">
              FBMonitor is provided "as is" without warranties of any kind. We do not guarantee uninterrupted service, scraping success rates, or the accuracy of data collected. Facebook may change its platform at any time in ways that affect scraping functionality.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">8. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              To the maximum extent permitted by law, FBMonitor and its creator shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform, even if advised of the possibility of such damages.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">9. Termination</h2>
            <p className="text-muted-foreground">
              We reserve the right to suspend or terminate your account at any time if you violate these Terms. You may terminate your account at any time by cancelling your subscription and stopping use of the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">10. Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms are governed by the laws of Pakistan. Any disputes will be resolved through good-faith negotiation first, and if unresolved, through binding arbitration.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">11. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We may update these Terms at any time. Continued use of FBMonitor after changes are posted constitutes acceptance of the new Terms. We will notify active subscribers of material changes via email.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">12. Contact</h2>
            <p className="text-muted-foreground">
              Questions about these Terms? Contact us at{' '}
              <Link href="mailto:contact@draurangzebabbas.com" className="text-primary font-medium hover:underline">
                contact@draurangzebabbas.com
              </Link>.
            </p>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  )
}
