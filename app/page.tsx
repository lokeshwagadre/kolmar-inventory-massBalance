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

type Certificate = "LCFS" | "ISCC" | "RFS";
type SaleRow = {
  id: string;
  certificate: Certificate;
  amountGal: string;
  buyerName: string;
  country: string;
};
type SaleHistoryRow = {
  id: string;
  certificate: Certificate;
  amountGal: number;
  buyerName: string;
  country: string;
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

const certificateDisplayOrder: Certificate[] = ["ISCC", "LCFS", "RFS"];
const eligibleCertificationsByFeedstock: Record<string, Certificate[]> = {
  UCO: ["LCFS", "ISCC"],
  Soybean: ["RFS"],
  "Cellulosic Waste": ["RFS", "ISCC"],
  "Circular Naphtha and Synthetic Oil": ["ISCC"],
};
const feedstockConsumptionPriorityByCertificate: Record<Certificate, string[]> = {
  ISCC: ["UCO", "Circular Naphtha and Synthetic Oil", "Cellulosic Waste", "Waste Oil and Waste Fat"],
  LCFS: ["UCO", "Waste Oil and Waste Fat"],
  RFS: ["Soybean", "Cellulosic Waste"],
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
  const summaryCards = [
    {
      label: "Current Inventory",
      value: `${totalCurrentInventoryMt.toLocaleString("en-US", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })} MT`,
      note: `As of ${currentAsOfLabel}`,
    },
    {
      label: "Incoming Inventory",
      value: `${totalIncomingMt.toLocaleString("en-US", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })} MT`,
      note: "Within applied date range",
    },
    {
      label: "Total Inventory",
      value: `${totalInventoryMt.toLocaleString("en-US", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })} MT`,
      note: "Current + Incoming",
    },
  ];

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
      <div className="mt-6 rounded-lg border border-[#e2e8f0] bg-white p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {summaryCards.map((card) => (
            <div key={card.label} className="h-full rounded-lg border border-[#e5e7eb] bg-white p-4">
              <p className="text-sm font-medium text-[#6b7280]">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[#111827]">{card.value}</p>
              <p className="mt-1 text-xs text-[#94a3b8]">{card.note}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {inventoryRows.map((row) => (
            <div
              key={`inventory-mini-${row.inventoryFeedstock}`}
              className={`h-full rounded-lg border border-[#e2e8f0] p-3 ${
                feedstockTypeClasses[row.inventoryFeedstock] ?? "bg-[#f8fafc] text-[#334155]"
              }`}
            >
              <p className="truncate text-xs font-semibold">{row.inventoryFeedstock}</p>
              <p className="mt-1 text-xs font-medium">Current: {row.inventoryAmount}</p>
              <p className="text-xs font-medium">Incoming: {row.incomingAmount}</p>
              <p className="text-xs font-semibold">Total: {row.totalInventoryAmount}</p>
            </div>
          ))}
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
  producedByCertificate,
  allocationDateRange,
  setAllocationDateRange,
  onSell,
  totalBiodieselInventoryTillDate,
}: {
  producedByCertificate: Record<Certificate, number>;
  allocationDateRange: DateTimeRange;
  setAllocationDateRange: (range: DateTimeRange) => void;
  onSell: () => void;
  totalBiodieselInventoryTillDate: number;
}) {
  const totalProducedAmount = certificateDisplayOrder.reduce(
    (sum, certificate) => sum + (producedByCertificate[certificate] ?? 0),
    0,
  );
  const rangeLabel =
    allocationDateRange.start && allocationDateRange.end
      ? `${allocationDateRange.start.toFormat("dd LLL yyyy, HH:mm")} - ${allocationDateRange.end.toFormat(
          "dd LLL yyyy, HH:mm",
        )}`
      : "Till date";

  return (
    <div className="mt-6 rounded-lg border border-[#e2e8f0] bg-white">
      <div className="border-b border-[#f1f5f9] p-4">
        <div className="max-w-sm rounded-lg border border-[#e5e7eb] bg-[#f8fafc] p-4">
          <p className="text-sm font-medium text-[#6b7280]">Total Biodiesel in Inventory till date</p>
          <p className="mt-2 text-2xl font-semibold text-[#111827]">
            {totalBiodieselInventoryTillDate.toLocaleString("en-US")} gal
          </p>
        </div>
      </div>
      <div className="border-b border-[#f1f5f9] p-4 text-xs text-[#64748b]">
        Certificate-wise eligible biodiesel prepared for sell submission.
      </div>
      <div className="border-b border-[#f1f5f9] p-4">
        <p className="text-sm font-semibold text-[#111827]">Date Range</p>
        <p className="text-xs text-[#64748b]">
          Use last 24 hours or load January from previous month. Certificate-wise eligible biodiesel updates for the
          selected range, then continue to the Biodiesel Sales tab.
        </p>
        <p className="mt-1 text-xs font-medium text-[#334155]">Applied: {rangeLabel}</p>
        <div className="mt-3">
          <DateTimeSelector
            onChange={setAllocationDateRange}
            initialRange={{
              start: allocationDateRange.start ?? undefined,
              end: allocationDateRange.end ?? undefined,
              timezone: allocationDateRange.timezone,
            }}
          />
        </div>
      </div>
      <div className="p-4">
        <div className="overflow-x-auto rounded-lg border border-[#e2e8f0] bg-white">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="bg-[#f8fafc] text-left text-xs uppercase tracking-wide text-[#64748b]">
                <th className="px-4 py-3">Certificate</th>
                <th className="px-4 py-3 text-right">Eligible Biodiesel (gal)</th>
              </tr>
            </thead>
            <tbody>
              {certificateDisplayOrder.map((certificate) => (
                <tr key={`produced-${certificate}`} className="border-t border-[#f1f5f9] bg-white text-[#334155]">
                  <td className="px-4 py-3 font-semibold">{certificate}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {(producedByCertificate[certificate] ?? 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    gal
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-[#cbd5e1] bg-[#f8fafc] text-[#0f172a]">
                <td className="px-4 py-3 font-semibold">Total</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  {totalProducedAmount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  gal
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onSell}
            className="rounded-md bg-[#0f8f6f] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#0c7a5e]"
          >
            Sell
          </button>
        </div>
      </div>
    </div>
  );
}

function BiodieselSalesSection({
  remainingByCertificate,
  soldByCertificate,
  overlapByPair,
  uniqueByCertificate,
  saleRows,
  saleErrors,
  salesHistory,
  onAddSaleRow,
  onUpdateSaleRow,
  onDeleteSaleRow,
  onCommitSales,
}: {
  remainingByCertificate: Record<Certificate, number>;
  soldByCertificate: Record<Certificate, number>;
  overlapByPair: Record<"ISCC_LCFS" | "ISCC_RFS" | "LCFS_RFS", number>;
  uniqueByCertificate: Record<Certificate, number>;
  saleRows: SaleRow[];
  saleErrors: Record<string, string>;
  salesHistory: SaleHistoryRow[];
  onAddSaleRow: () => void;
  onUpdateSaleRow: (id: string, patch: Partial<SaleRow>) => void;
  onDeleteSaleRow: (id: string) => void;
  onCommitSales: () => void;
}) {
  const remainingRows = certificateDisplayOrder.map((certificate) => ({
    certificate,
    remaining: remainingByCertificate[certificate] ?? 0,
    sold: soldByCertificate[certificate] ?? 0,
  }));
  const totalRemainingGallons = remainingRows.reduce((sum, row) => sum + row.remaining, 0);
  const totalSoldGallons = remainingRows.reduce((sum, row) => sum + row.sold, 0);

  return (
    <div className="mt-6 rounded-lg border border-[#e2e8f0] bg-white">
      <div className="border-b border-[#f1f5f9] p-4 text-xs text-[#64748b]">
        Smart sales allocation uses a shared feedstock pool. Selling under one certificate can reduce overlapping
        availability for other certificates.
      </div>
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
        <div className="overflow-x-auto rounded-lg border border-[#e2e8f0] bg-white">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="bg-[#f8fafc] text-left text-xs uppercase tracking-wide text-[#64748b]">
                <th className="px-4 py-3">Certificate</th>
                <th className="px-4 py-3 text-right">Remaining Eligible (gal)</th>
                <th className="px-4 py-3 text-right">Sold (gal)</th>
              </tr>
            </thead>
            <tbody>
              {remainingRows.map((row) => (
                <tr key={`remaining-${row.certificate}`} className="border-t border-[#f1f5f9] bg-white text-[#334155]">
                  <td className="px-4 py-3 font-semibold">{row.certificate}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {row.remaining.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    gal
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {row.sold.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    gal
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-[#cbd5e1] bg-[#f8fafc] text-[#0f172a]">
                <td className="px-4 py-3 font-semibold">Total</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  {totalRemainingGallons.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  gal
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  {totalSoldGallons.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  gal
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
          <h4 className="text-sm font-semibold text-[#0f172a]">Overlap Visibility (gal)</h4>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="rounded-md border border-[#dbeafe] bg-[#eff6ff] p-3">
              <p className="text-xs font-medium text-[#1e3a8a]">ISCC ∩ LCFS</p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-[#0f172a]">
                {overlapByPair.ISCC_LCFS.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} gal
              </p>
            </div>
            <div className="rounded-md border border-[#ede9fe] bg-[#f5f3ff] p-3">
              <p className="text-xs font-medium text-[#5b21b6]">ISCC ∩ RFS</p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-[#0f172a]">
                {overlapByPair.ISCC_RFS.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} gal
              </p>
            </div>
            <div className="rounded-md border border-[#dcfce7] bg-[#ecfdf5] p-3 md:col-span-2">
              <p className="text-xs font-medium text-[#166534]">LCFS ∩ RFS</p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-[#0f172a]">
                {overlapByPair.LCFS_RFS.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} gal
              </p>
            </div>
          </div>
          <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#64748b]">Unique-Only Buckets</h4>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {certificateDisplayOrder.map((certificate) => (
              <div key={`unique-${certificate}`} className="rounded-md border border-[#e2e8f0] bg-white p-3">
                <p className="text-xs font-medium text-[#334155]">Only {certificate}</p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-[#0f172a]">
                  {(uniqueByCertificate[certificate] ?? 0).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  gal
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-[#f1f5f9] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-[#0f172a]">Sales Transaction Details</h4>
          <button
            type="button"
            onClick={onAddSaleRow}
            className="rounded-md border border-[#0f8f6f] px-3 py-1.5 text-xs font-semibold text-[#0f8f6f] transition hover:bg-[#e8f5f1]"
          >
            Add Row
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-[#e2e8f0] bg-white">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="bg-[#f8fafc] text-left text-xs uppercase tracking-wide text-[#64748b]">
                <th className="px-4 py-3">Certificate</th>
                <th className="px-4 py-3 text-right">Amount (gal)</th>
                <th className="px-4 py-3">Buyer Name</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {saleRows.map((row) => (
                <tr key={row.id} className="border-t border-[#f1f5f9] bg-white text-[#334155]">
                  <td className="px-4 py-3">
                    <select
                      value={row.certificate}
                      onChange={(e) => onUpdateSaleRow(row.id, { certificate: e.target.value as Certificate })}
                      className="w-full rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none focus:border-[#0f8f6f]"
                    >
                      {certificateDisplayOrder.map((certificate) => (
                        <option key={`sale-cert-${certificate}`} value={certificate}>
                          {certificate}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.amountGal}
                      onChange={(e) => onUpdateSaleRow(row.id, { amountGal: e.target.value })}
                      placeholder="0.00"
                      className="w-full rounded-md border border-[#cbd5e1] px-3 py-2 text-right text-sm outline-none focus:border-[#0f8f6f]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={row.buyerName}
                      onChange={(e) => onUpdateSaleRow(row.id, { buyerName: e.target.value })}
                      placeholder="Buyer name"
                      className="w-full rounded-md border border-[#cbd5e1] px-3 py-2 text-sm outline-none focus:border-[#0f8f6f]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={row.country}
                      onChange={(e) => onUpdateSaleRow(row.id, { country: e.target.value })}
                      placeholder="Country"
                      className="w-full rounded-md border border-[#cbd5e1] px-3 py-2 text-sm outline-none focus:border-[#0f8f6f]"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => onDeleteSaleRow(row.id)}
                      className="rounded-md border border-[#ef4444] px-3 py-1 text-xs font-semibold text-[#ef4444] transition hover:bg-[#fef2f2]"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {saleRows.some((row) => saleErrors[row.id]) && (
          <div className="mt-2 space-y-1">
            {saleRows
              .filter((row) => saleErrors[row.id])
              .map((row) => (
                <p key={`sale-error-${row.id}`} className="text-xs font-medium text-[#b91c1c]">
                  Row {saleRows.findIndex((candidate) => candidate.id === row.id) + 1}: {saleErrors[row.id]}
                </p>
              ))}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onCommitSales}
            className="rounded-md bg-[#0f8f6f] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#0c7a5e]"
          >
            Sell / Commit
          </button>
        </div>
      </div>
      <div className="border-t border-[#f1f5f9] p-4">
        <h4 className="text-sm font-semibold text-[#0f172a]">Sales History</h4>
        <div className="mt-3 overflow-x-auto rounded-lg border border-[#e2e8f0] bg-white">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="bg-[#f8fafc] text-left text-xs uppercase tracking-wide text-[#64748b]">
                <th className="px-4 py-3">Certificate</th>
                <th className="px-4 py-3 text-right">Amount (gal)</th>
                <th className="px-4 py-3">Buyer Name</th>
                <th className="px-4 py-3">Country</th>
              </tr>
            </thead>
            <tbody>
              {salesHistory.length === 0 ? (
                <tr className="border-t border-[#f1f5f9] bg-white text-[#64748b]">
                  <td className="px-4 py-3 text-sm" colSpan={4}>
                    No committed sales yet.
                  </td>
                </tr>
              ) : (
                salesHistory.map((row) => (
                  <tr key={`history-${row.id}`} className="border-t border-[#f1f5f9] bg-white text-[#334155]">
                    <td className="px-4 py-3 font-medium">{row.certificate}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {row.amountGal.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      gal
                    </td>
                    <td className="px-4 py-3">{row.buyerName}</td>
                    <td className="px-4 py-3">{row.country}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
  const [allocationDateRange, setAllocationDateRange] = useState<DateTimeRange>({
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
  const allocationUseJanuaryMockDataset = isFullJanuary2026Range(allocationDateRange);
  const allocationUseLast24HoursDefaultSet = isLast24HoursWindow(allocationDateRange);
  const allocationRangeStart = (allocationDateRange.start ?? DateTime.now())
    .setZone(allocationDateRange.timezone)
    .startOf("day");
  const allocationRangeEnd = (allocationDateRange.end ?? DateTime.now())
    .setZone(allocationDateRange.timezone)
    .endOf("day");
  const allocationOpeningAsOf = allocationRangeStart.minus({ days: 1 }).endOf("day");
  const allocationSourceDocs = allocationUseJanuaryMockDataset
    ? january2026LedgerDocuments
    : allocationUseLast24HoursDefaultSet
      ? defaultLedgerDocuments
      : [...defaultLedgerDocuments, ...january2026LedgerDocuments];
  const allocationOpeningByFeedstock = allocationSourceDocs.reduce<Record<string, number>>(
    (acc, doc) => {
      if (!incomingFromLedgerFeedstocks.has(doc.feedstockType)) {
        return acc;
      }
      const docDate = DateTime.fromISO(doc.receivedAtIso, { zone: allocationDateRange.timezone });
      if (docDate <= allocationOpeningAsOf) {
        acc[doc.feedstockType] = (acc[doc.feedstockType] ?? 0) + doc.feedstockReceivedMt;
      }
      return acc;
    },
    allocationUseJanuaryMockDataset ? { ...mockOpeningInventoryByFeedstock } : { ...inventoryBaseByFeedstock },
  );
  const allocationIncomingByFeedstock = allocationSourceDocs.reduce<Record<string, number>>((acc, doc) => {
    if (!incomingFromLedgerFeedstocks.has(doc.feedstockType)) {
      return acc;
    }
    if (allocationUseLast24HoursDefaultSet) {
      acc[doc.feedstockType] = (acc[doc.feedstockType] ?? 0) + doc.feedstockReceivedMt;
      return acc;
    }
    const docDate = DateTime.fromISO(doc.receivedAtIso, { zone: allocationDateRange.timezone });
    if (docDate < allocationRangeStart || docDate > allocationRangeEnd) {
      return acc;
    }
    acc[doc.feedstockType] = (acc[doc.feedstockType] ?? 0) + doc.feedstockReceivedMt;
    return acc;
  }, {});
  const allocationRangeRows = inventoryRows.map((row) => {
    if (!incomingFromLedgerFeedstocks.has(row.inventoryFeedstock)) {
      return row;
    }
    const inventoryAmount = allocationOpeningByFeedstock[row.inventoryFeedstock] ?? parseMtValue(row.inventoryAmount);
    const incomingAmount = allocationIncomingByFeedstock[row.inventoryFeedstock] ?? 0;
    const totalInventoryAmount = inventoryAmount + incomingAmount;
    return {
      ...row,
      inventoryAmount: `${inventoryAmount.toFixed(1)} MT`,
      incomingAmount: `${incomingAmount.toFixed(1)} MT`,
      totalInventoryAmount: `${totalInventoryAmount.toFixed(1)} MT`,
    };
  });
  const currentInventoryMt = syncedInventoryRows.reduce((sum, row) => sum + parseMtValue(row.totalInventoryAmount), 0);
  const getEligibleCertificatesForFeedstock = (feedstock: string): Certificate[] => {
    const mapped = eligibleCertificationsByFeedstock[feedstock as keyof typeof eligibleCertificationsByFeedstock];
    if (mapped) {
      return mapped as Certificate[];
    }
    if (feedstock === "Waste Oil and Waste Fat") {
      return ["LCFS", "ISCC"];
    }
    return [];
  };
  const conversionFactorByCertificate: Record<Certificate, number> = {
    ISCC: 0.8,
    LCFS: 0.78,
    RFS: 0.75,
  };
  const producedByFeedstock = allocationRangeRows.reduce<Record<string, number>>((acc, row) => {
    const certificates = getEligibleCertificatesForFeedstock(row.inventoryFeedstock);
    if (certificates.length === 0) {
      return acc;
    }
    const bestFactor = certificates.reduce((max, certificate) => {
      const factor = conversionFactorByCertificate[certificate] ?? 0;
      return Math.max(max, factor);
    }, 0);
    acc[row.inventoryFeedstock] = parseMtValue(row.totalInventoryAmount) * bestFactor;
    return acc;
  }, {});
  const getCertificateRemainingFromPool = (pool: Record<string, number>, certificate: Certificate) =>
    Object.entries(pool).reduce((sum, [feedstock, gallons]) => {
      const certificates = getEligibleCertificatesForFeedstock(feedstock);
      if (!certificates.includes(certificate)) {
        return sum;
      }
      return sum + gallons;
    }, 0);
  const producedByCertificate = certificateDisplayOrder.reduce<Record<Certificate, number>>((acc, certificate) => {
    acc[certificate] = getCertificateRemainingFromPool(producedByFeedstock, certificate);
    return acc;
  }, { ISCC: 0, LCFS: 0, RFS: 0 });
  const totalProducedAmount = certificateDisplayOrder.reduce(
    (sum, certificate) => sum + (producedByCertificate[certificate] ?? 0),
    0,
  );
  const [remainingPoolByFeedstock, setRemainingPoolByFeedstock] = useState<Record<string, number>>(producedByFeedstock);
  const createEmptySaleRow = (): SaleRow => ({
    id: `sale-row-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    certificate: "ISCC",
    amountGal: "",
    buyerName: "",
    country: "",
  });
  const [saleRows, setSaleRows] = useState<SaleRow[]>([createEmptySaleRow()]);
  const [saleErrors, setSaleErrors] = useState<Record<string, string>>({});
  const [salesHistory, setSalesHistory] = useState<SaleHistoryRow[]>([]);
  const [soldByCertificateTxn, setSoldByCertificateTxn] = useState<Record<Certificate, number>>({
    ISCC: 0,
    LCFS: 0,
    RFS: 0,
  });
  const producedByFeedstockSignature = JSON.stringify(
    Object.entries(producedByFeedstock)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([feedstock, gallons]) => [feedstock, Number(gallons.toFixed(4))]),
  );
  useEffect(() => {
    const parsedEntries = JSON.parse(producedByFeedstockSignature) as Array<[string, number]>;
    setRemainingPoolByFeedstock(Object.fromEntries(parsedEntries));
    setSaleRows([createEmptySaleRow()]);
    setSalesHistory([]);
    setSaleErrors({});
    setSoldByCertificateTxn({
      ISCC: 0,
      LCFS: 0,
      RFS: 0,
    });
  }, [producedByFeedstockSignature]);
  const remainingByCertificate = certificateDisplayOrder.reduce<Record<Certificate, number>>((acc, certificate) => {
    acc[certificate] = getCertificateRemainingFromPool(remainingPoolByFeedstock, certificate);
    return acc;
  }, { ISCC: 0, LCFS: 0, RFS: 0 });
  const soldByCertificate = soldByCertificateTxn;
  const soldBiodieselTotal = certificateDisplayOrder.reduce((sum, certificate) => sum + (soldByCertificate[certificate] ?? 0), 0);
  const overlapByPair = Object.entries(remainingPoolByFeedstock).reduce<Record<"ISCC_LCFS" | "ISCC_RFS" | "LCFS_RFS", number>>(
    (acc, [feedstock, gallons]) => {
      const certifications = getEligibleCertificatesForFeedstock(feedstock);
      if (certifications.includes("ISCC") && certifications.includes("LCFS")) {
        acc.ISCC_LCFS += gallons;
      }
      if (certifications.includes("ISCC") && certifications.includes("RFS")) {
        acc.ISCC_RFS += gallons;
      }
      if (certifications.includes("LCFS") && certifications.includes("RFS")) {
        acc.LCFS_RFS += gallons;
      }
      return acc;
    },
    { ISCC_LCFS: 0, ISCC_RFS: 0, LCFS_RFS: 0 },
  );
  const uniqueByCertificate = Object.entries(remainingPoolByFeedstock).reduce<Record<Certificate, number>>(
    (acc, [feedstock, gallons]) => {
      const certifications = getEligibleCertificatesForFeedstock(feedstock);
      if (certifications.length === 1) {
        const certificate = certifications[0];
        acc[certificate] += gallons;
      }
      return acc;
    },
    { ISCC: 0, LCFS: 0, RFS: 0 },
  );

  const inventoryMixRows = syncedInventoryRows.map((row) => ({
    feedstock: row.inventoryFeedstock,
    amount: parseMtValue(row.totalInventoryAmount),
  }));
  const previousBiodieselInventory = 15000;
  const totalBiodieselInventoryTillDate = 15672;
  const updatedBiodieselInventory = Math.round(previousBiodieselInventory + soldBiodieselTotal);
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
      value: `${Math.round(totalProducedAmount).toLocaleString("en-US")} gal`,
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
  const consumeFromSharedPool = (
    pool: Record<string, number>,
    certificate: Certificate,
    requestedGallons: number,
  ): { nextPool: Record<string, number>; remainingRequest: number } => {
    const nextPool = { ...pool };
    let remainingRequest = requestedGallons;
    const priority = feedstockConsumptionPriorityByCertificate[certificate] ?? [];
    const extraEligibleFeedstocks = Object.keys(pool)
      .filter((feedstock) => getEligibleCertificatesForFeedstock(feedstock).includes(certificate))
      .filter((feedstock) => !priority.includes(feedstock))
      .sort((a, b) => a.localeCompare(b));
    const orderedFeedstocks = [...priority, ...extraEligibleFeedstocks];
    orderedFeedstocks.forEach((feedstock) => {
      if (remainingRequest <= 0) {
        return;
      }
      const available = nextPool[feedstock] ?? 0;
      if (available <= 0) {
        return;
      }
      const consumed = Math.min(available, remainingRequest);
      nextPool[feedstock] = available - consumed;
      remainingRequest -= consumed;
    });
    return { nextPool, remainingRequest };
  };
  const handleAddSaleRow = () => {
    setSaleRows((prev) => [...prev, createEmptySaleRow()]);
  };
  const handleUpdateSaleRow = (id: string, patch: Partial<SaleRow>) => {
    setSaleRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    setSaleErrors((prev) => {
      if (!prev[id]) {
        return prev;
      }
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };
  const handleDeleteSaleRow = (id: string) => {
    setSaleRows((prev) => {
      if (prev.length === 1) {
        return [createEmptySaleRow()];
      }
      return prev.filter((row) => row.id !== id);
    });
    setSaleErrors((prev) => {
      if (!prev[id]) {
        return prev;
      }
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };
  const handleCommitSales = () => {
    const nextErrors: Record<string, string> = {};
    let draftPool = { ...remainingPoolByFeedstock };
    const committedRows: SaleHistoryRow[] = [];
    saleRows.forEach((row) => {
      const amountGallons = Number.parseFloat(row.amountGal);
      if (!Number.isFinite(amountGallons) || amountGallons <= 0) {
        nextErrors[row.id] = "Enter a valid sale amount greater than 0.";
        return;
      }
      if (!row.buyerName.trim()) {
        nextErrors[row.id] = "Buyer name is required.";
        return;
      }
      if (!row.country.trim()) {
        nextErrors[row.id] = "Country is required.";
        return;
      }
      const remainingForCertificate = getCertificateRemainingFromPool(draftPool, row.certificate);
      if (amountGallons > remainingForCertificate + 1e-6) {
        nextErrors[row.id] =
          `Oversell blocked: ${row.certificate} has only ${remainingForCertificate.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} gal remaining.`;
        return;
      }
      const consumed = consumeFromSharedPool(draftPool, row.certificate, amountGallons);
      if (consumed.remainingRequest > 1e-6) {
        nextErrors[row.id] = "Unable to allocate requested sale amount from shared pool.";
        return;
      }
      draftPool = consumed.nextPool;
      committedRows.push({
        id: `history-${row.id}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        certificate: row.certificate,
        amountGal: amountGallons,
        buyerName: row.buyerName.trim(),
        country: row.country.trim(),
      });
    });
    if (Object.keys(nextErrors).length > 0) {
      setSaleErrors(nextErrors);
      return;
    }
    if (committedRows.length === 0) {
      return;
    }
    setRemainingPoolByFeedstock(draftPool);
    setSalesHistory((prev) => [...prev, ...committedRows]);
    setSoldByCertificateTxn((prev) => {
      const next = { ...prev };
      committedRows.forEach((row) => {
        next[row.certificate] = (next[row.certificate] ?? 0) + row.amountGal;
      });
      return next;
    });
    setSaleErrors({});
    setSaleRows([createEmptySaleRow()]);
  };
  const handleSellBiodiesel = () => {
    setActiveTab("Biodiesel Sales");
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
                <p className="text-xs font-semibold text-[#111827]">Domo Chemicals</p>
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
                  producedByCertificate={producedByCertificate}
                  allocationDateRange={allocationDateRange}
                  setAllocationDateRange={setAllocationDateRange}
                  onSell={handleSellBiodiesel}
                  totalBiodieselInventoryTillDate={totalBiodieselInventoryTillDate}
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
                  remainingByCertificate={remainingByCertificate}
                  soldByCertificate={soldByCertificate}
                  overlapByPair={overlapByPair}
                  uniqueByCertificate={uniqueByCertificate}
                  saleRows={saleRows}
                  saleErrors={saleErrors}
                  salesHistory={salesHistory}
                  onAddSaleRow={handleAddSaleRow}
                  onUpdateSaleRow={handleUpdateSaleRow}
                  onDeleteSaleRow={handleDeleteSaleRow}
                  onCommitSales={handleCommitSales}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
