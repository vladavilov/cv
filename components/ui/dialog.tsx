"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

function DialogPortal(props: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogBackdrop({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Backdrop>) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-backdrop"
      className={cn(
        "fixed inset-0 z-[60] bg-black/40 motion-safe:transition-opacity motion-safe:duration-300 data-ending-style:opacity-0 data-starting-style:opacity-0",
        className
      )}
      {...props}
    />
  )
}

const dialogPopupVariants = cva("fixed z-[70] bg-background outline-none", {
  variants: {
    variant: {
      // Only opacity and scale animate here; Tailwind v4 scale-* sets the
      // native `scale` property, so it is enumerated instead of `transform`.
      center:
        "left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border p-6 shadow-lg motion-safe:transition-[opacity,scale] motion-safe:duration-200 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
      command:
        "left-1/2 top-[16%] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border shadow-lg motion-safe:transition-[opacity,scale] motion-safe:duration-200 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0",
      "drawer-right":
        "right-0 top-0 flex h-full w-full max-w-[600px] flex-col border-l border-border shadow-[-8px_0_40px_rgba(0,0,0,0.4)] motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out data-ending-style:translate-x-full data-starting-style:translate-x-full",
    },
  },
  defaultVariants: {
    variant: "center",
  },
})

function DialogPopup({
  className,
  variant = "center",
  ...props
}: Omit<React.ComponentProps<typeof DialogPrimitive.Popup>, "className"> & {
  className?: string
} & VariantProps<typeof dialogPopupVariants>) {
  return (
    <DialogPrimitive.Popup
      data-slot="dialog-popup"
      className={cn(dialogPopupVariants({ variant }), className)}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg font-medium text-foreground", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

export {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  dialogPopupVariants,
}
