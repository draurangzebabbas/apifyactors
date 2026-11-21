import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { HeroHeader } from './header'
import { ChevronRight, ArrowUpRight, ShieldCheck, Globe, Search } from 'lucide-react'
import Image from 'next/image'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function HeroSection() {
    return (
        <>
            <HeroHeader />
            <main className="overflow-hidden">
                <section className="bg-background">
                    <div className="relative py-28 md:py-36">
                        <div className="relative z-10 mx-auto w-full max-w-5xl px-6">
                            <div className="md:w-1/2">
                                <div>
                                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-6">
                                        <ShieldCheck className="size-3.5" />
                                        <span>Real Headless Chromium Browsers & Residential Proxies</span>
                                    </div>

                                    <h1 className="max-w-md text-balance text-5xl font-medium tracking-tight md:text-6xl">
                                        Real Website Traffic & Google SERP Clicks at Scale.
                                    </h1>

                                    <p className="text-muted-foreground my-8 max-w-2xl text-balance text-lg leading-relaxed">
                                        Deliver authentic browser visits, organic Google search clicks, and targeted referral traffic across rotating residential IP pools. Boost organic rankings, reduce bounce rates, and simulate human dwell time safely.
                                    </p>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <Button size="lg" className="pr-4.5" render={<Link href="/dashboard" />} nativeButton={false}>
                                            <span className="text-nowrap">Start Traffic Campaign</span>
                                            <ChevronRight className="opacity-50" />
                                        </Button>
                                        <Button key={2} size="lg" variant="outline" className="pl-4" render={<Link href="/#pricing" />} nativeButton={false}>
                                            <span className="text-nowrap">View Credit Pricing</span>
                                            <ArrowUpRight className="size-4 opacity-60" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="mt-10">
                                    <div className="flex items-center gap-4">
                                        <div className="flex -space-x-3">
                                            <Avatar className="ring-2 ring-background">
                                                <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026024d" />
                                                <AvatarFallback>U1</AvatarFallback>
                                            </Avatar>
                                            <Avatar className="ring-2 ring-background">
                                                <AvatarImage src="https://i.pravatar.cc/150?u=a04258a2462d826712d" />
                                                <AvatarFallback>U2</AvatarFallback>
                                            </Avatar>
                                            <Avatar className="ring-2 ring-background">
                                                <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026704d" />
                                                <AvatarFallback>U3</AvatarFallback>
                                            </Avatar>
                                            <Avatar className="ring-2 ring-background">
                                                <AvatarImage src="https://i.pravatar.cc/150?u=a04258114e29026302d" />
                                                <AvatarFallback>U4</AvatarFallback>
                                            </Avatar>
                                            <div className="z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium text-muted-foreground ring-2 ring-background">
                                                +10k
                                            </div>
                                        </div>
                                        <p className="text-muted-foreground text-sm font-medium">
                                            Over <span className="text-foreground font-semibold">10,000,000+</span> visits delivered worldwide
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="perspective-near mt-16 translate-x-12 md:absolute md:-right-6 md:bottom-16 md:left-1/2 md:top-36 md:mt-0 md:translate-x-0">
                            <div className="before:border-foreground/5 before:bg-foreground/5 relative h-full before:absolute before:-inset-x-4 before:bottom-7 before:top-0 before:skew-x-6 before:rounded-[calc(var(--radius)+1rem)] before:border">
                                <div className="bg-background rounded-(--radius) shadow-foreground/10 ring-foreground/5 relative h-full -translate-y-12 skew-x-6 overflow-hidden border border-border shadow-xl ring-1">
                                    <Image
                                        src="/images/trafficflow light theme.png"
                                        alt="TrafficFlow Dashboard Light"
                                        width={2880}
                                        height={1842}
                                        className="object-top-left size-full object-cover block dark:hidden"
                                        priority
                                    />
                                    <Image
                                        src="/images/trafficflow dark theme.png"
                                        alt="TrafficFlow Dashboard Dark"
                                        width={2880}
                                        height={1842}
                                        className="object-top-left size-full object-cover hidden dark:block"
                                        priority
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </>
    )
}
