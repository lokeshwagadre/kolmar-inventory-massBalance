"use client";

import dynamic from "next/dynamic";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { DateTime } from "luxon";
import { Calendar as CalendarIcon } from "lucide-react";
import { type ComponentType, useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface DateTimeRange {
  start: DateTime | null;
  end: DateTime | null;
  timezone: string;
}

interface DateTimeRangePickerProps {
  onChange: (range: DateTimeRange) => void;
  initialRange?: Partial<DateTimeRange>;
  className?: string;
  mode?: "date" | "datetime";
}

type DateRangeSelection = {
  startDate: Date;
  endDate: Date;
  key: string;
};

type DateRangeComponentProps = {
  ranges: DateRangeSelection[];
  onChange: (ranges: { selection?: { startDate?: Date; endDate?: Date } }) => void;
  moveRangeOnFirstSelection: boolean;
  editableDateInputs: boolean;
  maxDate: Date;
  months: number;
  direction: "horizontal" | "vertical";
};

const DateRange = dynamic<DateRangeComponentProps>(
  () => import("react-date-range").then((mod) => mod.DateRange as ComponentType<DateRangeComponentProps>),
  { ssr: false },
);

export function DateTimeSelector({
  onChange,
  initialRange,
  className,
  mode = "datetime",
}: DateTimeRangePickerProps) {
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const initialTimezone = initialRange?.timezone || "America/New_York";
  const defaultEnd = DateTime.now().setZone(initialTimezone).startOf("day");
  const defaultStart = defaultEnd.minus({ days: 1 });
  const [timezone, setTimezone] = useState<string>(initialTimezone);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>("custom");
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = initialRange?.start?.setZone(initialTimezone) ?? defaultStart;
    return new Date(d.year, d.month - 1, d.day);
  });
  const [endDate, setEndDate] = useState<Date>(() => {
    const d = initialRange?.end?.setZone(initialTimezone) ?? defaultEnd;
    return new Date(d.year, d.month - 1, d.day);
  });
  const [startTime, setStartTime] = useState<string>(() => {
    if (initialRange?.start) {
      const s = initialRange.start.setZone(timezone);
      return `${String(s.hour).padStart(2, "0")}:${String(s.minute).padStart(2, "0")}`;
    }
    return "00:00";
  });
  const [endTime, setEndTime] = useState<string>(() => {
    if (initialRange?.end) {
      const e = initialRange.end.setZone(timezone);
      return `${String(e.hour).padStart(2, "0")}:${String(e.minute).padStart(2, "0")}`;
    }
    return "00:00";
  });

  const recentMonthOptions = useMemo(() => {
    const now = DateTime.now().setZone(timezone).startOf("month");
    return Array.from({ length: 6 }).map((_, idx) => {
      const month = now.minus({ months: idx + 1 });
      return {
        key: month.toFormat("yyyy-LL"),
        label: month.toFormat("LLLL yyyy"),
        start: month.startOf("month"),
        end: month.endOf("month"),
      };
    });
  }, [timezone]);

  const computed = useMemo(() => {
    const [sh, sm] = startTime.split(":").map((v) => Number(v) || 0);
    const [eh, em] = endTime.split(":").map((v) => Number(v) || 0);
    let start = DateTime.fromObject(
      {
        year: startDate.getFullYear(),
        month: startDate.getMonth() + 1,
        day: startDate.getDate(),
        hour: sh,
        minute: sm,
        second: 0,
        millisecond: 0,
      },
      { zone: timezone },
    );
    let end = DateTime.fromObject(
      {
        year: endDate.getFullYear(),
        month: endDate.getMonth() + 1,
        day: endDate.getDate(),
        hour: eh,
        minute: em,
        second: 0,
        millisecond: 0,
      },
      { zone: timezone },
    );
    const now = DateTime.now().setZone(timezone);
    if (start > now) start = now;
    if (end > now) end = now;
    if (end < start) end = start;
    return { start, end };
  }, [startDate, endDate, startTime, endTime, timezone]);

  const lastEmitted = useRef<string>("");
  useEffect(() => {
    const payload = {
      start: computed.start?.toISO() ?? null,
      end: computed.end?.toISO() ?? null,
      timezone,
    };
    const sig = JSON.stringify(payload);
    if (sig === lastEmitted.current) return;
    lastEmitted.current = sig;
    onChange({ start: computed.start, end: computed.end, timezone });
  }, [computed, timezone, onChange]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!pickerRef.current) return;
      const target = event.target;
      if (target instanceof Node && !pickerRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isOpen]);

  const onCalendarChange = useCallback(
    (ranges: { selection?: { startDate?: Date; endDate?: Date } }) => {
      const sel = ranges.selection;
      if (!sel) return;
      const now = new Date();
      const from = sel.startDate instanceof Date ? sel.startDate : startDate;
      const toRaw = sel.endDate instanceof Date ? sel.endDate : from;
      const to = toRaw > now ? now : toRaw;
      const fromClamped = from > now ? now : from;
      setStartDate(fromClamped);
      setEndDate(to);
      setSelectedMonthKey("custom");
      setIsOpen(false);
    },
    [startDate],
  );

  const maxDate = useMemo(() => new Date(), []);

  const setPreset = (preset: "1d" | "1w" | "1m" | "3m") => {
    const now = DateTime.now().setZone(timezone).set({ hour: 10, minute: 0, second: 0, millisecond: 0 });
    const start =
      preset === "1d"
        ? now.minus({ days: 1 })
        : preset === "1w"
          ? now.minus({ days: 7 })
          : preset === "1m"
            ? now.minus({ months: 1 })
            : now.minus({ months: 3 });
    setStartDate(new Date(start.year, start.month - 1, start.day));
    setEndDate(new Date(now.year, now.month - 1, now.day));
    setStartTime(`${String(start.hour).padStart(2, "0")}:${String(start.minute).padStart(2, "0")}`);
    setEndTime(`${String(now.hour).padStart(2, "0")}:${String(now.minute).padStart(2, "0")}`);
    setSelectedMonthKey("custom");
  };

  return (
    <div className={className ?? ""} ref={pickerRef}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="flex w-[380px] items-center justify-start rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-left text-sm font-normal text-[#334155] hover:bg-[#f8fafc]"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {computed.start && computed.end ? (
              <span>
                {computed.start.toFormat("LLL dd, yyyy HH:mm")} - {computed.end.toFormat("LLL dd, yyyy HH:mm")}
              </span>
            ) : (
              <span>Pick date & time range</span>
            )}
          </button>
        </div>
        <span className="text-sm font-semibold text-[#64748b]">or</span>
        <div className="relative">
          <div className="flex items-center gap-2">
            <select
              value={selectedMonthKey}
              onChange={(e) => {
                setSelectedMonthKey(e.target.value);
              }}
              className="h-[42px] w-48 rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm text-[#334155]"
            >
              <option value="custom">Custom Range</option>
              {recentMonthOptions.map((month) => (
                <option key={month.key} value={month.key}>
                  {month.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                if (selectedMonthKey === "custom") return;
                const selectedMonth = recentMonthOptions.find((month) => month.key === selectedMonthKey);
                if (!selectedMonth) return;
                setStartDate(new Date(selectedMonth.start.year, selectedMonth.start.month - 1, selectedMonth.start.day));
                setEndDate(new Date(selectedMonth.end.year, selectedMonth.end.month - 1, selectedMonth.end.day));
                setStartTime("00:00");
                setEndTime("00:00");
                setIsOpen(false);
              }}
              className="h-[42px] rounded-md bg-[#0f8f6f] px-4 text-sm font-semibold text-white transition hover:bg-[#0c7a5e]"
            >
              Load
            </button>
          </div>
          <span className="absolute left-2 -top-2 bg-white px-1 text-xs font-medium text-gray-700">
            Previous Month
          </span>
        </div>
        {isOpen && (
          <div className="absolute z-50 mt-2 rounded-md border border-[#cbd5e1] bg-white p-3 shadow-lg">
            <div className="flex flex-row items-start gap-3">
              <div className="flex flex-col">
                <DateRange
                  ranges={[{ startDate, endDate, key: "selection" }]}
                  onChange={onCalendarChange}
                  moveRangeOnFirstSelection={false}
                  editableDateInputs
                  maxDate={maxDate}
                  months={2}
                  direction="horizontal"
                />
              </div>
              <div className="flex min-w-[200px] flex-col gap-3">
                <TimezoneSelect value={timezone} onValueChange={setTimezone} className="w-48" />
                <FloatingLabelInput
                  label="Start Time"
                  type="time"
                  value={startTime}
                  onChange={(e) => {
                    setSelectedMonthKey("custom");
                    setStartTime(e.target.value);
                  }}
                  className="w-48"
                />
                <FloatingLabelInput
                  label="End Time"
                  type="time"
                  value={endTime}
                  onChange={(e) => {
                    setSelectedMonthKey("custom");
                    setEndTime(e.target.value);
                  }}
                  className="w-48"
                />
                <div className="flex flex-wrap gap-0.5">
                  <button
                    type="button"
                    onClick={() => setPreset("1d")}
                    className="rounded-md border border-[#cbd5e1] bg-white px-2 py-1 text-xs font-medium text-[#334155] hover:bg-[#f8fafc]"
                  >
                    1D
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreset("1w")}
                    className="rounded-md border border-[#cbd5e1] bg-white px-2 py-1 text-xs font-medium text-[#334155] hover:bg-[#f8fafc]"
                  >
                    1W
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreset("1m")}
                    className="rounded-md border border-[#cbd5e1] bg-white px-2 py-1 text-xs font-medium text-[#334155] hover:bg-[#f8fafc]"
                  >
                    1M
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreset("3m")}
                    className="rounded-md border border-[#cbd5e1] bg-white px-2 py-1 text-xs font-medium text-[#334155] hover:bg-[#f8fafc]"
                  >
                    3M
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {mode === "date" && (
        <p className="mt-1 text-xs text-[#94a3b8]">Date-only mode selected.</p>
      )}
    </div>
  );
}
