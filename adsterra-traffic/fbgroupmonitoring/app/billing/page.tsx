"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import {
  CoinsIcon,
  CreditCardIcon,
  ArrowsClockwiseIcon,
  SparkleIcon
} from "@phosphor-icons/react"

interface CreditTxn {
  id: string
  type: "purchase" | "debit" | "refund"
  amount: number
  description: string
  created_at: string
}

const POLAR_UNIT_PRODUCT_ID = "61f8dcb9-7b29-4877-9e85-38f4721ac085"
const CREDITS_PER_DOLLAR = 1000 // $1 USD = 1,000 traffic credits / website visits
const MIN_AMOUNT_USD = 10       // Minimum $10 required (10,000 credits)

function BillingContent() {
  const searchParams = useSearchParams()
  const [balance, setBalance] = useState<number>(0)
  const [totalPurchased, setTotalPurchased] = useState(0)
  const [totalUsed, setTotalUsed] = useState(0)
  const [transactions, setTransactions] = useState<CreditTxn[]>([])
  const [loading, setLoading] = useState(true)

  // Payment amount in USD ($) — minimum $10, integer only, unlimited
  const [amountUsd, setAmountUsd] = useState<number>(100)

  const fetchCredits = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Direct query for immediate balance
      const { data: credData } = await supabase
        .from('traffic_credits')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (credData) {
        setBalance(credData.balance ?? 0)
        setTotalPurchased(credData.total_purchased ?? 0)
        setTotalUsed(credData.total_used ?? 0)
      } else {
        setBalance(0)
        setTotalPurchased(0)
        setTotalUsed(0)
      }

      // Fetch transaction history
      const { data: txns } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (txns) {
        setTransactions(txns as CreditTxn[])
      }
    } catch (e) {
      console.error("Failed to load credits:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCredits()
    if (searchParams.get("status") === "success") {
      toast.success("Payment completed! Your traffic credits are now available.")
    }
  }, [searchParams])

  const calculatedTrafficCredits = (amountUsd || 0) * CREDITS_PER_DOLLAR

  const handleCheckout = async (dollars: number) => {
    try {
      if (!dollars || dollars < MIN_AMOUNT_USD) {
        toast.error(`Minimum purchase amount is $${MIN_AMOUNT_USD} (10,000 credits)`)
        return
      }

      const cleanDollars = Math.floor(dollars)
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error("Please sign in to buy credits")
        return
      }

      // 1 unit = $1.00 in checkout
      window.location.href = `/api/checkout?products=${POLAR_UNIT_PRODUCT_ID}&units=${cleanDollars}`
    } catch (err: any) {
      toast.error(err.message || "Checkout failed to initialize")
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex-1 space-y-6 p-6 max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Credits & Billing</h1>
              <p className="text-sm text-muted-foreground">
                Pay-as-you-go traffic credits. 1 Credit = 1 Real Website Visit.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchCredits}>
              <ArrowsClockwiseIcon className="w-4 h-4 mr-1" /> Refresh
            </Button>
          </div>

          {/* Balance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-primary">Available Balance</span>
                  <CoinsIcon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-3xl font-extrabold text-primary mt-2">
                  {balance.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Traffic visits available to launch</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Lifetime Purchased</span>
                <div className="text-2xl font-bold mt-2">
                  {totalPurchased.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Total visits acquired</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Delivered Visits</span>
                <div className="text-2xl font-bold mt-2">
                  {totalUsed.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Visits dispatched across campaigns</div>
              </CardContent>
            </Card>
          </div>

          {/* Buy Credits Top-Up Card */}
          <Card className="border-2 border-primary/20 shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <SparkleIcon className="w-5 h-5 text-primary" />
                  <CardTitle className="text-xl">Buy Traffic Credits</CardTitle>
                </div>
                <Badge variant="secondary" className="text-xs font-medium">
                  Rate: $1.00 USD = 1,000 Credits
                </Badge>
              </div>
              <CardDescription>
                Flexible pay-as-you-go credit wallet. Enter any dollar amount from ${MIN_AMOUNT_USD} upwards.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dollar Amount Controls */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">Enter Amount to Spend ($ USD)</label>
                  <span className="text-xs text-muted-foreground">
                    Integer only • Minimum ${MIN_AMOUNT_USD} ({(MIN_AMOUNT_USD * CREDITS_PER_DOLLAR).toLocaleString()} Credits) • No upper limit
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative w-full sm:max-w-xs">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                      $
                    </span>
                    <Input
                      type="number"
                      min={MIN_AMOUNT_USD}
                      step={1}
                      value={amountUsd || ""}
                      onChange={e => {
                        const val = parseInt(e.target.value, 10)
                        setAmountUsd(isNaN(val) ? 0 : Math.floor(val))
                      }}
                      onBlur={() => {
                        if (!amountUsd || amountUsd < MIN_AMOUNT_USD) {
                          setAmountUsd(MIN_AMOUNT_USD)
                        }
                      }}
                      placeholder="100"
                      className="pl-7 text-lg font-bold"
                    />
                  </div>
                  {amountUsd > 0 && amountUsd < MIN_AMOUNT_USD && (
                    <span className="text-xs text-destructive font-medium">
                      Minimum is ${MIN_AMOUNT_USD} (10,000 Credits)
                    </span>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {[10, 25, 50, 100, 250, 500, 1000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmountUsd(amt)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${
                          amountUsd === amt
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/70 hover:bg-muted text-foreground"
                        }`}
                      >
                        ${amt.toLocaleString()} ({(amt * CREDITS_PER_DOLLAR).toLocaleString()} Credits)
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Conversion Breakdown Pill */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center sm:text-left">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase">You Pay</div>
                    <div className="text-2xl font-extrabold text-foreground mt-1">
                      ${(amountUsd || 0).toLocaleString()} USD
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">One-time payment</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase">You Receive</div>
                    <div className="text-2xl font-extrabold text-primary mt-1">
                      {calculatedTrafficCredits.toLocaleString()} Credits
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-5">
              <div className="text-xs text-muted-foreground">
                Secure 256-bit encrypted checkout. Credits never expire and activate immediately.
              </div>
              <Button
                size="lg"
                onClick={() => handleCheckout(amountUsd)}
                disabled={!amountUsd || amountUsd < MIN_AMOUNT_USD}
                className="w-full sm:w-auto min-w-[240px] font-semibold gap-2"
              >
                <CreditCardIcon className="w-4 h-4" />
                {amountUsd < MIN_AMOUNT_USD
                  ? `Minimum $${MIN_AMOUNT_USD} Required`
                  : `Proceed to Checkout ($${(amountUsd || 0).toLocaleString()})`}
              </Button>
            </CardFooter>
          </Card>

          {/* Transactions Ledger */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Credit Ledger & Transaction History</CardTitle>
              <CardDescription>Verified log of all credit purchases, campaign allocations, and cancellations.</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-sm text-center py-6 text-muted-foreground">No transactions recorded yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Credits</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map(t => {
                      const cleanDesc = (t.description || "")
                        .replace(/Polar payment/gi, "Credit Purchase")
                        .replace(/—\s*Polar/gi, "—");

                      return (
                        <TableRow key={t.id}>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(t.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                t.type === "purchase" || t.type === "refund" ? "secondary" : "outline"
                              }
                              className="capitalize text-xs"
                            >
                              {t.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{cleanDesc}</TableCell>
                          <TableCell className={`text-right font-semibold ${t.amount > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                            {t.amount > 0 ? `+${t.amount.toLocaleString()}` : t.amount.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading billing...</div>}>
      <BillingContent />
    </Suspense>
  )
}
