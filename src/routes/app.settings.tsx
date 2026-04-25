import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — layer-x" },
      { name: "description", content: "Preferences for layer-x." },
    ],
  }),
  component: SettingsPage,
});

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-3">
      <div>
        <div className="text-sm text-foreground">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-primary glow-primary-sm" : "bg-surface"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-foreground transition-transform ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function SettingsPage() {
  const [notifTx, setNotifTx] = useState(true);
  const [notifPrice, setNotifPrice] = useState(false);
  const [confirmLarge, setConfirmLarge] = useState(true);
  const [compact, setCompact] = useState(false);

  return (
    <div className="px-6 py-8 sm:px-12">
      <header className="pb-12">
        <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tune your experience.</p>
      </header>

      <div className="max-w-xl space-y-12">
        <section>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Network</div>
          <div className="mt-3 space-y-2">
            {["Mainnet", "Devnet"].map((n) => (
              <label
                key={n}
                className="flex cursor-pointer items-center gap-3 py-2 text-sm text-foreground"
              >
                <input
                  type="radio"
                  name="network"
                  defaultChecked={n === "Mainnet"}
                  className="h-3 w-3 accent-primary"
                />
                {n}
              </label>
            ))}
          </div>
        </section>

        <section>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Notifications
          </div>
          <div className="mt-2 divide-y divide-border-subtle">
            <Toggle
              checked={notifTx}
              onChange={setNotifTx}
              label="Transaction confirmations"
              hint="Get a ping when a transaction settles."
            />
            <Toggle
              checked={notifPrice}
              onChange={setNotifPrice}
              label="Token price alerts"
              hint="Notify when SOL moves more than 5%."
            />
          </div>
        </section>

        <section>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Safety</div>
          <div className="mt-2 divide-y divide-border-subtle">
            <Toggle
              checked={confirmLarge}
              onChange={setConfirmLarge}
              label="Extra confirm for large amounts"
              hint="Require a second tap for transfers above ₹50,000."
            />
          </div>
        </section>

        <section>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Display</div>
          <div className="mt-2 divide-y divide-border-subtle">
            <Toggle
              checked={compact}
              onChange={setCompact}
              label="Compact layout"
              hint="Reduce spacing in the command area."
            />
          </div>
        </section>
      </div>
    </div>
  );
}
