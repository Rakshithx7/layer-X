import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Check, Copy } from "lucide-react";
import { ContactsManager } from "@/components/app/ContactsManager";

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
  const [copied, setCopied] = useState(false);
  const { publicKey } = useWallet();
  const address = publicKey?.toBase58() ?? "";

  async function copy() {
    if (!address) return;

    await navigator.clipboard.writeText(address);
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
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Identity</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Your wallet public key is your user identity.
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="break-all font-mono text-base text-foreground">
              {address || "Connect a wallet to view your public key."}
            </div>
            {address && (
              <button
                type="button"
                onClick={() => void copy()}
                aria-label="Copy address"
                className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </button>
            )}
          </div>
        </section>

        <section>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Contacts</div>
          <div className="mt-4">
            <ContactsManager userId={address || null} />
          </div>
        </section>
      </div>
    </div>
  );
}
