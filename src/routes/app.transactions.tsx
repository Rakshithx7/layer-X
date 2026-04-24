import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — CryptoChat" },
      { name: "description", content: "Your transaction history on Solana." },
    ],
  }),
  component: TransactionsPage,
});

const TXS = [
  { date: "Apr 22", type: "Send", amount: "1.0 SOL", recipient: "@prajwal", status: "success" },
  { date: "Apr 22", type: "Swap", amount: "10 USDC → SOL", recipient: "—", status: "success" },
  { date: "Apr 20", type: "Send", amount: "25 USDC", recipient: "@pooja", status: "success" },
  { date: "Apr 19", type: "Send", amount: "0.5 SOL", recipient: "@aman", status: "pending" },
  { date: "Apr 18", type: "Send", amount: "100 JUP", recipient: "@nikhil", status: "failed" },
  { date: "Apr 17", type: "Swap", amount: "0.2 SOL → USDC", recipient: "—", status: "success" },
] as const;

const STATUS_COLOR: Record<string, string> = {
  success: "bg-primary",
  pending: "bg-warning",
  failed: "bg-destructive",
};

function TransactionsPage() {
  return (
    <div className="px-6 py-8 sm:px-12">
      <header className="pb-10">
        <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">Transactions</h1>
        <p className="mt-1 text-sm text-muted-foreground">All your activity on Solana.</p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="pb-4 font-normal">Date</th>
              <th className="pb-4 font-normal">Type</th>
              <th className="pb-4 font-normal">Amount</th>
              <th className="pb-4 font-normal">Recipient</th>
              <th className="pb-4 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {TXS.map((t, i) => (
              <tr
                key={i}
                className="border-t border-border-subtle text-foreground transition-colors hover:bg-surface/40"
              >
                <td className="py-4 text-muted-foreground">{t.date}</td>
                <td className="py-4">{t.type}</td>
                <td className="py-4 font-mono">{t.amount}</td>
                <td className="py-4 text-muted-foreground">{t.recipient}</td>
                <td className="py-4">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_COLOR[t.status]}`} />
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
