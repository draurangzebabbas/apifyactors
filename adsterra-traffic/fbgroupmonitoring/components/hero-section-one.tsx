import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { HeroHeader } from './header'
import { ChevronRight, CirclePlay } from 'lucide-react'
import Image from 'next/image'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function HeroSection() {
    return (
        <>
            <HeroHeader />
            <main className="overflow-hidden">
                <section className="bg-background">
                    <div className="relative py-36">
                        <div className="relative z-10 mx-auto w-full max-w-5xl px-6">
                            <div className="md:w-1/2">
                                <div>
                                    <h1 className="max-w-md text-balance text-5xl font-medium md:text-6xl">Stop Scrolling. Never Miss a Facebook Group Lead Again.</h1>
                                    <p className="text-muted-foreground my-8 max-w-2xl text-balance text-xl">Connect the Facebook groups you're already in. We automatically filter the noise, track your exact keywords, and deliver high-value conversations straight to your dashboard. Be the first to reply, every time.</p>

                                    <div className="flex items-center gap-3">
                                        <Button size="lg" className="pr-4.5" render={<Link href="/dashboard" />} nativeButton={false}><span className="text-nowrap">Get Started</span><ChevronRight className="opacity-50" /></Button>
                                        <Button key={2} size="lg" variant="outline" className="pl-5" render={<Link href="#demo" />} nativeButton={false}><CirclePlay className="fill-primary/25 stroke-primary" /><span className="text-nowrap">Watch video</span></Button>
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
                                            Trusted by <span className="text-foreground">10,000+</span> teams
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="perspective-near mt-24 translate-x-12 md:absolute md:-right-6 md:bottom-16 md:left-1/2 md:top-40 md:mt-0 md:translate-x-0">
                            <div className="before:border-foreground/5 before:bg-foreground/5 relative h-full before:absolute before:-inset-x-4 before:bottom-7 before:top-0 before:skew-x-6 before:rounded-[calc(var(--radius)+1rem)] before:border">
                                <div className="bg-background rounded-(--radius) shadow-foreground/10 ring-foreground/5 relative h-full -translate-y-12 skew-x-6 overflow-hidden border border-transparent shadow-md ring-1">
                                    <Image
                                        src="/images/FB Monitor Light.webp"
                                        alt="app screen light"
                                        width="2880"
                                        height="1842"
                                        className="object-top-left size-full object-cover block dark:hidden"
                                    />
                                    <Image
                                        src="/images/FB Monitor Dark.webp"
                                        alt="app screen dark"
                                        width="2880"
                                        height="1842"
                                        className="object-top-left size-full object-cover hidden dark:block"
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
