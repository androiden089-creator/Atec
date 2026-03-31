import * as React from "react"
import { cn } from "@/src/lib/utils"

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost' | 'destructive', size?: 'default' | 'sm' | 'lg' }>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
          {
            "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm": variant === "default",
            "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900": variant === "outline",
            "hover:bg-slate-50 hover:text-slate-900 text-slate-600": variant === "ghost",
            "bg-red-500 text-white hover:bg-red-600 shadow-sm": variant === "destructive",
            "h-12 px-6 py-2": size === "default",
            "h-9 px-4": size === "sm",
            "h-14 px-8 text-base": size === "lg",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
