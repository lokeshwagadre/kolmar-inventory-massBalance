"use client";

import { type InputHTMLAttributes } from "react";

type FloatingLabelInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function FloatingLabelInput({ label, className = "", id, ...props }: FloatingLabelInputProps) {
  const inputId = id || `floating-input-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="relative">
      <input
        id={inputId}
        placeholder=" "
        className={`peer h-[42px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-[#334155] outline-none transition focus:border-[#0f8f6f] ${className}`}
        {...props}
      />
      <label
        htmlFor={inputId}
        className="pointer-events-none absolute left-2 -top-2 bg-white px-1 text-xs font-medium text-gray-700"
      >
        {label}
      </label>
    </div>
  );
}
