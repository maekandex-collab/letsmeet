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
}

export function SelectField({
  label,
  id,
  name,
  icon,
  options,
  placeholder,
  className = "",
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
          defaultValue=""
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
