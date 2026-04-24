import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

export const Route = createFileRoute("/app/identity")({
  head: () => ({
    meta: [
      { title: "Identity — CryptoChat" },
      { name: "description", content: "Your username and wallet identity." },
    ],
  }),
  component: IdentityPage,
});

function IdentityPage() {
  const [username, setUsername] = useState("prajwal");
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const address = "7YxQzK9p2vN3mBcAfEbR8sH5jWxLp1abc123";

  function copy() {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="px-6 py-8 sm:px-12">
      <header className="pb-12">
        <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">Identity</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          How others find and pay you on CryptoChat.
        </p>
      </header>

      <div className="max-w-xl space-y-12">
        <section>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Username</div>
          {editing ? (
            <div className="mt-2 flex items-center gap-2">
              <span className="font-mono text-foreground">@</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="flex-1 rounded-md bg-surface px-3 py-2 font-mono text-base text-foreground focus:outline-none focus:glow-primary-sm"
                autoFocus
              />
              <button
                onClick={() => setEditing(false)}
                className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary-glow"
              >
                Save
              </button>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-3">
              <div className="font-mono text-2xl text-foreground">@{username}</div>
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-primary transition-colors hover:text-primary-glow"
              >
                Edit
              </button>
            </div>
          )}
        </section>

        <section>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Wallet address
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="break-all font-mono text-sm text-foreground">{address}</div>
            <button
              onClick={copy}
              aria-label="Copy address"
              className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {copied ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </section>

        <section>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Network</div>
          <div className="mt-2 text-sm text-foreground">Solana Mainnet</div>
        </section>
      </div>
    </div>
  );
}
