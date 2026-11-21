'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Globe, Search, ShieldCheck, Zap, Coins, Sliders } from 'lucide-react'
import Link from 'next/link'

const iconMap: Record<string, React.ElementType> = {
    globe: Globe,
    search: Search,
    shield: ShieldCheck,
    zap: Zap,
    coins: Coins,
    sliders: Sliders,
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
            icon: 'globe',
            question: 'How does TrafficFlow generate and deliver visits?',
            answer: 'TrafficFlow uses automated headless Chromium browsers running on high-reputation rotating residential proxy networks. Each session behaves identically to a genuine human visitor: loading all scripts and stylesheets, scrolling with natural human jitter, pausing for realistic dwell time, and clicking internal links.',
        },
        {
            id: 'item-2',
            icon: 'search',
            question: 'How do Google SERP organic clicks work?',
            answer: 'In Google SERP mode, the browser opens Google Search, executes your target keyword or site query, scans the top 20 organic search results for your domain, and clicks through directly to your landing page. If an URL cannot be found in the top 20, TrafficFlow automatically detects it and prunes it from future batches.',
        },
        {
            id: 'item-3',
            icon: 'shield',
            question: 'Will visits register accurately in Google Analytics (GA4)?',
            answer: 'Yes! Because our sessions run inside real desktop and mobile Chromium browsers (not simple curl or socket requests), Google Analytics 4 (GA4), Google Search Console, server logs, and ad network trackers register all page views, session durations, and user locations.',
        },
        {
            id: 'item-4',
            icon: 'coins',
            question: 'How are credits calculated and used?',
            answer: '1 credit equals 1 standard website visit (direct, referral, or backlink). Google SERP visits consume 2 credits due to the extra compute required for live search interaction and ranked result detection. Credits never expire and can be used across multiple campaigns.',
        },
        {
            id: 'item-5',
            icon: 'sliders',
            question: 'Can I schedule traffic across specific hours or curves?',
            answer: 'Yes. You can distribute traffic evenly over 24 hours, follow local business hours, or run recurring cycles with randomized human jitter to mimic real-world audience traffic spikes and lulls.',
        },
        {
            id: 'item-6',
            icon: 'zap',
            question: 'What happens if a batch fails or is cancelled?',
            answer: 'TrafficFlow provides a 100% target fulfillment guarantee. Any unmet visits from interrupted batches are automatically reallocated into upcoming batches. If you cancel a running campaign, credits for all unexecuted pending batches are instantly refunded to your balance.',
        },
    ]

    return (
        <section id="faq" className="bg-background py-20">
            <div className="mx-auto max-w-5xl px-4 md:px-6">
                <div className="flex flex-col gap-10 md:flex-row md:gap-16">
                    <div className="md:w-1/3">
                        <div className="sticky top-20">
                            <span className="text-primary text-xs font-semibold uppercase tracking-widest">FAQ</span>
                            <h2 className="mt-4 text-3xl font-bold tracking-tight">Frequently Asked Questions</h2>
                            <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
                                Have questions about our residential proxies, Google SERP mode, or billing?{' '}
                                <Link
                                    href="mailto:support@trafficflow.io"
                                    className="text-primary font-medium hover:underline">
                                    Contact our team
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
                                    className="bg-card shadow-xs rounded-lg border px-4 last:border-b">
                                    <AccordionTrigger className="cursor-pointer items-center py-5 hover:no-underline">
                                        <div className="flex items-center gap-3">
                                            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                                {(() => {
                                                    const Icon = iconMap[item.icon]
                                                    return Icon ? <Icon className="m-auto size-4" /> : null
                                                })()}
                                            </div>
                                            <span className="text-base text-left font-medium">{item.question}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-5 text-sm text-muted-foreground leading-relaxed pl-10">
                                        {item.answer}
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
