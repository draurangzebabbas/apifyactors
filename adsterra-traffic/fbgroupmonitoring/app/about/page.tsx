import Link from 'next/link'
import { LogoIcon } from '@/components/logo'
import Footer from '@/components/footer'

export const metadata = {
  title: 'About — FBMonitor',
  description: 'Learn about FBMonitor, a community analytics platform that helps you stay informed about activity in Facebook groups you already belong to.',
}

export default function AboutPage() {
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
          <span className="text-primary text-sm font-semibold uppercase tracking-widest">About</span>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Automated intelligence for Facebook communities</h1>
          <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
            FBMonitor was built to solve a real problem — keeping up with high-volume Facebook communities manually is exhausting and inefficient. We built an analytics platform that filters the noise automatically, so you never miss a conversation or lead that matters to you.
          </p>
        </div>

        <div className="space-y-10 text-[15px] leading-relaxed">
          <section>
            <h2 className="mb-3 text-xl font-semibold">What is FBMonitor?</h2>
            <p className="text-muted-foreground">
              FBMonitor is an intelligence platform that surfaces high-value insights from Facebook groups you are already a member of. Using your own authorized Facebook account credentials, FBMonitor accesses groups on your behalf and organizes the activity into a structured dashboard with keyword filtering, trend heatmaps, and post alerts.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Authorized access only</h2>
            <p className="text-muted-foreground">
              FBMonitor never accesses groups without the user's own credentials. Users authenticate using their own encrypted Facebook session, meaning all data access is performed securely through the user's personal authorized account. This is functionally equivalent to you reading posts in a group you belong to — FBMonitor simply automates the scrolling so you can focus on engaging.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Who is it for?</h2>
            <p className="text-muted-foreground">
              FBMonitor is built for community managers, researchers, marketers, and founders who want smarter, automated visibility into community conversations — without spending hours manually scrolling the feed every day. Stop missing leads and start growing.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">How it works</h2>
            <ol className="text-muted-foreground list-decimal space-y-2 pl-5">
              <li>Subscribe to a plan and create your account.</li>
              <li>Add the URLs of Facebook groups you are already a member of.</li>
              <li>Securely connect your own Facebook session credentials for authorized access.</li>
              <li>Define keyword rules to filter posts (e.g., "looking for recommendations").</li>
              <li>Your personal dashboard updates automatically with matching posts and trends.</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">The creator</h2>
            <p className="text-muted-foreground">
              FBMonitor was designed and built by{' '}
              <Link href="https://draurangzebabbas.com" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">
                Aurangzeb Abbas
              </Link>
              , a full-stack developer and digital entrepreneur based in Pakistan. Follow along on{' '}
              <Link href="https://x.com/draurangzebabas" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">
                X (Twitter)
              </Link>{' '}
              or{' '}
              <Link href="https://www.linkedin.com/in/draurangzeb/" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">
                LinkedIn
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Contact</h2>
            <p className="text-muted-foreground">
              For questions, partnership inquiries, or support, reach out at{' '}
              <Link href="mailto:contact@draurangzebabbas.com" className="text-primary font-medium hover:underline">
                contact@draurangzebabbas.com
              </Link>
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
