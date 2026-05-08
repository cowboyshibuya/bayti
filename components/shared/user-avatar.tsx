import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function UserAvatar({
  name,
  imageUrl,
  className,
}: {
  name?: string | null;
  imageUrl?: string | null;
  className?: string;
}) {
  return (
    <Avatar className={className}>
      <AvatarImage src={imageUrl ?? undefined} alt="" />
      <AvatarFallback>{getInitials(name ?? "Family member")}</AvatarFallback>
    </Avatar>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
