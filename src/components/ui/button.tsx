import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-b from-cyber-cyan to-cyber-blue text-[#021326] font-semibold shadow-[0_0_18px_-2px_rgba(0,191,255,0.65)] hover:shadow-[0_0_24px_0px_rgba(0,191,255,0.8)] hover:brightness-110",
        outline:
          "border border-[rgba(0,191,255,0.25)] bg-[rgba(11,22,46,0.6)] text-foreground hover:border-[rgba(0,191,255,0.55)] hover:bg-[rgba(0,191,255,0.08)]",
        ghost: "hover:bg-[rgba(0,191,255,0.08)] text-foreground",
        danger:
          "border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.08)] text-red-400 hover:bg-[rgba(239,68,68,0.16)] hover:border-[rgba(239,68,68,0.6)]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-5",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
