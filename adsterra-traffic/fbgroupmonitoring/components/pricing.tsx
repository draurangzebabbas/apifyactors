'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Sparkles, CreditCard } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

const CREDITS_PER_DOLLAR = 1000 // $1 USD = 1,000 traffic credits / website visits
const MIN_AMOUNT_USD = 10       // Minimum $10 required (10,000 credits)

export default function Pricing({ activePlanId }: { activePlanId?: string | null }) {
  const [amountUsd, setAmountUsd] = useState<number>(10)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        setIsLoggedIn(!!session)
      } catch {
        setIsLoggedIn(false)
      }
    }
    checkUser()
  }, [])

  const cleanDollars = Math.max(MIN_AMOUNT_USD, amountUsd || MIN_AMOUNT_USD)
  const calculatedCredits = cleanDollars * CREDITS_PER_DOLLAR

  const handleAction = async () => {
    if (!isLoggedIn) {
      setLoading(true)
      try {
        const supabase = createClient()
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback?next=/billing`,
          },
        })
      } catch {
        window.location.href = '/login'
      }
      return
    }

    window.location.href = `/api/checkout?units=${cleanDollars}`
  }

  return (
    <section id="pricing" className="py-20 md:py-28 bg-muted/20 border-y">
      <div className="mx-auto max-w-5xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl space-y-3 text-center mb-12">
          <div className="inline-flex items-center gap-1.5 border border-border bg-card px-3 py-1 text-xs font-mono text-muted-foreground">
            <Sparkles className="size-3.5 text-foreground" />
            <span>PAY-AS-YOU-GO • NO MONTHLY RENEWALS</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">Simple, Flexible Pricing</h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-lg mx-auto">
            No recurring subscriptions or monthly fees. Buy credits once — they stay in your wallet forever until consumed. Minimum spend is $10.
          </p>
        </div>

        {/* Interactive Buy Credits Calculator */}
        <div className="mx-auto max-w-3xl">
          <Card className="border border-border shadow-xl bg-card rounded-none overflow-hidden ring-1 ring-foreground/5">
            <CardHeader className="border-b bg-muted/20 pb-4 pt-5 px-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-foreground" />
                  <CardTitle className="text-lg font-bold">Buy Traffic Credits</CardTitle>
                </div>
                <Badge variant="outline" className="text-xs font-mono font-medium rounded-none px-2.5 py-0.5">
                  Rate: $1.00 USD = 1,000 Credits
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Flexible pay-as-you-go credit wallet. Enter any dollar amount from ${MIN_AMOUNT_USD} upwards.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-6 px-6">
              {/* Dollar Amount Controls */}
              <div className="space-y-3">
                <label className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground block">
                  Enter Amount to Spend ($ USD)
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative w-full sm:max-w-xs shrink-0">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold font-mono text-base">
                      $
                    </span>
                    <Input
                      type="number"
                      min={MIN_AMOUNT_USD}
                      step={1}
                      value={amountUsd || ''}
                      onChange={e => {
                        const val = parseInt(e.target.value, 10)
                        setAmountUsd(isNaN(val) ? 0 : Math.floor(val))
                      }}
                      onBlur={() => {
                        if (!amountUsd || amountUsd < MIN_AMOUNT_USD) {
                          setAmountUsd(MIN_AMOUNT_USD)
                        }
                      }}
                      placeholder="10"
                      className="pl-8 text-lg font-bold font-mono h-11 rounded-none border-border"
                    />
                  </div>

                  {/* Preset Pills — Sharp, Consistent */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {[10, 25, 50, 100, 250, 500, 1000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmountUsd(amt)}
                        className={`text-xs px-2.5 py-1.5 border font-mono font-medium transition cursor-pointer rounded-none ${
                          amountUsd === amt
                            ? 'bg-foreground text-background border-foreground font-bold'
                            : 'bg-card hover:bg-muted text-foreground border-border'
                        }`}
                      >
                        ${amt} ({(amt * CREDITS_PER_DOLLAR).toLocaleString()})
                      </button>
                    ))}
                  </div>
                </div>

                {amountUsd > 0 && amountUsd < MIN_AMOUNT_USD && (
                  <p className="text-xs text-destructive font-mono">
                    Minimum spend is ${MIN_AMOUNT_USD} (10,000 Credits)
                  </p>
                )}
              </div>

              {/* Conversion Breakdown Box */}
              <div className="border border-border bg-muted/20 p-5 rounded-none">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center sm:text-left">
                  <div>
                    <div className="text-[11px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                      You Pay
                    </div>
                    <div className="text-3xl font-extrabold text-foreground mt-1 font-mono">
                      ${cleanDollars.toLocaleString()} USD
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 font-mono">One-time payment</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                      You Receive
                    </div>
                    <div className="text-3xl font-extrabold text-foreground mt-1 font-mono">
                      {calculatedCredits.toLocaleString()} Credits
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 font-mono">1 Credit = 1 Website Visit</div>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t bg-muted/10 pt-4 pb-4 px-6 rounded-none">
              <div className="text-xs text-muted-foreground leading-relaxed text-center sm:text-left font-mono">
                256-bit encrypted checkout. Credits never expire and activate immediately.
              </div>
              <Button
                size="lg"
                onClick={handleAction}
                disabled={loading || !amountUsd || amountUsd < MIN_AMOUNT_USD}
                className="w-full sm:w-auto min-w-[270px] font-semibold gap-2.5 h-11 rounded-none transition-all"
              >
                {isLoggedIn === false ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 262" className="size-4 shrink-0">
                      <path fill="#4285f4" d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" />
                      <path fill="#34a853" d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" />
                      <path fill="#fbbc05" d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z" />
                      <path fill="#eb4335" d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" />
                    </svg>
                    <span>{loading ? 'Connecting...' : `Continue with Google ($${cleanDollars.toLocaleString()})`}</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="size-4" />
                    <span>Proceed to Checkout (${cleanDollars.toLocaleString()})</span>
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Technical Guarantee Specs — Monochromatic, Sharp, Square */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            <div className="p-4 border border-border bg-card/60 rounded-none">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">01 // WALLET</div>
              <div className="text-sm font-semibold text-foreground mt-1">Credits Never Expire</div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Purchased credits remain in your balance permanently until dispatched.
              </p>
            </div>

            <div className="p-4 border border-border bg-card/60 rounded-none">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">02 // BILLING</div>
              <div className="text-sm font-semibold text-foreground mt-1">Zero Auto-Renewals</div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                No monthly subscriptions, hidden fees, or recurring charges.
              </p>
            </div>

            <div className="p-4 border border-border bg-card/60 rounded-none">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">03 // RATE</div>
              <div className="text-sm font-semibold text-foreground mt-1">$1.00 = 1,000 Visits</div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Fixed, predictable rate across all campaigns. Minimum spend is $10.
              </p>
            </div>

            <div className="p-4 border border-border bg-card/60 rounded-none">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">04 // GUARANTEE</div>
              <div className="text-sm font-semibold text-foreground mt-1">100% Fulfillment</div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Real Chromium browser visits. Unmet visits auto-reschedule safely.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
