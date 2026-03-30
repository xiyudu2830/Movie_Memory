"use client";

import { Loader2, LogOut } from "lucide-react";
import { useState } from "react";
import { signIn, signOut } from "next-auth/react";

type ButtonProps = {
  className?: string;
};

export function GoogleSignInButton({ className = "" }: ButtonProps) {
  const [isPending, setIsPending] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        setIsPending(true);
        await signIn("google", { callbackUrl: "/" });
      }}
      className={`inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
      disabled={isPending}
    >
      {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
      Sign in with Google
    </button>
  );
}

export function LogoutButton({ className = "" }: ButtonProps) {
  const [isPending, setIsPending] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        setIsPending(true);
        await signOut({ callbackUrl: "/" });
      }}
      className={`inline-flex items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-medium text-foreground transition hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
      disabled={isPending}
    >
      {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <LogOut className="mr-2 size-4" />}
      Logout
    </button>
  );
}