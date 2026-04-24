"use client"

import { ReactNode } from "react"

interface MockDeviceFrameProps {
  children: ReactNode
  className?: string
}

export function MockDeviceFrame({ children, className = "" }: MockDeviceFrameProps) {
  return (
    <div className={`relative rounded-xl border border-border-default bg-surface-card shadow-2xl overflow-hidden ${className}`}>
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-default bg-surface-subtle/50">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-danger-500/80" />
          <div className="w-3 h-3 rounded-full bg-warning-500/80" />
          <div className="w-3 h-3 rounded-full bg-success-500/80" />
        </div>
        <div className="flex-1 mx-4">
          <div className="h-6 rounded-md bg-surface-subtle border border-border-default flex items-center px-3">
            <span className="text-[10px] text-text-tertiary">clarift.app/dashboard</span>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 md:p-6">
        {children}
      </div>
    </div>
  )
}
