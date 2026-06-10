"use client"

import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const chipVariants = cva(
  "inline-flex items-center transition-[color,background-color,border-color,translate,scale] duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "gap-2 rounded-lg border border-border bg-muted px-3 py-1.5 text-sm text-foreground-soft hover:bg-secondary hover:text-foreground motion-safe:not-disabled:hover:-translate-y-0.5 motion-safe:not-disabled:active:translate-y-0 motion-safe:not-disabled:active:scale-[0.97]",
        active:
          "gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm text-accent-foreground hover:bg-accent motion-safe:not-disabled:hover:-translate-y-0.5 motion-safe:not-disabled:active:translate-y-0 motion-safe:not-disabled:active:scale-[0.97]",
        tag: "rounded-md border border-input bg-background px-2 py-0.5 text-xs text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Chip({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof chipVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(chipVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "chip",
      variant,
    },
  })
}

export { Chip, chipVariants }
