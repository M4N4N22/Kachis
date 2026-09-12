"use client";

import { useEffect, useRef, useState } from "react";
import { Loader, Lock } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";

const CYCLES_PER_LETTER = 2;
const SHUFFLE_TIME = 50;
const CHARS = "0123456789ABCDEF0123456789abcdef";


type EncryptButtonProps = {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
};

export function EncryptButton({
  label,
  onClick,
  disabled = false,
  loading = false,
  className,
}: EncryptButtonProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [text, setText] = useState(label);

  useEffect(() => {
    setText(label);
  }, [label]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const stopScramble = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setText(label);
  };

  const scramble = () => {
    if (disabled || loading) return;
    stopScramble();
    let pos = 0;
    const target = label;

    intervalRef.current = setInterval(() => {
      const scrambled = target
        .split("")
        .map((char, index) => {
          if (char === " ") return " ";
          if (pos / CYCLES_PER_LETTER > index) return char;
          return CHARS[Math.floor(Math.random() * CHARS.length)] ?? char;
        })
        .join("");

      setText(scrambled);
      pos += 1;

      if (pos >= target.length * CYCLES_PER_LETTER) {
        stopScramble();
      }
    }, SHUFFLE_TIME);
  };

  return (
    <motion.button
      type="button"
      whileHover={disabled || loading ? undefined : { scale: 1 }}
      whileTap={disabled || loading ? undefined : { scale: 0.98 }}
      onMouseEnter={scramble}
      onMouseLeave={stopScramble}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "group  relative w-full overflow-hidden rounded-full bg-brand text-brand-fg px-4 py-3 font-mono text-[13px] font-medium uppercase tracking-wide transition-colors",
        "hover:border-[color-mix(in_srgb,var(--brand-a)_45%,transparent)] hover:text-brand-fg ",
        "disabled:pointer-events-none disabled:opacity-45",
        className,
      )}
    >
      <div className="relative z-10 flex items-center justify-center gap-2">
        {loading ? (
          <Loader className="h-4 w-4 animate-spin" strokeWidth={1.75} />
        ) : (
          <>
            <span className="truncate">{text}</span>
          </>
        )}
      </div>
    </motion.button>
  );
}

export default EncryptButton;
