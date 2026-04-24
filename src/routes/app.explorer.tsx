import { createFileRoute } from "@tanstack/react-router";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Search, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";

type QueryType = "tx" | "wallet";

type ExplorerResult =
  | {
      kind: "tx";
      summary: TxSummary;
    }
  | {
      kind: "wallet";
      address: string;
      balanceSol: number;
      recent: WalletActivity[];
    };

type WalletActivity = {
  signature: string;
  label: string;
  timeLabel: string;
  status: "success" | "pending" | "failed";
};

type TxSummary = {
  status: "success" | "pending" | "failed";
  headline: string;
  amountLabel: string;
  valueInrLabel: string;
  fromLabel: string;
  toLabel: string;
  feeLabel: string;
  timeLabel: string;
  network: string;
  signature: string;
  flags: string[];
};

const INR_RATES: Record<string, number> = {
  SOL: 8090.44,
  USDC: 94.16,
};

export const Route = createFileRoute("/app/explorer")({
  head: () => ({
    meta: [
      { title: "Explorer — CryptoChat" },
      {
        name: "description",
        content: "Human-first Solana explorer that translates transactions into clear summaries.",
      },
    ],
  }),
  component: ExplorerPage,
});

function ExplorerPage() {
  const { connection } = useConnection();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExplorerResult | null>(null);

  const queryType = useMemo(() => detectType(query.trim()), [query]);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();

    const input = query.trim();
    if (!input) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchExplorerData(connection, input);
      setResult(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not fetch explorer data.";
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-6 py-8 sm:px-12">
      <header className="pb-8">
        <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">Explorer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste a wallet or transaction signature. We translate chain data into plain language.
        </p>
      </header>

      <section className="mx-auto w-full max-w-3xl space-y-6">
        <form
          onSubmit={(event) => {
            void handleSearch(event);
          }}
          className="rounded-xl border border-border-subtle bg-surface/60 p-4"
        >
          <label htmlFor="explorer-query" className="block text-xs uppercase tracking-wider text-muted-foreground">
            Search
          </label>
          <div className="mt-2 flex items-center gap-3 border-b border-border-subtle pb-2">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <input
              id="explorer-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Enter wallet address or transaction signature..."
              className="h-10 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>Detected: {query.trim() ? (queryType === "tx" ? "Transaction" : "Wallet") : "Unknown"}</span>
            <button
              type="submit"
              disabled={!query.trim() || loading}
              className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-all hover:bg-primary-glow disabled:cursor-not-allowed disabled:bg-muted-foreground/30 disabled:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </form>

        {error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {result ? <ExplorerResultView data={result} /> : null}
      </section>
    </div>
  );
}

function ExplorerResultView({ data }: { data: ExplorerResult }) {
  if (data.kind === "tx") {
    return <TxView summary={data.summary} />;
  }

  return <WalletView data={data} />;
}

function TxView({ summary }: { summary: TxSummary }) {
  const statusTone =
    summary.status === "success"
      ? "text-primary"
      : summary.status === "pending"
        ? "text-warning"
        : "text-destructive";

  return (
    <article className="rounded-xl border border-border-subtle bg-surface/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-medium text-foreground">{summary.headline}</h2>
        <div className={`text-xs font-medium ${statusTone}`}>{humanStatus(summary.status)}</div>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <DetailRow label="Amount" value={summary.amountLabel} mono />
        <DetailRow label="Value" value={summary.valueInrLabel} mono />
        <DetailRow label="From" value={summary.fromLabel} />
        <DetailRow label="To" value={summary.toLabel} />
        <DetailRow label="Fee" value={summary.feeLabel} mono />
        <DetailRow label="Time" value={summary.timeLabel} />
        <DetailRow label="Network" value={summary.network} />
      </div>

      {summary.flags.length > 0 ? (
        <div className="mt-4 space-y-1.5">
          {summary.flags.map((flag) => (
            <p key={flag} className="text-xs text-warning">
              {flag}
            </p>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="uppercase tracking-wider">Txn</span>
        <a
          href={`https://explorer.solana.com/tx/${summary.signature}?cluster=devnet`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-primary transition-colors hover:text-primary-glow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {short(summary.signature, 5)}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </article>
  );
}

function WalletView({ data }: { data: Extract<ExplorerResult, { kind: "wallet" }> }) {
  return (
    <article className="rounded-xl border border-border-subtle bg-surface/60 p-5">
      <h2 className="text-base font-medium text-foreground">Wallet Overview</h2>

      <div className="mt-4 space-y-2 text-sm">
        <DetailRow label="Balance" value={`${formatNumber(data.balanceSol)} SOL (${formatInr(data.balanceSol * INR_RATES.SOL)})`} mono />
      </div>

      <div className="mt-6">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Recent Activity</h3>
        <ul className="mt-3 space-y-2">
          {data.recent.length === 0 ? (
            <li className="text-sm text-muted-foreground">No recent transactions found.</li>
          ) : (
            data.recent.map((item) => (
              <li key={item.signature} className="rounded-lg border border-border-subtle bg-background/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-foreground">{item.label}</p>
                  <span className="text-xs text-muted-foreground">{item.timeLabel}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{humanStatus(item.status)}</span>
                  <span>•</span>
                  <a
                    href={`https://explorer.solana.com/tx/${item.signature}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary transition-colors hover:text-primary-glow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {short(item.signature, 5)} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </li>
            ))
          )}
        </ul>
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

function detectType(input: string): QueryType {
  if (input.length > 80) {
    return "tx";
  }

  return "wallet";
}

async function fetchExplorerData(connection: ReturnType<typeof useConnection>["connection"], input: string): Promise<ExplorerResult> {
  const type = detectType(input);

  if (type === "tx") {
    const tx = await connection.getParsedTransaction(input, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });

    if (!tx) {
      throw new Error("Transaction not found on devnet.");
    }

    return {
      kind: "tx",
      summary: toTxSummary(tx, input),
    };
  }

  const address = new PublicKey(input);
  const [lamports, signatures] = await Promise.all([
    connection.getBalance(address, "confirmed"),
    connection.getSignaturesForAddress(address, { limit: 6 }, "confirmed"),
  ]);

  return {
    kind: "wallet",
    address: address.toBase58(),
    balanceSol: lamports / LAMPORTS_PER_SOL,
    recent: signatures.map((s) => ({
      signature: s.signature,
      label: s.err ? "Transaction failed" : "Transaction confirmed",
      timeLabel: s.blockTime ? timeAgo(s.blockTime * 1000) : "unknown time",
      status: s.err ? "failed" : s.confirmationStatus === "processed" ? "pending" : "success",
    })),
  };
}

function toTxSummary(
  tx: Awaited<ReturnType<ReturnType<typeof useConnection>["connection"]["getParsedTransaction"]>>,
  signature: string,
): TxSummary {
  if (!tx) {
    throw new Error("Missing transaction data.");
  }

  const transfer = extractTransfer(tx);
  const feeSol = (tx.meta?.fee ?? 0) / LAMPORTS_PER_SOL;
  const status: TxSummary["status"] = tx.meta?.err ? "failed" : "success";

  if (!transfer) {
    return {
      status,
      headline: "Parsed transaction found (non-transfer program)",
      amountLabel: "Unknown",
      valueInrLabel: "Unknown",
      fromLabel: short(signature, 4),
      toLabel: "Unknown",
      feeLabel: `${feeSol.toFixed(6)} SOL`,
      timeLabel: tx.blockTime ? timeAgo(tx.blockTime * 1000) : "unknown time",
      network: "Solana Devnet",
      signature,
      flags: ["Could not map this transaction to a simple transfer summary"],
    };
  }

  const amountInr = transfer.amount * INR_RATES.SOL;
  const flags: string[] = [];

  if (transfer.amount * INR_RATES.SOL > 5000) {
    flags.push("Large transaction (>₹5,000)");
  }
  flags.push("First time interacting (heuristic)");

  return {
    status,
    headline: `Sent ${formatNumber(transfer.amount)} SOL to ${short(transfer.to, 4)}`,
    amountLabel: `${formatNumber(transfer.amount)} SOL`,
    valueInrLabel: formatInr(amountInr),
    fromLabel: short(transfer.from, 4),
    toLabel: short(transfer.to, 4),
    feeLabel: `${feeSol.toFixed(6)} SOL`,
    timeLabel: tx.blockTime ? timeAgo(tx.blockTime * 1000) : "unknown time",
    network: "Solana Devnet",
    signature,
    flags,
  };
}

function extractTransfer(
  tx: Awaited<ReturnType<ReturnType<typeof useConnection>["connection"]["getParsedTransaction"]>>,
): { from: string; to: string; amount: number } | null {
  if (!tx) {
    return null;
  }

  const instruction = tx.transaction.message.instructions.find(
    (ix) => "program" in ix && ix.program === "system" && "parsed" in ix,
  );

  if (!instruction || !("parsed" in instruction)) {
    return null;
  }

  const parsed = instruction.parsed;
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const info = "info" in parsed ? (parsed as { info?: Record<string, unknown> }).info : undefined;
  const source = info?.source;
  const destination = info?.destination;
  const lamports = info?.lamports;

  if (typeof source !== "string" || typeof destination !== "string" || typeof lamports !== "number") {
    return null;
  }

  return {
    from: source,
    to: destination,
    amount: lamports / LAMPORTS_PER_SOL,
  };
}

function short(value: string, chars = 4) {
  if (value.length <= chars * 2 + 3) {
    return value;
  }
  return `${value.slice(0, chars)}...${value.slice(-chars)}`;
}

function humanStatus(status: "success" | "pending" | "failed") {
  if (status === "success") {
    return "Confirmed";
  }
  if (status === "pending") {
    return "Pending";
  }
  return "Failed";
}

function formatInr(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatNumber(value: number) {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: value < 10 ? 2 : 0,
    maximumFractionDigits: 4,
  });
}

function timeAgo(timestampMs: number) {
  const diffMs = Date.now() - timestampMs;
  const minutes = Math.floor(diffMs / (60 * 1000));

  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day ago`;
}
