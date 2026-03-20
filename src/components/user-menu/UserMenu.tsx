"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { Settings } from "lucide-react";

export function UserMenu() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-3 pl-4 border-l border-white/10">
        <div className="text-right hidden sm:block space-y-1">
          <div className="h-4 w-24 rounded bg-white/10 animate-pulse ml-auto" />
          <div className="h-3 w-32 rounded bg-white/5 animate-pulse ml-auto" />
        </div>
        <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
      </div>
    );
  }

  const name =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "User";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  return (
    <div className="flex items-center gap-3 pl-4 border-l border-white/10">
      <div className="text-right hidden sm:block min-w-0">
        <p className="text-sm font-medium text-white truncate">{name}</p>
        <p className="text-xs text-gray-500 truncate max-w-[200px]">{email}</p>
      </div>
      <UserButton
        appearance={{
          elements: {
            avatarBox: "w-10 h-10 ring-2 ring-white/10",
            userButtonPopoverCard: "bg-gray-900 border border-white/10",
            userButtonPopoverActionButton: "text-gray-200 hover:bg-white/10",
          },
        }}
      >
        <UserButton.MenuItems>
          <UserButton.Link
            href="/settings"
            label="Settings"
            labelIcon={<Settings className="w-4 h-4" />}
          />
        </UserButton.MenuItems>
      </UserButton>
    </div>
  );
}
