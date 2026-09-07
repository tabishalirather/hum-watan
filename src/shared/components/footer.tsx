"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Compass } from "lucide-react";

const inviteHref = `mailto:?subject=Join%20Hum%20Watan&body=I%20thought%20you%20might%20like%20Hum%20Watan%2C%20a%20verified%20network%20for%20Kashmiri%20students%20and%20diaspora%3A%20${encodeURIComponent(process.env.NEXT_PUBLIC_APP_URL ?? "")}`;

export function Footer() {
  const { status } = useSession();

  return (
    <footer className="border-t border-border/80 bg-card/40">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight text-foreground">Hum Watan</p>
            <p className="text-xs text-muted-foreground">
              A free, verified network for Kashmiri students and diaspora worldwide.
            </p>
          </div>
        </div>
        <nav className="flex items-center gap-5 text-sm text-muted-foreground">
          {status === "authenticated" ? (
            <a
              href={inviteHref}
              className="transition-colors hover:text-foreground"
            >
              Invite others to join
            </a>
          ) : (
            <>
              <Link href="/register" className="transition-colors hover:text-foreground">
                Join the network
              </Link>
              <Link href="/login" className="transition-colors hover:text-foreground">
                Sign in
              </Link>
            </>
          )}
          <span className="text-xs text-muted-foreground/70">
            &copy; {new Date().getFullYear()} Hum Watan
          </span>
        </nav>
      </div>
    </footer>
  );
}
