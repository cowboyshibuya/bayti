"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, ImageUp, Loader2, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { LoadingState } from "@/components/shared/loading-state";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const MAX_PROFILE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const panelMotion = {
  initial: { opacity: 0, y: 14, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.98 },
};

type ProfileData = FunctionReturnType<typeof api.users.getCurrentProfile>;

export default function ProfileSetupPage() {
  const profile = useQuery(api.users.getCurrentProfile, {});

  if (profile === undefined) {
    return <LoadingState label="Preparing profile" />;
  }

  return <ProfileSetupEditor key={profile.user?._id} profile={profile} />;
}

function ProfileSetupEditor({ profile }: { profile: ProfileData }) {
  const router = useRouter();
  const generateUploadUrl = useMutation(api.users.generateProfileImageUploadUrl);
  const updateProfile = useMutation(api.users.updateProfile);
  const removeProfileImage = useMutation(api.users.removeProfileImage);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [displayName, setDisplayName] = useState(profile.user?.name ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, setPending] = useState<"save" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const user = profile.user;
  const cleanName = displayName.trim();
  const visibleImageUrl = previewUrl ?? profile.profileImageUrl ?? null;
  const hasCustomImage = Boolean(profile.hasCustomProfileImage);
  const canRemoveImage = Boolean(selectedFile || hasCustomImage);
  const canContinue = cleanName.length >= 2 && cleanName.length <= 80;

  function clearSelectedFile() {
    setSelectedFile(null);
    setPreviewUrl(null);

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function uploadProfileImage(file: File) {
    const uploadUrl = await generateUploadUrl({});
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!result.ok) {
      throw new Error("Profile picture upload failed.");
    }

    const { storageId } = (await result.json()) as {
      storageId: Id<"_storage">;
    };

    return storageId;
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setError(null);

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Choose an image file for your profile picture.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_SIZE_BYTES) {
      setError("Profile picture must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    previewUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);
    setSelectedFile(file);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("save");
    setError(null);

    if (!canContinue) {
      setError("Display name must be between 2 and 80 characters.");
      setPending(null);
      return;
    }

    try {
      const profileImageStorageId = selectedFile
        ? await uploadProfileImage(selectedFile)
        : undefined;

      await updateProfile({
        name: cleanName,
        profileImageStorageId,
      });

      clearSelectedFile();
      router.replace("/onboarding");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save profile.");
    } finally {
      setPending(null);
    }
  }

  async function handleRemoveImage() {
    setError(null);

    if (selectedFile) {
      clearSelectedFile();
      return;
    }

    setPending("remove");

    try {
      await removeProfileImage({});
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not remove profile picture.",
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <main className="min-h-svh bg-[#fbfaf8] px-5 py-6 text-[#101014] sm:px-8 dark:bg-background dark:text-foreground">
      <div className="mx-auto flex min-h-[calc(100svh-3rem)] max-w-5xl flex-col">
        <header className="flex h-12 items-center justify-center">
          <div className="flex items-center gap-2 rounded-full bg-black/[0.035] px-3 py-2 text-sm font-semibold text-black/70 dark:bg-white/[0.06] dark:text-foreground/70">
            <span className="flex size-6 items-center justify-center rounded-full bg-black text-white dark:bg-primary dark:text-primary-foreground">
              <UserRound className="size-3.5" />
            </span>
            Profile setup
          </div>
        </header>

        <div className="grid flex-1 place-items-center py-8">
          <motion.section
            {...panelMotion}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full max-w-xl text-center"
          >
            <div className="relative mx-auto h-36 w-44">
              <motion.button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                className="absolute left-1/2 top-0 z-10 flex size-32 -translate-x-1/2 items-center justify-center rounded-[2.25rem] border-[6px] border-[#eee6bd] bg-white shadow-[0_22px_60px_rgba(30,30,30,0.10)] outline-none transition-colors hover:border-[#e5dba7] focus-visible:ring-4 focus-visible:ring-black/10 dark:border-white/12 dark:bg-card dark:shadow-[0_22px_60px_rgba(0,0,0,0.28)] dark:focus-visible:ring-white/12"
                aria-label="Choose profile picture"
              >
                <AnimatePresence mode="wait">
                  <motion.span
                    key={visibleImageUrl ?? "fallback"}
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    transition={{ duration: 0.18 }}
                    className="size-full overflow-hidden rounded-[1.75rem]"
                  >
                    <UserAvatar
                      name={cleanName || user?.email || "Family member"}
                      imageUrl={visibleImageUrl}
                      className="size-full rounded-[1.75rem] ring-0 hover:ring-0"
                    />
                  </motion.span>
                </AnimatePresence>
              </motion.button>
              <motion.button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="absolute bottom-5 left-0 rounded-full bg-[#f8f5ff] px-4 py-2 text-xs font-semibold text-[#6f5d98] shadow-[0_8px_24px_rgba(80,60,120,0.08)] transition-colors hover:bg-[#f2edff] dark:bg-white/[0.08] dark:text-foreground/72 dark:hover:bg-white/[0.12]"
              >
                <ImageUp className="mr-1 inline size-3.5" />
                Upload
              </motion.button>
              <motion.button
                type="button"
                onClick={handleRemoveImage}
                disabled={!canRemoveImage || pending !== null}
                whileHover={canRemoveImage ? { y: -2 } : undefined}
                whileTap={canRemoveImage ? { scale: 0.98 } : undefined}
                className={cn(
                  "absolute bottom-6 right-0 rounded-full bg-[#f4f2ef] px-4 py-2 text-xs font-semibold text-black/58 shadow-[0_8px_24px_rgba(30,30,30,0.06)] transition-colors hover:bg-[#ece9e4] dark:bg-white/[0.06] dark:text-foreground/60 dark:hover:bg-white/[0.10]",
                  (!canRemoveImage || pending !== null) &&
                    "cursor-not-allowed opacity-45",
                )}
              >
                {pending === "remove" ? (
                  <Loader2 className="mr-1 inline size-3.5 animate-spin" />
                ) : (
                  <X className="mr-1 inline size-3.5" />
                )}
                Remove
              </motion.button>
            </div>

            <h1 className="mt-6 text-3xl font-semibold tracking-normal">
              Set up your profile
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-black/54 dark:text-foreground/54">
              This is how your family will see you across tasks, reminders,
              documents, and Stella.
            </p>

            <form onSubmit={handleSave} className="mx-auto mt-9 grid max-w-md gap-4 text-left">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleFileChange}
              />

              <div className="grid gap-2">
                <Label
                  htmlFor="displayName"
                  className="text-xs text-black/74 dark:text-foreground/74"
                >
                  Display name
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(event) => {
                    setDisplayName(event.target.value);
                    setError(null);
                  }}
                  minLength={2}
                  maxLength={80}
                  className="h-12 rounded-2xl border-black/10 bg-white px-4 text-base font-semibold text-black placeholder:text-black/18 hover:border-black/16 hover:bg-white focus-visible:border-black/24 focus-visible:ring-black/8 dark:border-white/10 dark:bg-card dark:text-foreground dark:placeholder:text-foreground/22 dark:hover:border-white/16 dark:hover:bg-card dark:focus-visible:border-white/24"
                  required
                />
              </div>

              <AnimatePresence mode="wait">
                {error && <InlineError key="error" message={error} />}
              </AnimatePresence>

              <Button
                type="submit"
                disabled={!canContinue || pending !== null}
                className="h-12 rounded-2xl bg-black text-white shadow-none hover:bg-black/88 disabled:bg-black/[0.045] disabled:text-black/18 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 dark:disabled:bg-white/[0.06] dark:disabled:text-foreground/20"
              >
                {pending === "save" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" />
                )}
                Continue
              </Button>
            </form>
          </motion.section>
        </div>
      </div>
    </main>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.16 }}
      className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-medium text-red-700 dark:border-destructive/25 dark:bg-destructive/10 dark:text-destructive"
    >
      {message}
    </motion.p>
  );
}
