import { type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="fcw-flex-col fcw-gap-sm" style={{ gap: "0.25rem" }}>
        {label && <label htmlFor={inputId} className="fcw-input-label">{label}</label>}
        <input
          ref={ref}
          id={inputId}
          className={`fcw-input ${error ? "fcw-input-error" : ""} ${className}`}
          {...props}
        />
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
