"use client"

import { useRef, useEffect } from "react"

export function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number
    let width = 0
    let height = 0
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      width = parent.clientWidth
      height = parent.clientHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener("resize", resize)

    const blobs = [
      { x: 0.3, y: 0.3, radius: 0.4, color: "99, 102, 241", speed: 0.0005, offset: 0 },
      { x: 0.7, y: 0.5, radius: 0.35, color: "129, 140, 248", speed: 0.0007, offset: 2 },
      { x: 0.5, y: 0.8, radius: 0.45, color: "99, 102, 241", speed: 0.0006, offset: 4 },
    ]

    const animate = (time: number) => {
      ctx.clearRect(0, 0, width, height)

      blobs.forEach((blob) => {
        const bx = width * (blob.x + Math.sin(time * blob.speed + blob.offset) * 0.15)
        const by = height * (blob.y + Math.cos(time * blob.speed + blob.offset * 1.3) * 0.15)
        const r = Math.min(width, height) * blob.radius

        const gradient = ctx.createRadialGradient(bx, by, 0, bx, by, r)
        gradient.addColorStop(0, `rgba(${blob.color}, 0.08)`)
        gradient.addColorStop(0.5, `rgba(${blob.color}, 0.04)`)
        gradient.addColorStop(1, `rgba(${blob.color}, 0)`)

        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, width, height)
      })

      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  )
}
