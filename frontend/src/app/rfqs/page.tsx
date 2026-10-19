
"use client";

import ProcurementSidebar from "../components/ProcurementSidebar";
import {
  Search,
  Plus,
  Download,
  ChevronRight,
  X,
  FileText,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  Send,
  Package,
  CalendarDays,
  Building2,
  Eye,
  ClipboardCheck,
  CircleDollarSign,
} from "lucide-react";
import {
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

type RFQStatus = "DRAFT" | "ISSUED" | "CLOSED" | "CANCELLED";
type ResponseStatus =
  | "NOT STARTED"
  | "AWAITING QUOTES"
  | "PARTIALLY RECEIVED"
  | "QUOTES RECEIVED"
  | "EVALUATION PENDING"
  | "EVALUATED";

type Quote = {
  supplierId: string;
  supplierName: string;
  status: "RECEIVED" | "AWAITED" | "DECLINED";
  quoteNumber?: string;
  amount?: number;
  currency: string;
  leadTimeDays?: number;
  deliveryDate?: string;
  paymentTerms?: string;
  validityDays?: number;
  notes?: string;
};

type RFQ = {
  id: string;
  requestNumber: string;
  material: string;
  materialCode: string;
  specification: string;
  quantity: number;
  uom: string;
  project: string;
  deliveryLocation: string;
  createdDate: string;
  responseDueDate: string;
  requiredDate: string;
  status: RFQStatus;
  responseStatus: ResponseStatus;
  currency: string;
  invitedSuppliers: number;
  quotes: Quote[];
  description: string;
};

const INITIAL_RFQS: RFQ[] = [
  {
    id: "RFQ-20261003-0001",
    requestNumber: "REQ-20260929-9E7835E1",
    material: "API 6D Class 600 Carbon Steel Valve",
    materialCode: "VAL-API6D-600-CS",
    specification:
      "API 6D, Class 600, Carbon Steel, RF, project-approved specification",
    quantity: 200,
    uom: "EA",
    project: "EPC Project — Middle East",
    deliveryLocation: "Dubai, United Arab Emirates",
    createdDate: "2026-10-03",
    responseDueDate: "2026-10-10",
    requiredDate: "2026-11-15",
    status: "ISSUED",
    responseStatus: "QUOTES RECEIVED",
    currency: "USD",
    invitedSuppliers: 2,
    description:
      "External sourcing for the remaining quantity after the internal supply decision.",
    quotes: [
      {
        supplierId: "SUP-001",
        supplierName: "Gulf Valve Industries",
        status: "RECEIVED",
        quoteNumber: "Q-GVI-1001",
        amount: 238500,
        currency: "USD",
        leadTimeDays: 25,
        deliveryDate: "2026-10-28",
        paymentTerms: "Net 45",
        validityDays: 30,
        notes: "Illustrative quotation. Subject to commercial approval.",
      },
      {
        supplierId: "SUP-002",
        supplierName: "Emirates Process Equipment",
        status: "RECEIVED",
        quoteNumber: "Q-EPE-2048",
        amount: 231300,
        currency: "USD",
        leadTimeDays: 40,
        deliveryDate: "2026-11-12",
        paymentTerms: "Net 30",
        validityDays: 21,
        notes: "Illustrative quotation. Subject to commercial approval.",
      },
    ],
  },
  {
    id: "RFQ-20261006-0002",
    requestNumber: "REQ-20261005-7A20D3F1",
    material: "Industrial Gate Valve",
    materialCode: "VAL-GATE-CS",
    specification: "Carbon steel, flanged ends, project specification",
    quantity: 350,
    uom: "EA",
    project: "EPC Project — Southeast Asia",
    deliveryLocation: "Singapore",
    createdDate: "2026-10-06",
    responseDueDate: "2026-10-15",
    requiredDate: "2026-12-05",
    status: "ISSUED",
    responseStatus: "PARTIALLY RECEIVED",
    currency: "USD",
    invitedSuppliers: 3,
    description:
      "Supplier quotations are being collected for a project material requirement.",
    quotes: [
      {
        supplierId: "SUP-004",
        supplierName: "Precision Steel Components",
        status: "RECEIVED",
        quoteNumber: "Q-PSC-1104",
        amount: 146000,
        currency: "USD",
        leadTimeDays: 30,
        deliveryDate: "2026-11-20",
        paymentTerms: "Net 45",
        validityDays: 30,
      },
      {
        supplierId: "SUP-001",
        supplierName: "Gulf Valve Industries",
        status: "AWAITED",
        currency: "USD",
      },
      {
        supplierId: "SUP-002",
        supplierName: "Emirates Process Equipment",
        status: "AWAITED",
        currency: "USD",
      },
    ],
  },
  {
    id: "RFQ-20261007-0003",
    requestNumber: "REQ-20261006-4C81F901",
    material: "Industrial Pipe Fittings",
    materialCode: "FIT-IND-001",
    specification: "Industrial fittings; grade and dimensions per project",
    quantity: 800,
    uom: "EA",
    project: "EPC Project — Europe",
    deliveryLocation: "Hamburg, Germany",
    createdDate: "2026-10-07",
    responseDueDate: "2026-10-18",
    requiredDate: "2026-12-20",
    status: "ISSUED",
    responseStatus: "AWAITING QUOTES",
    currency: "USD",
    invitedSuppliers: 3,
    description:
      "Quotation collection is in progress. No supplier has submitted a quote in this demo record.",
    quotes: [
      {
        supplierId: "SUP-002",
        supplierName: "Emirates Process Equipment",
        status: "AWAITED",
        currency: "USD",
      },
      {
        supplierId: "SUP-004",
        supplierName: "Precision Steel Components",
        status: "AWAITED",
        currency: "USD",
      },
      {
        supplierId: "SUP-005",
        supplierName: "Northstar Industrial Supply",
        status: "AWAITED",
        currency: "USD",
      },
    ],
  },
  {
    id: "RFQ-20260922-0004",
    requestNumber: "REQ-20260920-B31F220A",
    material: "Steel Forgings",
    materialCode: "STL-FRG-001",
    specification: "Forged steel components; project-approved grade",
    quantity: 120,
    uom: "EA",
    project: "EPC Project — India",
    deliveryLocation: "Mumbai, India",
    createdDate: "2026-09-22",
    responseDueDate: "2026-09-29",
    requiredDate: "2026-11-10",
    status: "CLOSED",
    responseStatus: "EVALUATED",
    currency: "USD",
    invitedSuppliers: 2,
    description:
      "Quotation evaluation has been completed in the illustrative demo workflow.",
    quotes: [
      {
        supplierId: "SUP-004",
        supplierName: "Precision Steel Components",
        status: "RECEIVED",
        quoteNumber: "Q-PSC-1082",
        amount: 87500,
        currency: "USD",
        leadTimeDays: 18,
        deliveryDate: "2026-10-20",
        paymentTerms: "Net 45",
        validityDays: 30,
      },
      {
        supplierId: "SUP-005",
        supplierName: "Northstar Industrial Supply",
        status: "RECEIVED",
        quoteNumber: "Q-NSI-0814",
        amount: 91200,
        currency: "USD",
        leadTimeDays: 28,
        deliveryDate: "2026-10-30",
        paymentTerms: "Net 30",
        validityDays: 21,
      },
    ],
  },
  {
    id: "RFQ-20261008-0005",
    requestNumber: "REQ-20261007-CC81A903",
    material: "MRO Spare Parts",
    materialCode: "MRO-SP-001",
    specification: "Replacement spare parts; approved technical equivalents",
    quantity: 75,
    uom: "EA",
    project: "Plant Maintenance",
    deliveryLocation: "Abu Dhabi, United Arab Emirates",
    createdDate: "2026-10-08",
    responseDueDate: "2026-10-17",
    requiredDate: "2026-11-25",
    status: "DRAFT",
    responseStatus: "NOT STARTED",
    currency: "USD",
    invitedSuppliers: 0,
    description:
      "Draft RFQ prepared for internal review. No suppliers have been invited.",
    quotes: [],
  },
];

const STATUS_STYLES: Record<string, CSSProperties> = {
  DRAFT: { background: "#f1f5f9", color: "#475569" },
  ISSUED: { background: "#dbeafe", color: "#1d4ed8" },
  CLOSED: { background: "#dcfce7", color: "#166534" },
  CANCELLED: { background: "#fee2e2", color: "#991b1b" },
  "NOT STARTED": { background: "#f1f5f9", color: "#475569" },
  "AWAITING QUOTES": { background: "#fef3c7", color: "#92400e" },
  "PARTIALLY RECEIVED": { background: "#ffedd5", color: "#9a3412" },
  "QUOTES RECEIVED": { background: "#dcfce7", color: "#166534" },
  "EVALUATION PENDING": { background: "#ede9fe", color: "#5b21b6" },
  EVALUATED: { background: "#dcfce7", color: "#166534" },
  RECEIVED: { background: "#dcfce7", color: "#166534" },
  AWAITED: { background: "#fef3c7", color: "#92400e" },
  DECLINED: { background: "#fee2e2", color: "#991b1b" },
};

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  padding: "11px 12px",
  border: "1px solid #dbe2ea",
  borderRadius: 8,
  background: "#fff",
  color: "#172033",
  fontSize: 12,
  outlineColor: "#818cf8",
};

function StatusBadge({ value }: { value: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 20,
        padding: "5px 9px",
        fontSize: 9,
        lineHeight: 1.4,
        fontWeight: 800,
        whiteSpace: "nowrap",
        ...STATUS_STYLES[value],
      }}
    >
      {value}
    </span>
  );
}

function formatDate(value: string): string {
  if (!value) return "—";

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return value;

  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function getReceivedQuotes(rfq: RFQ): Quote[] {
  return rfq.quotes.filter((quote) => quote.status === "RECEIVED");
}

function getResponseStatus(rfq: RFQ): ResponseStatus {
  if (rfq.status === "DRAFT") return "NOT STARTED";

  if (rfq.status === "CLOSED") {
    return rfq.responseStatus === "EVALUATED"
      ? "EVALUATED"
      : rfq.responseStatus;
  }

  const received = getReceivedQuotes(rfq).length;

  if (received === 0) return "AWAITING QUOTES";

  if (received < rfq.invitedSuppliers) return "PARTIALLY RECEIVED";

  if (rfq.responseStatus === "EVALUATION PENDING") {
    return "EVALUATION PENDING";
  }

  return "QUOTES RECEIVED";
}

export default function RFQsPage() {
  const [rfqs, setRfqs] = useState<RFQ[]>(INITIAL_RFQS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [responseFilter, setResponseFilter] = useState("ALL");
  const [selectedRfqId, setSelectedRfqId] = useState<string | null>(
    INITIAL_RFQS[0]?.id ?? null
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [notice, setNotice] = useState("");

  const [newMaterial, setNewMaterial] = useState("");
  const [newMaterialCode, setNewMaterialCode] = useState("");
  const [newQuantity, setNewQuantity] = useState("100");
  const [newUom, setNewUom] = useState("EA");
  const [newProject, setNewProject] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newRequiredDate, setNewRequiredDate] = useState("2026-12-15");
  const [newDueDate, setNewDueDate] = useState("2026-10-25");
  const [newSpecification, setNewSpecification] = useState("");

  const filteredRFQs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rfqs.filter((rfq) => {
      const matchesSearch =
        !query ||
        [
          rfq.id,
          rfq.requestNumber,
          rfq.material,
          rfq.materialCode,
          rfq.project,
          rfq.deliveryLocation,
          rfq.specification,
          ...rfq.quotes.map((quote) => quote.supplierName),
        ].some((value) => value.toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "ALL" || rfq.status === statusFilter;

      const matchesResponse =
        responseFilter === "ALL" ||
        getResponseStatus(rfq) === responseFilter;

      return matchesSearch && matchesStatus && matchesResponse;
    });
  }, [rfqs, search, statusFilter, responseFilter]);

  const selectedRFQ =
    rfqs.find((rfq) => rfq.id === selectedRfqId) ?? null;

  const totalReceived = rfqs.reduce(
    (total, rfq) => total + getReceivedQuotes(rfq).length,
    0
  );

  const awaitingRFQs = rfqs.filter(
    (rfq) =>
      rfq.status === "ISSUED" &&
      ["AWAITING QUOTES", "PARTIALLY RECEIVED"].includes(
        getResponseStatus(rfq)
      )
  ).length;

  const evaluationsPending = rfqs.filter(
    (rfq) => getResponseStatus(rfq) === "EVALUATION PENDING"
  ).length;

  const totalQuotedValue = rfqs.reduce(
    (total, rfq) =>
      total +
      getReceivedQuotes(rfq).reduce(
        (quoteTotal, quote) => quoteTotal + (quote.amount ?? 0),
        0
      ),
    0
  );

  function createDemoRFQ(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const quantity = Number(newQuantity);

    if (
      !newMaterial.trim() ||
      !newMaterialCode.trim() ||
      !newProject.trim() ||
      !newLocation.trim() ||
      !newSpecification.trim() ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !newDueDate ||
      !newRequiredDate
    ) {
      setNotice("Complete all required fields with a valid quantity.");
      return;
    }

    if (newDueDate > newRequiredDate) {
      setNotice(
        "The quotation response deadline should not be later than the required delivery date."
      );
      return;
    }

    const today = new Date();
    const datePrefix = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("");

    const sameDayCount = rfqs.filter((rfq) =>
      rfq.id.startsWith(`RFQ-${datePrefix}-`)
    ).length;

    const rfqNumber = `RFQ-${datePrefix}-${String(
      sameDayCount + 1
    ).padStart(4, "0")}`;

    const newRFQ: RFQ = {
      id: rfqNumber,
      requestNumber: "DEMO-REQUEST",
      material: newMaterial.trim(),
      materialCode: newMaterialCode.trim(),
      specification: newSpecification.trim(),
      quantity,
      uom: newUom,
      project: newProject.trim(),
      deliveryLocation: newLocation.trim(),
      createdDate: [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
      ].join("-"),
      responseDueDate: newDueDate,
      requiredDate: newRequiredDate,
      status: "DRAFT",
      responseStatus: "NOT STARTED",
      currency: "USD",
      invitedSuppliers: 0,
      quotes: [],
      description:
        "Demo RFQ created in the frontend. Supplier invitations and backend issuance are not connected.",
    };

    setRfqs((previous) => [newRFQ, ...previous]);
    setSelectedRfqId(newRFQ.id);
    setSearch("");
    setStatusFilter("ALL");
    setResponseFilter("ALL");
    setShowCreateForm(false);
    setNewMaterial("");
    setNewMaterialCode("");
    setNewQuantity("100");
    setNewUom("EA");
    setNewProject("");
    setNewLocation("");
    setNewSpecification("");

    setNotice(
      `${rfqNumber} created as a demo draft. No supplier invitations were sent.`
    );
  }

  function exportRFQs() {
    const headers = [
      "RFQ Number",
      "Request Number",
      "Material",
      "Material Code",
      "Quantity",
      "UOM",
      "Project",
      "Delivery Location",
      "RFQ Status",
      "Response Status",
      "Invited Suppliers",
      "Quotes Received",
      "Created Date",
      "Response Due Date",
      "Required Date",
      "Received Quote Value",
    ];

    const rows = filteredRFQs.map((rfq) => [
      rfq.id,
      rfq.requestNumber,
      rfq.material,
      rfq.materialCode,
      rfq.quantity,
      rfq.uom,
      rfq.project,
      rfq.deliveryLocation,
      rfq.status,
      getResponseStatus(rfq),
      rfq.invitedSuppliers,
      getReceivedQuotes(rfq).length,
      rfq.createdDate,
      rfq.responseDueDate,
      rfq.requiredDate,
      getReceivedQuotes(rfq).reduce(
        (total, quote) => total + (quote.amount ?? 0),
        0
      ),
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "procurement-rfqs-demo.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    setNotice("Filtered RFQ register exported to CSV.");
  }

  function markEvaluationPending(rfq: RFQ) {
    const receivedCount = getReceivedQuotes(rfq).length;

    if (receivedCount === 0) {
      setNotice(
        "There are no received quotations to evaluate for this RFQ."
      );
      return;
    }

    setRfqs((previous) =>
      previous.map((item) =>
        item.id === rfq.id
          ? { ...item, responseStatus: "EVALUATION PENDING" }
          : item
      )
    );

    setNotice(
      `${rfq.id} marked for evaluation in this demo. No supplier has been awarded.`
    );
  }

  return (
    <main className="app-shell">
      <ProcurementSidebar />

      <section
        className="control-tower-shell"
        style={{
          minHeight: "100vh",
          background: "#f5f7fb",
          color: "#172033",
          padding: "26px 28px 42px",
          boxSizing: "border-box",
          fontSize: 13,
        }}
      >
        {/* PAGE HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 22,
          }}
        >
          <div>
            <div
              style={{
                color: "#64748b",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.12em",
              }}
            >
              PROCUREMENT WORKSPACE
            </div>

            <h1
              style={{
                fontSize: 27,
                fontWeight: 800,
                letterSpacing: "-0.045em",
                margin: "9px 0 7px",
                color: "#111827",
              }}
            >
              RFQs &amp; Quotations
            </h1>

            <p
              style={{
                color: "#64748b",
                margin: 0,
                lineHeight: 1.7,
                maxWidth: 700,
              }}
            >
              Manage supplier requests, track quotation responses, and monitor
              commercial evaluation across your procurement projects.
            </p>
          </div>

          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={exportRFQs}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#fff",
                border: "1px solid #dbe2ea",
                borderRadius: 8,
                padding: "10px 13px",
                color: "#334155",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Download size={15} />
              Export
            </button>

            <button
              type="button"
              onClick={() => {
                setNotice("");
                setShowCreateForm(true);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#172554",
                border: "1px solid #172554",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Plus size={15} />
              Create RFQ
            </button>
          </div>
        </div>

        {/* DEMO NOTICE */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 9,
            padding: "12px 14px",
            marginBottom: 20,
            borderRadius: 9,
            border: "1px solid #dbe4ff",
            background: "#eef2ff",
            color: "#3730a3",
            fontSize: 11,
            lineHeight: 1.7,
          }}
        >
          <AlertTriangle
            size={16}
            style={{ flexShrink: 0, marginTop: 1 }}
          />
          <span>
            Demo workspace: RFQ and quotation data is illustrative. Creating a
            draft, marking evaluation pending, and exporting records are
            frontend-only actions. No supplier invitations, awards, or purchase
            orders are created.
          </span>
        </div>

        {/* KPI CARDS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(195px, 1fr))",
            gap: 15,
            marginBottom: 20,
          }}
        >
          {[
            {
              label: "Total RFQs",
              value: String(rfqs.length),
              helper: "Across the demo workspace",
              icon: <FileText size={19} />,
            },
            {
              label: "Awaiting quotations",
              value: String(awaitingRFQs),
              helper: "Issued RFQs awaiting responses",
              icon: <Clock3 size={19} />,
            },
            {
              label: "Quotes received",
              value: String(totalReceived),
              helper: "Submitted quotation records",
              icon: <CheckCircle2 size={19} />,
            },
            {
              label: "Evaluations pending",
              value: String(evaluationsPending),
              helper: "Ready for commercial review",
              icon: <ClipboardCheck size={19} />,
            },
          ].map((metric) => (
            <div
              key={metric.label}
              style={{
                background: "#fff",
                border: "1px solid #e5eaf1",
                borderRadius: 12,
                padding: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: "#64748b",
                  fontSize: 11,
                  fontWeight: 650,
                  gap: 8,
                }}
              >
                {metric.label}
                <span style={{ color: "#6474c9" }}>{metric.icon}</span>
              </div>

              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                  marginTop: 14,
                }}
              >
                {metric.value}
              </div>

              <div
                style={{
                  color: "#718096",
                  fontSize: 11,
                  marginTop: 5,
                }}
              >
                {metric.helper}
              </div>
            </div>
          ))}
        </div>

        {/* QUOTATION VALUE SUMMARY */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            padding: "15px 18px",
            marginBottom: 20,
            background: "#fff",
            border: "1px solid #e5eaf1",
            borderRadius: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#eef2ff",
                color: "#4f46e5",
                borderRadius: 10,
              }}
            >
              <CircleDollarSign size={19} />
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 800 }}>
                Received quotation value
              </div>
              <div
                style={{
                  color: "#718096",
                  fontSize: 10,
                  marginTop: 4,
                }}
              >
                Sum of illustrative submitted quote amounts; not a committed
                spend or award value.
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "-0.035em",
            }}
          >
            {formatMoney(totalQuotedValue)}
          </div>
        </div>

        {/* REGISTER AND DETAILS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: selectedRFQ
              ? "minmax(0, 1.55fr) minmax(320px, 0.85fr)"
              : "minmax(0, 1fr)",
            gap: 18,
            alignItems: "start",
          }}
        >
          {/* RFQ REGISTER */}
          <section
            style={{
              background: "#fff",
              border: "1px solid #e5eaf1",
              borderRadius: 12,
              overflow: "hidden",
              minWidth: 0,
            }}
          >
            <div
              style={{
                padding: 20,
                borderBottom: "1px solid #edf0f5",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 16,
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      margin: 0,
                    }}
                  >
                    RFQ register
                  </h2>

                  <p
                    style={{
                      color: "#718096",
                      fontSize: 11,
                      margin: "6px 0 0",
                    }}
                  >
                    {filteredRFQs.length} RFQs matching your filters
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("ALL");
                    setResponseFilter("ALL");
                  }}
                  style={{
                    border: 0,
                    background: "transparent",
                    color: "#4f46e5",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Reset filters
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(180px, 1fr) repeat(2, minmax(135px, 175px))",
                  gap: 10,
                }}
              >
                <div style={{ position: "relative" }}>
                  <Search
                    size={15}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: 12,
                      color: "#94a3b8",
                    }}
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search RFQ, material, supplier..."
                    aria-label="Search RFQs"
                    style={{
                      ...inputStyle,
                      paddingLeft: 35,
                    }}
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  aria-label="Filter by RFQ status"
                  style={inputStyle}
                >
                  <option value="ALL">All RFQ statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ISSUED">Issued</option>
                  <option value="CLOSED">Closed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>

                <select
                  value={responseFilter}
                  onChange={(event) => setResponseFilter(event.target.value)}
                  aria-label="Filter by response status"
                  style={inputStyle}
                >
                  <option value="ALL">All response statuses</option>
                  <option value="NOT STARTED">Not started</option>
                  <option value="AWAITING QUOTES">Awaiting quotes</option>
                  <option value="PARTIALLY RECEIVED">Partially received</option>
                  <option value="QUOTES RECEIVED">Quotes received</option>
                  <option value="EVALUATION PENDING">Evaluation pending</option>
                  <option value="EVALUATED">Evaluated</option>
                </select>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  minWidth: 900,
                  borderCollapse: "collapse",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {[
                      "RFQ / MATERIAL",
                      "SUPPLIER RESPONSES",
                      "RFQ STATUS",
                      "RESPONSE STATUS",
                      "DUE DATE",
                      "",
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          padding: "12px 14px",
                          color: "#64748b",
                          fontSize: 9,
                          letterSpacing: "0.07em",
                          fontWeight: 800,
                          borderBottom: "1px solid #edf0f5",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredRFQs.map((rfq) => {
                    const received = getReceivedQuotes(rfq).length;
                    const responseStatus = getResponseStatus(rfq);
                    const selected = selectedRfqId === rfq.id;

                    return (
                      <tr
                        key={rfq.id}
                        onClick={() => setSelectedRfqId(rfq.id)}
                        style={{
                          cursor: "pointer",
                          background: selected ? "#f0f4ff" : "#fff",
                        }}
                      >
                        <td
                          style={{
                            padding: "15px 14px",
                            borderBottom: "1px solid #edf0f5",
                            maxWidth: 300,
                          }}
                        >
                          <div
                            style={{
                              color: "#4f46e5",
                              fontSize: 10,
                              fontWeight: 800,
                            }}
                          >
                            {rfq.id}
                          </div>

                          <div
                            style={{
                              color: "#172033",
                              fontWeight: 750,
                              fontSize: 11,
                              marginTop: 6,
                              lineHeight: 1.6,
                            }}
                          >
                            {rfq.material}
                          </div>

                          <div
                            style={{
                              color: "#94a3b8",
                              fontSize: 10,
                              marginTop: 4,
                            }}
                          >
                            {rfq.materialCode} · {rfq.quantity.toLocaleString()}{" "}
                            {rfq.uom}
                          </div>

                          <div
                            style={{
                              color: "#718096",
                              fontSize: 10,
                              marginTop: 4,
                            }}
                          >
                            Request: {rfq.requestNumber}
                          </div>
                        </td>

                        <td
                          style={{
                            padding: "15px 14px",
                            borderBottom: "1px solid #edf0f5",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 800,
                            }}
                          >
                            {received} / {rfq.invitedSuppliers}
                          </div>

                          <div
                            style={{
                              height: 5,
                              width: 88,
                              borderRadius: 5,
                              overflow: "hidden",
                              background: "#e2e8f0",
                              marginTop: 7,
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width:
                                  rfq.invitedSuppliers > 0
                                    ? `${Math.min(
                                        100,
                                        (received / rfq.invitedSuppliers) * 100
                                      )}%`
                                    : "0%",
                                background: "#6366f1",
                                borderRadius: 5,
                              }}
                            />
                          </div>

                          <div
                            style={{
                              color: "#94a3b8",
                              fontSize: 9,
                              marginTop: 5,
                            }}
                          >
                            {rfq.invitedSuppliers} invited
                          </div>
                        </td>

                        <td
                          style={{
                            padding: "15px 14px",
                            borderBottom: "1px solid #edf0f5",
                          }}
                        >
                          <StatusBadge value={rfq.status} />
                        </td>

                        <td
                          style={{
                            padding: "15px 14px",
                            borderBottom: "1px solid #edf0f5",
                          }}
                        >
                          <StatusBadge value={responseStatus} />
                        </td>

                        <td
                          style={{
                            padding: "15px 14px",
                            borderBottom: "1px solid #edf0f5",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            <CalendarDays size={13} color="#64748b" />
                            {formatDate(rfq.responseDueDate)}
                          </div>
                          <div
                            style={{
                              color: "#94a3b8",
                              fontSize: 9,
                              marginTop: 5,
                            }}
                          >
                            Response deadline
                          </div>
                        </td>

                        <td
                          style={{
                            padding: "15px 14px",
                            borderBottom: "1px solid #edf0f5",
                          }}
                        >
                          <ChevronRight size={16} color="#94a3b8" />
                        </td>
                      </tr>
                    );
                  })}

                  {filteredRFQs.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          padding: 38,
                          textAlign: "center",
                          color: "#64748b",
                        }}
                      >
                        No RFQs match your search and filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div
              style={{
                padding: "13px 17px",
                color: "#94a3b8",
                fontSize: 10,
                borderTop: "1px solid #edf0f5",
              }}
            >
              Illustrative RFQ records · Select any row to inspect supplier
              responses and quotation details.
            </div>
          </section>

          {/* RFQ DETAIL PANEL */}
          {selectedRFQ && (
            <aside
              style={{
                background: "#fff",
                border: "1px solid #e5eaf1",
                borderRadius: 12,
                overflow: "hidden",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  padding: 20,
                  borderBottom: "1px solid #edf0f5",
                  background: "#fbfcff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 11,
                      background: "#eef2ff",
                      color: "#4f46e5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FileText size={20} />
                  </div>

                  <button
                    type="button"
                    aria-label="Close RFQ details"
                    onClick={() => setSelectedRfqId(null)}
                    style={{
                      border: 0,
                      background: "transparent",
                      color: "#64748b",
                      cursor: "pointer",
                    }}
                  >
                    <X size={17} />
                  </button>
                </div>

                <h2
                  style={{
                    fontSize: 18,
                    lineHeight: 1.45,
                    letterSpacing: "-0.035em",
                    margin: "14px 0 5px",
                    overflowWrap: "anywhere",
                  }}
                >
                  {selectedRFQ.material}
                </h2>

                <div
                  style={{
                    color: "#4f46e5",
                    fontSize: 10,
                    fontWeight: 800,
                    overflowWrap: "anywhere",
                  }}
                >
                  {selectedRFQ.id}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 7,
                    marginTop: 12,
                  }}
                >
                  <StatusBadge value={selectedRFQ.status} />
                  <StatusBadge value={getResponseStatus(selectedRFQ)} />
                </div>
              </div>

              <div style={{ padding: 20 }}>
                {/* REQUEST DETAILS */}
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    marginBottom: 12,
                  }}
                >
                  RFQ details
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  {[
                    {
                      label: "Quantity",
                      value: `${selectedRFQ.quantity.toLocaleString()} ${selectedRFQ.uom}`,
                    },
                    {
                      label: "Material code",
                      value: selectedRFQ.materialCode,
                    },
                    {
                      label: "Invited suppliers",
                      value: String(selectedRFQ.invitedSuppliers),
                    },
                    {
                      label: "Quotes received",
                      value: String(getReceivedQuotes(selectedRFQ).length),
                    },
                    {
                      label: "Response deadline",
                      value: formatDate(selectedRFQ.responseDueDate),
                    },
                    {
                      label: "Required delivery",
                      value: formatDate(selectedRFQ.requiredDate),
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        padding: 11,
                        border: "1px solid #edf0f5",
                        borderRadius: 9,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          color: "#718096",
                          fontSize: 9,
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 750,
                          marginTop: 6,
                          overflowWrap: "anywhere",
                          lineHeight: 1.6,
                        }}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* PROJECT AND DELIVERY */}
                <div style={{ marginTop: 22 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      marginBottom: 11,
                    }}
                  >
                    Project and delivery
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 9,
                      fontSize: 11,
                      lineHeight: 1.7,
                      color: "#475569",
                    }}
                  >
                    <Building2
                      size={15}
                      color="#64748b"
                      style={{ flexShrink: 0, marginTop: 2 }}
                    />
                    <div>
                      <div style={{ fontWeight: 750 }}>
                        {selectedRFQ.project}
                      </div>
                      <div style={{ color: "#718096", marginTop: 3 }}>
                        {selectedRFQ.deliveryLocation}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 9,
                      fontSize: 10,
                      lineHeight: 1.8,
                      color: "#718096",
                      marginTop: 12,
                    }}
                  >
                    <Package
                      size={15}
                      color="#64748b"
                      style={{ flexShrink: 0, marginTop: 2 }}
                    />
                    <span>{selectedRFQ.specification}</span>
                  </div>

                  <p
                    style={{
                      fontSize: 10,
                      lineHeight: 1.8,
                      color: "#718096",
                      margin: "12px 0 0",
                    }}
                  >
                    {selectedRFQ.description}
                  </p>
                </div>

                {/* SUPPLIER QUOTATIONS */}
                <div style={{ marginTop: 24 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      Supplier quotations
                    </div>

                    <span
                      style={{
                        fontSize: 10,
                        color: "#718096",
                      }}
                    >
                      {selectedRFQ.quotes.length} records
                    </span>
                  </div>

                  {selectedRFQ.quotes.length > 0 ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      {selectedRFQ.quotes.map((quote) => (
                        <div
                          key={quote.supplierId}
                          style={{
                            padding: 12,
                            border: "1px solid #e5eaf1",
                            borderRadius: 9,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: 8,
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 750,
                                  lineHeight: 1.6,
                                }}
                              >
                                {quote.supplierName}
                              </div>
                              <div
                                style={{
                                  color: "#94a3b8",
                                  fontSize: 9,
                                  marginTop: 3,
                                }}
                              >
                                {quote.supplierId}
                                {quote.quoteNumber
                                  ? ` · ${quote.quoteNumber}`
                                  : ""}
                              </div>
                            </div>

                            <StatusBadge value={quote.status} />
                          </div>

                          {quote.status === "RECEIVED" ? (
                            <>
                              <div
                                style={{
                                  fontSize: 18,
                                  fontWeight: 800,
                                  letterSpacing: "-0.03em",
                                  marginTop: 13,
                                }}
                              >
                                {formatMoney(
                                  quote.amount ?? 0,
                                  quote.currency
                                )}
                              </div>

                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "1fr 1fr",
                                  gap: 10,
                                  marginTop: 12,
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      color: "#94a3b8",
                                      fontSize: 9,
                                    }}
                                  >
                                    Lead time
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 750,
                                      marginTop: 4,
                                    }}
                                  >
                                    {quote.leadTimeDays ?? "—"} days
                                  </div>
                                </div>

                                <div>
                                  <div
                                    style={{
                                      color: "#94a3b8",
                                      fontSize: 9,
                                    }}
                                  >
                                    Delivery date
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 750,
                                      marginTop: 4,
                                    }}
                                  >
                                    {quote.deliveryDate
                                      ? formatDate(quote.deliveryDate)
                                      : "—"}
                                  </div>
                                </div>

                                <div>
                                  <div
                                    style={{
                                      color: "#94a3b8",
                                      fontSize: 9,
                                    }}
                                  >
                                    Payment terms
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 750,
                                      marginTop: 4,
                                    }}
                                  >
                                    {quote.paymentTerms ?? "Not specified"}
                                  </div>
                                </div>

                                <div>
                                  <div
                                    style={{
                                      color: "#94a3b8",
                                      fontSize: 9,
                                    }}
                                  >
                                    Validity
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 750,
                                      marginTop: 4,
                                    }}
                                  >
                                    {quote.validityDays
                                      ? `${quote.validityDays} days`
                                      : "Not specified"}
                                  </div>
                                </div>
                              </div>

                              {quote.notes && (
                                <div
                                  style={{
                                    marginTop: 10,
                                    paddingTop: 9,
                                    borderTop: "1px solid #edf0f5",
                                    color: "#718096",
                                    fontSize: 9,
                                    lineHeight: 1.7,
                                  }}
                                >
                                  {quote.notes}
                                </div>
                              )}
                            </>
                          ) : (
                            <div
                              style={{
                                color: "#718096",
                                fontSize: 10,
                                lineHeight: 1.7,
                                marginTop: 10,
                              }}
                            >
                              {quote.status === "DECLINED"
                                ? "The supplier declined to quote."
                                : "Awaiting a quotation response from this supplier."}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: 17,
                        border: "1px dashed #cbd5e1",
                        borderRadius: 9,
                        color: "#718096",
                        fontSize: 11,
                        lineHeight: 1.7,
                      }}
                    >
                      No supplier responses have been recorded for this RFQ.
                    </div>
                  )}
                </div>

                {/* ACTIONS */}
                <div
                  style={{
                    display: "grid",
                    gap: 9,
                    marginTop: 23,
                    paddingTop: 18,
                    borderTop: "1px solid #edf0f5",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const received = getReceivedQuotes(selectedRFQ).length;

                      setNotice(
                        received > 0
                          ? `${received} quotation(s) are available for ${selectedRFQ.id}. Review the commercial terms before making a sourcing decision.`
                          : `No quotations have been received for ${selectedRFQ.id} yet.`
                      );
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      width: "100%",
                      border: "1px solid #dbe2ea",
                      background: "#fff",
                      color: "#334155",
                      borderRadius: 8,
                      padding: "11px 12px",
                      fontSize: 11,
                      fontWeight: 750,
                      cursor: "pointer",
                    }}
                  >
                    <Eye size={14} />
                    Review quotations
                  </button>

                  {selectedRFQ.status === "ISSUED" &&
                    getReceivedQuotes(selectedRFQ).length > 0 && (
                      <button
                        type="button"
                        onClick={() => markEvaluationPending(selectedRFQ)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          width: "100%",
                          border: "1px solid #172554",
                          background: "#172554",
                          color: "#fff",
                          borderRadius: 8,
                          padding: "11px 12px",
                          fontSize: 11,
                          fontWeight: 750,
                          cursor: "pointer",
                        }}
                      >
                        <ClipboardCheck size={14} />
                        Mark evaluation pending
                      </button>
                    )}

                  {selectedRFQ.status === "DRAFT" && (
                    <button
                      type="button"
                      onClick={() =>
                        setNotice(
                          "This RFQ remains a demo draft. Real issuance requires backend validation, authorization, and supplier invitation integration."
                        )
                      }
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        width: "100%",
                        border: "1px solid #172554",
                        background: "#172554",
                        color: "#fff",
                        borderRadius: 8,
                        padding: "11px 12px",
                        fontSize: 11,
                        fontWeight: 750,
                        cursor: "pointer",
                      }}
                    >
                      <Send size={14} />
                      Review draft issuance
                    </button>
                  )}
                </div>

                <div
                  style={{
                    color: "#94a3b8",
                    fontSize: 9,
                    lineHeight: 1.7,
                    marginTop: 13,
                  }}
                >
                  Actions on this panel update demo state only. They do not
                  submit an evaluation, approve a supplier, or issue an RFQ.
                </div>
              </div>
            </aside>
          )}
        </div>

        {/* NOTIFICATION */}
        {notice && (
          <div
            role="status"
            style={{
              position: "fixed",
              right: 24,
              bottom: 24,
              zIndex: 1100,
              maxWidth: 460,
              display: "flex",
              alignItems: "flex-start",
              gap: 9,
              padding: "13px 15px",
              borderRadius: 10,
              border: "1px solid #bfdbfe",
              background: "#eff6ff",
              color: "#1d4ed8",
              lineHeight: 1.7,
              boxShadow: "0 8px 30px rgba(15,23,42,0.12)",
            }}
          >
            <CheckCircle2
              size={17}
              style={{ flexShrink: 0, marginTop: 2 }}
            />
            <span style={{ flex: 1 }}>{notice}</span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
              style={{
                border: 0,
                background: "transparent",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* CREATE RFQ MODAL */}
        {showCreateForm && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-rfq-title"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1200,
              background: "rgba(15,23,42,0.48)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 18,
            }}
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setShowCreateForm(false);
              }
            }}
          >
            <form
              onSubmit={createDemoRFQ}
              style={{
                width: "100%",
                maxWidth: 650,
                maxHeight: "90vh",
                overflowY: "auto",
                background: "#fff",
                borderRadius: 14,
                padding: 25,
                boxShadow: "0 20px 70px rgba(15,23,42,0.2)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      color: "#64748b",
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.09em",
                    }}
                  >
                    SOURCING WORKSPACE
                  </div>

                  <h2
                    id="create-rfq-title"
                    style={{
                      fontSize: 21,
                      fontWeight: 800,
                      margin: "7px 0 0",
                    }}
                  >
                    Create demo RFQ
                  </h2>
                </div>

                <button
                  type="button"
                  aria-label="Close create RFQ form"
                  onClick={() => setShowCreateForm(false)}
                  style={{
                    border: 0,
                    background: "#f1f5f9",
                    borderRadius: 8,
                    padding: 8,
                    cursor: "pointer",
                  }}
                >
                  <X size={17} />
                </button>
              </div>

              <p
                style={{
                  color: "#64748b",
                  fontSize: 11,
                  lineHeight: 1.7,
                  margin: "12px 0 20px",
                }}
              >
                Create a draft RFQ for the demo. Supplier selection, invitations
                and issuance are not connected to the backend.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 14,
                }}
              >
                <div style={{ gridColumn: "1 / -1" }}>
                  <label
                    htmlFor="rfq-material"
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 750,
                      marginBottom: 7,
                    }}
                  >
                    Material description *
                  </label>
                  <input
                    id="rfq-material"
                    required
                    value={newMaterial}
                    onChange={(event) => setNewMaterial(event.target.value)}
                    placeholder="e.g. API 6D Class 600 Carbon Steel Valve"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label
                    htmlFor="rfq-material-code"
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 750,
                      marginBottom: 7,
                    }}
                  >
                    Material code *
                  </label>
                  <input
                    id="rfq-material-code"
                    required
                    value={newMaterialCode}
                    onChange={(event) =>
                      setNewMaterialCode(event.target.value)
                    }
                    placeholder="e.g. VAL-001"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label
                    htmlFor="rfq-quantity"
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 750,
                      marginBottom: 7,
                    }}
                  >
                    Quantity *
                  </label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) 95px",
                      gap: 8,
                    }}
                  >
                    <input
                      id="rfq-quantity"
                      required
                      type="number"
                      min="1"
                      step="any"
                      value={newQuantity}
                      onChange={(event) => setNewQuantity(event.target.value)}
                      style={inputStyle}
                    />
                    <select
                      aria-label="Unit of measure"
                      value={newUom}
                      onChange={(event) => setNewUom(event.target.value)}
                      style={inputStyle}
                    >
                      <option value="EA">EA</option>
                      <option value="KG">KG</option>
                      <option value="MT">MT</option>
                      <option value="M">M</option>
                      <option value="SET">SET</option>
                    </select>
                  </div>
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label
                    htmlFor="rfq-specification"
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 750,
                      marginBottom: 7,
                    }}
                  >
                    Technical specification *
                  </label>
                  <textarea
                    id="rfq-specification"
                    required
                    value={newSpecification}
                    onChange={(event) =>
                      setNewSpecification(event.target.value)
                    }
                    placeholder="Grade, pressure class, standard and project requirements"
                    rows={3}
                    style={{
                      ...inputStyle,
                      resize: "vertical",
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="rfq-project"
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 750,
                      marginBottom: 7,
                    }}
                  >
                    Project *
                  </label>
                  <input
                    id="rfq-project"
                    required
                    value={newProject}
                    onChange={(event) => setNewProject(event.target.value)}
                    placeholder="Project name"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label
                    htmlFor="rfq-location"
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 750,
                      marginBottom: 7,
                    }}
                  >
                    Delivery location *
                  </label>
                  <input
                    id="rfq-location"
                    required
                    value={newLocation}
                    onChange={(event) => setNewLocation(event.target.value)}
                    placeholder="City, country"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label
                    htmlFor="rfq-due-date"
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 750,
                      marginBottom: 7,
                    }}
                  >
                    Response deadline *
                  </label>
                  <input
                    id="rfq-due-date"
                    required
                    type="date"
                    value={newDueDate}
                    onChange={(event) => setNewDueDate(event.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label
                    htmlFor="rfq-required-date"
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 750,
                      marginBottom: 7,
                    }}
                  >
                    Required delivery date *
                  </label>
                  <input
                    id="rfq-required-date"
                    required
                    type="date"
                    value={newRequiredDate}
                    onChange={(event) =>
                      setNewRequiredDate(event.target.value)
                    }
                    style={inputStyle}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 9,
                  marginTop: 24,
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  style={{
                    border: "1px solid #dbe2ea",
                    background: "#fff",
                    color: "#334155",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 11,
                    fontWeight: 750,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    background: "#172554",
                    color: "#fff",
                    border: "1px solid #172554",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 11,
                    fontWeight: 750,
                    cursor: "pointer",
                  }}
                >
                  <Plus size={14} />
                  Create draft RFQ
                </button>
              </div>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
