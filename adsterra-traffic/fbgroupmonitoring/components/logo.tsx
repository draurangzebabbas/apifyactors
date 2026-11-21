import Image from 'next/image'
import { cn } from '../lib/utils'

export const Logo = ({ className }: { className?: string }) => {
    return (
        <div className={cn("flex items-center gap-2.5", className)}>
            <div className="relative size-8 rounded-lg overflow-hidden shadow-sm ring-1 ring-border shrink-0">
                <Image
                    src="/assets/android-chrome-192x192.png"
                    alt="TrafficFlow Logo"
                    width={32}
                    height={32}
                    className="size-full object-cover"
                    priority
                />
            </div>
            <span className="text-xl font-bold tracking-tight">TrafficFlow</span>
        </div>
    )
}

export const LogoIcon = ({ className }: { className?: string }) => {
    return (
        <div className={cn("relative size-6 rounded-md overflow-hidden shadow-sm ring-1 ring-border shrink-0", className)}>
            <Image
                src="/assets/android-chrome-192x192.png"
                alt="TrafficFlow Icon"
                width={24}
                height={24}
                className="size-full object-cover"
                priority
            />
        </div>
    )
}
