import { Link } from "@tanstack/react-router";

const TOKENS = [
  { symbol: "SOL", value: "₹98,420.10" },
  { symbol: "USDC", value: "₹22,610.40" },
  { symbol: "JUP", value: "₹4,400.00" },
];

export function ContextPanel() {
  return (
    <aside className="hidden w-[300px] shrink-0 flex-col gap-12 px-8 py-8 lg:flex">
      {/* Wallet */}
      <section>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Total Balance
        </div>
        <div className="mt-2 font-mono text-3xl font-medium tracking-tight text-foreground">
          ₹1,25,430.50
        </div>
        <div className="mt-3">
          <Sparkline />
        </div>
        <div className="mt-2 text-xs text-primary">+ 2.4% today</div>
      </section>

      {/* Tokens */}
      <section>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Tokens</div>
        <ul className="mt-3 space-y-2.5">
          {TOKENS.map((t) => (
            <li key={t.symbol} className="flex items-baseline justify-between font-mono text-sm">
              <span className="text-foreground">{t.symbol}</span>
              <span className="text-muted-foreground">{t.value}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Identity */}
      <section>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Identity</div>
        <div className="mt-3 text-sm font-medium text-foreground">@prajwal</div>
        <div className="mt-1 font-mono text-xs text-muted-foreground">7Yx…abc123</div>
        <Link
          to="/app/identity"
          className="mt-2 inline-block text-xs text-primary transition-colors hover:text-primary-glow"
        >
          Edit
        </Link>
      </section>
    </aside>
  );
}

function Sparkline() {
  // tiny static trend line
  const points = [6, 8, 5, 9, 7, 11, 10, 13, 12, 15, 14, 17];
  const max = Math.max(...points);
  const min = Math.min(...points);
  const w = 220;
  const h = 36;
  const stepX = w / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * stepX;
      const y = h - ((p - min) / (max - min)) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="text-primary">
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
    </svg>
  );
}
