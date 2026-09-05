"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { ArrowUpRight, Compass } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export function Navbar() {
  const { data: session, status } = useSession();

  return (
    <header className="border-b border-[color:var(--border)]/80 bg-[color:var(--background)]/80 px-4 backdrop-blur-xl sm:px-8">
      <div className="mx-auto flex h-[4.5rem] max-w-[1440px] items-center justify-between">
        <Link href="/" className="group flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:-rotate-6">
            <Compass className="size-5" />
          </span>
          <span>
            <span className="block font-semibold tracking-tight">Hum Watan</span>
            <span className="hidden text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:block">
              Find your people
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-1.5">
          {status === "authenticated" ? (
            <>
              <span className="mr-2 hidden text-sm text-muted-foreground sm:block">
                {session.user?.name}
              </span>
              <Button
                render={<Link href="/profile" />}
                nativeButton={false}
                variant="ghost"
                size="sm"
              >
                Profile
              </Button>
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
                Join the network
                <ArrowUpRight data-icon="inline-end" />
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
