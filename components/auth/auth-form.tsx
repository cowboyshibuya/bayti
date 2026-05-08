"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

type AuthMode = "signIn" | "signUp";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextErrors: Record<string, string> = {};
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "").trim();

    if (!email.includes("@")) nextErrors.email = "Enter a valid email.";
    // if (password.length < 8) nextErrors.password = "Use at least 8 characters.";
    if (mode === "signUp" && name.length < 2) {
      nextErrors.name = "Enter your display name.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      formData.set("flow", mode);
      await signIn("password", formData);
      router.push(mode === "signUp" ? "/new-workspace" : "/");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Authentication failed",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded bg-primary text-sm font-semibold text-primary-foreground">
            Shelby
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            {mode === "signIn" ? "Sign in to Shelby" : "Create account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signIn"
              ? "Open your workspace and get back to the list."
              : "Start with a workspace. Add products next."}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "signUp" ? (
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" autoComplete="name" />
              {errors.name ? (
                <p className="text-xs text-destructive">{errors.name}</p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" />
            {errors.email ? (
              <p className="text-xs text-destructive">{errors.email}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
            />
            {errors.password ? (
              <p className="text-xs text-destructive">{errors.password}</p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting
              ? "Working..."
              : mode === "signIn"
                ? "Sign in"
                : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signIn" ? "No account yet?" : "Already have an account?"}{" "}
          <Link
            href={mode === "signIn" ? "/signup" : "/login"}
            className="font-medium text-foreground hover:underline"
          >
            {mode === "signIn" ? "Sign up" : "Sign in"}
          </Link>
        </p>
      </div>
    </div>
  );
}
