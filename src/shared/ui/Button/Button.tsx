import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

const variantMap: Record<ButtonVariant, string> = {
  primary: "fcw-btn fcw-btn-primary",
  secondary: "fcw-btn fcw-btn-secondary",
  ghost: "fcw-btn fcw-btn-ghost",
  outline: "fcw-btn fcw-btn-outline",
};

const sizeMap: Record<ButtonSize, string> = {
  sm: "fcw-btn-sm",
  md: "",
  lg: "fcw-btn-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, fullWidth, icon, children, className = "", disabled, ...props }, ref) => {
    const classes = [
      variantMap[variant],
      sizeMap[size],
      fullWidth ? "fcw-btn-full" : "",
      loading ? "is-loading" : "",
      className,
    ].filter(Boolean).join(" ");

    return (
      <motion.button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        whileTap={{ scale: 0.97 }}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        {...(props as HTMLMotionProps<"button">)}
      >
        {icon && <span className="fcw-btn-icon-wrap">{icon}</span>}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = "Button";
