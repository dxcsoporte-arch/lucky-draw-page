import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tone?: "dark" | "accent" | "ghost";
};

export function ActionButton({ children, className, tone = "dark", ...props }: ActionButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-extrabold uppercase transition-transform duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        tone === "dark" && "bg-foreground text-background hover:bg-primary",
        tone === "accent" && "bg-accent text-accent-foreground hover:scale-[1.02]",
        tone === "ghost" && "border border-border bg-background text-foreground hover:bg-muted",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}