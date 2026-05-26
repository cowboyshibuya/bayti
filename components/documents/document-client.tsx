"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  Download,
  Edit2,
  FileText,
  Folder,
  FolderPlus,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Doc, Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import {
  DocumentForm,
  documentTypes,
  type DocumentFormSubmitValues,
  type DocumentType,
} from "@/components/documents/document-form";
import {
  FolderForm,
  type FolderFormSubmitValues,
} from "@/components/documents/folder-form";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { MemberDisplay, type MemberWithUser } from "@/components/shared/member-display";
import { UserAvatar } from "../shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHousehold } from "@/lib/household-context";
import { formatDate } from "@/lib/dates";
import { formatCurrency, toTitleLabel } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type FolderStats = {
  folder: Doc<"documentFolders"> | null;
  count: number;
  sizeBytes: number;
};

type DocumentRow = {
  document: Doc<"documents">;
  folder: Doc<"documentFolders"> | null;
  uploadedBy: Doc<"users"> | null;
  fileUrl: string | null;
};

type SortValue = "latest" | "name" | "expires" | "size";

const allFoldersValue = "all";
const unfiledFolderValue = "unfiled";

function formatSize(bytes?: number | null) {
  if (!bytes) return "No file";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

function expiryVariant(
  timestamp: number | undefined,
  nowTime: number,
): "secondary" | "destructive" | "warning" {
  if (!timestamp) return "secondary";
  const days = (timestamp - nowTime) / (1000 * 60 * 60 * 24);
  if (days < 0) return "destructive";
  if (days <= 30) return "warning";
  return "secondary";
}

function sortDocuments(documents: DocumentRow[], sort: SortValue) {
  return [...documents].sort((left, right) => {
    if (sort === "name") {
      return left.document.title.localeCompare(right.document.title);
    }

    if (sort === "expires") {
      return (
        (left.document.expiresAt ?? Number.MAX_SAFE_INTEGER) -
        (right.document.expiresAt ?? Number.MAX_SAFE_INTEGER)
      );
    }

    if (sort === "size") {
      return (right.document.sizeBytes ?? 0) - (left.document.sizeBytes ?? 0);
    }

    return right.document.updatedAt - left.document.updatedAt;
  });
}

export function DocumentsClient() {
  const searchParams = useSearchParams();
  const highlightedDocumentId = searchParams.get("document");
  const [nowTime] = useState(Date.now);
  const { household } = useHousehold();
  const householdId = household?._id;

  const [query, setQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState<string>(allFoldersValue);
  const [typeFilter, setTypeFilter] = useState<DocumentType | "all">("all");
  const [sort, setSort] = useState<SortValue>("latest");
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Doc<"documents"> | null>(null);
  const [editingFolder, setEditingFolder] = useState<Doc<"documentFolders"> | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<Doc<"documents"> | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<Doc<"documentFolders"> | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const foldersResult = useQuery(
    api.documentFolders.list,
    householdId ? { householdId } : "skip",
  );
  const documents = useQuery(
    api.documents.list,
    householdId
      ? {
          householdId,
          folderId:
            folderFilter === allFoldersValue
              ? undefined
              : folderFilter === unfiledFolderValue
                ? null
                : (folderFilter as Id<"documentFolders">),
          documentType: typeFilter,
          query,
          limit: 250,
        }
      : "skip",
  );

  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.create);
  const updateDocument = useMutation(api.documents.update);
  const removeDocument = useMutation(api.documents.remove);
  const createFolder = useMutation(api.documentFolders.create);
  const updateFolder = useMutation(api.documentFolders.update);
  const removeFolder = useMutation(api.documentFolders.remove);

  const folders = useMemo(
    () => foldersResult?.folders.map((item) => item.folder).filter(Boolean) ?? [],
    [foldersResult],
  ) as Doc<"documentFolders">[];

  const sortedDocuments = useMemo(
    () => sortDocuments((documents ?? []) as DocumentRow[], sort),
    [documents, sort],
  );
  const recentDocuments = sortedDocuments.slice(0, 4);
  const totalSize = sortedDocuments.reduce(
    (total, row) => total + (row.document.sizeBytes ?? 0),
    0,
  );
  const expiringCount = sortedDocuments.filter((row) => {
    if (!row.document.expiresAt) return false;
    const days = (row.document.expiresAt - nowTime) / (1000 * 60 * 60 * 24);
    return days <= 45;
  }).length;

  if (!householdId || foldersResult === undefined || documents === undefined) {
    return <LoadingState label="Loading documents" />;
  }

  const currentHouseholdId = householdId;
  const currentFoldersResult = foldersResult;

  async function uploadFile(file: File) {
    const uploadUrl = await generateUploadUrl({});
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });

    if (!result.ok) {
      throw new Error("File upload failed.");
    }

    const { storageId } = (await result.json()) as {
      storageId: Id<"_storage">;
    };

    return storageId;
  }

  async function handleCreateDocument(values: DocumentFormSubmitValues) {
    setError(null);
    try {
      const storageId = values.file ? await uploadFile(values.file) : undefined;
      await createDocument({
        householdId: currentHouseholdId,
        title: values.title,
        documentType: values.documentType,
        folderId: values.folderId,
        storageId,
        fileName: values.file?.name,
        mimeType: values.file?.type,
        sizeBytes: values.file?.size,
        vendor: values.vendor,
        amount: values.amount,
        currency: values.currency,
        issuedAt: values.issuedAt,
        expiresAt: values.expiresAt,
      });
      setDocumentDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save document.");
      throw err;
    }
  }

  async function handleUpdateDocument(values: DocumentFormSubmitValues) {
    if (!editingDocument) return;
    setError(null);
    try {
      await updateDocument({
        householdId: currentHouseholdId,
        documentId: editingDocument._id,
        title: values.title,
        documentType: values.documentType,
        folderId: values.folderId ?? null,
        vendor: values.vendor ?? null,
        amount: values.amount ?? null,
        currency: values.currency ?? null,
        issuedAt: values.issuedAt ?? null,
        expiresAt: values.expiresAt ?? null,
      });
      setEditingDocument(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update document.");
      throw err;
    }
  }

  async function handleCreateFolder(values: FolderFormSubmitValues) {
    setError(null);
    try {
      await createFolder({
        householdId: currentHouseholdId,
        name: values.name,
        description: values.description,
      });
      setFolderDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save folder.");
      throw err;
    }
  }

  async function handleUpdateFolder(values: FolderFormSubmitValues) {
    if (!editingFolder) return;
    setError(null);
    try {
      await updateFolder({
        householdId: currentHouseholdId,
        folderId: editingFolder._id,
        name: values.name,
        description: values.description ?? null,
      });
      setEditingFolder(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update folder.");
      throw err;
    }
  }

  async function handleRemoveDocument() {
    if (!documentToDelete) return;

    setDeletePending(true);
    setError(null);
    try {
      await removeDocument({
        householdId: currentHouseholdId,
        documentId: documentToDelete._id,
      });
      setDocumentToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete document.");
    } finally {
      setDeletePending(false);
    }
  }

  async function handleRemoveFolder() {
    if (!folderToDelete) return;

    setDeletePending(true);
    setError(null);
    try {
      await removeFolder({
        householdId: currentHouseholdId,
        folderId: folderToDelete._id,
      });
      setFolderToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete folder.");
    } finally {
      setDeletePending(false);
    }
  }

  function folderTiles(): FolderStats[] {
    return [
      ...(currentFoldersResult.folders as FolderStats[]),
      currentFoldersResult.unfiled as FolderStats,
    ];
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{household?.name}</p>
          <h1 className="text-2xl font-semibold">Documents</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Shared policies, IDs, receipts, warranties, and household paperwork.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FolderPlus className="size-4" />
                New folder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New folder</DialogTitle>
                <DialogDescription>
                  Group documents by policy, person, provider, or project.
                </DialogDescription>
              </DialogHeader>
              <FolderForm submitLabel="Create folder" onSubmit={handleCreateFolder} />
            </DialogContent>
          </Dialog>

          <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" />
                New document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>New document</DialogTitle>
                <DialogDescription>
                  Upload a file or save a document record to track important dates.
                </DialogDescription>
              </DialogHeader>
              <DocumentForm
                folders={folders}
                submitLabel="Save document"
                onSubmit={handleCreateDocument}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 [box-shadow:var(--shadow-card)]">
          <p className="text-xs text-muted-foreground">Documents</p>
          <p className="mt-1 text-2xl font-semibold">{sortedDocuments.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 [box-shadow:var(--shadow-card)]">
          <p className="text-xs text-muted-foreground">Stored files</p>
          <p className="mt-1 text-2xl font-semibold">{formatSize(totalSize)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 [box-shadow:var(--shadow-card)]">
          <p className="text-xs text-muted-foreground">Expiring soon</p>
          <p className="mt-1 text-2xl font-semibold">{expiringCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search documents..."
            className="pl-9"
          />
        </div>
        <Select value={folderFilter} onValueChange={setFolderFilter}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={allFoldersValue}>All folders</SelectItem>
            <SelectItem value={unfiledFolderValue}>Unfiled</SelectItem>
            {folders.map((folder) => (
              <SelectItem key={folder._id} value={folder._id}>
                {folder.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={typeFilter}
          onValueChange={(value) => setTypeFilter(value as DocumentType | "all")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {documentTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {toTitleLabel(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(value) => setSort(value as SortValue)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">Sort: Latest</SelectItem>
            <SelectItem value="name">Sort: Name</SelectItem>
            <SelectItem value="expires">Sort: Expiry</SelectItem>
            <SelectItem value="size">Sort: Size</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Folders</h2>
          <Button
            variant={folderFilter === allFoldersValue ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFolderFilter(allFoldersValue)}
          >
            All documents
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {folderTiles().map((item) => {
            const value = item.folder?._id ?? unfiledFolderValue;
            const active = folderFilter === value;

            return (
              <motion.div
                key={value}
                role="button"
                layout
                tabIndex={0}
                onClick={() => setFolderFilter(value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setFolderFilter(value);
                  }
                }}
                className={cn(
                  "group min-w-0 rounded-xl border bg-card p-4 text-left transition-colors [box-shadow:var(--shadow-card)] hover:border-foreground/16 hover:bg-muted/30",
                  active && "border-primary/40 bg-primary/5",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Folder className="size-5" />
                  </span>
                  {item.folder && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                          className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <MoreHorizontal className="size-4" />
                        </span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditingFolder(item.folder);
                          }}
                        >
                          <Edit2 className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={(event) => {
                            event.stopPropagation();
                            setError(null);
                            setFolderToDelete(item.folder!);
                          }}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <p className="mt-4 truncate text-sm font-semibold">
                  {item.folder?.name ?? "Unfiled"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.count} files · {formatSize(item.sizeBytes)}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {recentDocuments.length > 0 && (
        <section className="grid gap-3">
          <h2 className="text-sm font-semibold">Recent</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {recentDocuments.map((row) => (
              <button
                key={row.document._id}
                type="button"
                onClick={() =>
                  row.fileUrl
                    ? window.open(row.fileUrl, "_blank", "noopener,noreferrer")
                    : setEditingDocument(row.document)
                }
                className="flex items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors [box-shadow:var(--shadow-card)] hover:border-foreground/16 hover:bg-muted/30"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <FileText className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {row.document.title}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {formatDate(row.document.updatedAt)} · {formatSize(row.document.sizeBytes)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-3">
        <h2 className="text-sm font-semibold">All files</h2>
        {sortedDocuments.length === 0 ? (
          <EmptyState
            icon={Upload}
            title="No documents found"
            description="Upload a file or save a document record to start the shared family library."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Folder</TableHead>
                <TableHead>Uploaded by</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDocuments.map((row) => {

                const highlighted = highlightedDocumentId === row.document._id;
                const uploaderName = row.uploadedBy?.name ?? row.uploadedBy?.email ?? "Family member";
                return (
                  <TableRow
                    key={row.document._id}
                    className={cn(highlighted && "bg-primary/5")}
                  >
                    <TableCell>
                      <div className="flex min-w-52 items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                          <FileText className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{row.document.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {row.document.fileName ?? "Metadata only"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {toTitleLabel(row.document.documentType)}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.folder?.name ?? "Unfiled"}</TableCell>
                    <TableCell>
                      {/*<MemberDisplay
                        member={member}
                        avatarClassName="size-6"
                        className="min-w-36"
                      />*/}
                      <span className="flex min-w-36 items-center gap-2">
                        <UserAvatar
                          name={uploaderName}
                          imageUrl={row.uploadedBy?.image}
                          className="size-6"
                        />
                        <span className="truncate text-sm font-medium">
                          {uploaderName}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>{row.document.vendor ?? "—"}</TableCell>
                    <TableCell>
                      {row.document.amount !== undefined
                        ? formatCurrency(row.document.amount, row.document.currency)
                        : "—"}
                    </TableCell>
                    <TableCell>{formatDate(row.document.issuedAt)}</TableCell>
                    <TableCell>
                      {row.document.expiresAt ? (
                        <Badge variant={expiryVariant(row.document.expiresAt, nowTime)}>
                          {formatDate(row.document.expiresAt)}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{formatSize(row.document.sizeBytes)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" animated={false}>
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Document actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            disabled={!row.fileUrl}
                            onClick={() =>
                              row.fileUrl &&
                              window.open(row.fileUrl, "_blank", "noopener,noreferrer")
                            }
                          >
                            <Download className="size-4" />
                            Open file
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingDocument(row.document)}>
                            <Edit2 className="size-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => {
                              setError(null);
                              setDocumentToDelete(row.document);
                            }}
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>

      <Dialog
        open={editingDocument !== null}
        onOpenChange={(open) => !open && setEditingDocument(null)}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit document</DialogTitle>
            <DialogDescription>
              Update the filing details and renewal dates for this document.
            </DialogDescription>
          </DialogHeader>
          {editingDocument && (
            <DocumentForm
              folders={folders}
              initialDocument={editingDocument}
              allowFileUpload={false}
              submitLabel="Update document"
              onSubmit={handleUpdateDocument}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingFolder !== null}
        onOpenChange={(open) => !open && setEditingFolder(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit folder</DialogTitle>
            <DialogDescription>
              Rename or clarify how this folder should be used.
            </DialogDescription>
          </DialogHeader>
          {editingFolder && (
            <FolderForm
              initialFolder={editingFolder}
              submitLabel="Update folder"
              onSubmit={handleUpdateFolder}
            />
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={Boolean(documentToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setDocumentToDelete(null);
            setError(null);
          }
        }}
        title="Delete document?"
        description={
          documentToDelete
            ? `This permanently deletes "${documentToDelete.title}", its file, links, and reminders. This cannot be undone.`
            : "This permanently deletes the document."
        }
        actionLabel="Delete document"
        pending={deletePending}
        error={documentToDelete ? error : null}
        onConfirm={handleRemoveDocument}
      />
      <ConfirmDialog
        open={Boolean(folderToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setFolderToDelete(null);
            setError(null);
          }
        }}
        title="Delete folder?"
        description={
          folderToDelete
            ? `This permanently deletes the "${folderToDelete.name}" folder. Move or delete documents in this folder first.`
            : "This permanently deletes the folder."
        }
        actionLabel="Delete folder"
        pending={deletePending}
        error={folderToDelete ? error : null}
        onConfirm={handleRemoveFolder}
      />
    </div>
  );
}
