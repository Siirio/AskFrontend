import { type ReactNode, type HTMLAttributes, forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  flush?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  children?: ReactNode;
}

const padMap: Record<string, string> = {
  none: "",
  sm: "fcw-p-sm",
  md: "fcw-p-md",
  lg: "fcw-p-lg",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ interactive, flush, padding = "md", children, className = "", ...props }, ref) => {
    const base = flush ? "fcw-card-flush" : interactive ? "fcw-card-clickable" : "fcw-card";
    const classes = [base, padMap[padding], className].filter(Boolean).join(" ");

    if (interactive) {
      return (
        <motion.div
          ref={ref}
          className={classes}
          whileHover={{ y: -2 }}
          whileTap={{ y: 0 }}
          {...(props as HTMLMotionProps<"div">)}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <div ref={ref} className={classes} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
