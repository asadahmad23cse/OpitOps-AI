"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { CircleUserRound, Settings } from "lucide-react";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());

function UserMenuWithClerk() {
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
    user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "User";
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

function UserMenuNoAuth() {
  return (
    <div className="flex items-center gap-3 pl-4 border-l border-white/10">
      <div className="text-right hidden sm:block min-w-0">
        <p className="text-sm font-medium text-white truncate">Local User</p>
        <p className="text-xs text-amber-300 truncate max-w-[200px]">Auth disabled</p>
      </div>
      <div className="w-10 h-10 rounded-full border border-white/15 bg-white/5 flex items-center justify-center">
        <CircleUserRound className="w-5 h-5 text-gray-300" />
      </div>
    </div>
  );
}

export function UserMenu() {
  return clerkEnabled ? <UserMenuWithClerk /> : <UserMenuNoAuth />;
}
