"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "radix-ui"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Sheet({ open, onOpenChange, ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" open={open} onOpenChange={onOpenChange} {...props} />
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const sheetContentVariants = {
  right: {
    hidden: { x: "100%", opacity: 0 },
    visible: { x: 0, opacity: 1 },
  },
  left: {
    hidden: { x: "-100%", opacity: 0 },
    visible: { x: 0, opacity: 1 },
  },
  top: {
    hidden: { y: "-100%", opacity: 0 },
    visible: { y: 0, opacity: 1 },
  },
  bottom: {
    hidden: { y: "100%", opacity: 0 },
    visible: { y: 0, opacity: 1 },
  },
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <motion.div
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      transition={{ duration: 0.15 }}
    >
      <SheetPrimitive.Overlay
        data-slot="sheet-overlay"
        className={cn(
          "fixed inset-0 z-50 bg-black/45 supports-backdrop-filter:backdrop-blur-md",
          className
        )}
        {...props}
      />
    </motion.div>
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  const sideClass = {
    top: "inset-x-0 top-0 h-auto border-b",
    right: "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
    bottom: "inset-x-0 bottom-0 h-auto border-t",
    left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
  }

  return (
    <SheetPortal>
      <AnimatePresence>
        <SheetOverlay key="sheet-overlay" />
        <SheetPrimitive.Content
          key="sheet-content"
          data-slot="sheet-content"
          data-side={side}
          className={cn(
            "fixed z-50 flex min-h-0 flex-col gap-4 border-border bg-popover/95 bg-clip-padding text-sm text-popover-foreground shadow-[0_28px_80px_rgba(25,25,25,0.16)] backdrop-blur-2xl dark:shadow-[0_28px_80px_rgba(0,0,0,0.42)]",
            sideClass[side],
            className
          )}
          {...props}
          asChild
        >
          <motion.div
            variants={sheetContentVariants[side]}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ type: "spring", stiffness: 350, damping: 32 }}
          >
            {children}
            {showCloseButton && (
              <SheetPrimitive.Close data-slot="sheet-close" asChild>
                <Button
                  variant="ghost"
                  className="absolute top-3 right-3"
                  size="icon-sm"
                >
                  <XIcon />
                  <span className="sr-only">Close</span>
                </Button>
              </SheetPrimitive.Close>
            )}
          </motion.div>
        </SheetPrimitive.Content>
      </AnimatePresence>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-0.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "font-heading text-base font-medium text-foreground",
        className
      )}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
