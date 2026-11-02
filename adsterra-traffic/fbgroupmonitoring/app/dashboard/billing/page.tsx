import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"

export default function BillingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 p-8 text-center">
      <div className="max-w-md space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">You are not subscribed to any plan</h2>
        <p className="text-muted-foreground">
          To access billing and manage your subscription, please subscribe to a plan first.
        </p>
        <div className="pt-4">
          <Link href="/#pricing" className={buttonVariants({ size: "lg" })}>
            Subscribe to a plan
          </Link>
        </div>
      </div>
    </div>
  )
}
