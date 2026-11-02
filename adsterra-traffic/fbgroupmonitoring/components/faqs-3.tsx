'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Users, CreditCard, Shield, Zap, Key, BarChart2 } from 'lucide-react'
import Link from 'next/link'

const iconMap: Record<string, React.ElementType> = {
    users: Users,
    'credit-card': CreditCard,
    shield: Shield,
    zap: Zap,
    key: Key,
    'bar-chart': BarChart2,
}

type FAQItem = {
    id: string
    icon: string
    question: string
    answer: string
}

export default function FAQsThree() {
    const faqItems: FAQItem[] = [
        {
            id: 'item-1',
            icon: 'users',
            question: 'Which Facebook groups can I track?',
            answer: 'You can track any Facebook group you are already a member of — public or private. By using your own Facebook session, FBMonitor accesses data exactly as you would when browsing manually. No admin privileges required.',
        },
        {
            id: 'item-2',
            icon: 'zap',
            question: 'How fast will I be notified of new posts?',
            answer: 'On the Basic plan, group activity is synced hourly. On Pro and Scale plans, syncing happens every 5 minutes so you can be the first to jump into important conversations and generate leads.',
        },
        {
            id: 'item-3',
            icon: 'bar-chart',
            question: 'What does the Activity Heatmap show me?',
            answer: 'The Activity Heatmap visualizes exactly when your target communities are most active. Know the best days and hours to post your own content for maximum engagement.',
        },
        {
            id: 'item-4',
            icon: 'key',
            question: 'How do keyword alerts work?',
            answer: 'Set up advanced rules to filter the noise. Use "Must Include", "Any Of", and "Must Exclude" logic so your dashboard only shows posts with high intent (like people asking for recommendations or support).',
        },
        {
            id: 'item-5',
            icon: 'shield',
            question: 'Is my Facebook session stored securely?',
            answer: 'Security is our priority. Your session credentials are encrypted with AES-256 at rest, never logged, and only decrypted in memory during the split-second we sync your groups.',
        },
        {
            id: 'item-6',
            icon: 'credit-card',
            question: 'Can I cancel my subscription anytime?',
            answer: 'Yes, you can cancel anytime directly from your billing portal. Your plan stays active until the end of your current billing period. No hidden fees or questions asked.',
        },
    ]

    return (
        <section id="faq" className="bg-background py-20">
            <div className="mx-auto max-w-5xl px-4 md:px-6">
                <div className="flex flex-col gap-10 md:flex-row md:gap-16">
                    <div className="md:w-1/3">
                        <div className="sticky top-20">
                            <span className="text-primary text-sm font-semibold uppercase tracking-widest">FAQ</span>
                            <h2 className="mt-4 text-3xl font-bold">Frequently Asked Questions</h2>
                            <p className="text-muted-foreground mt-4">
                                Can't find the answer you need?{' '}
                                <Link
                                    href="mailto:contact@draurangzebabbas.com"
                                    className="text-primary font-medium hover:underline">
                                    Contact us directly
                                </Link>
                            </p>
                        </div>
                    </div>
                    <div className="md:w-2/3">
                        <Accordion
                            className="w-full space-y-2">
                            {faqItems.map((item) => (
                                <AccordionItem
                                    key={item.id}
                                    value={item.id}
                                    className="bg-background shadow-xs rounded-lg border px-4 last:border-b">
                                    <AccordionTrigger className="cursor-pointer items-center py-5 hover:no-underline">
                                        <div className="flex items-center gap-3">
                                            <div className="flex size-6 shrink-0">
                                                {(() => {
                                                    const Icon = iconMap[item.icon]
                                                    return Icon ? <Icon className="m-auto size-4" /> : null
                                                })()}
                                            </div>
                                            <span className="text-base text-left">{item.question}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-5">
                                        <div className="px-9">
                                            <p className="text-base text-muted-foreground">{item.answer}</p>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                </div>
            </div>
        </section>
    )
}
