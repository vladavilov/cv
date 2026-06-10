"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const tooltipPopupVariants = cva(
  "rounded-md border border-border px-2 py-1 text-xs shadow-md transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0",
  {
    variants: {
      variant: {
        default: "bg-popover text-popover-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

function TooltipTrigger(props: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  variant = "default",
  side = "top",
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Popup> &
  VariantProps<typeof tooltipPopupVariants> & {
    side?: React.ComponentProps<typeof TooltipPrimitive.Positioner>["side"]
    sideOffset?: React.ComponentProps<typeof TooltipPrimitive.Positioner>["sideOffset"]
  }) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner side={side} sideOffset={sideOffset} className="z-[80]">
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(tooltipPopupVariants({ variant }), className)}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, tooltipPopupVariants }
