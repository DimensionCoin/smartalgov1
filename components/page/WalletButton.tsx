"use client";

import React, { useEffect, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { toast } from "react-hot-toast";
import { Wallet as WalletIcon, Copy, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"; // shadcn/ui
import { Button } from "@/components/ui/button";
import { useUserContext } from "@/providers/UserProvider";

const short = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

const WalletControl: React.FC = () => {
  const { publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  const {
    isAuthenticated,
    isContextLoaded,
    solanaWallet,
    registerWalletIfEmpty,
    refreshUser,
  } = useUserContext();

  const connectedAddress = useMemo(
    () => (publicKey ? publicKey.toBase58() : ""),
    [publicKey]
  );

  // Sync on connect and enforce "must match" behavior
  useEffect(() => {
    const sync = async () => {
      if (!isContextLoaded || !isAuthenticated) return;
      if (!connectedAddress) return;

      // First-time connect → register
      if (!solanaWallet) {
        try {
          await registerWalletIfEmpty(connectedAddress);
          await refreshUser();
          toast.success(`Wallet registered: ${short(connectedAddress)}`);
        } catch (err) {
          await disconnect();
          toast.error(
            err instanceof Error
              ? err.message
              : "Unable to register wallet. Please try another address."
          );
        }
        return;
      }

      // Enforce match
      if (solanaWallet !== connectedAddress) {
        await disconnect();
        toast.error(
          `Wallet mismatch. Please connect the registered wallet: ${short(
            solanaWallet
          )}`
        );
      }
    };

    void sync();
  }, [
    isContextLoaded,
    isAuthenticated,
    connectedAddress,
    solanaWallet,
    registerWalletIfEmpty,
    refreshUser,
    disconnect,
  ]);

  const isConnectedAndVerified =
    Boolean(connectedAddress) && connectedAddress === solanaWallet;

  const handlePrimaryClick = () => {
    if (!connectedAddress) {
      setVisible(true); // open wallet picker
    } else if (!isConnectedAndVerified) {
      // Connected but not verified (should rarely happen due to the effect)
      toast.error("Wallet mismatch. Please reconnect the registered wallet.");
    }
    // If connected & verified, the DropdownMenuTrigger handles opening the menu.
  };

  const copyAddress = async () => {
    if (!connectedAddress) return;
    await navigator.clipboard.writeText(connectedAddress);
    toast.success("Address copied");
  };

  const disconnectNow = async () => {
    await disconnect();
    toast("Wallet disconnected");
  };

  // The trigger button (icon with status badge)
  const IconButton = (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-10 w-10 rounded-full hover:bg-zinc-800/60"
      onClick={!isConnectedAndVerified ? handlePrimaryClick : undefined}
      disabled={connecting}
      aria-label={
        isConnectedAndVerified
          ? `Wallet connected: ${short(connectedAddress)}`
          : "Connect wallet"
      }
    >
      <WalletIcon className="h-5 w-5 text-zinc-200" />
      <span
        className={`absolute right-1 top-1 inline-block h-2.5 w-2.5 rounded-full ring-2 ring-black ${
          isConnectedAndVerified ? "bg-emerald-500" : "bg-rose-500"
        }`}
      />
    </Button>
  );

  // If not connected (or not verified), just render the icon button (click opens modal)
  if (!isConnectedAndVerified) {
    return IconButton;
  }

  // If connected AND verified → wrap the button in a dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{IconButton}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-60 bg-zinc-900/95 backdrop-blur-md border-zinc-800 text-zinc-200"
      >
        <DropdownMenuLabel className="text-zinc-400">
          Connected wallet
        </DropdownMenuLabel>
        <div className="px-3 py-1.5 text-sm font-mono text-zinc-300 truncate">
          {short(connectedAddress)}
        </div>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem
          onClick={copyAddress}
          className="cursor-pointer flex items-center gap-2"
        >
          <Copy className="h-4 w-4" />
          Copy address
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={disconnectNow}
          className="cursor-pointer text-red-400 focus:text-red-400 hover:text-red-300 flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default WalletControl;
