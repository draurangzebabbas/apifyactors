import React from "react"
import { Badge } from "@/components/ui/badge"
import {
  PlayIcon,
  CheckCircleIcon,
  PauseIcon,
  XCircleIcon,
  WarningCircleIcon,
  ClockIcon
} from "@phosphor-icons/react"

export type CampaignStatus = "running" | "completed" | "paused" | "cancelled" | "failed" | "pending" | string

interface StatusBadgeProps {
  status: CampaignStatus
  className?: string
  showIcon?: boolean
}

export function CampaignStatusBadge({ status, className = "", showIcon = true }: StatusBadgeProps) {
  const normalized = (status || "pending").toLowerCase()

  switch (normalized) {
    case "running":
      return (
        <Badge
          variant="outline"
          className={`bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border-blue-500/30 gap-1 font-medium transition-colors ${className}`}
        >
          {showIcon && <PlayIcon className="h-3 w-3 fill-current" />}
          <span>Running</span>
        </Badge>
      )

    case "completed":
      return (
        <Badge
          variant="outline"
          className={`bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30 gap-1 font-medium transition-colors ${className}`}
        >
          {showIcon && <CheckCircleIcon className="h-3 w-3 fill-current" />}
          <span>Completed</span>
        </Badge>
      )

    case "paused":
      return (
        <Badge
          variant="outline"
          className={`bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border-amber-500/30 gap-1 font-medium transition-colors ${className}`}
        >
          {showIcon && <PauseIcon className="h-3 w-3 fill-current" />}
          <span>Paused</span>
        </Badge>
      )

    case "cancelled":
      return (
        <Badge
          variant="outline"
          className={`bg-red-500/15 hover:bg-red-500/25 text-red-400 border-red-500/30 gap-1 font-medium transition-colors ${className}`}
        >
          {showIcon && <XCircleIcon className="h-3 w-3 fill-current" />}
          <span>Cancelled</span>
        </Badge>
      )

    case "failed":
      return (
        <Badge
          variant="outline"
          className={`bg-red-500/15 hover:bg-red-500/25 text-red-400 border-red-500/30 gap-1 font-medium transition-colors ${className}`}
        >
          {showIcon && <WarningCircleIcon className="h-3 w-3 fill-current" />}
          <span>Failed</span>
        </Badge>
      )

    case "pending":
    default:
      return (
        <Badge
          variant="outline"
          className={`bg-muted/40 hover:bg-muted/60 text-muted-foreground border-border gap-1 font-medium transition-colors ${className}`}
        >
          {showIcon && <ClockIcon className="h-3 w-3" />}
          <span className="capitalize">{status || "Pending"}</span>
        </Badge>
      )
  }
}

