import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Pricing({ activePlanId }: { activePlanId?: string | null }) {
  const plans = [
    {
      id: process.env.POLAR_BASIC_PLAN_ID || 'ff8a9b62-b8f7-4183-b76c-6a4aad2f2ed7',
      name: 'Basic',
      price: '$3',
      period: 'mo',
      description: 'Perfect for tracking a single high-value group.',
      href: `/api/checkout?products=${process.env.POLAR_BASIC_PLAN_ID || 'ff8a9b62-b8f7-4183-b76c-6a4aad2f2ed7'}`,
      variant: 'outline' as const,
      features: [
        '1 Facebook Group',
        'Hourly Activity Sync',
        'Keyword Alerts & Filtering',
        'Analytics Dashboard',
        'Community Support',
      ],
    },
    {
      id: process.env.POLAR_PRO_PLAN_ID || '1d3d8ccd-aa6c-4b3b-8e06-97bd859f5e10',
      name: 'Pro',
      price: '$10',
      period: 'mo',
      description: 'For teams actively generating leads across multiple communities.',
      href: `/api/checkout?products=${process.env.POLAR_PRO_PLAN_ID || '1d3d8ccd-aa6c-4b3b-8e06-97bd859f5e10'}`,
      variant: 'default' as const,
      features: [
        'Everything in Basic',
        'Up to 5 Facebook Groups',
        'Near Real-Time Sync (5 min)',
        'Advanced Keyword Rules',
        'Priority Support',
      ],
    },
    {
      id: process.env.POLAR_SCALE_PLAN_ID || '0e40861a-2b68-4eb0-8c6b-ac22660c84c7',
      name: 'Scale',
      price: '$20',
      period: 'mo',
      description: 'For power users dominating large community portfolios.',
      href: `/api/checkout?products=${process.env.POLAR_SCALE_PLAN_ID || '0e40861a-2b68-4eb0-8c6b-ac22660c84c7'}`,
      variant: 'outline' as const,
      features: [
        'Everything in Pro',
        'Up to 15 Facebook Groups',
        'Activity Heatmaps & Trends',
        'Custom Integrations',
        'Dedicated Account Manager',
      ],
    },
  ]

  return (
    <section id="pricing" className="py-16 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto max-w-xl space-y-3 text-center mb-12 md:mb-20">
          <h2 className="text-4xl font-semibold tracking-tight lg:text-5xl">Simple Pricing</h2>
          <p className="text-muted-foreground">
            Choose the right plan to automate your Facebook Group monitoring.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const isActive = activePlanId === plan.id;
            const buttonText = isActive ? 'Current Plan' : 'Get Started';
            const href = isActive ? '/api/portal' : plan.href;

            return (
              <Card 
                key={plan.name} 
                className={cn(
                  "flex flex-col relative overflow-hidden",
                  isActive && "border-primary ring-2 ring-primary/20 shadow-md"
                )}
              >
                {isActive && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-bl-md uppercase tracking-wider">
                    Active
                  </div>
                )}
                <CardHeader className="space-y-4 pb-4">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {plan.name}
                  </CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-semibold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">/ {plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                  <Button
                    variant={isActive ? 'secondary' : plan.variant}
                    className="w-full"
                    render={<Link href={href} />}
                    nativeButton={false}
                  >
                    {buttonText}
                  </Button>
                </CardHeader>

                <CardContent className="flex-1 space-y-4 pt-0">
                  <hr className="border-dashed" />
                  <ul className="space-y-2.5 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2.5">
                        <Check className="size-3.5 shrink-0 text-muted-foreground" />
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
