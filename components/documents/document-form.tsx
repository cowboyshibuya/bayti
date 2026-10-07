"use client";

import { EntityForm, useSavedForm } from "@/components/shared/entity-form";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useHousehold } from "@/lib/household-context";
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
import { DatePicker } from "@/components/shared/date-picker";
import { formatDateInputValue, parseLocalDate } from "@/lib/dates";
import { toTitleLabel } from "@/lib/formatters";

export const documentTypes = [
  "receipt",
  "invoice",
  "contract",
  "warranty",
  "policy",
  "identity",
  "other",
] as const;

export type DocumentType = (typeof documentTypes)[number];

export type DocumentFormSubmitValues = {
  title: string;
  documentType: DocumentType;
  folderId?: Id<"documentFolders">;
  file?: File;
  vendor?: string;
  amount?: number;
  currency?: string;
  issuedAt?: number;
  expiresAt?: number;
};

export function DocumentForm({
  folders,
  initialDocument,
  submitLabel,
  allowFileUpload = true,
  onSubmit,
}: {
  folders: Doc<"documentFolders">[];
  initialDocument?: Doc<"documents"> | null;
  submitLabel: string;
  allowFileUpload?: boolean;
  onSubmit: (values: DocumentFormSubmitValues) => Promise<void>;
}) {
  const saved = useSavedForm();
  const [title, setTitle] = useState(initialDocument?.title ?? "");
  const [documentType, setDocumentType] = useState<DocumentType>(
    initialDocument?.documentType ?? "policy",
  );
  const [folderValue, setFolderValue] = useState(
    initialDocument?.folderId ?? "unfiled",
  );
  const [vendor, setVendor] = useState(initialDocument?.vendor ?? "");
  const [amount, setAmount] = useState(
    initialDocument?.amount !== undefined ? String(initialDocument.amount) : "",
  );
  const { household } = useHousehold();
  const currency = initialDocument?.currency ?? household?.currency ?? "EUR";
  const [issuedAt, setIssuedAt] = useState(
    formatDateInputValue(initialDocument?.issuedAt),
  );
  const [expiresAt, setExpiresAt] = useState(
    formatDateInputValue(initialDocument?.expiresAt),
  );
  const [file, setFile] = useState<File | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sortedFolders = useMemo(
    () =>
      [...folders].sort((left, right) => left.name.localeCompare(right.name)),
    [folders],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        title,
        documentType,
        folderId:
          folderValue === "unfiled"
            ? undefined
            : (folderValue as Id<"documentFolders">),
        file,
        vendor: vendor.trim() || undefined,
        amount: amount.trim() ? Number(amount) : undefined,
        currency: currency.trim() || undefined,
        issuedAt: parseLocalDate(issuedAt, "00:00"),
        expiresAt: parseLocalDate(expiresAt, "00:00"),
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
        <Label htmlFor="document-title">Title</Label>
        <Input
          id="document-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Passport, home insurance, appliance warranty"
          required
        />
      </div>

      {allowFileUpload && (
        <div className="grid gap-2">
          <Label htmlFor="document-file">File</Label>
          <Input
            id="document-file"
            type="file"
            onChange={(event) => setFile(event.target.files?.[0])}
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to create a metadata-only document.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="document-type">Type</Label>
          <Select
            value={documentType}
            onValueChange={(value) => setDocumentType(value as DocumentType)}
          >
            <SelectTrigger id="document-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {documentTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {toTitleLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="document-folder">Folder</Label>
          <Select value={folderValue} onValueChange={setFolderValue}>
            <SelectTrigger id="document-folder" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unfiled">Unfiled</SelectItem>
              {sortedFolders.map((folder) => (
                <SelectItem key={folder._id} value={folder._id}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-2 sm:col-span-3">
          <Label htmlFor="document-vendor">Vendor / issuer</Label>
          <Input
            id="document-vendor"
            value={vendor}
            onChange={(event) => setVendor(event.target.value)}
            placeholder="Insurance provider, school, bank"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="document-amount">Amount</Label>
          <Input
            id="document-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="document-issued">Issued</Label>
          <DatePicker
            value={issuedAt}
            onChange={setIssuedAt}
            placeholder="Issued date"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="document-expires">Expires</Label>
          <DatePicker
            value={expiresAt}
            onChange={setExpiresAt}
            placeholder="Expiry date"
          />
        </div>
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
