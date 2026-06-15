import React from "react";

interface InputFieldProps {
  label?: string;
  id?: string;
  type?: string;
  placeholder?: string;
  name?: string;
  autoComplete?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputMode?: "text" | "numeric" | "tel" | "email" | "search" | "url" | "decimal" | "none";
  maxLength?: number;
}

export function InputField({
  label,
  id,
  type = "text",
  placeholder,
  name,
  autoComplete,
  icon,
  rightIcon,
  className = "",
  defaultValue,
  value,
  onChange,
  inputMode,
  maxLength,
}: InputFieldProps) {
  return (
    <div className={`input-group ${className}`}>
      {label && (
        <label htmlFor={id} className="input-label">
          {label}
        </label>
      )}
      <div className="input-wrapper">
        {icon && <span className="input-icon">{icon}</span>}
        <input
          type={type}
          id={id}
          name={name}
          placeholder={placeholder}
          autoComplete={autoComplete}
          defaultValue={defaultValue}
          value={value}
          onChange={onChange}
          inputMode={inputMode}
          maxLength={maxLength}
          className={`input-field ${icon ? "pl-14" : "pl-4"} ${rightIcon ? "pr-12" : "pr-4"}`}
        />
        {rightIcon && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer">{rightIcon}</span>
        )}
      </div>
    </div>
  );
}

interface SelectFieldProps {
  label?: string;
  id?: string;
  name?: string;
  icon?: React.ReactNode;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export function SelectField({
  label,
  id,
  name,
  icon,
  options,
  placeholder,
  className = "",
  value,
  onChange,
}: SelectFieldProps) {
  return (
    <div className={`input-group ${className}`}>
      {label && (
        <label htmlFor={id} className="input-label">
          {label}
        </label>
      )}
      <div className="input-wrapper">
        {icon && <span className="input-icon">{icon}</span>}
        <select
          id={id}
          name={name}
          {...(value !== undefined ? { value, onChange } : { defaultValue: "" })}
          className={`input-field appearance-none cursor-pointer ${icon ? "pl-14" : "pl-4"} pr-10`}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M6 9L12 15L18 9" stroke="#616568" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </div>
  );
}
