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
  type UserDTO,
} from "@/actions/user.actions";

type SubscriptionTier = "free" | "basic";

type UserContextType = {
  // auth
  isAuthenticated: boolean;
  clerkId: string;

  // core profile (from Mongo; falls back to Clerk where sensible)
  email: string | null;
  firstName: string;
  lastName: string;
  username: string | null;

  // computed niceties
  name: string; // prefers "firstName lastName"; falls back to username or Clerk fullName
  isBasic: boolean;

  // entitlements & usage
  tier: SubscriptionTier;
  credits: number;

  // prefs (you can expose more later as you use them)
  topCoins: string[];

  // timestamps (ISO strings from DTO)
  createdAt: string | null;
  updatedAt: string | null;

  // lifecycle
  isContextLoaded: boolean;
  refreshUser: () => Promise<void>;

  // actions (thin wrappers over server actions)
  setUsername: (desired: string) => Promise<void>;

  // helpers
  hasEnoughCredits: (required?: number) => boolean;
};

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useClerkUser();

  const [mongoUser, setMongoUser] = useState<UserDTO | null>(null);
  const [isContextLoaded, setIsContextLoaded] = useState(false);

  // guard against state updates after unmount
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
  }, [isClerkLoaded, clerkUser?.id]); // re-run when auth identity changes

  // action: set username (case-insensitive uniqueness enforced in DB)
  const setUsername = async (desired: string) => {
    if (!clerkUser) throw new Error("Not authenticated");
    await setUsernameAction(clerkUser.id, desired);
    await refreshUser();
  };

  // derive a clean, ergonomic object the app can use anywhere
  const value: UserContextType = useMemo(() => {
    const isAuthenticated = !!clerkUser;
    const clerkId = clerkUser?.id ?? "";

    // email: prefer Mongo (normalized), fall back to Clerk primary
    const clerkPrimaryEmail =
      clerkUser?.emailAddresses?.find(
        (e) => e.id === clerkUser.primaryEmailAddressId
      )?.emailAddress ??
      clerkUser?.primaryEmailAddress?.emailAddress ??
      clerkUser?.emailAddresses?.[0]?.emailAddress ??
      null;

    const email = mongoUser?.email ?? clerkPrimaryEmail ?? null;

    // first/last from Mongo (kept in sync via webhook); fallback to Clerk
    const firstName = mongoUser?.firstName ?? clerkUser?.firstName ?? "";
    const lastName = mongoUser?.lastName ?? clerkUser?.lastName ?? "";
    const username = mongoUser?.username ?? null;

    // prefer "First Last" if present; else username; else Clerk fullName; else email or "User"
    const fullFromNames = [firstName, lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    const clerkFullName = clerkUser?.fullName ?? "";
    const name = fullFromNames || username || clerkFullName || email || "User";

    const tier: SubscriptionTier = mongoUser?.subscriptionTier ?? "free";
    const isBasic = tier === "basic";
    const credits = mongoUser?.credits ?? 0;

    const topCoins = mongoUser?.topCoins ?? [];

    const createdAt = mongoUser?.createdAt ?? null;
    const updatedAt = mongoUser?.updatedAt ?? null;

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
      createdAt,
      updatedAt,
      isContextLoaded,
      refreshUser,
      setUsername,
      hasEnoughCredits,
    };
  }, [clerkUser, mongoUser, isContextLoaded]); // safe deps

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUserContext() {
  const ctx = useContext(UserContext);
  if (!ctx)
    throw new Error("useUserContext must be used within a UserProvider");
  return ctx;
}
