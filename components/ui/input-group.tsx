import * as React from "react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

function InputGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      className={cn(
        "relative flex h-9 w-full min-w-0 items-center rounded-lg border border-input bg-transparent text-sm shadow-none transition-all hover:border-foreground/20 has-[input:focus]:border-ring has-[input:focus]:ring-[3px] has-[input:focus]:ring-ring/30 has-aria-invalid:border-destructive has-aria-invalid:ring-[3px] has-aria-invalid:ring-destructive/20 dark:bg-input/20 dark:has-aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input-group-input"
      className={cn(
        "h-full w-full min-w-0 bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground/60",
        className
      )}
      {...props}
    />
  )
}

function InputGroupTextarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="input-group-textarea"
      className={cn(
        "min-h-20 w-full resize-none bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground/60",
        className
      )}
      {...props}
    />
  )
}

function InputGroupAddon({
  className,
  align = "end",
  ...props
}: React.ComponentProps<"div"> & { align?: "start" | "end" }) {
  return (
    <div
      data-slot="input-group-addon"
      data-align={align}
      className={cn(
        "flex shrink-0 items-center justify-center text-muted-foreground data-[align=start]:pl-2.5 data-[align=end]:pr-2.5 [&>svg]:size-4",
        className
      )}
      {...props}
    />
  )
}

function InputGroupButton({
  className,
  align = "end",
  ...props
}: React.ComponentProps<"button"> & { align?: "start" | "end" }) {
  return (
    <button
      data-slot="input-group-button"
      data-align={align}
      className={cn(
        "flex shrink-0 items-center justify-center text-muted-foreground hover:text-foreground data-[align=start]:pl-2.5 data-[align=end]:pr-2.5 [&>svg]:size-4",
        className
      )}
      {...props}
    />
  )
}

function InputGroupField({
  children,
  ...props
}: React.ComponentProps<typeof Slot.Root>) {
  return (
    <Slot.Root
      data-slot="input-group-field"
      className="contents [&>*]:data-[slot=input-group-input]:flex-1 [&>*]:data-[slot=input-group-textarea]:flex-1 [&>*]:border-0 [&>*]:shadow-none [&>*]:focus:ring-0 [&>*]:!ring-0 [&>*:first-child]:rounded-r-none [&>*:last-child]:rounded-l-none"
      {...props}
    >
      {children}
    </Slot.Root>
  )
}

export {
  InputGroup,
  InputGroupInput,
  InputGroupTextarea,
  InputGroupAddon,
  InputGroupButton,
  InputGroupField,
}
