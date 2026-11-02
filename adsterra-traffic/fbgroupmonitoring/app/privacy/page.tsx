import Link from 'next/link'
import { LogoIcon } from '@/components/logo'
import Footer from '@/components/footer'

export const metadata = {
  title: 'Privacy Policy — FBMonitor',
  description: 'Privacy Policy for FBMonitor. Learn how we collect, use, and protect your personal data.',
}

export default function PrivacyPage() {
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
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-muted-foreground mt-2 text-sm">Last updated: August 26, 2026</p>
        </div>

        <div className="space-y-8 text-[15px] leading-relaxed">

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">1. Information We Collect</h2>
            <p className="text-muted-foreground">We collect the following types of information when you use FBMonitor:</p>
            <ul className="text-muted-foreground list-disc space-y-1.5 pl-5">
              <li><strong className="text-foreground">Account Information:</strong> Your email address and authentication credentials when you sign up.</li>
              <li><strong className="text-foreground">Subscription Data:</strong> Billing information processed by Polar (our payment provider). We do not store card details.</li>
              <li><strong className="text-foreground">Facebook Session Credentials:</strong> If you add your personal Facebook session for accessing private groups you are a member of, it is encrypted with AES-256 and stored securely. It is never logged, never shared, and only decrypted in memory during your authorized data sync.</li>
              <li><strong className="text-foreground">Community Activity Data:</strong> Post content and activity from Facebook groups you are a member of, accessed through your own authorized account credentials.</li>
              <li><strong className="text-foreground">Analytics:</strong> Aggregated hourly activity statistics and keyword match data used to power your personal dashboard.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">2. Authorized Access Model</h2>
            <p className="text-muted-foreground">
              FBMonitor operates strictly on an authorized access model. All Facebook group data retrieved through our platform is accessed using the user's own Facebook session credentials — the same credentials the user would use to browse those groups directly. FBMonitor does not access any group data that the user does not already have personal permission to view. Users are solely responsible for ensuring they are authorized members of the groups they choose to connect.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">3. How We Use Your Information</h2>
            <ul className="text-muted-foreground list-disc space-y-1.5 pl-5">
              <li>To provide and operate the FBMonitor platform and analytics dashboard.</li>
              <li>To process payments and manage your subscription.</li>
              <li>To sync activity from Facebook groups you are a member of, using your own credentials.</li>
              <li>To send transactional emails (e.g., account confirmation, billing receipts).</li>
              <li>To improve the platform and fix bugs.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">4. Data Storage & Security</h2>
            <p className="text-muted-foreground">
              All data is stored in Supabase (hosted on AWS). Your Facebook session credentials are encrypted at rest using AES-256. We use Row Level Security (RLS) to ensure each user can only access their own data. Connections are encrypted via HTTPS/TLS.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">5. Data Sharing</h2>
            <p className="text-muted-foreground">
              We do not sell, rent, or share your personal data with third parties, except:
            </p>
            <ul className="text-muted-foreground list-disc space-y-1.5 pl-5">
              <li><strong className="text-foreground">Polar:</strong> Our payment processor, for subscription billing.</li>
              <li><strong className="text-foreground">Apify:</strong> Our data retrieval infrastructure, which performs authorized community data syncs on behalf of users using their own credentials.</li>
              <li><strong className="text-foreground">Legal Requirements:</strong> If required by law or to protect our rights.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">6. Data Retention</h2>
            <p className="text-muted-foreground">
              Raw community post content is automatically removed after 7 days. Aggregated hourly activity statistics and keyword match statistics are retained indefinitely while your account is active. You can request deletion of your account and all associated data at any time by contacting us.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">7. Your Rights</h2>
            <p className="text-muted-foreground">You have the right to:</p>
            <ul className="text-muted-foreground list-disc space-y-1.5 pl-5">
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your account and data.</li>
              <li>Cancel your subscription at any time without penalty.</li>
            </ul>
            <p className="text-muted-foreground">To exercise any of these rights, contact us at <Link href="mailto:contact@draurangzebabbas.com" className="text-primary font-medium hover:underline">contact@draurangzebabbas.com</Link>.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">8. Cookies</h2>
            <p className="text-muted-foreground">
              We use essential cookies for authentication (Supabase session management). We do not use advertising or tracking cookies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">9. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of significant changes by email or via an in-app notice. Continued use of FBMonitor after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">10. Contact</h2>
            <p className="text-muted-foreground">
              If you have any questions about this Privacy Policy, contact us at{' '}
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
