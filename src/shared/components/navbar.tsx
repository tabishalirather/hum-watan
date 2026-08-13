"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/shared/components/ui/button";

export function Navbar() {
  const { data: session, status } = useSession();

  return (
    <header className="flex h-16 items-center justify-between border-b px-4">
      <Link href="/" className="font-semibold">
        Hum Watan
      </Link>
      <nav className="flex items-center gap-3">
        {status === "authenticated" ? (
          <>
            <span className="text-sm text-muted-foreground">{session.user?.name}</span>
            <Button variant="outline" size="sm" onClick={() => signOut()}>
              Sign out
            </Button>
          </>
        ) : (
          <>
            <Button
              render={<Link href="/login" />}
              nativeButton={false}
              variant="ghost"
              size="sm"
            >
              Sign in
            </Button>
            <Button render={<Link href="/register" />} nativeButton={false} size="sm">
              Sign up
            </Button>
          </>
        )}
      </nav>
    </header>
  );
}
