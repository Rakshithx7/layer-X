import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

type TxSummary = {
  type: "send" | "swap";
  status: "success" | "pending" | "failed";
  from: string;
  to: string;
  fromName?: string;
  toName?: string;
  amount: number;
  token: string;
  receivedAmount?: number;
  receivedToken?: string;
  fee: number;
  network: string;
  timestamp: number;
  signature: string;
  flags?: string[];
};

const INR_RATES: Record<string, number> = {
  SOL: 8090.44,
  USDC: 94.16,
  JUP: 50,
  ETH: 240000,
};

const TXS: TxSummary[] = [
  {
    type: "send",
    status: "success",
    from: "7mYp6rs2Lx5xQf9cC7YfW9NVk2vDk4kJ6N2xQm8v3Jp1",
    to: "9mSS3x8mQ2oXe4pQv2qPq7kbV9p7V85Hj2f7uNWfWfc3",
    fromName: "You",
    toName: "@pooja",
    amount: 1,
    token: "SOL",
    fee: 0.000005,
    network: "Solana Devnet",
    timestamp: Date.now() - 2 * 60 * 1000,
    signature: "5KJdQ3r1T8nR9b7cM1pL4aX29wqf8eNyV6z2hP9aX2",
    flags: ["Contact recognized (@pooja)", "First time sending to this address"],
  },
  {
    type: "swap",
    status: "success",
    from: "7mYp6rs2Lx5xQf9cC7YfW9NVk2vDk4kJ6N2xQm8v3Jp1",
    to: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
    fromName: "You",
    toName: "Jupiter",
    amount: 1,
    token: "SOL",
    receivedAmount: 85.9,
    receivedToken: "USDC",
    fee: 0.000005,
    network: "Solana Devnet",
    timestamp: Date.now() - 8 * 60 * 1000,
    signature: "4qV1mP9hA2xYz8Nb7S2jL3rT6cK1wM5dE8uQ3aN7pX9",
    flags: ["Devnet simulation", "Slippage estimate 0.1%"],
  },
  {
    type: "send",
    status: "pending",
    from: "7mYp6rs2Lx5xQf9cC7YfW9NVk2vDk4kJ6N2xQm8v3Jp1",
    to: "F4aQ5m6Lp9Tz2nW3cV8kY1pR7sD4xN6qJ3hB2eA1zM9",
    fromName: "You",
    toName: "@aman",
    amount: 0.5,
    token: "SOL",
    fee: 0.000005,
    network: "Solana Devnet",
    timestamp: Date.now() - 21 * 60 * 1000,
    signature: "2nM8kQ1rV5pZ3xC7dL9sA4wE6tY1uI3oP8hB2jN5mR7",
    flags: ["Awaiting final confirmation"],
  },
  {
    type: "send",
    status: "failed",
    from: "7mYp6rs2Lx5xQf9cC7YfW9NVk2vDk4kJ6N2xQm8v3Jp1",
    to: "G9kL2mN4pQ6rS8tV1wX3yZ5aB7cD9eF2gH4iJ6kL8mN0",
    fromName: "You",
    toName: "@nikhil",
    amount: 100,
    token: "JUP",
    fee: 0.000005,
    network: "Solana Devnet",
    timestamp: Date.now() - 2 * 60 * 60 * 1000,
    signature: "8wQ2eR4tY6uI1oP3aS5dF7gH9jK2lZ4xC6vB8nM1qW3",
    flags: ["Large transaction (>₹5,000)", "Execution failed"],
  },
];

const STATUS_UI: Record<TxSummary["status"], { label: string; className: string }> = {
  success: { label: "Confirmed", className: "text-primary" },
  pending: { label: "Pending", className: "text-warning" },
  failed: { label: "Failed", className: "text-destructive" },
};

export const Route = createFileRoute("/app/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — CryptoChat" },
      { name: "description", content: "Human-readable transaction explorer on Solana." },
    ],
  }),
  component: TransactionsPage,
});

function TransactionsPage() {
  return (
    <div className="px-6 py-8 sm:px-12">
      <header className="pb-8">
        <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">Simplified Explorer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Clear transaction stories instead of raw instruction logs.
        </p>
      </header>

      <section className="space-y-4">
        {TXS.map((tx) => (
          <TxExplorerCard key={tx.signature} tx={tx} />
        ))}
      </section>
    </div>
  );
}

function TxExplorerCard({ tx }: { tx: TxSummary }) {
  const status = STATUS_UI[tx.status];
  const valueInr = getValueInr(tx);

  return (
    <article className="rounded-xl border border-border-subtle bg-surface/60 p-5">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-base font-medium text-foreground">{headline(tx)}</h2>
        <div className={`shrink-0 text-xs font-medium ${status.className}`}>
          {statusEmoji(tx.status)} {status.label}
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <DetailRow label="Amount" value={`${formatAmount(tx.amount)} ${tx.token}`} mono />
        <DetailRow label="Value" value={formatInr(valueInr)} mono />

        {tx.type === "swap" && tx.receivedAmount && tx.receivedToken ? (
          <>
            <DetailRow
              label="You get"
              value={`${formatAmount(tx.receivedAmount)} ${tx.receivedToken}`}
              mono
            />
            <DetailRow
              label="Rate"
              value={`1 ${tx.token} = ${formatAmount(tx.receivedAmount / tx.amount)} ${tx.receivedToken}`}
              mono
            />
          </>
        ) : null}

        <DetailRow label="To" value={`${tx.toName ?? shortAddress(tx.to)} (${shortAddress(tx.to)})`} />
        <DetailRow label="From" value={tx.fromName ?? shortAddress(tx.from)} />
        <DetailRow label="Fee" value={`${tx.fee.toFixed(6)} SOL`} mono />
        <DetailRow label="Network" value={tx.network} />
        <DetailRow label="Time" value={timeAgo(tx.timestamp)} />
      </div>

      {tx.flags && tx.flags.length > 0 ? (
        <div className="mt-4 space-y-1.5">
          {tx.flags.map((flag) => (
            <p key={flag} className="text-xs text-warning">
              ⚠ {flag}
            </p>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="uppercase tracking-wider">Txn</span>
        <a
          href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-primary transition-colors hover:text-primary-glow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {shortAddress(tx.signature, 5)} <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </article>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-5">
      <span className="w-20 text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`${mono ? "font-mono" : ""} text-foreground`}>{value}</span>
    </div>
  );
}

function headline(tx: TxSummary) {
  if (tx.type === "send") {
    return `Sent ${formatAmount(tx.amount)} ${tx.token} to ${tx.toName ?? shortAddress(tx.to)}`;
  }

  return `Swapped ${formatAmount(tx.amount)} ${tx.token} to ${formatAmount(tx.receivedAmount ?? 0)} ${tx.receivedToken ?? ""}`;
}

function getValueInr(tx: TxSummary) {
  const rate = INR_RATES[tx.token] ?? 0;
  return tx.amount * rate;
}

function formatAmount(value: number) {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: value < 10 ? 2 : 0,
    maximumFractionDigits: 4,
  });
}

function formatInr(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function shortAddress(value: string, chars = 4) {
  if (value.length <= chars * 2 + 3) {
    return value;
  }
  return `${value.slice(0, chars)}...${value.slice(-chars)}`;
}

function statusEmoji(status: TxSummary["status"]) {
  if (status === "success") {
    return "✅";
  }
  if (status === "pending") {
    return "⏳";
  }
  return "❌";
}

function timeAgo(timestamp: number) {
  const diffMs = Date.now() - timestamp;
  const mins = Math.floor(diffMs / (60 * 1000));

  if (mins < 1) {
    return "just now";
  }
  if (mins < 60) {
    return `${mins} min ago`;
  }

  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day ago`;
}
