"use client";

import { EntityForm, useSavedForm } from "@/components/shared/entity-form";

import { useState } from "react";

import { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type FolderFormSubmitValues = {
  name: string;
  description?: string;
};

export function FolderForm({
  initialFolder,
  submitLabel,
  onSubmit,
}: {
  initialFolder?: Doc<"documentFolders"> | null;
  submitLabel: string;
  onSubmit: (values: FolderFormSubmitValues) => Promise<void>;
}) {
  const saved = useSavedForm();
  const [name, setName] = useState(initialFolder?.name ?? "");
  const [description, setDescription] = useState(
    initialFolder?.description ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        name,
        description: description.trim() || undefined,
      });
      saved();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not save. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <EntityForm onSubmit={handleSubmit} pending={submitting} error={error}>
      <div className="grid gap-2">
        <Label htmlFor="folder-name">Name</Label>
        <Input
          id="folder-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Insurance, IDs, School"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="folder-description">Description</Label>
        <Textarea
          id="folder-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional note for this folder"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving..." : submitLabel}
      </Button>
    </EntityForm>
  );
}
