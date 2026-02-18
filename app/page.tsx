"use client";

import Image from "next/image";
import { type ReactNode, useEffect, useState } from "react";
import { DateTimeSelector, type DateTimeRange } from "@/components/date-time-selector";
import { DateTime } from "luxon";
import { january2026LedgerDocuments } from "@/data/ledger-january-2026";

type Tab = "Dashboard" | "Ledger" | "Inventory" | "Feedstock Allocation" | "Biodiesel Sales";

type SummaryCard = {
  label: string;
  value: string;
  note: string;
};

type LedgerDocument = {
  documentName: string;
  documentType: string;
  feedstockType: string;
  feedstockReceivedMt: number;
  receivedAtIso: string;
  status: string;
};

type InventoryRow = {
  date: string;
  inventoryFeedstock: string;
  inventoryCertification: string;
  inventoryAmount: string;
  incomingFeedstock: string;
  incomingCertification: string;
  incomingAmount: string;
  totalInventoryAmount: string;
};

type AllocationRow = {
  id: string;
  feedstock: string;
  certification: string;
  allocationAmount: number;
  conversionFactor: number;
};

type FeedstockGallons = {
  feedstock: string;
  gallons: number;
};

const tabs: Tab[] = ["Dashboard", "Ledger", "Inventory", "Feedstock Allocation", "Biodiesel Sales"];

const statusClasses: Record<string, string> = {
  Received: "bg-[#e0f2fe] text-[#075985]",
  "Needs Review": "bg-[#fef3c7] text-[#92400e]",
};

const feedstockTypeClasses: Record<string, string> = {
  UCO: "bg-[#dcfce7] text-[#166534]",
  Soybean: "bg-[#ffedd5] text-[#9a3412]",
  "Waste Oil and Waste Fat": "bg-[#ecfeff] text-[#0e7490]",
  "Cellulosic Waste": "bg-[#ede9fe] text-[#5b21b6]",
  "Circular Naphtha and Synthetic Oil": "bg-[#f3e8ff] text-[#6b21a8]",
};

const certificationClasses: Record<string, string> = {
  LCFS: "bg-[#e0f2fe] text-[#075985]",
  ISCC: "bg-[#f3e8ff] text-[#6b21a8]",
  RFS: "bg-[#dcfce7] text-[#166534]",
};

const certificationOptions = ["LCFS", "ISCC", "RFS"];
const fixedAllocationFeedstocks = [
  "UCO",
  "Soybean",
  "Cellulosic Waste",
  "Circular Naphtha and Synthetic Oil",
] as const;
const eligibleCertificationsByFeedstock: Record<(typeof fixedAllocationFeedstocks)[number], string[]> = {
  UCO: ["LCFS", "ISCC"],
  Soybean: ["RFS"],
  "Cellulosic Waste": ["RFS", "ISCC"],
  "Circular Naphtha and Synthetic Oil": ["ISCC"],
};

const parseMtValue = (value: string) => Number.parseFloat(value.replace(" MT", ""));

const isFullJanuary2026Range = (range: DateTimeRange) => {
  if (!range.start || !range.end) {
    return false;
  }
  const start = range.start.setZone(range.timezone);
  const end = range.end.setZone(range.timezone);
  return start.year === 2026 && start.month === 1 && start.day === 1 && end.year === 2026 && end.month === 1 && end.day === 31;
};

const isLast24HoursWindow = (range: DateTimeRange) => {
  if (!range.start || !range.end) {
    return false;
  }
  const zone = range.timezone || "America/New_York";
  const nowInZone = DateTime.now().setZone(zone);
  const expectedEnd = nowInZone.startOf("day");
  const expectedStart = expectedEnd.minus({ days: 1 });
  const start = range.start.setZone(zone);
  const end = range.end.setZone(zone);
  return start.hasSame(expectedStart, "day") && end.hasSame(expectedEnd, "day");
};

function TabsNav({
  tabsList,
  activeTab,
  onTabClick,
}: {
  tabsList: readonly Tab[];
  activeTab: Tab;
  onTabClick: (tab: Tab) => void;
}) {
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      {tabsList.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabClick(tab)}
          className={`rounded-md border px-4 py-2 text-sm font-medium transition ${
            activeTab === tab
              ? "border-[#0f8f6f] bg-[#e8f5f1] text-[#0f8f6f]"
              : "border-[#e5e7eb] bg-white text-[#6b7280] hover:bg-[#f9fafb]"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

function DashboardSection({
  summaryCards,
  inventoryMixRows,
  statsWindowLabel,
}: {
  summaryCards: SummaryCard[];
  inventoryMixRows: Array<{ feedstock: string; amount: number }>;
  statsWindowLabel: string;
}) {
  const maxInventoryMix = Math.max(...inventoryMixRows.map((row) => row.amount), 1);
  const zeroCerts = { iscc: 0, rfs: 0, lcfs: 0 };
  const feedstockMassBalanceCards = [
    {
      feedstock: "UCO",
      rows: [
        {
          month: "January 2026",
          opening: { iscc: 180, rfs: 30, lcfs: 120 },
          incoming: { iscc: 95, rfs: 25, lcfs: 90 },
          outgoing: { iscc: 65, rfs: 10, lcfs: 50 },
          closing: { iscc: 210, rfs: 45, lcfs: 160 },
          biodieselProduced: { iscc: 6300, rfs: 1100, lcfs: 4800 },
          biodieselInventory: { iscc: 8200, rfs: 1400, lcfs: 6100 },
        },
        {
          month: "February 2026",
          opening: { iscc: 210, rfs: 45, lcfs: 160 },
          incoming: { iscc: 90, rfs: 20, lcfs: 70 },
          outgoing: { iscc: 55, rfs: 13, lcfs: 45 },
          closing: { iscc: 245, rfs: 52, lcfs: 185 },
          biodieselProduced: { iscc: 7100, rfs: 1200, lcfs: 5300 },
          biodieselInventory: { iscc: 9300, rfs: 1600, lcfs: 7000 },
        },
        {
          month: "March 2026",
          opening: zeroCerts,
          incoming: zeroCerts,
          outgoing: zeroCerts,
          closing: zeroCerts,
          biodieselProduced: zeroCerts,
          biodieselInventory: zeroCerts,
        },
      ],
    },
    {
      feedstock: "Soybean",
      rows: [
        {
          month: "January 2026",
          opening: { iscc: 85, rfs: 110, lcfs: 70 },
          incoming: { iscc: 55, rfs: 45, lcfs: 40 },
          outgoing: { iscc: 35, rfs: 25, lcfs: 15 },
          closing: { iscc: 105, rfs: 130, lcfs: 95 },
          biodieselProduced: { iscc: 2900, rfs: 3600, lcfs: 2600 },
          biodieselInventory: { iscc: 4100, rfs: 5000, lcfs: 3500 },
        },
        {
          month: "February 2026",
          opening: { iscc: 105, rfs: 130, lcfs: 95 },
          incoming: { iscc: 50, rfs: 42, lcfs: 38 },
          outgoing: { iscc: 37, rfs: 20, lcfs: 21 },
          closing: { iscc: 118, rfs: 152, lcfs: 112 },
          biodieselProduced: { iscc: 3300, rfs: 4100, lcfs: 3100 },
          biodieselInventory: { iscc: 4700, rfs: 5900, lcfs: 4300 },
        },
        {
          month: "March 2026",
          opening: zeroCerts,
          incoming: zeroCerts,
          outgoing: zeroCerts,
          closing: zeroCerts,
          biodieselProduced: zeroCerts,
          biodieselInventory: zeroCerts,
        },
      ],
    },
    {
      feedstock: "Cellulosic Waste",
      rows: [
        {
          month: "January 2026",
          opening: { iscc: 70, rfs: 84, lcfs: 60 },
          incoming: { iscc: 40, rfs: 35, lcfs: 28 },
          outgoing: { iscc: 22, rfs: 15, lcfs: 16 },
          closing: { iscc: 88, rfs: 104, lcfs: 72 },
          biodieselProduced: { iscc: 2400, rfs: 2850, lcfs: 2100 },
          biodieselInventory: { iscc: 3200, rfs: 3900, lcfs: 2800 },
        },
        {
          month: "February 2026",
          opening: { iscc: 88, rfs: 104, lcfs: 72 },
          incoming: { iscc: 37, rfs: 32, lcfs: 24 },
          outgoing: { iscc: 29, rfs: 18, lcfs: 15 },
          closing: { iscc: 96, rfs: 118, lcfs: 81 },
          biodieselProduced: { iscc: 2600, rfs: 3200, lcfs: 2300 },
          biodieselInventory: { iscc: 3600, rfs: 4600, lcfs: 3200 },
        },
        {
          month: "March 2026",
          opening: zeroCerts,
          incoming: zeroCerts,
          outgoing: zeroCerts,
          closing: zeroCerts,
          biodieselProduced: zeroCerts,
          biodieselInventory: zeroCerts,
        },
      ],
    },
    {
      feedstock: "Circular Naphtha and Synthetic Oil",
      rows: [
        {
          month: "January 2026",
          opening: { iscc: 74, rfs: 30, lcfs: 50 },
          incoming: { iscc: 44, rfs: 18, lcfs: 28 },
          outgoing: { iscc: 26, rfs: 12, lcfs: 14 },
          closing: { iscc: 92, rfs: 36, lcfs: 64 },
          biodieselProduced: { iscc: 2500, rfs: 900, lcfs: 1700 },
          biodieselInventory: { iscc: 3400, rfs: 1300, lcfs: 2500 },
        },
        {
          month: "February 2026",
          opening: { iscc: 92, rfs: 36, lcfs: 64 },
          incoming: { iscc: 40, rfs: 16, lcfs: 24 },
          outgoing: { iscc: 28, rfs: 11, lcfs: 15 },
          closing: { iscc: 104, rfs: 41, lcfs: 73 },
          biodieselProduced: { iscc: 2900, rfs: 1000, lcfs: 1900 },
          biodieselInventory: { iscc: 4100, rfs: 1500, lcfs: 2900 },
        },
        {
          month: "March 2026",
          opening: zeroCerts,
          incoming: zeroCerts,
          outgoing: zeroCerts,
          closing: zeroCerts,
          biodieselProduced: zeroCerts,
          biodieselInventory: zeroCerts,
        },
      ],
    },
    {
      feedstock: "Waste Oil and Waste Fat",
      rows: [
        {
          month: "January 2026",
          opening: { iscc: 145, rfs: 82, lcfs: 120 },
          incoming: { iscc: 70, rfs: 45, lcfs: 55 },
          outgoing: { iscc: 39, rfs: 29, lcfs: 35 },
          closing: { iscc: 176, rfs: 98, lcfs: 140 },
          biodieselProduced: { iscc: 5200, rfs: 2800, lcfs: 4100 },
          biodieselInventory: { iscc: 6900, rfs: 3900, lcfs: 5600 },
        },
        {
          month: "February 2026",
          opening: { iscc: 176, rfs: 98, lcfs: 140 },
          incoming: { iscc: 62, rfs: 39, lcfs: 50 },
          outgoing: { iscc: 45, rfs: 23, lcfs: 32 },
          closing: { iscc: 193, rfs: 114, lcfs: 158 },
          biodieselProduced: { iscc: 5700, rfs: 3200, lcfs: 4600 },
          biodieselInventory: { iscc: 7800, rfs: 4600, lcfs: 6500 },
        },
        {
          month: "March 2026",
          opening: zeroCerts,
          incoming: zeroCerts,
          outgoing: zeroCerts,
          closing: zeroCerts,
          biodieselProduced: zeroCerts,
          biodieselInventory: zeroCerts,
        },
      ],
    },
  ];
  const monthOrder = feedstockMassBalanceCards[0]?.rows.map((row) => row.month) ?? [];
  const certificateTotalsByMonth = feedstockMassBalanceCards.reduce<
    Record<string, { lcfs: number; iscc: number; rfs: number }>
  >((acc, card) => {
    card.rows.forEach((row) => {
      if (!acc[row.month]) {
        acc[row.month] = { lcfs: 0, iscc: 0, rfs: 0 };
      }
      acc[row.month].lcfs += row.closing.lcfs;
      acc[row.month].iscc += row.closing.iscc;
      acc[row.month].rfs += row.closing.rfs;
    });
    return acc;
  }, {});
  const certificateInventoryByMonth = monthOrder.map((month) => ({
    month,
    lcfs: certificateTotalsByMonth[month]?.lcfs ?? 0,
    iscc: certificateTotalsByMonth[month]?.iscc ?? 0,
    rfs: certificateTotalsByMonth[month]?.rfs ?? 0,
  }));

  return (
    <>
      <div className="rounded-xl border border-[#cfe8df] bg-[#f3fbf8] p-4">
        <div className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-3 text-xs text-[#64748b]">
          <span className="font-semibold text-[#334155]">{statsWindowLabel}</span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          {summaryCards.map((card) => (
            <div key={card.label} className="rounded-lg border border-[#e5e7eb] bg-white p-4">
              <p className="text-sm font-medium text-[#6b7280]">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold text-[#111827]">{card.value}</p>
              <p className="mt-1 text-xs text-[#94a3b8]">{card.note}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-[#e5e7eb] bg-white p-4">
          <h3 className="text-sm font-semibold text-[#111827]">Feedstock Inventory by Certificate</h3>
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#f8fafc] text-left text-xs uppercase tracking-wide text-[#64748b]">
                <th className="px-3 py-2">Month</th>
                <th className="px-3 py-2">ISCC</th>
                <th className="px-3 py-2">LCFS</th>
                <th className="px-3 py-2">RFS</th>
              </tr>
            </thead>
            <tbody>
              {certificateInventoryByMonth.map((row, idx) => (
                <tr
                  key={`certificate-inventory-${row.month}`}
                  className={`border-t border-[#f1f5f9] text-[#334155] ${idx % 2 === 0 ? "bg-white" : "bg-[#fcfdff]"}`}
                >
                  <td className="px-3 py-2 font-medium">{row.month}</td>
                  <td className="px-3 py-2 tabular-nums">{row.iscc.toLocaleString("en-US")} MT</td>
                  <td className="px-3 py-2 tabular-nums">{row.lcfs.toLocaleString("en-US")} MT</td>
                  <td className="px-3 py-2 tabular-nums">{row.rfs.toLocaleString("en-US")} MT</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-lg border border-[#e5e7eb] bg-white p-4">
          <h3 className="text-sm font-semibold text-[#111827]">Current Inventory by Feedstock</h3>
          <div className="mt-4 space-y-3">
            {inventoryMixRows.map((row) => (
              <div key={`mix-${row.feedstock}`}>
                <div className="mb-1 flex items-center justify-between text-xs text-[#64748b]">
                  <span>{row.feedstock}</span>
                  <span className="font-semibold text-[#334155]">{row.amount} MT</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#e2e8f0]">
                  <div
                    className="h-2 rounded-full bg-[#0f8f6f]"
                    style={{ width: `${(row.amount / maxInventoryMix) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-[#111827]">Mass Balance by Feedstock</h3>
        <div className="mt-3 max-h-[68vh] overflow-y-auto rounded-lg border border-[#dbe7e2] bg-[#f8fbfa] p-3 pr-2">
          <div className="space-y-4 pr-1">
            {feedstockMassBalanceCards.map((card) => (
              <div key={`mass-balance-${card.feedstock}`} className="rounded-lg border border-[#e5e7eb] bg-white p-4">
                <h4 className="text-sm font-semibold text-[#0f172a]">{card.feedstock}</h4>
                <table className="mt-3 w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f8fafc] text-left text-xs uppercase tracking-wide text-[#64748b]">
                      <th className="border-r border-[#e2e8f0] px-3 py-2" rowSpan={2}>
                        Month
                      </th>
                      <th className="border-r border-[#e2e8f0] px-3 py-2 text-center" colSpan={3}>Opening Stock (MT)</th>
                      <th className="border-r border-[#e2e8f0] px-3 py-2 text-center" colSpan={3}>Incoming (MT)</th>
                      <th className="border-r border-[#e2e8f0] px-3 py-2 text-center" colSpan={3}>Outgoing (MT)</th>
                      <th className="border-r border-[#e2e8f0] px-3 py-2 text-center" colSpan={3}>Closing Stock (MT)</th>
                      <th className="border-r border-[#e2e8f0] px-3 py-2 text-center" colSpan={3}>Biodiesel Produced</th>
                      <th className="px-3 py-2 text-center" colSpan={3}>Biodiesel Inventory</th>
                    </tr>
                    <tr className="bg-[#f8fafc] text-left text-xs uppercase tracking-wide text-[#64748b]">
                      <th className="px-3 py-2">ISCC</th>
                      <th className="px-3 py-2">RFS</th>
                      <th className="border-r border-[#e2e8f0] px-3 py-2">LCFS</th>
                      <th className="px-3 py-2">ISCC</th>
                      <th className="px-3 py-2">RFS</th>
                      <th className="border-r border-[#e2e8f0] px-3 py-2">LCFS</th>
                      <th className="px-3 py-2">ISCC</th>
                      <th className="px-3 py-2">RFS</th>
                      <th className="border-r border-[#e2e8f0] px-3 py-2">LCFS</th>
                      <th className="px-3 py-2">ISCC</th>
                      <th className="px-3 py-2">RFS</th>
                      <th className="border-r border-[#e2e8f0] px-3 py-2">LCFS</th>
                      <th className="px-3 py-2">ISCC</th>
                      <th className="px-3 py-2">RFS</th>
                      <th className="border-r border-[#e2e8f0] px-3 py-2">LCFS</th>
                      <th className="px-3 py-2">ISCC</th>
                      <th className="px-3 py-2">RFS</th>
                      <th className="px-3 py-2">LCFS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {card.rows.map((row, idx) => (
                      <tr
                        key={`${card.feedstock}-${row.month}`}
                        className={`border-t border-[#f1f5f9] text-[#334155] ${idx % 2 === 0 ? "bg-white" : "bg-[#fcfdff]"}`}
                      >
                        <td className="px-3 py-2 font-medium">{row.month}</td>
                        <td className="px-3 py-2 tabular-nums">{row.opening.iscc.toLocaleString("en-US")} MT</td>
                        <td className="px-3 py-2 tabular-nums">{row.opening.rfs.toLocaleString("en-US")} MT</td>
                        <td className="border-r border-[#f1f5f9] px-3 py-2 tabular-nums">{row.opening.lcfs.toLocaleString("en-US")} MT</td>
                        <td className="px-3 py-2 tabular-nums">{row.incoming.iscc.toLocaleString("en-US")} MT</td>
                        <td className="px-3 py-2 tabular-nums">{row.incoming.rfs.toLocaleString("en-US")} MT</td>
                        <td className="border-r border-[#f1f5f9] px-3 py-2 tabular-nums">{row.incoming.lcfs.toLocaleString("en-US")} MT</td>
                        <td className="px-3 py-2 tabular-nums">{row.outgoing.iscc.toLocaleString("en-US")} MT</td>
                        <td className="px-3 py-2 tabular-nums">{row.outgoing.rfs.toLocaleString("en-US")} MT</td>
                        <td className="border-r border-[#f1f5f9] px-3 py-2 tabular-nums">{row.outgoing.lcfs.toLocaleString("en-US")} MT</td>
                        <td className="px-3 py-2 tabular-nums">{row.closing.iscc.toLocaleString("en-US")} MT</td>
                        <td className="px-3 py-2 tabular-nums">{row.closing.rfs.toLocaleString("en-US")} MT</td>
                        <td className="border-r border-[#f1f5f9] px-3 py-2 tabular-nums">{row.closing.lcfs.toLocaleString("en-US")} MT</td>
                        <td className="px-3 py-2 tabular-nums">{row.biodieselProduced.iscc.toLocaleString("en-US")} gal</td>
                        <td className="px-3 py-2 tabular-nums">{row.biodieselProduced.rfs.toLocaleString("en-US")} gal</td>
                        <td className="border-r border-[#f1f5f9] px-3 py-2 tabular-nums">{row.biodieselProduced.lcfs.toLocaleString("en-US")} gal</td>
                        <td className="px-3 py-2 tabular-nums">{row.biodieselInventory.iscc.toLocaleString("en-US")} gal</td>
                        <td className="px-3 py-2 tabular-nums">{row.biodieselInventory.rfs.toLocaleString("en-US")} gal</td>
                        <td className="px-3 py-2 tabular-nums">{row.biodieselInventory.lcfs.toLocaleString("en-US")} gal</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function InventorySection({
  inventoryRows,
  renderCertificationBadges,
  inventoryDateRange,
  setInventoryDateRange,
}: {
  inventoryRows: InventoryRow[];
  renderCertificationBadges: (value: string) => ReactNode[];
  inventoryDateRange: DateTimeRange;
  setInventoryDateRange: (range: DateTimeRange) => void;
}) {
  const totalCurrentInventoryMt = inventoryRows.reduce((sum, row) => sum + parseMtValue(row.inventoryAmount), 0);
  const totalIncomingMt = inventoryRows.reduce((sum, row) => sum + parseMtValue(row.incomingAmount), 0);
  const totalInventoryMt = inventoryRows.reduce((sum, row) => sum + parseMtValue(row.totalInventoryAmount), 0);
  const currentAsOfLabel = inventoryDateRange.start
    ? inventoryDateRange.start
        .setZone(inventoryDateRange.timezone)
        .minus({ days: 1 })
        .toFormat("dd LLL yyyy")
    : "N/A";
  const rangeLabel =
    inventoryDateRange.start && inventoryDateRange.end
      ? `${inventoryDateRange.start.toFormat("dd LLL yyyy, HH:mm")} - ${inventoryDateRange.end.toFormat(
          "dd LLL yyyy, HH:mm",
        )}`
      : "Till date";

  return (
    <>
      <div className="mt-6 rounded-lg border border-[#e2e8f0] bg-white p-4">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-semibold text-[#111827]">Date Range</p>
            <p className="text-xs text-[#64748b]">
              Inventory defaults to last 24 hours on first load (previous day 00:00 to current day 00:00). Use
              previous month or custom range to review a period.
            </p>
            <p className="mt-1 text-xs font-medium text-[#334155]">Applied: {rangeLabel}</p>
            <p className="mt-1 text-xs font-medium text-[#334155]">Current Inventory as of: {currentAsOfLabel}</p>
          </div>
          <DateTimeSelector
            onChange={setInventoryDateRange}
            initialRange={{
              start: inventoryDateRange.start ?? undefined,
              end: inventoryDateRange.end ?? undefined,
              timezone: inventoryDateRange.timezone,
            }}
          />
        </div>
      </div>
      <div className="mt-6 overflow-x-auto rounded-lg border border-[#e2e8f0] bg-white">
      <table className="w-full min-w-[980px] border-collapse text-sm">
        <thead>
          <tr className="bg-[#f8fafc] text-left text-xs uppercase tracking-wide text-[#64748b]">
            <th className="border-r border-[#e2e8f0] px-4 py-3 text-center" colSpan={3}>
              Current Inventory
            </th>
            <th className="border-r border-[#e2e8f0] px-4 py-3 text-center" colSpan={2}>
              Incoming
            </th>
            <th className="px-4 py-3 text-center" colSpan={1}>
              Total Inventory
            </th>
          </tr>
          <tr className="bg-[#f8fafc] text-left text-xs uppercase tracking-wide text-[#64748b]">
            <th className="px-4 py-3">Feedstock</th>
            <th className="px-4 py-3">Certification</th>
            <th className="border-r border-[#e2e8f0] px-4 py-3">Amount</th>
            <th className="px-4 py-3">Feedstock</th>
            <th className="border-r border-[#e2e8f0] px-4 py-3">Amount</th>
            <th className="px-4 py-3">Amount</th>
          </tr>
        </thead>
        <tbody>
          {inventoryRows.map((row, idx) => (
            <tr
              key={`${row.inventoryFeedstock}-${row.totalInventoryAmount}`}
              className={`border-t border-[#f1f5f9] text-[#334155] ${idx % 2 === 0 ? "bg-white" : "bg-[#fcfdff]"}`}
            >
              <td className="px-4 py-3">{row.inventoryFeedstock}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">{renderCertificationBadges(row.inventoryCertification)}</div>
              </td>
              <td className="border-r border-[#e2e8f0] px-4 py-3 text-right font-medium tabular-nums">
                {row.inventoryAmount}
              </td>
              <td className="px-4 py-3">{row.incomingFeedstock}</td>
              <td className="border-r border-[#e2e8f0] px-4 py-3 text-right font-medium tabular-nums">
                {row.incomingAmount}
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">{row.totalInventoryAmount}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-[#cbd5e1] bg-[#f8fafc] text-[#0f172a]">
            <td className="px-4 py-3 text-sm font-semibold" colSpan={2}>
              Total
            </td>
            <td className="border-r border-[#e2e8f0] px-4 py-3 text-right text-sm font-semibold tabular-nums">
              {totalCurrentInventoryMt.toLocaleString("en-US", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{" "}
              MT
            </td>
            <td className="px-4 py-3"></td>
            <td className="border-r border-[#e2e8f0] px-4 py-3 text-right text-sm font-semibold tabular-nums">
              {totalIncomingMt.toLocaleString("en-US", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{" "}
              MT
            </td>
            <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums">
              {totalInventoryMt.toLocaleString("en-US", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{" "}
              MT
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </>
  );
}

function FeedstockAllocationSection({
  allocationRows,
  onToggleAllocateRow,
  onChangeRow,
  onSaveAll,
  allocatedRowIds,
  isSaveSuccess,
}: {
  allocationRows: AllocationRow[];
  onToggleAllocateRow: (id: string) => void;
  onChangeRow: (id: string, patch: Partial<AllocationRow>) => void;
  onSaveAll: () => void;
  allocatedRowIds: Set<string>;
  isSaveSuccess: boolean;
}) {
  const totalProducedAmount = allocationRows.reduce(
    (sum, row) => sum + row.allocationAmount * row.conversionFactor,
    0,
  );

  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-[#e2e8f0] bg-white">
      <div className="border-b border-[#f1f5f9] p-4 text-xs text-[#64748b]">
        Demo calculator: allocation amount is prefilled from Inventory totals, and biodiesel produced is calculated
        instantly as Amount (MT) x Conversion Factor = Amount (gal).
      </div>
      <div className="flex items-center justify-between border-b border-[#f1f5f9] p-4">
        <p className="text-xs text-[#64748b]">Assign feedstock to certification, then allocate or save.</p>

      </div>
      <table className="w-full min-w-[940px] border-collapse text-sm">
        <thead>
          <tr className="bg-[#f8fafc] text-left text-xs uppercase tracking-wide text-[#64748b]">
            <th className="border-r border-[#e2e8f0] px-4 py-3 text-center" colSpan={3}>
              Allocation
            </th>
            <th className="border-r border-[#e2e8f0] px-4 py-3 text-center" colSpan={1}>
              Biodiesel Produced
            </th>
            <th className="border-r border-[#e2e8f0] px-4 py-3 text-center" colSpan={1}>
              Conversion Factor
            </th>
            <th className="px-4 py-3 text-center" colSpan={1}>
              &nbsp;
            </th>
          </tr>
          <tr className="bg-[#f8fafc] text-left text-xs uppercase tracking-wide text-[#64748b]">
            <th className="px-4 py-3">Feedstock</th>
            <th className="px-4 py-3">Certification</th>
            <th className="border-r border-[#e2e8f0] px-4 py-3">Amount (MT)</th>
            <th className="border-r border-[#e2e8f0] px-4 py-3">Amount (gal)</th>
            <th className="border-r border-[#e2e8f0] px-4 py-3">Factor</th>
            <th className="px-4 py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {allocationRows.map((row) => {
            const producedAmount = row.allocationAmount * row.conversionFactor;
            const isAllocated = allocatedRowIds.has(row.id);
            return (
              <tr
                key={row.id}
                className={`border-t border-[#f1f5f9] text-[#334155] ${
                  isAllocated ? "bg-[#ecfdf5]" : "bg-white"
                }`}
              >
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      feedstockTypeClasses[row.feedstock] ?? "bg-[#e2e8f0] text-[#334155]"
                    }`}
                  >
                    {row.feedstock}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={row.certification}
                    onChange={(e) => onChangeRow(row.id, { certification: e.target.value })}
                    disabled={isAllocated}
                    className="w-full rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none focus:border-[#0f8f6f]"
                  >
                    {(eligibleCertificationsByFeedstock[
                      row.feedstock as keyof typeof eligibleCertificationsByFeedstock
                    ] ?? certificationOptions).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border-r border-[#f1f5f9] px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={row.allocationAmount}
                    onChange={(e) =>
                      onChangeRow(row.id, { allocationAmount: Number.parseFloat(e.target.value) || 0 })
                    }
                    disabled={isAllocated}
                    className="w-full rounded-md border border-[#cbd5e1] px-3 py-2 text-right text-sm outline-none focus:border-[#0f8f6f]"
                  />
                </td>
                <td className="border-r border-[#f1f5f9] px-4 py-3 text-right font-semibold tabular-nums">
                  {producedAmount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="border-r border-[#f1f5f9] px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={row.conversionFactor}
                    onChange={(e) =>
                      onChangeRow(row.id, { conversionFactor: Number.parseFloat(e.target.value) || 0 })
                    }
                    disabled={isAllocated}
                    className="w-full rounded-md border border-[#cbd5e1] px-3 py-2 text-right text-sm outline-none focus:border-[#0f8f6f]"
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onToggleAllocateRow(row.id)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      isAllocated
                        ? "border border-[#b91c1c] text-[#b91c1c] hover:bg-[#fef2f2]"
                        : "border border-[#0f8f6f] text-[#0f8f6f] hover:bg-[#e8f5f1]"
                    }`}
                  >
                    {isAllocated ? "Unallocate" : "Allocate"}
                  </button>
                </td>
              </tr>
            );
          })}
          <tr className="border-t-2 border-[#cbd5e1] bg-[#f8fafc] text-[#0f172a]">
            <td className="border-r border-[#e2e8f0] px-4 py-3 text-sm font-semibold" colSpan={3}>
              Total
            </td>
            <td className="border-r border-[#e2e8f0] px-4 py-3 text-right text-sm font-semibold tabular-nums">
              {totalProducedAmount.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </td>
            <td className="border-r border-[#e2e8f0] px-4 py-3"></td>
            <td className="px-4 py-3 text-xs font-medium text-[#64748b]">gal</td>
          </tr>
        </tbody>
      </table>
      {isSaveSuccess && (
        <div className="border-t border-[#f1f5f9] bg-[#ecfdf5] px-4 py-2 text-xs font-medium text-[#166534]">
          Allocation changes saved (demo mock).
        </div>
      )}
    </div>
  );
}

function BiodieselSalesSection({
  previousBiodieselInventory,
  allocatedBiodieselAdded,
  updatedBiodieselInventory,
  previousInventoryBreakdown,
  updatedInventoryBreakdown,
  allocatedFeedstocks,
  allocatedCertificationByFeedstock,
}: {
  previousBiodieselInventory: number;
  allocatedBiodieselAdded: number;
  updatedBiodieselInventory: number;
  previousInventoryBreakdown: FeedstockGallons[];
  updatedInventoryBreakdown: FeedstockGallons[];
  allocatedFeedstocks: Set<string>;
  allocatedCertificationByFeedstock: Record<string, string>;
}) {
  const previousMap = Object.fromEntries(
    previousInventoryBreakdown.map((row) => [row.feedstock, row.gallons]),
  ) as Record<string, number>;
  const updatedMap = Object.fromEntries(
    updatedInventoryBreakdown.map((row) => [row.feedstock, row.gallons]),
  ) as Record<string, number>;

  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-[#e2e8f0] bg-white">
      <table className="w-full min-w-[880px] border-collapse text-sm">
        <thead>
          <tr className="bg-[#f8fafc] text-left text-xs uppercase tracking-wide text-[#64748b]">
            <th className="px-4 py-3">
              Previous Biodiesel Inventory
            </th>
            <th className="px-4 py-3">
              Allocated Biodiesel Added
            </th>
            <th className="px-4 py-3">
              Updated Biodiesel Inventory
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-[#f1f5f9] bg-white text-[#334155]">
            <td className="px-4 py-3 font-semibold tabular-nums">
              {previousBiodieselInventory.toLocaleString("en-US")} gal
            </td>
            <td className="px-4 py-3 font-semibold tabular-nums">{allocatedBiodieselAdded.toLocaleString("en-US")} gal</td>
            <td className="px-4 py-3 font-semibold tabular-nums">{updatedBiodieselInventory.toLocaleString("en-US")} gal</td>
          </tr>
        </tbody>
      </table>

      <div className="border-t border-[#f1f5f9] p-4">
        <h4 className="text-sm font-semibold text-[#0f172a]">Feedstock Breakdown (gal)</h4>
        <table className="mt-3 w-full min-w-[880px] border-collapse text-sm">
          <thead>
            <tr className="bg-[#f8fafc] text-left text-xs uppercase tracking-wide text-[#64748b]">
              <th className="px-4 py-3">Feedstock</th>
              <th className="px-4 py-3">Allowed Certifications</th>
              <th className="px-4 py-3">Previous Inventory</th>
              <th className="px-4 py-3">Added From Allocation</th>
              <th className="px-4 py-3">Updated Inventory</th>
            </tr>
          </thead>
          <tbody>
            {updatedInventoryBreakdown.map((row, idx) => (
              <tr
                key={`biodiesel-breakdown-${row.feedstock}`}
                className={`border-t border-[#f1f5f9] ${
                  allocatedFeedstocks.has(row.feedstock)
                    ? "bg-[#ecfdf5]"
                    : idx % 2 === 0
                      ? "bg-white"
                      : "bg-[#fcfdff]"
                }`}
              >
                <td className="px-4 py-3 font-medium text-[#334155]">{row.feedstock}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(eligibleCertificationsByFeedstock[
                      row.feedstock as keyof typeof eligibleCertificationsByFeedstock
                    ] ?? []).map((certification) => (
                      <span
                        key={`${row.feedstock}-${certification}`}
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          certificationClasses[certification] ?? "bg-[#e2e8f0] text-[#334155]"
                        }`}
                      >
                        {certification}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums text-[#334155]">
                  {(previousMap[row.feedstock] ?? 0).toLocaleString("en-US")} gal
                </td>
                <td className="px-4 py-3 tabular-nums text-[#334155]">
                  <div className="flex items-center gap-2">
                    <span>
                      {((updatedMap[row.feedstock] ?? 0) - (previousMap[row.feedstock] ?? 0)).toLocaleString(
                        "en-US",
                      )}{" "}
                      gal
                    </span>
                    {allocatedFeedstocks.has(row.feedstock) && allocatedCertificationByFeedstock[row.feedstock] && (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          certificationClasses[allocatedCertificationByFeedstock[row.feedstock]] ??
                          "bg-[#e2e8f0] text-[#334155]"
                        }`}
                      >
                        {allocatedCertificationByFeedstock[row.feedstock]}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums font-semibold text-[#0f172a]">
                  {row.gallons.toLocaleString("en-US")} gal
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


    </div>
  );
}

function LedgerSection({
  ledgerTotalDocuments,
  ledgerIncomingQuantityMt,
  ledgerIncomingByFeedstock,
  setLedgerDateRange,
  ledgerCurrentPage,
  ledgerTotalPages,
  onLedgerPageChange,
  ledgerSearch,
  setLedgerSearch,
  documentTypeFilter,
  setDocumentTypeFilter,
  feedstockTypeFilter,
  setFeedstockTypeFilter,
  sortOrder,
  setSortOrder,
  documentTypeOptions,
  feedstockTypeOptions,
  visibleLedgerDocuments,
  filteredLedgerDocuments,
}: {
  ledgerTotalDocuments: number;
  ledgerIncomingQuantityMt: number;
  ledgerIncomingByFeedstock: Record<string, number>;
  setLedgerDateRange: (range: DateTimeRange) => void;
  ledgerCurrentPage: number;
  ledgerTotalPages: number;
  onLedgerPageChange: (page: number) => void;
  ledgerSearch: string;
  setLedgerSearch: (value: string) => void;
  documentTypeFilter: string;
  setDocumentTypeFilter: (value: string) => void;
  feedstockTypeFilter: string;
  setFeedstockTypeFilter: (value: string) => void;
  sortOrder: "latest" | "oldest";
  setSortOrder: (value: "latest" | "oldest") => void;
  documentTypeOptions: string[];
  feedstockTypeOptions: string[];
  visibleLedgerDocuments: LedgerDocument[];
  filteredLedgerDocuments: LedgerDocument[];
}) {
  const visibleFeedstockTotalMt = filteredLedgerDocuments.reduce((sum, doc) => sum + doc.feedstockReceivedMt, 0);
  const ledgerFeedstockTileOrder = [
    "UCO",
    "Soybean",
    "Cellulosic Waste",
    "Circular Naphtha and Synthetic Oil",
    "Waste Oil and Waste Fat",
  ] as const;
  const ledgerFeedstockBreakdown = ledgerFeedstockTileOrder.map((feedstock) => {
    const value = ledgerIncomingByFeedstock[feedstock] ?? 0;
    const share = ledgerIncomingQuantityMt > 0 ? (value / ledgerIncomingQuantityMt) * 100 : 0;
    return { feedstock, value, share };
  });

  return (
    <>
      <div className="mt-6 rounded-lg border border-[#e2e8f0] bg-white p-4">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-semibold text-[#111827]">Date Range</p>
            <p className="text-xs text-[#64748b]">Select previous month or choose a custom date range.</p>
          </div>
          <DateTimeSelector onChange={setLedgerDateRange} />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-7">
        <div className="rounded-lg border border-[#e5e7eb] bg-white p-4 lg:col-span-1">
          <p className="text-sm font-medium text-[#6b7280]">Total Documents</p>
          <p className="mt-2 text-3xl font-semibold text-[#111827]">{ledgerTotalDocuments.toLocaleString("en-US")}</p>
          <p className="mt-1 text-xs text-[#94a3b8]">All ledger documents</p>
        </div>
        <div className="lg:col-span-6 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-lg border border-[#e5e7eb] bg-white p-3">
              <p className="truncate text-xs font-semibold text-[#334155]">Incoming Quantity</p>
              <p className="mt-1 text-sm font-semibold text-[#0f172a]">
                {ledgerIncomingQuantityMt.toLocaleString("en-US", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}{" "}
                MT
              </p>
              <p className="text-xs text-[#64748b]">{ledgerIncomingQuantityMt > 0 ? "100.0%" : "0.0%"}</p>
            </div>
            {ledgerFeedstockBreakdown.map(({ feedstock, value, share }) => (
              <div
                key={feedstock}
                className={`rounded-lg border border-[#e2e8f0] p-3 ${
                  feedstockTypeClasses[feedstock] ?? "bg-[#f8fafc] text-[#334155]"
                }`}
              >
                <p className="truncate text-xs font-semibold">{feedstock}</p>
                <p className="mt-1 text-sm font-semibold">
                  {value.toLocaleString("en-US", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}{" "}
                  MT
                </p>
                <p className="text-xs opacity-80">{share.toFixed(1)}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 overflow-x-auto rounded-lg border border-[#e2e8f0] bg-white">
      <div className="grid gap-3 border-b border-[#f1f5f9] p-4 md:grid-cols-2 xl:grid-cols-5">
        <input
          type="text"
          value={ledgerSearch}
          onChange={(e) => setLedgerSearch(e.target.value)}
          placeholder="Search documents..."
          className="rounded-md border border-[#cbd5e1] px-3 py-2 text-sm text-[#334155] outline-none transition focus:border-[#0f8f6f]"
        />
        <select
          value={documentTypeFilter}
          onChange={(e) => setDocumentTypeFilter(e.target.value)}
          className="rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm text-[#334155] outline-none transition focus:border-[#0f8f6f]"
        >
          {documentTypeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          value={feedstockTypeFilter}
          onChange={(e) => setFeedstockTypeFilter(e.target.value)}
          className="rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm text-[#334155] outline-none transition focus:border-[#0f8f6f]"
        >
          {feedstockTypeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as "latest" | "oldest")}
          className="rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm text-[#334155] outline-none transition focus:border-[#0f8f6f]"
        >
          <option value="latest">Sort: Latest first</option>
          <option value="oldest">Sort: Oldest first</option>
        </select>
        <button
          onClick={() => {
            setLedgerSearch("");
            setDocumentTypeFilter("All");
            setFeedstockTypeFilter("All");
            setSortOrder("latest");
          }}
          className="rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-medium text-[#334155] transition hover:bg-[#f8fafc]"
        >
          Clear Filters
        </button>
      </div>
      <table className="w-full min-w-[820px] border-collapse text-sm">
        <thead>
          <tr className="bg-[#f8fafc] text-left text-xs uppercase tracking-wide text-[#64748b]">
            <th className="px-4 py-3">Document Name</th>
            <th className="px-4 py-3">Document Type</th>
            <th className="px-4 py-3">Feedstock Type</th>
            <th className="px-4 py-3">Feedstock Received (MT)</th>
            <th className="px-4 py-3">Received Date & Time</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {visibleLedgerDocuments.length > 0 ? (
            <>
              {visibleLedgerDocuments.map((doc, idx) => (
                <tr
                  key={`${doc.documentName}-${doc.receivedAtIso}`}
                  className={`border-t border-[#f1f5f9] text-[#334155] ${idx % 2 === 0 ? "bg-white" : "bg-[#fcfdff]"}`}
                >
                  <td className="px-4 py-3">{doc.documentName}</td>
                  <td className="px-4 py-3">{doc.documentType}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        feedstockTypeClasses[doc.feedstockType] ?? "bg-[#e2e8f0] text-[#334155]"
                      }`}
                    >
                      {doc.feedstockType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">{doc.feedstockReceivedMt}</td>
                  <td className="px-4 py-3">
                    {new Date(doc.receivedAtIso).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        statusClasses[doc.status] ?? "bg-[#e2e8f0] text-[#334155]"
                      }`}
                    >
                      {doc.status}
                    </span>
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-[#cbd5e1] bg-[#f8fafc] text-[#0f172a]">
                <td className="px-4 py-3 text-sm font-semibold" colSpan={3}>
                  Total
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums">
                  {visibleFeedstockTotalMt.toLocaleString("en-US", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                </td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3"></td>
              </tr>
            </>
          ) : (
            <tr className="border-t border-[#f1f5f9] text-[#64748b]">
              <td className="px-4 py-8 text-center text-sm" colSpan={6}>
                No documents match your current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-[#f1f5f9] p-3">
        <p className="text-xs text-[#64748b]">
          Showing{" "}
          {filteredLedgerDocuments.length === 0 ? 0 : (ledgerCurrentPage - 1) * 20 + 1}
          -
          {Math.min(ledgerCurrentPage * 20, filteredLedgerDocuments.length)} of {filteredLedgerDocuments.length} matching
          documents
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onLedgerPageChange(Math.max(1, ledgerCurrentPage - 1))}
            disabled={ledgerCurrentPage === 1}
            className="rounded-md border border-[#cbd5e1] px-3 py-1.5 text-xs font-medium text-[#334155] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-xs font-medium text-[#475569]">
            Page {ledgerCurrentPage} of {ledgerTotalPages}
          </span>
          <button
            onClick={() => onLedgerPageChange(Math.min(ledgerTotalPages, ledgerCurrentPage + 1))}
            disabled={ledgerCurrentPage === ledgerTotalPages}
            className="rounded-md border border-[#cbd5e1] px-3 py-1.5 text-xs font-medium text-[#334155] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
      </div>
    </>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [documentTypeFilter, setDocumentTypeFilter] = useState("All");
  const [feedstockTypeFilter, setFeedstockTypeFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest");
  const [ledgerCurrentPage, setLedgerCurrentPage] = useState(1);
  const ledgerPageSize = 20;
  const [ledgerDateRange, setLedgerDateRange] = useState<DateTimeRange>({
    start: null,
    end: null,
    timezone: "America/New_York",
  });
  const inventoryDefaultEnd = DateTime.now().setZone("America/New_York").startOf("day");
  const inventoryDefaultStart = inventoryDefaultEnd.minus({ days: 1 });
  const [inventoryDateRange, setInventoryDateRange] = useState<DateTimeRange>({
    start: inventoryDefaultStart,
    end: inventoryDefaultEnd,
    timezone: "America/New_York",
  });
  const defaultLedgerDocuments: LedgerDocument[] = [
    {
      documentName: "GRN-UCO-0210.pdf",
      documentType: "Goods Receipt Note",
      feedstockType: "UCO",
      feedstockReceivedMt: 18.5,
      receivedAtIso: "2015-02-17T18:45:00",
      status: "Received",
    },
    {
      documentName: "SDN-WAF-0211.pdf",
      documentType: "Supplier Delivery Note",
      feedstockType: "Soybean",
      feedstockReceivedMt: 24.2,
      receivedAtIso: "2015-02-17T17:30:00",
      status: "Received",
    },
    {
      documentName: "WBS-DFA-0212.pdf",
      documentType: "Weighbridge Slip",
      feedstockType: "Waste Oil and Waste Fat",
      feedstockReceivedMt: 12.8,
      receivedAtIso: "2015-02-17T16:20:00",
      status: "Received",
    },
    {
      documentName: "QIR-CEL-0214.pdf",
      documentType: "Quality Inspection Report",
      feedstockType: "Cellulosic Waste",
      feedstockReceivedMt: 31.4,
      receivedAtIso: "2015-02-17T15:05:00",
      status: "Received",
    },
    {
      documentName: "IST-CIR-0215.pdf",
      documentType: "Inbound Stock Transfer",
      feedstockType: "Circular Naphtha and Synthetic Oil",
      feedstockReceivedMt: 16.9,
      receivedAtIso: "2015-02-17T13:50:00",
      status: "Received",
    },
    {
      documentName: "GRN-UCO-0206.pdf",
      documentType: "Goods Receipt Note",
      feedstockType: "UCO",
      feedstockReceivedMt: 22.4,
      receivedAtIso: "2015-02-16T18:10:00",
      status: "Received",
    },
    {
      documentName: "SDN-CIR-0207.pdf",
      documentType: "Supplier Delivery Note",
      feedstockType: "Circular Naphtha and Synthetic Oil",
      feedstockReceivedMt: 19.6,
      receivedAtIso: "2015-02-16T11:40:00",
      status: "Received",
    },
    {
      documentName: "WBS-CEL-0208.pdf",
      documentType: "Weighbridge Slip",
      feedstockType: "Cellulosic Waste",
      feedstockReceivedMt: 14.3,
      receivedAtIso: "2015-02-15T17:25:00",
      status: "Received",
    },
    {
      documentName: "QIR-UCO-0209.pdf",
      documentType: "Quality Inspection Report",
      feedstockType: "Soybean",
      feedstockReceivedMt: 27.1,
      receivedAtIso: "2015-02-15T10:05:00",
      status: "Received",
    },
    {
      documentName: "IST-CIR-0204.pdf",
      documentType: "Inbound Stock Transfer",
      feedstockType: "Circular Naphtha and Synthetic Oil",
      feedstockReceivedMt: 11.9,
      receivedAtIso: "2015-02-14T15:35:00",
      status: "Received",
    },
    {
      documentName: "GRN-DFA-0205.pdf",
      documentType: "Goods Receipt Note",
      feedstockType: "Waste Oil and Waste Fat",
      feedstockReceivedMt: 20.2,
      receivedAtIso: "2015-02-14T09:20:00",
      status: "Received",
    },
  ];
  const useJanuary2026MockDataset = isFullJanuary2026Range(ledgerDateRange);
  const useLast24HoursLedgerDataset = isLast24HoursWindow(ledgerDateRange);
  const activeLedgerDocuments = useJanuary2026MockDataset
    ? january2026LedgerDocuments
    : useLast24HoursLedgerDataset
      ? defaultLedgerDocuments
      : defaultLedgerDocuments;
  const documentTypeOptions = ["All", ...new Set(activeLedgerDocuments.map((doc) => doc.documentType))];
  const feedstockTypeOptions = ["All", ...new Set(activeLedgerDocuments.map((doc) => doc.feedstockType))];
  const sortedLedgerDocuments = [...activeLedgerDocuments].sort((a, b) =>
    sortOrder === "latest"
      ? b.receivedAtIso.localeCompare(a.receivedAtIso)
      : a.receivedAtIso.localeCompare(b.receivedAtIso),
  );
  const filteredLedgerDocuments = sortedLedgerDocuments.filter((doc) => {
    const matchesSearch =
      doc.documentName.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      doc.documentType.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      doc.feedstockType.toLowerCase().includes(ledgerSearch.toLowerCase());
    const matchesDocumentType =
      documentTypeFilter === "All" || doc.documentType === documentTypeFilter;
    const matchesFeedstockType =
      feedstockTypeFilter === "All" || doc.feedstockType === feedstockTypeFilter;
    return matchesSearch && matchesDocumentType && matchesFeedstockType;
  });
  const ledgerTotalPages = Math.max(1, Math.ceil(filteredLedgerDocuments.length / ledgerPageSize));
  const safeLedgerCurrentPage = Math.min(ledgerCurrentPage, ledgerTotalPages);
  const visibleLedgerDocuments = filteredLedgerDocuments.slice(
    (safeLedgerCurrentPage - 1) * ledgerPageSize,
    safeLedgerCurrentPage * ledgerPageSize,
  );
  useEffect(() => {
    setLedgerCurrentPage(1);
  }, [ledgerSearch, documentTypeFilter, feedstockTypeFilter, sortOrder, useJanuary2026MockDataset]);
  useEffect(() => {
    if (ledgerCurrentPage > ledgerTotalPages) {
      setLedgerCurrentPage(ledgerTotalPages);
    }
  }, [ledgerCurrentPage, ledgerTotalPages]);
  const totalDocuments = activeLedgerDocuments.length;
  const ledgerIncomingQuantityMt = activeLedgerDocuments.reduce((sum, doc) => sum + doc.feedstockReceivedMt, 0);
  const dashboardIncomingQuantityMt = defaultLedgerDocuments.reduce((sum, doc) => sum + doc.feedstockReceivedMt, 0);
  const inventoryRows = [
    {
      date: "Feb 16, 2026",
      inventoryFeedstock: "UCO",
      inventoryCertification: "LCFS, ISCC",
      inventoryAmount: "320 MT",
      incomingFeedstock: "UCO",
      incomingCertification: "LCFS, ISCC",
      incomingAmount: "42 MT",
      totalInventoryAmount: "362 MT",
    },
    {
      date: "Feb 16, 2026",
      inventoryFeedstock: "Soybean",
      inventoryCertification: "RFS",
      inventoryAmount: "210 MT",
      incomingFeedstock: "Soybean",
      incomingCertification: "RFS, ISCC",
      incomingAmount: "28 MT",
      totalInventoryAmount: "238 MT",
    },
    {
      date: "Feb 15, 2026",
      inventoryFeedstock: "Cellulosic Waste",
      inventoryCertification: "RFS, ISCC",
      inventoryAmount: "145 MT",
      incomingFeedstock: "Cellulosic Waste",
      incomingCertification: "RFS",
      incomingAmount: "19 MT",
      totalInventoryAmount: "164 MT",
    },
    {
      date: "Feb 14, 2026",
      inventoryFeedstock: "Circular Naphtha and Synthetic Oil",
      inventoryCertification: "ISCC",
      inventoryAmount: "98 MT",
      incomingFeedstock: "Circular Naphtha and Synthetic Oil",
      incomingCertification: "ISCC, LCFS",
      incomingAmount: "12 MT",
      totalInventoryAmount: "110 MT",
    },
    {
      date: "Feb 14, 2026",
      inventoryFeedstock: "Waste Oil and Waste Fat",
      inventoryCertification: "LCFS, ISCC",
      inventoryAmount: "175 MT",
      incomingFeedstock: "Waste Oil and Waste Fat",
      incomingCertification: "LCFS, ISCC",
      incomingAmount: "15 MT",
      totalInventoryAmount: "190 MT",
    },
  ];
  const incomingFromLedgerFeedstocks = new Set([
    "UCO",
    "Soybean",
    "Cellulosic Waste",
    "Circular Naphtha and Synthetic Oil",
    "Waste Oil and Waste Fat",
  ]);
  const defaultLedgerIncomingByFeedstock = defaultLedgerDocuments.reduce<Record<string, number>>((acc, doc) => {
    if (!incomingFromLedgerFeedstocks.has(doc.feedstockType)) {
      return acc;
    }
    acc[doc.feedstockType] = (acc[doc.feedstockType] ?? 0) + doc.feedstockReceivedMt;
    return acc;
  }, {});
  const activeLedgerIncomingByFeedstock = activeLedgerDocuments.reduce<Record<string, number>>((acc, doc) => {
    if (!incomingFromLedgerFeedstocks.has(doc.feedstockType)) {
      return acc;
    }
    acc[doc.feedstockType] = (acc[doc.feedstockType] ?? 0) + doc.feedstockReceivedMt;
    return acc;
  }, {});
  const inventoryUseJanuaryMockDataset = isFullJanuary2026Range(inventoryDateRange);
  const inventoryUseLast24HoursDefaultSet = isLast24HoursWindow(inventoryDateRange);
  const inventoryRangeStart = (inventoryDateRange.start ?? DateTime.now())
    .setZone(inventoryDateRange.timezone)
    .startOf("day");
  const inventoryRangeEnd = (inventoryDateRange.end ?? DateTime.now())
    .setZone(inventoryDateRange.timezone)
    .endOf("day");
  const inventoryOpeningAsOf = inventoryRangeStart.minus({ days: 1 }).endOf("day");
  const inventorySourceDocs = inventoryUseJanuaryMockDataset
    ? january2026LedgerDocuments
    : inventoryUseLast24HoursDefaultSet
      ? defaultLedgerDocuments
      : [...defaultLedgerDocuments, ...january2026LedgerDocuments];
  const mockOpeningInventoryByFeedstock: Record<string, number> = {
    UCO: 2650,
    Soybean: 2310,
    "Cellulosic Waste": 1890,
    "Circular Naphtha and Synthetic Oil": 2140,
    "Waste Oil and Waste Fat": 2480,
  };
  const inventoryBaseByFeedstock = inventoryRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.inventoryFeedstock] = parseMtValue(row.inventoryAmount);
    return acc;
  }, {});
  const inventoryOpeningByFeedstock = inventorySourceDocs.reduce<Record<string, number>>(
    (acc, doc) => {
      if (!incomingFromLedgerFeedstocks.has(doc.feedstockType)) {
        return acc;
      }
      const docDate = DateTime.fromISO(doc.receivedAtIso, { zone: inventoryDateRange.timezone });
      if (docDate <= inventoryOpeningAsOf) {
        acc[doc.feedstockType] = (acc[doc.feedstockType] ?? 0) + doc.feedstockReceivedMt;
      }
      return acc;
    },
    inventoryUseJanuaryMockDataset ? { ...mockOpeningInventoryByFeedstock } : { ...inventoryBaseByFeedstock },
  );
  const inventoryIncomingByFeedstock = inventorySourceDocs.reduce<
    Record<string, number>
  >((acc, doc) => {
    if (!incomingFromLedgerFeedstocks.has(doc.feedstockType)) {
      return acc;
    }
    if (inventoryUseLast24HoursDefaultSet) {
      acc[doc.feedstockType] = (acc[doc.feedstockType] ?? 0) + doc.feedstockReceivedMt;
      return acc;
    }
    const docDate = DateTime.fromISO(doc.receivedAtIso, { zone: inventoryDateRange.timezone });
    if (docDate < inventoryRangeStart || docDate > inventoryRangeEnd) {
      return acc;
    }
    acc[doc.feedstockType] = (acc[doc.feedstockType] ?? 0) + doc.feedstockReceivedMt;
    return acc;
  }, {});
  const syncedInventoryRows = inventoryRows.map((row) => {
    if (!incomingFromLedgerFeedstocks.has(row.inventoryFeedstock)) {
      return row;
    }
    const inventoryAmount = parseMtValue(row.inventoryAmount);
    const incomingAmount = defaultLedgerIncomingByFeedstock[row.inventoryFeedstock] ?? parseMtValue(row.incomingAmount);
    const totalInventoryAmount = inventoryAmount + incomingAmount;
    return {
      ...row,
      incomingAmount: `${incomingAmount.toFixed(1)} MT`,
      totalInventoryAmount: `${totalInventoryAmount.toFixed(1)} MT`,
    };
  });
  const inventoryRangeRows = inventoryRows.map((row) => {
    if (!incomingFromLedgerFeedstocks.has(row.inventoryFeedstock)) {
      return row;
    }
    const inventoryAmount = inventoryOpeningByFeedstock[row.inventoryFeedstock] ?? parseMtValue(row.inventoryAmount);
    const incomingAmount = inventoryIncomingByFeedstock[row.inventoryFeedstock] ?? 0;
    const totalInventoryAmount = inventoryAmount + incomingAmount;
    return {
      ...row,
      inventoryAmount: `${inventoryAmount.toFixed(1)} MT`,
      incomingAmount: `${incomingAmount.toFixed(1)} MT`,
      totalInventoryAmount: `${totalInventoryAmount.toFixed(1)} MT`,
    };
  });
  const currentInventoryMt = syncedInventoryRows.reduce((sum, row) => sum + parseMtValue(row.totalInventoryAmount), 0);
  const totalInventoryByFeedstock = syncedInventoryRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.inventoryFeedstock] = parseMtValue(row.totalInventoryAmount);
    return acc;
  }, {});
  const [allocationRows, setAllocationRows] = useState<AllocationRow[]>(() =>
    fixedAllocationFeedstocks.map((feedstock, idx) => {
      const eligibleCertifications = eligibleCertificationsByFeedstock[feedstock];
      return {
        id: `alloc-${idx + 1}`,
        feedstock,
        certification: eligibleCertifications[0] || certificationOptions[0],
        allocationAmount: totalInventoryByFeedstock[feedstock] ?? 0,
        conversionFactor: idx === 0 ? 0.8 : 0.75,
      };
    }),
  );
  const [allocatedRowIds, setAllocatedRowIds] = useState<Set<string>>(new Set());
  const [isSaveSuccess, setIsSaveSuccess] = useState(false);
  const previousInventoryBreakdown: FeedstockGallons[] = [
    { feedstock: "UCO", gallons: 5000 },
    { feedstock: "Soybean", gallons: 3500 },
    { feedstock: "Cellulosic Waste", gallons: 3000 },
    { feedstock: "Circular Naphtha and Synthetic Oil", gallons: 3500 },
  ];

  const inventoryMixRows = syncedInventoryRows.map((row) => ({
    feedstock: row.inventoryFeedstock,
    amount: parseMtValue(row.totalInventoryAmount),
  }));
  const previousBiodieselInventory = 15000;
  const allocatedProducedByFeedstock = allocationRows.reduce<Record<string, number>>((acc, row) => {
    if (!allocatedRowIds.has(row.id)) {
      return acc;
    }
    const produced = row.allocationAmount * row.conversionFactor;
    acc[row.feedstock] = (acc[row.feedstock] ?? 0) + produced;
    return acc;
  }, {});
  const allocatedBiodieselAdded = Math.round(
    Object.values(allocatedProducedByFeedstock).reduce((sum, value) => sum + value, 0),
  );
  const previousBreakdownMap = previousInventoryBreakdown.reduce<Record<string, number>>((acc, row) => {
    acc[row.feedstock] = row.gallons;
    return acc;
  }, {});
  const allocationFeedstockById = allocationRows.reduce<Record<string, string>>((acc, row) => {
    acc[row.id] = row.feedstock;
    return acc;
  }, {});
  const allocatedFeedstocks = new Set(
    [...allocatedRowIds]
      .map((id) => allocationFeedstockById[id])
      .filter((feedstock): feedstock is string => Boolean(feedstock)),
  );
  const allocatedCertificationByFeedstock = allocationRows.reduce<Record<string, string>>((acc, row) => {
    if (!allocatedRowIds.has(row.id)) {
      return acc;
    }
    acc[row.feedstock] = row.certification;
    return acc;
  }, {});
  const updatedInventoryBreakdown: FeedstockGallons[] = fixedAllocationFeedstocks.map((feedstock) => ({
    feedstock,
    gallons: Math.round((previousBreakdownMap[feedstock] ?? 0) + (allocatedProducedByFeedstock[feedstock] ?? 0)),
  }));
  const updatedBiodieselInventory = Math.round(previousBiodieselInventory + allocatedBiodieselAdded);
  const now = new Date();
  const statsWindowEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const statsWindowStart = new Date(statsWindowEnd);
  statsWindowStart.setUTCDate(statsWindowStart.getUTCDate() - 1);
  const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
  const statsWindowLabel = `${dateTimeFormatter.format(statsWindowStart)} - ${dateTimeFormatter.format(statsWindowEnd)}`;
  const statsWindowAsOfLabel = dateTimeFormatter.format(statsWindowEnd);
  const biodieselSalesMock = 12500;
  const summaryCards = [
    {
      label: "Incoming Quantity",
      value: `${dashboardIncomingQuantityMt.toLocaleString("en-US", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })} MT`,
      note: "Summed from ledger receipts",
    },
    {
      label: "Current Inventory",
      value: `${currentInventoryMt.toLocaleString("en-US", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })} MT`,
      note: "Total Feedstock Inventory",
    },
    {
      label: "Newly Allocated Biodiesel",
      value: `${allocatedBiodieselAdded.toLocaleString("en-US")} gal`,
      note: "From newly incoming feedstock",
    },
    {
      label: "Biodiesel Inventory",
      value: `${updatedBiodieselInventory.toLocaleString("en-US")} gal`,
      note: `As on ${statsWindowAsOfLabel}`,
    },
    {
      label: "Biodiesel Sales",
      value: `${biodieselSalesMock.toLocaleString("en-US")} gal`,
      note: "",
    },
  ];

  const renderCertificationBadges = (value: string) =>
    value.split(", ").map((program) => (
      <span
        key={program}
        className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
          certificationClasses[program] ?? "bg-[#e2e8f0] text-[#334155]"
        }`}
      >
        {program}
      </span>
    ));

  const handleAllocationRowChange = (id: string, patch: Partial<AllocationRow>) => {
    setIsSaveSuccess(false);
    setAllocationRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const handleToggleAllocateRow = (id: string) => {
    setAllocatedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setIsSaveSuccess(false);
  };

  const handleSaveAllocations = () => {
    setIsSaveSuccess(true);
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#1f2937]">
      <div className="flex min-h-screen w-full">
        <aside className="flex w-[260px] flex-col border-r border-[#e5e7eb] bg-white">
          <div className="border-b border-[#eef1f4] px-6 py-5">
            <Image src="/rimba-logo.png" alt="Rimba logo" width={260} height={76} />
          </div>
          <nav className="flex-1 space-y-2 px-4 py-6">
            {tabs.map((tab: Tab) => (
              <button
                key={`sidebar-${tab}`}
                onClick={() => setActiveTab(tab)}
                className={`w-full rounded-md px-4 py-2 text-left text-sm font-medium transition ${
                  activeTab === tab
                    ? "bg-[#e8f5f1] font-semibold text-[#0f8f6f]"
                    : "text-[#6b7280] hover:bg-[#f3f4f6]"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
          <div className="px-6 py-4 text-xs text-[#9ca3af]">Version 1.0.0</div>
        </aside>

        <main className="flex-1 px-4 py-6 md:px-5 lg:px-6">
          <div className="mb-8 flex items-center justify-between">
            <div className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-sm text-[#4b5563]">
              All Facilities
            </div>
            <div className="text-sm font-semibold text-[#6b7280]">
               <span className="text-[#111827]">Mass Balance and Inventory Management</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0f8f6f] text-sm font-semibold text-white">
                S
              </div>
              <div>
                <p className="text-sm font-semibold">Shiv Dixit</p>
                <p className="text-xs font-semibold text-[#111827]">Kolmar Americas</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
            <TabsNav tabsList={tabs} activeTab={activeTab} onTabClick={setActiveTab} />

            <div className="mt-6 rounded-lg border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-8">
              {activeTab === "Dashboard" && (
                <DashboardSection
                  summaryCards={summaryCards}
                  inventoryMixRows={inventoryMixRows}
                  statsWindowLabel={statsWindowLabel}
                />
              )}
              {activeTab === "Inventory" && (
                <InventorySection
                  inventoryRows={inventoryRangeRows}
                  renderCertificationBadges={renderCertificationBadges}
                  inventoryDateRange={inventoryDateRange}
                  setInventoryDateRange={setInventoryDateRange}
                />
              )}
              {activeTab === "Feedstock Allocation" && (
                <FeedstockAllocationSection
                  allocationRows={allocationRows}
                  onToggleAllocateRow={handleToggleAllocateRow}
                  onChangeRow={handleAllocationRowChange}
                  onSaveAll={handleSaveAllocations}
                  allocatedRowIds={allocatedRowIds}
                  isSaveSuccess={isSaveSuccess}
                />
              )}
              {activeTab === "Ledger" && (
                <LedgerSection
                  ledgerTotalDocuments={totalDocuments}
                  ledgerIncomingQuantityMt={ledgerIncomingQuantityMt}
                  ledgerIncomingByFeedstock={activeLedgerIncomingByFeedstock}
                  setLedgerDateRange={setLedgerDateRange}
                  ledgerCurrentPage={safeLedgerCurrentPage}
                  ledgerTotalPages={ledgerTotalPages}
                  onLedgerPageChange={setLedgerCurrentPage}
                  ledgerSearch={ledgerSearch}
                  setLedgerSearch={setLedgerSearch}
                  documentTypeFilter={documentTypeFilter}
                  setDocumentTypeFilter={setDocumentTypeFilter}
                  feedstockTypeFilter={feedstockTypeFilter}
                  setFeedstockTypeFilter={setFeedstockTypeFilter}
                  sortOrder={sortOrder}
                  setSortOrder={setSortOrder}
                  documentTypeOptions={documentTypeOptions}
                  feedstockTypeOptions={feedstockTypeOptions}
                  visibleLedgerDocuments={visibleLedgerDocuments}
                  filteredLedgerDocuments={filteredLedgerDocuments}
                />
              )}
              {activeTab === "Biodiesel Sales" && (
                <BiodieselSalesSection
                  previousBiodieselInventory={previousBiodieselInventory}
                  allocatedBiodieselAdded={allocatedBiodieselAdded}
                  updatedBiodieselInventory={updatedBiodieselInventory}
                  previousInventoryBreakdown={previousInventoryBreakdown}
                  updatedInventoryBreakdown={updatedInventoryBreakdown}
                  allocatedFeedstocks={allocatedFeedstocks}
                  allocatedCertificationByFeedstock={allocatedCertificationByFeedstock}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
