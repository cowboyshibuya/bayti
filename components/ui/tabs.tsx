"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"
import { motion } from "framer-motion"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-full p-[3px] text-muted-foreground group-data-horizontal/tabs:h-9 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "border border-border bg-muted/60 backdrop-blur-xl dark:bg-white/[0.045]",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-full border border-transparent px-2.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/50 transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground/80 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 dark:text-foreground/50 dark:hover:text-foreground/80",
        "data-active:border-border data-active:bg-card data-active:text-foreground data-active:[box-shadow:0_8px_18px_rgba(25,25,25,0.08)] dark:data-active:border-white/[0.08] dark:data-active:bg-white/[0.12] dark:data-active:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.06),0_8px_18px_rgba(0,0,0,0.16)] dark:data-active:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
    >
      <TabsPrimitive.Content
        data-slot="tabs-content"
        className={cn("flex-1 text-sm outline-none", className)}
        {...props}
      />
    </motion.div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
