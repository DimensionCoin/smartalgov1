"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useUser as useClerkUser } from "@clerk/nextjs";
import {
  getUser,
  setUsername as setUsernameAction,
  setSolanaWallet as setSolanaWalletAction,
  clearSolanaWallet as clearSolanaWalletAction,
  type UserDTO,
} from "@/actions/user.actions";

type SubscriptionTier = "free" | "basic";

type UserContextType = {
  // auth
  isAuthenticated: boolean;
  clerkId: string;

  // core profile (Mongo first; Clerk fallback)
  email: string | null;
  firstName: string;
  lastName: string;
  username: string | null;

  // computed niceties
  name: string; // prefers "First Last", then username, then Clerk fullName, then email
  isBasic: boolean;

  // entitlements & usage
  tier: SubscriptionTier;
  credits: number;

  // prefs
  topCoins: string[];

  // wallet
  solanaWallet: string; // empty string if not set
  isWalletRegistered: boolean;

  // timestamps (ISO)
  createdAt: string | null;
  updatedAt: string | null;

  // lifecycle
  isContextLoaded: boolean;
  refreshUser: () => Promise<void>;

  // actions
  setUsername: (desired: string) => Promise<void>;
  registerWalletIfEmpty: (address: string) => Promise<void>;
  clearWallet: () => Promise<void>;

  // helpers
  hasEnoughCredits: (required?: number) => boolean;
};

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useClerkUser();
  const [mongoUser, setMongoUser] = useState<UserDTO | null>(null);
  const [isContextLoaded, setIsContextLoaded] = useState(false);

  // avoid state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshUser = async () => {
    if (!clerkUser) return;
    const data = await getUser(clerkUser.id);
    if (mountedRef.current) setMongoUser(data);
  };

  // initial load + when Clerk user changes
  useEffect(() => {
    (async () => {
      setIsContextLoaded(false);

      if (!isClerkLoaded) {
        setMongoUser(null);
        setIsContextLoaded(false);
        return;
      }
      if (!clerkUser) {
        setMongoUser(null);
        setIsContextLoaded(true);
        return;
      }

      try {
        const data = await getUser(clerkUser.id);
        if (mountedRef.current) setMongoUser(data ?? null);
      } catch (err) {
        console.error("Failed to fetch user from backend:", err);
      } finally {
        if (mountedRef.current) setIsContextLoaded(true);
      }
    })();
  }, [isClerkLoaded, clerkUser?.id]);

  // actions
  const setUsername = async (desired: string) => {
    if (!clerkUser) throw new Error("Not authenticated");
    await setUsernameAction(clerkUser.id, desired);
    await refreshUser();
  };

  const registerWalletIfEmpty = async (address: string) => {
    if (!clerkUser) throw new Error("Not authenticated");
    // only register if not set yet (prevents accidental overwrite)
    if (!mongoUser?.solanaWallet) {
      await setSolanaWalletAction(clerkUser.id, address);
      await refreshUser();
    }
  };

  const clearWallet = async () => {
    if (!clerkUser) throw new Error("Not authenticated");
    await clearSolanaWalletAction(clerkUser.id);
    await refreshUser();
  };

  // derived context value
  const value: UserContextType = useMemo(() => {
    const isAuthenticated = !!clerkUser;
    const clerkId = clerkUser?.id ?? "";

    // email: prefer Mongo (normalized), fallback to Clerk
    const clerkPrimaryEmail =
      clerkUser?.emailAddresses?.find(
        (e) => e.id === clerkUser.primaryEmailAddressId
      )?.emailAddress ??
      clerkUser?.primaryEmailAddress?.emailAddress ??
      clerkUser?.emailAddresses?.[0]?.emailAddress ??
      null;

    const email = mongoUser?.email ?? clerkPrimaryEmail ?? null;

    // first/last & username
    const firstName = mongoUser?.firstName ?? clerkUser?.firstName ?? "";
    const lastName = mongoUser?.lastName ?? clerkUser?.lastName ?? "";
    const username = mongoUser?.username ?? null;

    // pretty name
    const fullFromNames = [firstName, lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    const clerkFullName = clerkUser?.fullName ?? "";
    const name = fullFromNames || username || clerkFullName || email || "User";

    // plan/credits
    const tier: SubscriptionTier = mongoUser?.subscriptionTier ?? "free";
    const isBasic = tier === "basic";
    const credits = mongoUser?.credits ?? 0;

    // prefs
    const topCoins = mongoUser?.topCoins ?? [];

    // wallet
    const solanaWallet = mongoUser?.solanaWallet ?? "";
    const isWalletRegistered = Boolean(solanaWallet);

    // timestamps
    const createdAt = mongoUser?.createdAt ?? null;
    const updatedAt = mongoUser?.updatedAt ?? null;

    // helpers
    const hasEnoughCredits = (required = 1) => credits >= required;

    return {
      isAuthenticated,
      clerkId,
      email,
      firstName,
      lastName,
      username,
      name,
      isBasic,
      tier,
      credits,
      topCoins,
      solanaWallet,
      isWalletRegistered,
      createdAt,
      updatedAt,
      isContextLoaded,
      refreshUser,
      setUsername,
      registerWalletIfEmpty,
      clearWallet,
      hasEnoughCredits,
    };
  }, [clerkUser, mongoUser, isContextLoaded]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUserContext() {
  const ctx = useContext(UserContext);
  if (!ctx)
    throw new Error("useUserContext must be used within a UserProvider");
  return ctx;
}
