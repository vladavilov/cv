import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm transition-[color,background-color,border-color,translate,scale] duration-150 outline-none focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 motion-safe:not-disabled:active:scale-[0.97] [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary font-medium text-primary-foreground hover:bg-primary-hover motion-safe:not-disabled:hover:-translate-y-0.5 motion-safe:not-disabled:active:translate-y-0",
        outline:
          "border border-input bg-background text-foreground-soft hover:bg-secondary hover:text-foreground motion-safe:not-disabled:hover:-translate-y-0.5 motion-safe:not-disabled:active:translate-y-0",
        ghost:
          "text-muted-foreground hover:bg-muted hover:text-foreground not-disabled:active:bg-secondary",
      },
      size: {
        default: "px-4 py-2",
        sm: "px-3 py-1.5",
        icon: "rounded p-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

/**
 * Button-styled anchor for navigation. Deliberately NOT built on the Base UI
 * Button primitive: `useButton` with `nativeButton={false}` forces
 * `role="button"` and Space/Enter click synthesis onto the element, which
 * strips link semantics from assistive technology. Links must stay links.
 */
function ButtonLink({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<"a"> & VariantProps<typeof buttonVariants>) {
  return (
    <a
      data-slot="button-link"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, ButtonLink, buttonVariants }
