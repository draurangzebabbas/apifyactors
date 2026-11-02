"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AccountsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/cookies")
  }, [router])

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <p className="text-sm text-muted-foreground">Redirecting to Cookie Vault...</p>
    </div>
  )
}
