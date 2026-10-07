"use client";

import { EntityForm, useSavedForm } from "@/components/shared/entity-form";

import { FormEvent, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/shared/date-picker";
import { MemberDisplay } from "@/components/shared/member-display";
import { formatDateTimeInputValue, parseDateTimeInput } from "@/lib/dates";

export type ReminderFormSubmitValues = {
  title: string;
  note?: string;
  remindAt: number;
  targetUserId?: Id<"users">;
};

export function ReminderForm({
  members,
  initialReminder,
  defaultDate,
  submitLabel,
  onSubmit,
}: {
  members: { membership: Doc<"householdMembers">; user: Doc<"users"> | null }[];
  initialReminder?: Pick<
    Doc<"reminders">,
    "title" | "note" | "remindAt" | "targetUserId"
  >;
  defaultDate?: number;
  submitLabel: string;
  onSubmit: (values: ReminderFormSubmitValues) => Promise<void>;
}) {
  const saved = useSavedForm();
  const [title, setTitle] = useState(initialReminder?.title ?? "");
  const [note, setNote] = useState(initialReminder?.note ?? "");
  const [remindAt, setRemindAt] = useState(() =>
    formatDateTimeInputValue(
      initialReminder?.remindAt ?? defaultDate ?? Date.now() + 60 * 60 * 1000,
    ),
  );
  const [targetUserId, setTargetUserId] = useState<string>(
    initialReminder?.targetUserId ?? "household",
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberOptions = useMemo(
    () =>
      members.filter(
        (member): member is typeof member & { user: Doc<"users"> } =>
          Boolean(member.user),
      ),
    [members],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);

    const cleanTitle = title.trim();
    const timestamp = parseDateTimeInput(remindAt);

    if (!cleanTitle) {
      setError("Reminder title is required.");
      setPending(false);
      return;
    }

    if (timestamp === undefined) {
      setError("Choose a valid reminder time.");
      setPending(false);
      return;
    }

    try {
      await onSubmit({
        title: cleanTitle,
        note: note.trim() || undefined,
        remindAt: timestamp,
        targetUserId:
          targetUserId === "household"
            ? undefined
            : (targetUserId as Id<"users">),
      });
      saved();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save reminder.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <EntityForm onSubmit={handleSubmit} pending={pending} error={error}>
      <div className="grid gap-2">
        <Label htmlFor="reminder-title">Title</Label>
        <Input
          id="reminder-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Follow up on school form"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="reminder-note">Note</Label>
        <Textarea
          id="reminder-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add any details the family needs."
          rows={3}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="reminder-at">Remind at</Label>
          <DateTimePicker
            id="reminder-at"
            value={remindAt}
            onChange={setRemindAt}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reminder-for">For</Label>
          <Select value={targetUserId} onValueChange={setTargetUserId}>
            <SelectTrigger id="reminder-for">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="household">Whole household</SelectItem>
              {memberOptions.map((member) => (
                <SelectItem key={member.user._id} value={member.user._id}>
                  <MemberDisplay
                    member={member}
                    detail={member.user.email}
                    avatarClassName="size-6"
                  />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {submitLabel}
      </Button>
    </EntityForm>
  );
}
