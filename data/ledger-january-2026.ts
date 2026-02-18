const januaryFeedstocks = [
  "UCO",
  "Soybean",
  "Waste Oil and Waste Fat",
  "Cellulosic Waste",
  "Circular Naphtha and Synthetic Oil",
] as const;

const januaryDocumentTypes = [
  "Goods Receipt Note",
  "Supplier Delivery Note",
  "Weighbridge Slip",
  "Quality Inspection Report",
  "Inbound Stock Transfer",
] as const;

const feedstockCodeMap: Record<(typeof januaryFeedstocks)[number], string> = {
  UCO: "UCO",
  Soybean: "SOY",
  "Waste Oil and Waste Fat": "WAF",
  "Cellulosic Waste": "CEL",
  "Circular Naphtha and Synthetic Oil": "CIR",
};

const documentTypeCodeMap: Record<(typeof januaryDocumentTypes)[number], string> = {
  "Goods Receipt Note": "GRN",
  "Supplier Delivery Note": "SDN",
  "Weighbridge Slip": "WBS",
  "Quality Inspection Report": "QIR",
  "Inbound Stock Transfer": "IST",
};

const pad = (value: number) => String(value).padStart(2, "0");

export const january2026LedgerDocuments = Array.from({ length: 211 }, (_, idx) => {
  const feedstock = januaryFeedstocks[(idx * 3) % januaryFeedstocks.length];
  const documentType = januaryDocumentTypes[idx % januaryDocumentTypes.length];
  const day = (idx % 31) + 1;
  const hour = 8 + (idx % 11);
  const minute = (idx * 7) % 60;
  const feedstockReceivedMt = Number((12 + (idx % 9) * 2.4 + (idx % 4) * 0.5).toFixed(1));
  return {
    documentName: `${documentTypeCodeMap[documentType]}-${feedstockCodeMap[feedstock]}-${String(1001 + idx)}.pdf`,
    documentType,
    feedstockType: feedstock,
    feedstockReceivedMt,
    receivedAtIso: `2026-01-${pad(day)}T${pad(hour)}:${pad(minute)}:00`,
    status: "Received",
  };
});
