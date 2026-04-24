import { useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Check, Copy, ExternalLink, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function truncateAddress(address: string, chars = 4) {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function WalletConnector() {
  const { setVisible } = useWalletModal();
  const { connected, connecting, disconnecting, disconnect, publicKey } = useWallet();

  const address = useMemo(() => publicKey?.toBase58() ?? "", [publicKey]);
  const shortAddress = useMemo(() => (address ? truncateAddress(address) : ""), [address]);

  if (!connected) {
    return (
      <Button
        type="button"
        onClick={() => setVisible(true)}
        disabled={connecting}
        className="w-full justify-center"
      >
        {connecting ? "Connecting..." : "Connect Wallet"}
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            className="w-full justify-between font-mono tabular-nums"
          >
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="h-2 w-2 rounded-full bg-green-500" />
              {shortAddress}
            </span>
            {/* <span className="text-xs text-muted-foreground">Connected</span> */}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            onClick={async () => {
              if (address) {
                await navigator.clipboard.writeText(address);
              }
            }}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy address
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              if (address) {
                window.open(
                  `https://explorer.solana.com/address/${address}?cluster=devnet`,
                  "_blank",
                  "noreferrer",
                );
              }
            }}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View on Explorer
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => disconnect()} disabled={disconnecting}>
            <LogOut className="mr-2 h-4 w-4" />
            {disconnecting ? "Disconnecting..." : "Disconnect"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Check className="h-3.5 w-3.5 text-green-500" />
        Connected
      </div>
    </div>
  );
}
