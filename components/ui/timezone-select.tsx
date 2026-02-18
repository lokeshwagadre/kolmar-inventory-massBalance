"use client";

type TimezoneSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
};

const timezoneOptions = [
  "US/Eastern",
  "US/Central",
  "US/Mountain",
  "US/Pacific",
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Singapore",
];

export function TimezoneSelect({ value, onValueChange, className = "" }: TimezoneSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={className}
    >
      {timezoneOptions.map((timezone) => (
        <option key={timezone} value={timezone}>
          {timezone}
        </option>
      ))}
    </select>
  );
}
