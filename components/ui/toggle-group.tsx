"use client"

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function ToggleGroup<Value extends string>({
  className,
  ...props
}: ToggleGroupPrimitive.Props<Value>) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      className={cn("flex flex-wrap gap-2", className)}
      {...props}
    />
  )
}

const toggleGroupItemVariants = cva(
  "transition-[color,background-color,border-color,scale] duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-safe:active:scale-[0.97]",
  {
    variants: {
      variant: {
        chip: "rounded-lg border px-3 py-1.5 text-sm not-data-pressed:border-border not-data-pressed:bg-muted not-data-pressed:text-foreground-soft not-data-pressed:hover:bg-secondary not-data-pressed:hover:text-foreground data-pressed:border-primary/30 data-pressed:bg-primary/10 data-pressed:text-accent-foreground data-pressed:hover:bg-accent",
        card: "rounded-lg border p-4 text-left not-data-pressed:border-input not-data-pressed:bg-background not-data-pressed:hover:border-foreground-faint data-pressed:border-primary/30 data-pressed:bg-primary/10",
      },
    },
    defaultVariants: {
      variant: "chip",
    },
  }
)

function ToggleGroupItem<Value extends string>({
  className,
  variant = "chip",
  ...props
}: TogglePrimitive.Props<Value> & VariantProps<typeof toggleGroupItemVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={cn(toggleGroupItemVariants({ variant }), className)}
      {...props}
    />
  )
}

export { ToggleGroup, ToggleGroupItem, toggleGroupItemVariants }
