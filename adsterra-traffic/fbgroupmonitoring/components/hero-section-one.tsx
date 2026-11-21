import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { HeroHeader } from './header'
import { ChevronRight, ArrowUpRight, ShieldCheck } from 'lucide-react'
import Image from 'next/image'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function HeroSection() {
    return (
        <>
            <HeroHeader />
            <main className="overflow-hidden">
                <section className="bg-background border-b">
                    <div className="py-20 md:py-28">
                        <div className="mx-auto w-full max-w-6xl px-6">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                                {/* Left Column: Pitch */}
                                <div className="lg:col-span-6 space-y-6">
                                    <div className="inline-flex items-center gap-2 border border-border bg-muted/40 px-3 py-1 text-xs font-mono text-muted-foreground">
                                        <ShieldCheck className="size-3.5 text-foreground" />
                                        <span>Chromium Browsers & Residential Proxies</span>
                                    </div>

                                    <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl text-balance">
                                        Real Website Traffic & Google SERP Clicks at Scale.
                                    </h1>

                                    <p className="text-muted-foreground text-base leading-relaxed text-balance">
                                        Deliver authentic browser visits, organic Google search clicks, and targeted referral traffic across rotating residential IP pools. Boost organic rankings, reduce bounce rates, and simulate human dwell time safely.
                                    </p>

                                    <div className="flex flex-wrap items-center gap-3 pt-2">
                                        <Button size="lg" className="pr-4.5 rounded-none font-semibold" render={<Link href="/dashboard" />} nativeButton={false}>
                                            <span className="text-nowrap">Start Traffic Campaign</span>
                                            <ChevronRight className="opacity-50" />
                                        </Button>
                                        <Button size="lg" variant="outline" className="pl-4 rounded-none font-semibold" render={<Link href="/#pricing" />} nativeButton={false}>
                                            <span className="text-nowrap">View Credit Pricing</span>
                                            <ArrowUpRight className="size-4 opacity-60" />
                                        </Button>
                                    </div>

                                    <div className="pt-4 border-t border-border/60">
                                        <div className="flex items-center gap-4">
                                            <div className="flex -space-x-3">
                                                <Avatar className="ring-2 ring-background rounded-none">
                                                    <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026024d" />
                                                    <AvatarFallback>U1</AvatarFallback>
                                                </Avatar>
                                                <Avatar className="ring-2 ring-background rounded-none">
                                                    <AvatarImage src="https://i.pravatar.cc/150?u=a04258a2462d826712d" />
                                                    <AvatarFallback>U2</AvatarFallback>
                                                </Avatar>
                                                <Avatar className="ring-2 ring-background rounded-none">
                                                    <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026704d" />
                                                    <AvatarFallback>U3</AvatarFallback>
                                                </Avatar>
                                                <Avatar className="ring-2 ring-background rounded-none">
                                                    <AvatarImage src="https://i.pravatar.cc/150?u=a04258114e29026302d" />
                                                    <AvatarFallback>U4</AvatarFallback>
                                                </Avatar>
                                                <div className="z-10 flex h-10 w-10 items-center justify-center border border-border bg-muted text-xs font-mono font-medium text-foreground ring-1 ring-background">
                                                    +10k
                                                </div>
                                            </div>
                                            <p className="text-muted-foreground text-xs font-mono">
                                                Over <span className="text-foreground font-semibold">10,000,000+</span> visits delivered worldwide
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Theme-Responsive Dashboard Screenshot */}
                                <div className="lg:col-span-6 flex items-center justify-center">
                                    <div className="w-full border border-border bg-card shadow-2xl overflow-hidden ring-1 ring-foreground/10 rounded-none">
                                        {/* Light theme image */}
                                        <Image
                                            src="/images/trafficflow-light.png"
                                            alt="TrafficFlow Dashboard Light"
                                            width={2880}
                                            height={1842}
                                            className="w-full h-auto object-cover block dark:hidden"
                                            priority
                                            unoptimized
                                        />
                                        {/* Dark theme image */}
                                        <Image
                                            src="/images/trafficflow-dark.png"
                                            alt="TrafficFlow Dashboard Dark"
                                            width={2880}
                                            height={1842}
                                            className="w-full h-auto object-cover hidden dark:block"
                                            priority
                                            unoptimized
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </>
    )
}
