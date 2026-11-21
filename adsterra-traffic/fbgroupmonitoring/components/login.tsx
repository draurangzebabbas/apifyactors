'use client'

import { useState } from 'react'
import { LogoIcon } from '@/components/logo'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

export default function LoginPage() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleGoogleLogin = async () => {
        try {
            setLoading(true)
            setError(null)
            const supabase = createClient()
            const { error: authError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            })
            if (authError) {
                setError(authError.message)
                setLoading(false)
            }
        } catch (err: any) {
            setError(err?.message || 'Failed to initialize Google login')
            setLoading(false)
        }
    }

    return (
        <section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
            <div className="bg-card m-auto h-fit w-full max-w-sm rounded-[calc(var(--radius)+.125rem)] border p-0.5 shadow-md dark:[--color-muted:var(--color-zinc-900)]">
                <div className="p-8 pb-8 text-center">
                    <div className="flex flex-col items-center">
                        <Link href="/" aria-label="go home">
                            <LogoIcon className="size-10 rounded-xl" />
                        </Link>
                        <h1 className="mb-1 mt-4 text-2xl font-bold tracking-tight">Sign In to TrafficFlow</h1>
                        <p className="text-muted-foreground text-sm max-w-xs">
                            Welcome back! Sign in with your Google account to access your dashboard.
                        </p>
                    </div>

                    {error && (
                        <div className="mt-4 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-500 text-left">
                            {error}
                        </div>
                    )}

                    <div className="mt-8">
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full h-11 text-base font-medium flex items-center justify-center gap-3 bg-background border-border text-foreground hover:border-blue-500/70 hover:bg-blue-50/40 hover:text-blue-600 dark:hover:border-blue-400/70 dark:hover:bg-blue-950/20 dark:hover:text-blue-400 shadow-xs hover:shadow transition-all"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="1.1em" height="1.1em" viewBox="0 0 256 262">
                                <path fill="#4285f4" d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" />
                                <path fill="#34a853" d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" />
                                <path fill="#fbbc05" d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z" />
                                <path fill="#eb4335" d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" />
                            </svg>
                            <span>{loading ? 'Connecting to Google...' : 'Continue with Google'}</span>
                        </Button>
                    </div>

                    <p className="mt-6 text-xs text-muted-foreground leading-relaxed">
                        By continuing, you agree to TrafficFlow's{' '}
                        <Link href="/terms" className="underline hover:text-foreground">Terms of Service</Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
                    </p>
                </div>

                <div className="bg-muted rounded-(--radius) border p-3">
                    <p className="text-foreground/80 text-center text-sm">
                        New to TrafficFlow?{' '}
                        <Link href="/sign-up" className="text-primary font-medium hover:underline">
                            Get started
                        </Link>
                    </p>
                </div>
            </div>
        </section>
    )
}
