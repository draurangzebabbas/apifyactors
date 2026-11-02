'use client'

import Link from 'next/link'
import Image from 'next/image'
import { LogoIcon } from '@/components/logo'
import { XLogo, LinkedinLogo, GithubLogo, EnvelopeSimple } from '@phosphor-icons/react'

const quickLinks = [
    { label: 'Features', href: '/#features' },
    { label: 'Pricing', href: '/#pricing' },
    { label: 'FAQ', href: '/#faq' },
    { label: 'About', href: '/about' },
]

const legalLinks = [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
]

const socialLinks = [
    { label: 'X (Twitter)', href: 'https://x.com/draurangzebabas', icon: XLogo },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/draurangzeb/', icon: LinkedinLogo },
    { label: 'GitHub', href: 'https://github.com/draurangzebabbas', icon: GithubLogo },
    { label: 'Email', href: 'mailto:contact@draurangzebabbas.com', icon: EnvelopeSimple },
]

export default function Footer() {
    return (
        <footer className="relative bg-background">
            {/* No top accent — sections are unified */}

            <div className="mx-auto max-w-6xl px-6 pt-16 pb-10">
                {/* Main grid */}
                <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Brand column */}
                    <div className="lg:col-span-2">
                        <Link href="/" className="flex items-center gap-2.5 w-fit">
                            <LogoIcon className="size-7" />
                            <span className="text-lg font-bold tracking-tight">FBMonitor</span>
                        </Link>
                        <p className="text-muted-foreground mt-4 max-w-xs text-sm leading-relaxed">
                            Automate Facebook group tracking with real-time scraping, keyword alerts, and actionable analytics — all in one platform.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <p className="text-muted-foreground mb-5 text-xs font-semibold uppercase tracking-widest">Quick Links</p>
                        <ul className="space-y-3">
                            {quickLinks.map((link) => (
                                <li key={link.label}>
                                    <Link href={link.href} className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <p className="text-muted-foreground mb-5 text-xs font-semibold uppercase tracking-widest">Legal</p>
                        <ul className="space-y-3">
                            {legalLinks.map((link) => (
                                <li key={link.label}>
                                    <Link href={link.href} className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Divider */}
                <div className="mt-14 border-t" />

                {/* Bottom bar — creator credit centered */}
                <div className="mt-8 flex justify-center">
                    <div className="flex items-center gap-4">
                        {/* Profile image + name */}
                        <Link
                            href="https://draurangzebabbas.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 group"
                        >
                            <div className="relative size-8 shrink-0 overflow-hidden rounded-full ring-2 ring-primary/20">
                                <Image
                                    src="/images/Aurangzeb Abbas.webp"
                                    alt="Aurangzeb Abbas"
                                    fill
                                    sizes="32px"
                                    className="object-cover"
                                />
                            </div>
                            <span className="text-muted-foreground text-sm">
                                Created by{' '}
                                <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                    Aurangzeb Abbas
                                </span>
                            </span>
                        </Link>

                        {/* Divider */}
                        <div className="h-6 w-px bg-border" />

                        {/* Social icons */}
                        {socialLinks.map((s) => {
                            const Icon = s.icon
                            return (
                                <Link
                                    key={s.label}
                                    href={s.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={s.label}
                                    className="text-muted-foreground hover:text-foreground flex size-9 items-center justify-center rounded-lg border transition-colors hover:border-foreground/20 hover:bg-muted"
                                >
                                    <Icon size={18} />
                                </Link>
                            )
                        })}

                    </div>
                </div>
            </div>
        </footer>
    )
}
