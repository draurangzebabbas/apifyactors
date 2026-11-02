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
const UNIT_PRICE_USD = 1.00 // $1 per unit in Polar
const MIN_UNITS = 100       // Minimum units enforced by Polar product
const CREDITS_PER_UNIT = 1000 // Each $1 unit provides 1,000 traffic visits/credits

function BillingContent() {
  const searchParams = useSearchParams()
  const [balance, setBalance] = useState<number>(0)
  const [totalPurchased, setTotalPurchased] = useState(0)
  const [totalUsed, setTotalUsed] = useState(0)
  const [transactions, setTransactions] = useState<CreditTxn[]>([])
  const [loading, setLoading] = useState(true)

  // Unit Pricing State
  const [units, setUnits] = useState(100)

  const fetchCredits = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Direct Supabase query for immediate balance
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

  const calculatedTotalUsd = units * UNIT_PRICE_USD
  const calculatedTrafficCredits = units * CREDITS_PER_UNIT

  const handleCheckout = async (unitCount: number) => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error("Please sign in to buy credits")
        return
      }

      // Redirect to Polar Unit Pricing checkout
      window.location.href = `/api/checkout?products=${POLAR_UNIT_PRODUCT_ID}&units=${unitCount}`
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
                Pay-as-you-go traffic credit wallet powered by Polar unit pricing.
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
                  {balance !== null ? balance.toLocaleString() : "..."}
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

          {/* Polar Unit-Based Pricing Top-Up Card */}
          <Card className="border-2 border-primary/20 shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <SparkleIcon className="w-5 h-5 text-primary" />
                  <CardTitle className="text-xl">Buy Traffic Credits (Unit Pricing)</CardTitle>
                </div>
                <Badge variant="secondary" className="text-xs font-medium">
                  Polar Unit Pricing: $1.00 / Unit
                </Badge>
              </div>
              <CardDescription>
                Flexible upfront unit pricing. Purchase exact increments starting at {MIN_UNITS} units.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Unit Selection Controls */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">Select Units to Purchase</label>
                  <span className="text-sm text-muted-foreground">
                    Minimum {MIN_UNITS} units ($100)
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <Input
                    type="number"
                    min={MIN_UNITS}
                    step={25}
                    value={units}
                    onChange={e => setUnits(Math.max(MIN_UNITS, parseInt(e.target.value, 10) || MIN_UNITS))}
                    className="max-w-xs text-lg font-bold"
                  />
                  <div className="flex flex-wrap gap-2">
                    {[100, 250, 500, 1000, 2500].map(u => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setUnits(u)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${
                          units === u
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/70 hover:bg-muted text-foreground"
                        }`}
                      >
                        {u.toLocaleString()} Units (${u * UNIT_PRICE_USD})
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Conversion Breakdown Pill */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase">You Pay</div>
                    <div className="text-2xl font-extrabold text-foreground mt-1">
                      ${calculatedTotalUsd.toLocaleString()} USD
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">({units} units @ ${UNIT_PRICE_USD}/ea)</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase">You Receive</div>
                    <div className="text-2xl font-extrabold text-primary mt-1">
                      {calculatedTrafficCredits.toLocaleString()} Credits
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">1 Credit = 1 Website Visit</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase">Features Included</div>
                    <div className="text-xs text-muted-foreground mt-1.5 space-y-1">
                      <div>✓ Real Google SERP & Organic Clicks</div>
                      <div>✓ Rotating Apify Residential Proxies</div>
                      <div>✓ Batch Chunking (Max 100 visits/call)</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-5">
              <div className="text-xs text-muted-foreground">
                Secure checkout powered by <strong>Polar.sh</strong>. Credits never expire and add to your wallet instantly.
              </div>
              <Button
                size="lg"
                onClick={() => handleCheckout(units)}
                className="w-full sm:w-auto min-w-[240px] font-semibold gap-2"
              >
                <CreditCardIcon className="w-4 h-4" />
                Checkout with Polar (${calculatedTotalUsd.toLocaleString()})
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
                    {transactions.map(t => (
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
                        <TableCell className="text-sm">{t.description}</TableCell>
                        <TableCell className={`text-right font-semibold ${t.amount > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                          {t.amount > 0 ? `+${t.amount.toLocaleString()}` : t.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
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
