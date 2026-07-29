import { type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, className = "", id, type, ...props }, ref) => {
    const { t } = useTranslation();
    const [passwordVisible, setPasswordVisible] = useState(false);
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const isPassword = type === "password";
    return (
      <div className="fcw-flex-col fcw-gap-sm" style={{ gap: "0.25rem" }}>
        {label && <label htmlFor={inputId} className="fcw-input-label">{label}</label>}
        <div className={isPassword ? "fcw-password-input" : undefined}>
          <input
            ref={ref}
            id={inputId}
            type={isPassword && passwordVisible ? "text" : type}
            className={`fcw-input ${error ? "fcw-input-error" : ""} ${className}`}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              className="fcw-password-input__toggle"
              onClick={() => setPasswordVisible(value => !value)}
              aria-label={t(passwordVisible ? "auth.password.hide" : "auth.password.show")}
              aria-pressed={passwordVisible}
            >
              {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
        {error && <span className="fcw-input-error-msg">{error}</span>}
        {helper && !error && <span className="fcw-input-helper">{helper}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
        {label && <label htmlFor={inputId} className="fcw-input-label">{label}</label>}
        <textarea ref={ref} id={inputId} className={`fcw-textarea ${className}`} {...props} />
        {error && <span className="fcw-input-error-msg">{error}</span>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
        {label && <label htmlFor={inputId} className="fcw-input-label">{label}</label>}
        <select ref={ref} id={inputId} className={`fcw-select ${className}`} {...props}>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error && <span className="fcw-input-error-msg">{error}</span>}
      </div>
    );
  }
);

Select.displayName = "Select";
