"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
import { BackButton } from "@/components/shared/back-button";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";

type FormDialogContextValue = {
  saved: () => void;
  setBusy: (busy: boolean) => void;
  setDirty: (dirty: boolean) => void;
  cancel: () => void;
  deleteAction?: () => void;
  resetForm: () => boolean;
};
const FormDialogContext = React.createContext<FormDialogContextValue | null>(
  null,
);
export function useFormDialog() {
  return React.useContext(FormDialogContext);
}

function Dialog({
  open,
  onOpenChange,
  children,
  defaultOpen,
  onDelete,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root> & {
  onDelete?: () => void;
}) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen ?? false);
  const busy = React.useRef(false);
  const dirty = React.useRef(false);
  const change = (next: boolean, force = false) => {
    if (
      !next &&
      !force &&
      (busy.current ||
        (dirty.current && !window.confirm("Discard your unsaved changes?")))
    )
      return;
    if (!next) {
      dirty.current = false;
      busy.current = false;
    }
    setInternalOpen(next);
    onOpenChange?.(next);
  };
  return (
    <FormDialogContext.Provider
      value={{
        deleteAction: onDelete,
        resetForm: () => {
          if (
            busy.current ||
            (dirty.current && !window.confirm("Discard your unsaved changes?"))
          )
            return false;
          dirty.current = false;
          return true;
        },
        saved: () => change(false, true),
        cancel: () => change(false),
        setBusy: (value) => {
          busy.current = value;
        },
        setDirty: (value) => {
          dirty.current = value;
        },
      }}
    >
      <DialogPrimitive.Root
        {...props}
        open={open ?? internalOpen}
        onOpenChange={(value) => change(value)}
      >
        {children}
      </DialogPrimitive.Root>
    </FormDialogContext.Provider>
  );
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <motion.div
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      transition={{ duration: 0.15 }}
    >
      <DialogPrimitive.Overlay
        data-slot="dialog-overlay"
        className={cn(
          "fixed inset-0 isolate z-50 bg-black/45 supports-backdrop-filter:backdrop-blur-md",
          className,
        )}
        {...props}
      />
    </motion.div>
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <DialogPortal>
      <AnimatePresence initial={false}>
        <DialogOverlay key="dialog-overlay" />
        <DialogPrimitive.Content asChild {...props}>
          <motion.div
            key="dialog-content"
            data-slot="dialog-content"
            initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : 4 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className={cn(
              "fixed left-1/2 top-1/2 z-50 flex w-[calc(100%-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 overflow-hidden overscroll-contain rounded-2xl border bg-popover p-5 text-popover-foreground shadow-2xl outline-none sm:p-6",
              className,
            )}
          >
            {React.Children.toArray(children).filter(
              (child) =>
                React.isValidElement(child) && child.type === DialogHeader,
            )}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto has-[form]:overflow-hidden">
              {React.Children.toArray(children).filter(
                (child) =>
                  !(React.isValidElement(child) && child.type === DialogHeader),
              )}
            </div>
            {showCloseButton && (
              <DialogPrimitive.Close asChild>
                <Button
                  variant="ghost"
                  className="absolute top-3 right-3 size-10"
                  size="icon-sm"
                  aria-label="Close dialog"
                >
                  <XIcon aria-hidden="true" />
                </Button>
              </DialogPrimitive.Close>
            )}
          </motion.div>
        </DialogPrimitive.Content>
      </AnimatePresence>
    </DialogPortal>
  );
}

function DialogHeader({
  className,
  children,
  onBack,
  ...props
}: React.ComponentProps<"div"> & { onBack?: () => void }) {
  const dialog = useFormDialog();
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex shrink-0 flex-col gap-2 pr-10", className)}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (!onBack || !React.isValidElement(child)) return child;
        if (child.type === DialogTitle)
          return (
            <div className="flex min-w-0 items-center gap-2">
              <BackButton
                onClick={() => {
                  if (!dialog || dialog.resetForm()) onBack();
                }}
              />
              {child}
            </div>
          );
        return child;
      })}
    </div>
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean;
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-3 rounded-b-2xl border-t border-border bg-muted/30 p-4 sm:flex-row sm:justify-end dark:bg-white/[0.025]",
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "min-w-0 break-words font-heading text-xl leading-tight font-semibold text-balance",
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
