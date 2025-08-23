"use client";

import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { motion } from "framer-motion";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Subtle particles in background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-radial from-zinc-900 to-zinc-950 opacity-80"></div>
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-teal-400/30"
            style={{
              width: `${Math.random() * 4 + 1}px`,
              height: `${Math.random() * 4 + 1}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `float ${Math.random() * 10 + 10}s linear infinite`,
            }}
          />
        ))}
      </div>

      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-10 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-cyan-500/5 rounded-full blur-3xl"></div>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full mb-8 text-center"
        >
          <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-500">
            Welcome Back
          </h1>
          <p className="text-zinc-400">
            Sign in to access your personalized crypto insights
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Clerk SignIn component - directly styled */}
          <SignIn
            appearance={{
              baseTheme: dark,
              variables: {
                colorPrimary: "#2DD4BF", // teal-400
                colorBackground: "transparent",
                colorInputBackground: "rgba(39, 39, 42, 0.4)", // zinc-800 with transparency
                colorInputText: "#F4F4F5", // zinc-100
                colorTextSecondary: "#A1A1AA", // zinc-400
                colorTextOnPrimaryBackground: "#FFFFFF",
                borderRadius: "0.75rem",
                fontFamily: "inherit",
                fontFamilyButtons: "inherit",
                colorDanger: "#EF4444", // red-500
                colorSuccess: "#10B981", // emerald-500
              },
              elements: {
                rootBox: "w-full",
                card: "bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl overflow-hidden",
                header: "mb-6",
                headerTitle: "text-xl font-bold text-zinc-100",
                headerSubtitle: "text-zinc-400",
                socialButtonsBlockButton:
                  "bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 hover:bg-zinc-700/50 transition-colors",
                socialButtonsBlockButtonText: "text-zinc-200",
                socialButtonsBlockButtonArrow: "text-zinc-400",
                dividerLine: "bg-zinc-700/50",
                dividerText: "text-zinc-500 px-2",
                formFieldLabel: "text-zinc-300 font-medium",
                formFieldInput:
                  "bg-zinc-800/30 backdrop-blur-sm border-zinc-700/50 text-zinc-100 focus:border-teal-400/50 focus:ring focus:ring-teal-400/20 transition-all",
                formButtonPrimary:
                  "bg-gradient-to-r from-teal-500 to-indigo-500 hover:from-teal-400 hover:to-indigo-400 text-white border-0 transition-all duration-200",
                footerActionText: "text-zinc-400",
                footerActionLink: "text-teal-400 hover:text-teal-300",
                identityPreviewText: "text-zinc-300",
                identityPreviewEditButton: "text-teal-400 hover:text-teal-300",
                formFieldAction: "text-teal-400 hover:text-teal-300",
                formFieldSuccessText: "text-emerald-500",
                formFieldErrorText: "text-red-400",
                alert: "bg-zinc-800/50 border border-zinc-700/50 text-zinc-300",
                alertText: "text-zinc-300",
                alertIcon: "text-zinc-300",
                logoBox: "hidden",
              },
            }}
          />
        </motion.div>
      </main>

      <footer className="relative z-10 p-4 text-center">
        <p className="text-zinc-500 text-xs">
          © {new Date().getFullYear()} SCAR. All rights reserved.
        </p>
      </footer>

      {/* Floating effect animation */}
      <style jsx global>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-10px) translateX(10px);
          }
          50% {
            transform: translateY(0) translateX(20px);
          }
          75% {
            transform: translateY(10px) translateX(10px);
          }
        }

        /* Force Clerk's button to use gradient */
        .cl-formButtonPrimary {
          background: linear-gradient(to right, #14b8a6, #6366f1) !important;
        }

        .cl-formButtonPrimary:hover {
          background: linear-gradient(to right, #0d9488, #4f46e5) !important;
        }

        /* Ensure no extra backgrounds */
        .cl-internal-b3fm6y {
          background: transparent !important;
        }
      `}</style>
    </div>
  );
}
