"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  UserIcon,
  Settings,
  CreditCard,
  User,
  ChevronDown,
  LayoutDashboard,
  BotIcon,
  CoinsIcon,
  TrendingUp,
  Menu,
  X,
  LogIn,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CiLogout } from "react-icons/ci";
import { SignedIn, SignedOut, SignOutButton, useUser } from "@clerk/nextjs";
import WalletButton from "./WalletButton";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Coins", href: "/coinpage", icon: CoinsIcon },
  { name: "Playground", href: "/playground", icon: TrendingUp },
  { name: "Bots", href: "/bots", icon: BotIcon },
];

const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const { user, isSignedIn } = useUser();

  return (
    <>
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <header className="flex items-center justify-between px-6 py-4 bg-black/95 border-b border-gray-800/50 sticky top-0 z-30">
        {/* Left: Logo + menu toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="hover:bg-gray-800/50 rounded-xl transition-colors duration-100"
          >
            <Menu className="h-5 w-5 text-gray-300" />
          </Button>
          <Link href="/" className="group">
            <div className="text-white font-heading font-bold text-2xl tracking-wider group-hover:text-[#14f195] transition-colors duration-200">
              SEEK
            </div>
          </Link>
        </div>

        {/* Right: User controls */}
        <div className="flex items-center gap-4">
          <SignedIn>
            <div className="flex gap-4 items-center">
              <Button
                variant="ghost"
                size="icon"
                className="relative h-10 w-10 rounded-full hover:bg-zinc-800/60 transition-colors duration-150"
              >
                <Bell className="h-5 w-5 text-zinc-300 group-hover:text-[#14f195] transition-colors" />
                <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full ring-2 ring-black bg-[#14f195]" />
              </Button>

              <WalletButton />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-3 px-4 py-2 hover:bg-gray-800/50 border border-gray-700/50 rounded-xl transition-colors duration-100"
                  >
                    <UserIcon className="h-5 w-5 text-gray-300" />
                    <span className="text-gray-300 font-medium">
                      {user?.firstName || "User"}
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-64 bg-black/95 border-gray-800/50 text-gray-300 rounded-2xl shadow-2xl shadow-black/50 p-2"
                  sideOffset={8}
                  forceMount
                >
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.1 }}
                  >
                    <div className="px-4 py-3 text-sm border-b border-gray-800/50 mb-2">
                      <p className="text-gray-500 text-xs uppercase tracking-wider font-medium">
                        Signed in as
                      </p>
                      <p className="truncate text-[#14f195] font-medium mt-1">
                        {user?.emailAddresses[0]?.emailAddress}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <DropdownMenuItem asChild>
                        <Link
                          href="/account"
                          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-800/50 transition-colors duration-100"
                        >
                          <User className="h-4 w-4" />
                          <span className="font-medium">Account</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/settings"
                          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-800/50 transition-colors duration-100"
                        >
                          <Settings className="h-4 w-4" />
                          <span className="font-medium">Settings</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-800/50 transition-colors duration-100 cursor-pointer">
                        <CreditCard className="h-4 w-4" />
                        <span className="font-medium">Billing</span>
                      </DropdownMenuItem>
                    </div>

                    <DropdownMenuSeparator className="bg-gray-800/50 my-2" />
                    <div className="pt-1">
                      <SignOutButton>
                        <DropdownMenuItem className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-100">
                          <CiLogout className="h-4 w-4" />
                          <span className="font-medium">Sign out</span>
                        </DropdownMenuItem>
                      </SignOutButton>
                    </div>
                  </motion.div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SignedIn>

          <SignedOut>
            <Link href="/sign-in">
              <Button className="bg-[#14f195] hover:bg-[#10d182] text-black font-semibold px-6 py-2 rounded-xl transition-colors duration-100">
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </Link>
          </SignedOut>
        </div>

        <AnimatePresence>
          {isSidebarOpen && (
            <motion.aside
              className="fixed top-0 left-0 w-72 h-full bg-black/95 z-50 shadow-2xl border-r border-gray-800/50 flex flex-col"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="flex items-center justify-between px-6 py-6 border-b border-gray-800/50">
                <div className="text-white font-heading font-bold text-2xl tracking-wider">
                  SEEK
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                  className="hover:bg-gray-800/50 rounded-xl transition-colors duration-100"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </Button>
              </div>
              <nav className="flex-1 px-4 py-6">
                <div className="space-y-2">
                  {navItems.map((item) => (
                    <Button
                      key={item.href}
                      variant="ghost"
                      className={`w-full flex justify-start items-center gap-4 px-4 py-4 rounded-xl font-medium transition-colors duration-100 ${
                        pathname === item.href
                          ? "bg-[#14f195]/10 text-[#14f195] border border-[#14f195]/20"
                          : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                      }`}
                      onClick={() => {
                        router.push(item.href);
                        setSidebarOpen(false);
                      }}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="text-base">{item.name}</span>
                    </Button>
                  ))}
                </div>
              </nav>
            </motion.aside>
          )}
        </AnimatePresence>
      </header>
    </>
  );
};

export default Header;
