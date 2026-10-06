"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { ChevronsUpDown, LogOut, UserRound } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useHousehold } from "@/lib/household-context";

export function AccountMenu({
  expanded = false,
  onNavigate,
}: {
  expanded?: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const { setActiveHouseholdId } = useHousehold();
  const profile = useQuery(api.users.getCurrentProfile, {});
  const user = profile?.user;
  const name = user?.name ?? user?.email ?? "Family member";

  async function handleSignOut() {
    onNavigate?.();
    setActiveHouseholdId(null);
    await signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          animated={false}
          className={expanded ? "h-14 w-full justify-start gap-3 rounded-2xl px-2" : "h-10 rounded-2xl px-2"}
          aria-label="Open account menu"
        >
          <UserAvatar name={name} imageUrl={profile?.profileImageUrl} className="size-8 shrink-0" />
          {expanded && (
            <>
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-semibold">{name}</span>
                <span className="block truncate text-xs text-muted-foreground">{user?.email ?? "Signed in"}</span>
              </span>
              <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={expanded ? "top" : "bottom"} align="end" className="min-w-56 rounded-2xl p-2">
        <DropdownMenuLabel>
          <span className="block truncate">{name}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">{user?.email ?? "Signed in"}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" onClick={onNavigate}>
            <UserRound className="size-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={handleSignOut}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
