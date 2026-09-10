"use client";

import React, { memo, forwardRef } from "react";
import { LiquidMetal as LiquidMetalShader } from "@paper-design/shaders-react";
import { cn } from "@/lib/utils";

export interface LiquidMetalProps {
  colorBack?: string;
  colorTint?: string;
  speed?: number;
  repetition?: number;
  distortion?: number;
  scale?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const LiquidMetal = memo(function LiquidMetal({
  colorBack = "#aaaaac",
  colorTint = "#ffffff",
  speed = 0.5,
  repetition = 4,
  distortion = 0.1,
  scale = 1,
  className,
  style,
}: LiquidMetalProps) {
  return (
    <div className={cn("absolute inset-0 z-0 overflow-hidden", className)} style={style}>
      <LiquidMetalShader
        colorBack={colorBack}
        colorTint={colorTint}
        speed={speed}
        repetition={repetition}
        distortion={distortion}
        softness={0}
        shiftRed={0.3}
        shiftBlue={-0.3}
        angle={45}
        shape="none"
        scale={scale}
        fit="cover"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
});

LiquidMetal.displayName = "LiquidMetal";

export interface LiquidMetalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  icon?: React.ReactNode;
  /** Square control — icon only, no text padding. */
  iconOnly?: boolean;
  borderWidth?: number;
  metalConfig?: Omit<LiquidMetalProps, "className" | "style">;
  size?: "sm" | "md" | "lg";
}

export const LiquidMetalButton = forwardRef<HTMLButtonElement, LiquidMetalButtonProps>(
  (
    {
      children,
      icon,
      iconOnly = false,
      borderWidth = 3,
      metalConfig,
      size = "md",
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const sizeStyles = {
      sm: icon
        ? "py-2 pl-2 pr-6 gap-3 text-sm"
        : "justify-center px-5 py-2.5 text-sm",
      md: icon
        ? "py-3 pl-3 pr-8 gap-4 text-base"
        : "justify-center px-7 py-3 text-base",
      lg: icon
        ? "py-4 pl-4 pr-10 gap-6 text-lg"
        : "justify-center px-8 py-3.5 text-[15px]",
    };

    const iconOnlyStyles = {
      sm: "h-10 w-10 justify-center p-0",
      md: "h-11 w-11 justify-center p-0",
      lg: "h-12 w-12 justify-center p-0",
    };

    const iconSizes = {
      sm: "w-8 h-8",
      md: "w-10 h-10",
      lg: "w-12 h-12",
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "group relative cursor-pointer border-none bg-transparent p-0 outline-none transition-transform active:scale-[0.98]",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        <div
          className="relative w-full overflow-hidden rounded-full shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)]"
          style={{ padding: borderWidth }}
        >
          <LiquidMetal
            colorBack={metalConfig?.colorBack ?? "#1f3f6d"}
            colorTint={metalConfig?.colorTint ?? "#f1ffa5"}
            speed={metalConfig?.speed ?? 0.45}
            repetition={metalConfig?.repetition ?? 4}
            distortion={metalConfig?.distortion ?? 0.15}
            scale={metalConfig?.scale ?? 1}
            className="absolute inset-0 z-0 rounded-full"
          />

          <div
            className={cn(
              "relative z-10 flex items-center rounded-full",
              "bg-black text-ink transition-colors duration-200",
              "group-hover:bg-neutral-950",
              iconOnly ? iconOnlyStyles[size] : cn(sizeStyles[size], "w-full"),
            )}
          >
            {icon && !iconOnly ? (
              <div
                className={cn(
                  "flex items-center justify-center rounded-full",
                  "bg-neutral-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)]",
                  iconSizes[size],
                )}
              >
                <span className="text-neutral-200">{icon}</span>
              </div>
            ) : null}
            {iconOnly ? (
              <span className="flex items-center justify-center text-ink">{children ?? icon}</span>
            ) : (
              <span className="font-medium tracking-tight text-ink">{children}</span>
            )}
          </div>
        </div>
      </button>
    );
  },
);

LiquidMetalButton.displayName = "LiquidMetalButton";

export default LiquidMetalButton;
