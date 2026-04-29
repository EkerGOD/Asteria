import type { ReactNode } from "react";
import { inputClassName } from "../lib/style";

export function FieldError({ error }: { error?: string }) {
  if (!error) {
    return null;
  }

  return <p className="mt-1 text-xs font-medium text-red-700">{error}</p>;
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      {message}
    </div>
  );
}

export function TextField({
  id,
  label,
  value,
  error,
  required,
  placeholder,
  inputMode,
  onChange
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  required?: boolean;
  placeholder?: string;
  inputMode?: "numeric";
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-stone-700">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        className={inputClassName(error)}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldError error={error} />
    </div>
  );
}

export function PasswordField({
  id,
  label,
  value,
  placeholder,
  onChange
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-stone-700">
        {label}
      </label>
      <input
        id={id}
        type="password"
        className={inputClassName()}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function NumberField({
  id,
  label,
  value,
  error,
  min,
  max,
  required,
  onChange
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  min: number;
  max: number;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-stone-700">
        {label}
      </label>
      <input
        id={id}
        type="number"
        className={inputClassName(error)}
        value={value}
        min={min}
        max={max}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldError error={error} />
    </div>
  );
}

export function TextAreaField({
  id,
  label,
  value,
  error,
  required,
  onChange
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-stone-700">
        {label}
      </label>
      <textarea
        id={id}
        className={`${inputClassName(error)} min-h-24 resize-y`}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldError error={error} />
    </div>
  );
}

export function SelectField({
  id,
  label,
  value,
  children,
  onChange
}: {
  id: string;
  label: string;
  value: string;
  children: ReactNode;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-stone-700">
        {label}
      </label>
      <select
        id={id}
        className={inputClassName()}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </div>
  );
}
