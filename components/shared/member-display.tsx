"use client";

import type { Doc } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { UserAvatar } from "./user-avatar";

export type MemberWithUser = {
  membership: Doc<"householdMembers">;
  user: Doc<"users"> | null;
};

export function getMemberName(member: MemberWithUser | null | undefined) {
  return (
    member?.membership.displayName ??
    member?.user?.name ??
    member?.user?.email ??
    "Family member"
  );
}

export function MemberDisplay({
  member,
  detail,
  showRole = false,
  className,
  avatarClassName,
}: {
  member: MemberWithUser | null | undefined;
  detail?: string;
  showRole?: boolean;
  className?: string;
  avatarClassName?: string;
}) {
  const name = getMemberName(member);
  const secondary = detail ?? (showRole ? member?.membership.role : undefined);

  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <UserAvatar
        name={name}
        imageUrl={member?.user?.imageUrl}
        className={cn("size-7", avatarClassName)}
      />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{name}</span>
        {secondary && (
          <span className="block truncate text-xs text-muted-foreground">
            {secondary}
          </span>
        )}
      </span>
    </span>
  );
}

export function findMemberByUserId(
  members: MemberWithUser[],
  userId?: string | null,
) {
  if (!userId) {
    return null;
  }

  return members.find((member) => member.user?._id === userId) ?? null;
}
