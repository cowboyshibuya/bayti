import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type EnrichedUser = Doc<"users"> & {
  image: string | undefined;
  profileImageUrl: string | null;
};

export async function getUserProfileImageUrl(
  ctx: QueryCtx | MutationCtx,
  user: Pick<Doc<"users">, "image" | "profileImageStorageId">,
) {
  if (user.profileImageStorageId) {
    const customUrl = await ctx.storage.getUrl(user.profileImageStorageId);

    if (customUrl) {
      return customUrl;
    }
  }

  return user.image ?? null;
}

export async function enrichUser(
  ctx: QueryCtx | MutationCtx,
  user: Doc<"users"> | null,
): Promise<EnrichedUser | null> {
  if (!user) {
    return null;
  }

  const profileImageUrl = await getUserProfileImageUrl(ctx, user);

  return {
    ...user,
    image: profileImageUrl ?? undefined,
    profileImageUrl,
  };
}

export async function assertImageStorageFile(
  ctx: QueryCtx | MutationCtx,
  storageId: Id<"_storage">,
  maxSizeBytes: number,
) {
  const metadata = await ctx.db.system.get(storageId);

  if (!metadata) {
    throw new Error("Uploaded image was not found.");
  }

  if (!metadata.contentType?.startsWith("image/")) {
    throw new Error("Profile picture must be an image file.");
  }

  if (metadata.size > maxSizeBytes) {
    throw new Error("Profile picture must be 5 MB or smaller.");
  }
}
