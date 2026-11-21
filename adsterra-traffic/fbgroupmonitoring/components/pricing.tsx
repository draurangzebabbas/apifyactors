import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Pricing({ activePlanId }: { activePlanId?: string | null }) {
  const packages = [
    {
      name: 'Starter Package',
      visits: '10,000 Visits',
      price: '$10',
      period: '10,000 credits',
      popular: false,
      description: 'Ideal for testing new landing pages, small sites, or single URL boost.',
      href: '/billing',
      variant: 'outline' as const,
      features: [
        '10,000 Real Browser Visits',
        'Google SERP & Referral Traffic',
        'Desktop & Mobile User Agents',
        'Human Dwell Time (15s – 45s)',
        'Rotating Residential Proxies',
        'Automated Batch Scheduling',
      ],
    },
    {
      name: 'Growth Package',
      visits: '50,000 Visits',
      price: '$50',
      period: '50,000 credits',
      popular: true,
      description: 'Best for ongoing SEO campaigns, ranking pushes, and affiliate sites.',
      href: '/billing',
      variant: 'default' as const,
      features: [
        '50,000 Real Browser Visits',
        'Targeted Google Keyword Clicks',
        'Internal Multi-Page Navigation',
        'Custom Referrer Domain Spoofing',
        'Humanized Jitter & Day Curves',
        'Automatic SERP Unranked Pruning',
      ],
    },
    {
      name: 'Scale Package',
      visits: '100,000 Visits',
      price: '$100',
      period: '100,000 credits',
      popular: false,
      description: 'Maximum volume for marketing agencies, publishers, and high-traffic portals.',
      href: '/billing',
      variant: 'outline' as const,
      features: [
        '100,000 Real Browser Visits',
        '24/7 Recurring Daily Cycles',
        'Custom Proxy IP Support',
        '100% Target Fulfillment Guarantee',
        'Deep Diagnostics & SERP Tracking',
        'Priority API Execution Queue',
      ],
    },
  ]

  return (
    <section id="pricing" className="py-16 md:py-28 bg-muted/30 border-y">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto max-w-xl space-y-3 text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" />
            <span>Pay-As-You-Go Credits</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">Transparent Pricing</h2>
          <p className="text-muted-foreground text-base">
            $1 = 1,000 traffic credits. No rigid monthly lock-ins or contracts. Top up your balance anytime and run campaigns on your own schedule.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {packages.map((pkg) => {
            return (
              <Card 
                key={pkg.name} 
                className={cn(
                  "flex flex-col relative overflow-hidden bg-card transition-all",
                  pkg.popular && "border-primary ring-2 ring-primary/20 shadow-lg scale-[1.02]"
                )}
              >
                {pkg.popular && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-bl-md uppercase tracking-wider">
                    Most Popular
                  </div>
                )}
                <CardHeader className="space-y-3 pb-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {pkg.name}
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-bold">{pkg.price}</span>
                    <span className="text-muted-foreground text-xs">/ {pkg.period}</span>
                  </div>
                  <div className="text-sm font-medium text-primary">
                    {pkg.visits}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed min-h-[32px]">{pkg.description}</p>
                  <Button
                    variant={pkg.popular ? 'default' : 'outline'}
                    className="w-full"
                    render={<Link href={pkg.href} />}
                    nativeButton={false}
                  >
                    Top Up Credits
                  </Button>
                </CardHeader>

                <CardContent className="flex-1 space-y-4 pt-0">
                  <hr className="border-dashed" />
                  <ul className="space-y-2.5 text-xs text-muted-foreground">
                    {pkg.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2.5 text-foreground/90">
                        <Check className="size-3.5 shrink-0 text-emerald-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
