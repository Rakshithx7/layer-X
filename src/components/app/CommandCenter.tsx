import { useEffect, useRef, useState } from "react";
import { Mic, ArrowUp, ExternalLink } from "lucide-react";

type ParsedTx =
  | {
      kind: "send";
      amount: number;
      token: string;
      recipient: string;
    }
  | {
      kind: "swap";
      amount: number;
      from: string;
      to: string;
    };

type FlowState =
  | { phase: "idle" }
  | { phase: "review"; tx: ParsedTx }
  | { phase: "broadcasting"; tx: ParsedTx }
  | { phase: "success"; tx: ParsedTx; hash: string };

type LogEntry =
  | { id: string; type: "user"; text: string }
  | { id: string; type: "system"; text: string };

const RUPEE_RATES: Record<string, number> = {
  SOL: 8000,
  USDC: 83,
  JUP: 50,
  ETH: 240000,
};

function parseCommand(input: string): ParsedTx | null {
  const send = input
    .trim()
    .match(/^send\s+([\d.]+)\s+([a-zA-Z]+)\s+to\s+@?([a-zA-Z0-9_.-]+)$/i);
  if (send) {
    return {
      kind: "send",
      amount: parseFloat(send[1]),
      token: send[2].toUpperCase(),
      recipient: send[3],
    };
  }
  const swap = input
    .trim()
    .match(/^swap\s+([\d.]+)\s+([a-zA-Z]+)\s+(?:to|for)\s+([a-zA-Z]+)$/i);
  if (swap) {
    return {
      kind: "swap",
      amount: parseFloat(swap[1]),
      from: swap[2].toUpperCase(),
      to: swap[3].toUpperCase(),
    };
  }
  return null;
}

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function randomHash() {
  const chars = "abcdef0123456789";
  let s = "";
  for (let i = 0; i < 16; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `0x${s}`;
}

export function CommandCenter() {
  const [input, setInput] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [flow, setFlow] = useState<FlowState>({ phase: "idle" });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [log, flow]);

  function appendUser(text: string) {
    setLog((l) => [...l, { id: crypto.randomUUID(), type: "user", text }]);
  }
  function appendSystem(text: string) {
    setLog((l) => [...l, { id: crypto.randomUUID(), type: "system", text }]);
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || flow.phase === "broadcasting") return;
    appendUser(text);
    setInput("");
    const parsed = parseCommand(text);
    if (!parsed) {
      appendSystem(
        "I didn't understand that. Try: 'send 1 SOL to @prajwal' or 'swap 10 USDC to SOL'.",
      );
      return;
    }
    setFlow({ phase: "review", tx: parsed });
  }

  function handleConfirm() {
    if (flow.phase !== "review") return;
    setFlow({ phase: "broadcasting", tx: flow.tx });
    setTimeout(() => {
      const hash = randomHash();
      setFlow({ phase: "success", tx: flow.tx, hash });
    }, 1400);
  }

  function handleCancel() {
    setFlow({ phase: "idle" });
    appendSystem("Cancelled.");
  }

  function handleReset() {
    setFlow({ phase: "idle" });
  }

  return (
    <div className="flex h-screen flex-col px-6 py-8 sm:px-12">
      {/* Header */}
      <header className="flex items-center justify-between pb-8">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
            What do you want to do today?
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Try: <span className="font-mono text-foreground/80">send 1 SOL to @prajwal</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-dot" />
          Connected
        </div>
      </header>

      {/* Conversation flow */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 space-y-8 overflow-y-auto pr-2"
      >
        {log.length === 0 && flow.phase === "idle" && (
          <div className="text-sm text-muted-foreground/60">
            Your commands and confirmations will appear here.
          </div>
        )}

        {log.map((entry) => (
          <div key={entry.id} className="space-y-1">
            {entry.type === "user" ? (
              <div className="font-mono text-sm">
                <span className="text-muted-foreground">{">"} </span>
                <span className="text-foreground">{entry.text}</span>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">{entry.text}</div>
            )}
          </div>
        ))}

        {flow.phase === "review" && (
          <ReviewBlock tx={flow.tx} onConfirm={handleConfirm} onCancel={handleCancel} />
        )}
        {flow.phase === "broadcasting" && <BroadcastingBlock />}
        {flow.phase === "success" && (
          <SuccessBlock tx={flow.tx} hash={flow.hash} onDone={handleReset} />
        )}
      </div>

      {/* Command bar */}
      <form onSubmit={handleSubmit} className="pt-6">
        <div className="group relative flex items-center rounded-xl bg-surface px-4 py-3 transition-shadow focus-within:glow-primary-sm">
          <span className="mr-3 font-mono text-sm text-muted-foreground">{">"}</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a command…"
            className="flex-1 bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            autoFocus
            disabled={flow.phase === "broadcasting"}
          />
          <button
            type="button"
            aria-label="Voice input"
            className="ml-2 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-primary"
          >
            <Mic className="h-4 w-4" />
          </button>
          <button
            type="submit"
            aria-label="Send command"
            disabled={!input.trim() || flow.phase === "broadcasting"}
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground transition-all hover:bg-primary-glow disabled:opacity-30"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function txAmountInr(tx: ParsedTx) {
  const symbol = tx.kind === "send" ? tx.token : tx.from;
  const rate = RUPEE_RATES[symbol] ?? 100;
  return inr(tx.amount * rate);
}

function ReviewBlock({
  tx,
  onConfirm,
  onCancel,
}: {
  tx: ParsedTx;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isSend = tx.kind === "send";
  return (
    <div className="animate-enter space-y-5 border-l-2 border-border-subtle pl-5">
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {isSend ? "You are about to send" : "You are about to swap"}
        </div>
        <div className="font-mono text-2xl font-medium text-foreground">
          {tx.amount} {isSend ? tx.token : tx.from}
          <span className="ml-2 text-base text-muted-foreground">
            ({txAmountInr(tx)})
          </span>
        </div>
      </div>

      <div className="space-y-1.5 text-sm">
        {isSend ? (
          <>
            <Row label="To" value={`@${tx.recipient}`} />
            <Row label="Wallet" mono value="7Yx…abc123" />
            <div className="text-xs text-primary">✓ Verified recipient</div>
          </>
        ) : (
          <>
            <Row label="From" value={tx.from} />
            <Row label="To" value={tx.to} />
            <Row label="Estimated rate" mono value={`1 ${tx.from} ≈ 0.012 ${tx.to}`} />
          </>
        )}
        <Row label="Network" value="Solana" />
        <Row label="Fee" mono value="0.000005 SOL" />
      </div>

      <div className="space-y-1 text-xs">
        <div className="text-warning">⚠ First time interacting with this address</div>
        {tx.amount >= 5 && (
          <div className="text-warning">⚠ Large amount — please double check</div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={onConfirm}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary-glow active:scale-[0.98] glow-primary"
        >
          Confirm Transaction
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-border px-5 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function BroadcastingBlock() {
  return (
    <div className="animate-enter flex items-center gap-3 border-l-2 border-primary/40 pl-5 text-sm text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-dot" />
      Broadcasting transaction…
    </div>
  );
}

function SuccessBlock({
  tx,
  hash,
  onDone,
}: {
  tx: ParsedTx;
  hash: string;
  onDone: () => void;
}) {
  return (
    <div className="animate-enter animate-success rounded-xl border border-primary/30 bg-surface/50 p-5">
      <div className="text-sm font-medium text-primary">✓ Sent successfully</div>
      <div className="mt-2 text-sm text-foreground">
        {tx.kind === "send"
          ? `${tx.amount} ${tx.token} sent to @${tx.recipient}`
          : `Swapped ${tx.amount} ${tx.from} for ${tx.to}`}
      </div>
      <div className="mt-3 flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
        Txn: {hash}…
      </div>
      <div className="mt-4 flex items-center gap-4">
        <a
          href={`https://explorer.solana.com/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary transition-colors hover:text-primary-glow"
        >
          View on explorer <ExternalLink className="h-3 w-3" />
        </a>
        <button
          onClick={onDone}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-6">
      <span className="w-20 text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={`text-foreground ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
