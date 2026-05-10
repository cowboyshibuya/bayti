"use client";

import Image from "next/image";
import Link from "next/link";
// import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { ArrowRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConvexAuth } from "@convex-dev/auth/react";

const heroMotion: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" },
  },
};

export default function MarketingPage() {
  const { isAuthenticated } = useConvexAuth();
  return (
    <main className="min-h-svh overflow-hidden bg-[#f4efe4] text-[#0b0b0b] dark:bg-background">
      <section className="relative grid min-h-svh grid-rows-[auto_1fr]">
        <Image
          src="/hero.png"
          alt="Family gathered by a bright lakeside"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[50%_58%] sm:object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.72)_0%,rgba(255,255,255,0.5)_28%,rgba(255,255,255,0.18)_58%,rgba(0,0,0,0.08)_100%)] dark:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.58)_0%,rgba(255,255,255,0.32)_28%,rgba(255,255,255,0.12)_58%,rgba(0,0,0,0.28)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-44 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.48),transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-[linear-gradient(to_top,rgba(16,24,12,0.34),transparent)]" />

        <header className="relative z-10 flex h-16 items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link
            href="/"
            // className="flex items-center gap-2 rounded-full bg-white/24 px-2.5 py-2 text-black/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_10px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-colors hover:bg-white/34"
          >
            <Image
              src="/logo.png"
              height="100"
              width="100"
              alt="logo"
            />
            {/*<span className="flex size-8 items-center justify-center rounded-full bg-black text-white shadow-sm">
              <Home className="size-4" />
            </span>*/}

            {/*<span className="pr-1 text-sm font-semibold tracking-normal">
              FamilyOS
            </span>*/}
          </Link>

          <div className="flex items-center gap-2">
            {!isAuthenticated ? (
              <Button
                variant="ghost"
                className="bg-white/20 text-black/72 backdrop-blur-xl hover:bg-white/32 hover:text-black"
              >
                <Link href="/login">
                  Sign in
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                className="bg-black text-white shadow-[0_18px_45px_rgba(0,0,0,0.22)] hover:bg-black/88"
              >
                <Link href="/dashboard">
                  Dashboard
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            )}
          </div>
        </header>

        <div className="relative z-10 flex min-h-0 items-start justify-center px-5 pb-10 pt-[12svh] text-center sm:px-8 sm:pt-[13svh] lg:pt-[14svh]">
          <motion.div
            className="flex w-full max-w-6xl flex-col items-center"
            initial="hidden"
            animate="visible"
            variants={heroMotion}
          >
            <motion.div
              className="inline-flex max-w-[min(92vw,520px)] items-center gap-3 rounded-full border border-white/42 bg-white/38 px-4 py-2 text-sm font-semibold text-black/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_18px_60px_rgba(30,43,22,0.1)] backdrop-blur-2xl sm:px-5"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.45, delay: 0.08 }}
            >
              <span className="flex -space-x-2">
                <span className="size-7 rounded-full border-2 border-white/80 bg-[#d7a15e]" />
                <span className="size-7 rounded-full border-2 border-white/80 bg-[#8fb5c7]" />
                <span className="size-7 rounded-full border-2 border-white/80 bg-[#b7c98b]" />
              </span>
              <span className="truncate">A private space for your household.</span>
            </motion.div>

            <motion.h1
              className="mt-8 max-w-6xl text-balance text-6xl font-semibold leading-[0.94] tracking-normal text-black sm:text-8xl lg:text-[8.75rem]"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
            >
              Home. Plans. Peace.
            </motion.h1>

            <motion.p
              className="mt-6 max-w-2xl text-balance text-base font-medium leading-7 text-black/62 sm:text-xl sm:leading-8"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              FamilyOS keeps tasks, bills, events, notes, and shared routines in
              one calm family workspace.
            </motion.p>

            <motion.div
              className="mt-9 flex flex-wrap justify-center gap-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.26 }}
            >
              {isAuthenticated ? (
                <Button
                  size="lg"
                  asChild
                  className="h-12 bg-black px-6 text-base text-white shadow-[0_18px_45px_rgba(0,0,0,0.24)] hover:bg-black/88"
                >
                  <Link href="/dashboard">
                    Open dashboard
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="h-12 bg-black px-6 text-base text-white shadow-[0_18px_45px_rgba(0,0,0,0.24)] hover:bg-black/88"
                >
                  Create household
                  <ArrowRight className="size-4" />
                </Button>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
