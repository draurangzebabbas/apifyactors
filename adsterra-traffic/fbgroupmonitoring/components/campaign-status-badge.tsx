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
          className={`bg-blue-600 hover:bg-blue-500 text-white border-blue-500/40 gap-1 font-medium ${className}`}
        >
          {showIcon && <PlayIcon className="h-3 w-3 fill-current" />}
          <span>Running</span>
        </Badge>
      )

    case "completed":
      return (
        <Badge
          className={`bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/40 gap-1 font-medium ${className}`}
        >
          {showIcon && <CheckCircleIcon className="h-3 w-3 fill-current" />}
          <span>Completed</span>
        </Badge>
      )

    case "paused":
      return (
        <Badge
          className={`bg-amber-500 hover:bg-amber-400 text-black border-amber-400/50 gap-1 font-semibold ${className}`}
        >
          {showIcon && <PauseIcon className="h-3 w-3 fill-current" />}
          <span>Paused</span>
        </Badge>
      )

    case "cancelled":
      return (
        <Badge
          className={`bg-rose-600 hover:bg-rose-500 text-white border-rose-500/40 gap-1 font-medium ${className}`}
        >
          {showIcon && <XCircleIcon className="h-3 w-3 fill-current" />}
          <span>Cancelled</span>
        </Badge>
      )

    case "failed":
      return (
        <Badge
          className={`bg-rose-700 hover:bg-rose-600 text-white border-rose-600/40 gap-1 font-medium ${className}`}
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
          className={`text-muted-foreground border-border gap-1 font-medium ${className}`}
        >
          {showIcon && <ClockIcon className="h-3 w-3" />}
          <span className="capitalize">{status || "Pending"}</span>
        </Badge>
      )
  }
}

