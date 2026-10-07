"use client";

import {
  Children,
  useEffect,
  useRef,
  useId,
  type ComponentProps,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useFormDialog } from "@/components/ui/dialog";

/** Form layout shared by both standalone forms and modal editors. */
export function EntityForm({
  children,
  pending = false,
  error,
  ...props
}: ComponentProps<"form"> & { pending?: boolean; error?: string | null }) {
  const dialog = useFormDialog();
  const errorId = useId();
  const submitting = useRef(false);
  const ref = useRef<HTMLFormElement>(null);
  const items = Children.toArray(children);
  const action = items.pop();
  useEffect(() => {
    dialog?.setBusy(pending);
  }, [pending, dialog]);
  useEffect(() => {
    if (!error || !ref.current) return;
    const controls = Array.from(
      ref.current.querySelectorAll<HTMLElement>(
        "input, textarea, [role='combobox'], button[aria-required]",
      ),
    );
    const matched = controls.find((el) => {
      const label = Array.from(ref.current!.querySelectorAll("label")).find(
        (label) => label.htmlFor === el.id,
      );
      return (
        label &&
        error.toLowerCase().includes(label.textContent?.toLowerCase() ?? "__")
      );
    });
    const control =
      matched ?? ref.current.querySelector<HTMLElement>(":invalid");
    if (!control) {
      const alert = ref.current.querySelector<HTMLElement>("[role=alert]");
      alert?.setAttribute("tabindex", "-1");
      alert?.focus();
      return;
    }
    let parent = control.parentElement;
    while (parent && parent !== ref.current) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
      parent = parent.parentElement;
    }
    control?.setAttribute("aria-invalid", "true");
    control?.setAttribute("aria-describedby", errorId);
    control?.focus();
  }, [error, errorId]);
  useEffect(() => {
    if (!error)
      ref.current?.querySelectorAll("[aria-invalid=true]").forEach((el) => {
        el.removeAttribute("aria-invalid");
        el.removeAttribute("aria-describedby");
      });
  }, [error]);
  return (
    <form
      {...props}
      ref={ref}
      aria-busy={pending}
      className="flex min-h-0 min-w-0 flex-1 flex-col gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (submitting.current) return;
        submitting.current = true;
        dialog?.setBusy(true);
        try {
          await props.onSubmit?.(event);
        } finally {
          submitting.current = false;
          dialog?.setBusy(false);
        }
      }}
      onChangeCapture={() => dialog?.setDirty(true)}
    >
      <div className="grid min-h-0 min-w-0 gap-4 overflow-y-auto overscroll-contain pr-1 [&_input]:h-11 [&_input]:rounded-xl [&_input]:placeholder:text-muted-foreground [&_textarea]:placeholder:text-muted-foreground [&_textarea]:rounded-xl [&_button]:min-h-11 [&_[data-slot=select-trigger]]:rounded-xl [&_[data-slot=select-trigger]]:min-h-11 [&_input]:text-base [&_textarea]:text-base sm:[&_input]:h-10 sm:[&_button]:min-h-10 sm:[&_[data-slot=select-trigger]]:min-h-10 sm:[&_input]:text-sm sm:[&_textarea]:text-sm [&_.grid]:min-w-0 [&_button]:max-w-full">
        {items}
        {error && (
          <span id={errorId} className="sr-only">
            {error}
          </span>
        )}
      </div>
      <div className="z-10 flex shrink-0 flex-wrap items-center justify-end gap-3 border-t bg-popover pt-4 [&_button]:min-h-11 sm:[&_button]:min-h-10">
        {dialog?.deleteAction && (
          <Button
            type="button"
            variant="destructive"
            className="mr-auto text-foreground"
            disabled={pending}
            onClick={dialog.deleteAction}
          >
            Delete
          </Button>
        )}
        {dialog && (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={dialog.cancel}
          >
            Cancel
          </Button>
        )}
        {action}
      </div>
    </form>
  );
}

export function useSavedForm() {
  const dialog = useFormDialog();
  return () => {
    dialog?.saved();
    toast.success("Saved successfully");
  };
}

export function OptionalFields({
  children,
  title = "Additional details",
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <details className="min-w-0 rounded-xl border p-4">
      <summary className="cursor-pointer text-sm font-medium focus-visible:outline-2">
        {title}
      </summary>
      <div className="mt-4 grid min-w-0 gap-4">{children}</div>
    </details>
  );
}
