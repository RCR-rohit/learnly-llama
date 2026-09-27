import { Link, useNavigate } from "@tanstack/react-router";
import { LogIn, LogOut, UserRound } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function UserAvatar({ className }: { className?: string }) {
  const { user, profile, avatarUrl } = useAuth();
  const label = profile?.display_name || user?.email || "?";
  return (
    <Avatar className={cn("size-8 border border-primary/40", className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={label} className="object-cover" />}
      <AvatarFallback className="bg-primary/15 text-primary">{label.slice(0, 1).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

export function UserMenu() {
  const { user, ready, profile, signOut } = useAuth();
  const navigate = useNavigate();
  if (!ready) return <div className="size-8" />;
  if (!user)
    return (
      <Button asChild size="sm" className="gap-1.5">
        <Link to="/auth"><LogIn className="size-4" /> Log in</Link>
      </Button>
    );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Account menu" className="rounded-full">
        <UserAvatar />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">
          {profile?.display_name || "Account"}
          <span className="block truncate text-xs font-normal text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/account"><UserRound className="size-4" /> Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
            navigate({ to: "/auth", replace: true });
          }}
        >
          <LogOut className="size-4" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
