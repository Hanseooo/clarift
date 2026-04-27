"use client"

import { Upload } from "lucide-react"

export function MockUploadFrame() {
  return (
    <div className="w-full">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-brand-500/20 bg-brand-500/10">
          <Upload className="size-7 text-brand-500" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-text-primary">
            Drop your notes here, or click to upload
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            PDF only up to 50MB
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {["PDF", "PNG / JPG", "TXT"].map((type) => (
            <span
              key={type}
              className="rounded-full border border-brand-500/20 bg-brand-500/8 px-3 py-1 text-xs font-medium text-brand-500"
            >
              {type}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
