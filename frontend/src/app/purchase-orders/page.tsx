
"use client";

import ProcurementSidebar from "../components/ProcurementSidebar";
import {
  Search,
  Plus,
  Download,
  X,
  FileCheck,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  CalendarDays,
  Building2,
  Package,
  Truck,
  ClipboardCheck,
  CircleDollarSign,
  ChevronRight,
  MapPin,
  CreditCard,
} from "lucide-react";
import {
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

type POStatus =
  | "DRAFT"
  | "PENDING APPROVAL"
  | "APPROVED"
  | "ISSUED"
  | "PARTIALLY RECEIVED"
  | "COMPLETED"
  | "CANCELLED";

type POItem = {
  code: string;
  name: string;
  specification: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  receivedQuantity: number;
};

type PurchaseOrder = {
  id: string;
  requestNumber: string;
  rfqNumber: string;
  supplierId: string;
  supplierName: string;
  supplierCountry: string;
  project: string;
  deliveryLocation: string;
  orderDate: string;
  expectedDelivery: string;
  currency: string;
  status: POStatus;
  paymentTerms: string;
  buyer: string;
  approvalOwner: string;
  approvalDate?: string;
  items: POItem[];
  notes: string;
};

const INITIAL_ORDERS: PurchaseOrder[] = [
  {
    id: "PO-20261005-0001",
    requestNumber: "REQ-20260929-9E7835E1",
    rfqNumber: "RFQ-20261003-0001",
    supplierId: "SUP-001",
    supplierName: "Gulf Valve Industries",
    supplierCountry: "United Arab Emirates",
    project: "EPC Project — Middle East",
    deliveryLocation: "Dubai, United Arab Emirates",
    orderDate: "2026-10-05",
    expectedDelivery: "2026-10-28",
    currency: "USD",
    status: "PENDING APPROVAL",
    paymentTerms: "Net 45",
    buyer: "Procurement Team",
    approvalOwner: "Procurement Head",
    items: [
      {
        code: "VAL-API6D-600-CS",
        name: "API 6D Class 600 Carbon Steel Valve",
        specification:
          "API 6D, Class 600, Carbon Steel, RF, project-approved specification",
        quantity: 200,
        uom: "EA",
        unitPrice: 1192.5,
        receivedQuantity: 0,
      },
    ],
    notes:
      "Illustrative purchase order draft associated with the sourcing demo. Approval is pending; this is not a real issued order.",
  },
  {
    id: "PO-20261002-0002",
    requestNumber: "REQ-20260920-B31F220A",
    rfqNumber: "RFQ-20260922-0004",
    supplierId: "SUP-004",
    supplierName: "Precision Steel Components",
    supplierCountry: "India",
    project: "EPC Project — India",
    deliveryLocation: "Mumbai, India",
    orderDate: "2026-10-02",
    expectedDelivery: "2026-10-20",
    currency: "USD",
    status: "ISSUED",
    paymentTerms: "Net 45",
    buyer: "Procurement Team",
    approvalOwner: "Procurement Head",
    approvalDate: "2026-10-01",
    items: [
      {
        code: "STL-FRG-001",
        name: "Steel Forgings",
        specification: "Forged steel components; project-approved grade",
        quantity: 120,
        uom: "EA",
        unitPrice: 729.17,
        receivedQuantity: 40,
      },
    ],
    notes:
      "Illustrative issued order with partial receiving progress for the demo.",
  },
  {
    id: "PO-20260928-0003",
    requestNumber: "REQ-20260925-DA018D42",
    rfqNumber: "RFQ-20260924-0003",
    supplierId: "SUP-002",
    supplierName: "Emirates Process Equipment",
    supplierCountry: "United Arab Emirates",
    project: "EPC Project — Southeast Asia",
    deliveryLocation: "Singapore",
    orderDate: "2026-09-28",
    expectedDelivery: "2026-11-12",
    currency: "USD",
    status: "APPROVED",
    paymentTerms: "Net 30",
    buyer: "Procurement Team",
    approvalOwner: "Finance Controller",
    approvalDate: "2026-09-27",
    items: [
      {
        code: "VAL-IND-001",
        name: "Industrial Valve",
        specification: "Industrial valve; final specification per project",
        quantity: 150,
        uom: "EA",
        unitPrice: 840,
        receivedQuantity: 0,
      },
    ],
    notes:
      "Illustrative approved order awaiting formal issue. Approval does not itself mean the PO has been sent to the supplier.",
  },
  {
    id: "PO-20260918-0004",
    requestNumber: "REQ-20260910-7B9C1011",
    rfqNumber: "RFQ-20260912-0002",
    supplierId: "SUP-005",
    supplierName: "Northstar Industrial Supply",
    supplierCountry: "United States",
    project: "Plant Maintenance",
    deliveryLocation: "Houston, United States",
    orderDate: "2026-09-18",
    expectedDelivery: "2026-10-05",
    currency: "USD",
    status: "COMPLETED",
    paymentTerms: "Net 30",
    buyer: "Maintenance Procurement",
    approvalOwner: "Procurement Head",
    approvalDate: "2026-09-17",
    items: [
      {
        code: "MRO-SP-001",
        name: "MRO Spare Parts",
        specification: "Replacement parts; approved technical equivalents",
        quantity: 75,
        uom: "EA",
        unitPrice: 320,
        receivedQuantity: 75,
      },
    ],
    notes: "Illustrative completed order. All quantities have been received.",
  },
  {
    id: "PO-20261008-0005",
    requestNumber: "REQ-20261007-CC81A903",
    rfqNumber: "RFQ-20261008-0005",
    supplierId: "SUP-003",
    supplierName: "Global Industrial Valves",
    supplierCountry: "India",
    project: "EPC Project — Europe",
    deliveryLocation: "Hamburg, Germany",
    orderDate: "2026-10-08",
    expectedDelivery: "2026-11-15",
    currency: "USD",
    status: "DRAFT",
    paymentTerms: "Not agreed",
    buyer: "Procurement Team",
    approvalOwner: "Procurement Head",
    items: [
      {
        code: "VAL-GATE-CS",
        name: "Industrial Gate Valve",
        specification: "Carbon steel, flanged ends; project specification",
        quantity: 50,
        uom: "EA",
        unitPrice: 650,
        receivedQuantity: 0,
      },
    ],
    notes:
      "Illustrative draft only. Supplier qualification and all technical and quality requirements must be verified before approval.",
  },
  {
    id: "PO-20260915-0006",
    requestNumber: "REQ-20260912-2A17D05B",
    rfqNumber: "RFQ-20260914-0001",
    supplierId: "SUP-004",
    supplierName: "Precision Steel Components",
    supplierCountry: "India",
    project: "EPC Project — Middle East",
    deliveryLocation: "Dubai, United Arab Emirates",
    orderDate: "2026-09-15",
    expectedDelivery: "2026-10-25",
    currency: "USD",
    status: "PARTIALLY RECEIVED",
    paymentTerms: "Net 45",
    buyer: "Procurement Team",
    approvalOwner: "Procurement Head",
    approvalDate: "2026-09-14",
    items: [
      {
        code: "STL-COMP-002",
        name: "Steel Components",
        specification: "Project-approved steel components",
        quantity: 500,
        uom: "EA",
        unitPrice: 86,
        receivedQuantity: 325,
      },
    ],
    notes:
      "Illustrative order with outstanding quantity still awaiting receipt.",
  },
];

const STATUS_STYLES: Record<POStatus, CSSProperties> = {
  DRAFT: { background: "#f1f5f9", color: "#475569" },
  "PENDING APPROVAL": { background: "#fef3c7", color: "#92400e" },
  APPROVED: { background: "#ede9fe", color: "#5b21b6" },
  ISSUED: { background: "#dbeafe", color: "#1d4ed8" },
  "PARTIALLY RECEIVED": { background: "#ffedd5", color: "#9a3412" },
  COMPLETED: { background: "#dcfce7", color: "#166534" },
  CANCELLED: { background: "#fee2e2", color: "#991b1b" },
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

function StatusBadge({ value }: { value: POStatus }) {
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

function formatDate(value?: string): string {
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

function getOrderValue(order: PurchaseOrder): number {
  return order.items.reduce(
    (total, item) => total + item.quantity * item.unitPrice,
    0
  );
}

function getReceivedValue(order: PurchaseOrder): number {
  return order.items.reduce(
    (total, item) => total + item.receivedQuantity * item.unitPrice,
    0
  );
}

function getReceivedQuantity(order: PurchaseOrder): number {
  return order.items.reduce(
    (total, item) => total + item.receivedQuantity,
    0
  );
}

function getOrderedQuantity(order: PurchaseOrder): number {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>(INITIAL_ORDERS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    INITIAL_ORDERS[0]?.id ?? null
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [notice, setNotice] = useState("");

  const [newSupplier, setNewSupplier] = useState("");
  const [newProject, setNewProject] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newMaterial, setNewMaterial] = useState("");
  const [newMaterialCode, setNewMaterialCode] = useState("");
  const [newQuantity, setNewQuantity] = useState("100");
  const [newUnitPrice, setNewUnitPrice] = useState("100");
  const [newDeliveryDate, setNewDeliveryDate] = useState("2026-12-15");
  const [newPaymentTerms, setNewPaymentTerms] = useState("Net 30");

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !query ||
        [
          order.id,
          order.requestNumber,
          order.rfqNumber,
          order.supplierId,
          order.supplierName,
          order.project,
          order.deliveryLocation,
          ...order.items.flatMap((item) => [
            item.name,
            item.code,
            item.specification,
          ]),
        ].some((value) => value.toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "ALL" || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const selectedOrder =
    orders.find((order) => order.id === selectedOrderId) ?? null;

  const pendingApproval = orders.filter(
    (order) => order.status === "PENDING APPROVAL"
  ).length;

  const issuedOrders = orders.filter(
    (order) =>
      order.status === "ISSUED" || order.status === "PARTIALLY RECEIVED"
  ).length;

  const totalCommittedValue = orders
    .filter(
      (order) =>
        order.status !== "DRAFT" &&
        order.status !== "CANCELLED" &&
        order.status !== "PENDING APPROVAL"
    )
    .reduce((total, order) => total + getOrderValue(order), 0);

  const receivedValue = orders.reduce(
    (total, order) => total + getReceivedValue(order),
    0
  );

  function createDemoOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const quantity = Number(newQuantity);
    const unitPrice = Number(newUnitPrice);

    if (
      !newSupplier.trim() ||
      !newProject.trim() ||
      !newLocation.trim() ||
      !newMaterial.trim() ||
      !newMaterialCode.trim() ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !Number.isFinite(unitPrice) ||
      unitPrice < 0 ||
      !newDeliveryDate
    ) {
      setNotice("Complete all required fields with valid values.");
      return;
    }

    const today = new Date();
    const datePrefix = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("");

    const sameDayCount = orders.filter((order) =>
      order.id.startsWith(`PO-${datePrefix}-`)
    ).length;

    const id = `PO-${datePrefix}-${String(sameDayCount + 1).padStart(4, "0")}`;

    const newOrder: PurchaseOrder = {
      id,
      requestNumber: "DEMO-REQUEST",
      rfqNumber: "DEMO-RFQ",
      supplierId: "DEMO-SUPPLIER",
      supplierName: newSupplier.trim(),
      supplierCountry: "Not specified",
      project: newProject.trim(),
      deliveryLocation: newLocation.trim(),
      orderDate: [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
      ].join("-"),
      expectedDelivery: newDeliveryDate,
      currency: "USD",
      status: "DRAFT",
      paymentTerms: newPaymentTerms,
      buyer: "Procurement Team",
      approvalOwner: "Procurement Head",
      items: [
        {
          code: newMaterialCode.trim(),
          name: newMaterial.trim(),
          specification: "To be confirmed against approved project specification",
          quantity,
          uom: "EA",
          unitPrice,
          receivedQuantity: 0,
        },
      ],
      notes:
        "Demo draft created in the frontend. It has not been approved or issued to a supplier.",
    };

    setOrders((previous) => [newOrder, ...previous]);
    setSelectedOrderId(id);
    setSearch("");
    setStatusFilter("ALL");
    setShowCreateForm(false);
    setNewSupplier("");
    setNewProject("");
    setNewLocation("");
    setNewMaterial("");
    setNewMaterialCode("");
    setNewQuantity("100");
    setNewUnitPrice("100");
    setNotice(`${id} created as a demo draft. No supplier was notified.`);
  }

  function exportOrders() {
    const headers = [
      "PO Number",
      "Request Number",
      "RFQ Number",
      "Supplier",
      "Supplier ID",
      "Project",
      "Delivery Location",
      "Order Date",
      "Expected Delivery",
      "Status",
      "Currency",
      "Order Value",
      "Received Value",
      "Payment Terms",
    ];

    const rows = filteredOrders.map((order) => [
      order.id,
      order.requestNumber,
      order.rfqNumber,
      order.supplierName,
      order.supplierId,
      order.project,
      order.deliveryLocation,
      order.orderDate,
      order.expectedDelivery,
      order.status,
      order.currency,
      getOrderValue(order),
      getReceivedValue(order),
      order.paymentTerms,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "purchase-orders-demo.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    setNotice("Filtered purchase order register exported to CSV.");
  }

  function updateDemoStatus(order: PurchaseOrder, status: POStatus) {
    if (
      status === "ISSUED" &&
      order.status !== "APPROVED"
    ) {
      setNotice(
        "Only an approved order can move to Issued. This is a demo safeguard."
      );
      return;
    }

    if (
      status === "APPROVED" &&
      order.status !== "PENDING APPROVAL"
    ) {
      setNotice(
        "Only a pending order can be marked approved in this demo."
      );
      return;
    }

    setOrders((previous) =>
      previous.map((item) =>
        item.id === order.id ? { ...item, status } : item
      )
    );

    setNotice(
      `${order.id} updated to ${status} in demo state only. No approval or supplier communication occurred.`
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
        {/* HEADER */}
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
              Purchase Orders
            </h1>

            <p
              style={{
                color: "#64748b",
                margin: 0,
                lineHeight: 1.7,
                maxWidth: 700,
              }}
            >
              Monitor purchase commitments, approvals, supplier orders, and
              delivery progress across your procurement projects.
            </p>
          </div>

          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={exportOrders}
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
              Create draft PO
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
            Demo workspace: purchase order records are illustrative. Draft
            creation, status changes, and CSV export are frontend-only actions.
            No order is submitted to a supplier or saved to PostgreSQL.
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
              label: "Total purchase orders",
              value: String(orders.length),
              helper: "Across the demo workspace",
              icon: <FileCheck size={19} />,
            },
            {
              label: "Pending approval",
              value: String(pendingApproval),
              helper: "Awaiting human decision",
              icon: <Clock3 size={19} />,
            },
            {
              label: "Issued / in progress",
              value: String(issuedOrders),
              helper: "Orders with delivery activity",
              icon: <Truck size={19} />,
            },
            {
              label: "Committed order value",
              value: formatMoney(totalCommittedValue),
              helper: "Excludes drafts and pending approval",
              icon: <CircleDollarSign size={19} />,
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
                  fontSize: metric.label === "Committed order value" ? 24 : 28,
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

        {/* RECEIVING SUMMARY */}
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
              <ClipboardCheck size={19} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800 }}>
                Value of goods received
              </div>
              <div
                style={{
                  color: "#718096",
                  fontSize: 10,
                  marginTop: 4,
                }}
              >
                Illustrative received quantities across all orders.
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
            {formatMoney(receivedValue)}
          </div>
        </div>

        {/* REGISTER + DETAIL PANEL */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: selectedOrder
              ? "minmax(0, 1.55fr) minmax(320px, 0.85fr)"
              : "minmax(0, 1fr)",
            gap: 18,
            alignItems: "start",
          }}
        >
          <section
            style={{
              background: "#fff",
              border: "1px solid #e5eaf1",
              borderRadius: 12,
              overflow: "hidden",
              minWidth: 0,
            }}
          >
            {/* REGISTER FILTERS */}
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
                  <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>
                    Purchase order register
                  </h2>
                  <p
                    style={{
                      color: "#718096",
                      fontSize: 11,
                      margin: "6px 0 0",
                    }}
                  >
                    {filteredOrders.length} purchase orders matching your filters
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("ALL");
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
                    "minmax(180px, 1fr) minmax(150px, 190px)",
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
                    placeholder="Search PO, supplier, material, project..."
                    aria-label="Search purchase orders"
                    style={{
                      ...inputStyle,
                      paddingLeft: 35,
                    }}
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  aria-label="Filter by purchase order status"
                  style={inputStyle}
                >
                  <option value="ALL">All PO statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PENDING APPROVAL">Pending approval</option>
                  <option value="APPROVED">Approved</option>
                  <option value="ISSUED">Issued</option>
                  <option value="PARTIALLY RECEIVED">Partially received</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            {/* TABLE */}
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  minWidth: 960,
                  borderCollapse: "collapse",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {[
                      "PURCHASE ORDER",
                      "SUPPLIER",
                      "ORDER VALUE",
                      "EXPECTED DELIVERY",
                      "STATUS",
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
                  {filteredOrders.map((order) => {
                    const selected = selectedOrderId === order.id;

                    return (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedOrderId(order.id)}
                        style={{
                          cursor: "pointer",
                          background: selected ? "#f0f4ff" : "#fff",
                        }}
                      >
                        <td
                          style={{
                            padding: "15px 14px",
                            borderBottom: "1px solid #edf0f5",
                          }}
                        >
                          <div
                            style={{
                              color: "#4f46e5",
                              fontSize: 10,
                              fontWeight: 800,
                            }}
                          >
                            {order.id}
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
                            {order.items[0]?.name ?? "No line items"}
                          </div>
                          <div
                            style={{
                              color: "#94a3b8",
                              fontSize: 10,
                              marginTop: 4,
                            }}
                          >
                            {order.items.length} line item(s) ·{" "}
                            {order.items.reduce(
                              (total, item) => total + item.quantity,
                              0
                            )}{" "}
                            units
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
                              fontSize: 11,
                              fontWeight: 750,
                              lineHeight: 1.6,
                            }}
                          >
                            {order.supplierName}
                          </div>
                          <div
                            style={{
                              color: "#94a3b8",
                              fontSize: 10,
                              marginTop: 4,
                            }}
                          >
                            {order.supplierId}
                          </div>
                        </td>

                        <td
                          style={{
                            padding: "15px 14px",
                            borderBottom: "1px solid #edf0f5",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 800 }}>
                            {formatMoney(getOrderValue(order), order.currency)}
                          </div>
                          <div
                            style={{
                              color: "#94a3b8",
                              fontSize: 9,
                              marginTop: 4,
                            }}
                          >
                            {order.currency}
                          </div>
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
                            {formatDate(order.expectedDelivery)}
                          </div>
                          <div
                            style={{
                              color: "#94a3b8",
                              fontSize: 9,
                              marginTop: 5,
                            }}
                          >
                            Expected delivery
                          </div>
                        </td>

                        <td
                          style={{
                            padding: "15px 14px",
                            borderBottom: "1px solid #edf0f5",
                          }}
                        >
                          <StatusBadge value={order.status} />
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

                  {filteredOrders.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          padding: 38,
                          textAlign: "center",
                          color: "#64748b",
                        }}
                      >
                        No purchase orders match your search and filters.
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
              Illustrative purchase order records · Select a row to inspect
              approval, line items, and receiving progress.
            </div>
          </section>

          {/* DETAIL PANEL */}
          {selectedOrder && (
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
                    <FileCheck size={20} />
                  </div>

                  <button
                    type="button"
                    aria-label="Close purchase order details"
                    onClick={() => setSelectedOrderId(null)}
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
                  {selectedOrder.id}
                </h2>

                <div
                  style={{
                    color: "#64748b",
                    fontSize: 11,
                    lineHeight: 1.7,
                  }}
                >
                  {selectedOrder.supplierName}
                </div>

                <div style={{ marginTop: 12 }}>
                  <StatusBadge value={selectedOrder.status} />
                </div>

                <div
                  style={{
                    fontSize: 25,
                    fontWeight: 800,
                    letterSpacing: "-0.04em",
                    marginTop: 16,
                  }}
                >
                  {formatMoney(
                    getOrderValue(selectedOrder),
                    selectedOrder.currency
                  )}
                </div>
                <div
                  style={{
                    color: "#718096",
                    fontSize: 10,
                    marginTop: 4,
                  }}
                >
                  Total order value · {selectedOrder.currency}
                </div>
              </div>

              <div style={{ padding: 20 }}>
                {/* KEY DETAILS */}
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    marginBottom: 12,
                  }}
                >
                  Order details
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
                      label: "Order date",
                      value: formatDate(selectedOrder.orderDate),
                    },
                    {
                      label: "Expected delivery",
                      value: formatDate(selectedOrder.expectedDelivery),
                    },
                    {
                      label: "Request number",
                      value: selectedOrder.requestNumber,
                    },
                    {
                      label: "RFQ number",
                      value: selectedOrder.rfqNumber,
                    },
                    {
                      label: "Payment terms",
                      value: selectedOrder.paymentTerms,
                    },
                    {
                      label: "Buyer",
                      value: selectedOrder.buyer,
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
                          fontSize: 10,
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

                {/* SUPPLIER AND DELIVERY */}
                <div style={{ marginTop: 22 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      marginBottom: 11,
                    }}
                  >
                    Supplier and delivery
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
                        {selectedOrder.supplierName}
                      </div>
                      <div style={{ color: "#718096", marginTop: 3 }}>
                        {selectedOrder.supplierId} ·{" "}
                        {selectedOrder.supplierCountry}
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
                    <MapPin
                      size={15}
                      color="#64748b"
                      style={{ flexShrink: 0, marginTop: 2 }}
                    />
                    <span>{selectedOrder.deliveryLocation}</span>
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
                    <CreditCard
                      size={15}
                      color="#64748b"
                      style={{ flexShrink: 0, marginTop: 2 }}
                    />
                    <span>
                      Payment terms: {selectedOrder.paymentTerms}
                    </span>
                  </div>
                </div>

                {/* LINE ITEMS */}
                <div style={{ marginTop: 24 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      marginBottom: 12,
                    }}
                  >
                    Order line items
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    {selectedOrder.items.map((item) => {
                      const progress =
                        item.quantity > 0
                          ? Math.min(
                              100,
                              (item.receivedQuantity / item.quantity) * 100
                            )
                          : 0;

                      return (
                        <div
                          key={item.code}
                          style={{
                            padding: 12,
                            border: "1px solid #e5eaf1",
                            borderRadius: 9,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 750,
                              lineHeight: 1.6,
                            }}
                          >
                            {item.name}
                          </div>

                          <div
                            style={{
                              color: "#94a3b8",
                              fontSize: 9,
                              marginTop: 4,
                            }}
                          >
                            {item.code}
                          </div>

                          <div
                            style={{
                              color: "#718096",
                              fontSize: 10,
                              lineHeight: 1.7,
                              marginTop: 8,
                            }}
                          >
                            {item.specification}
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
                                Ordered quantity
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  marginTop: 4,
                                }}
                              >
                                {item.quantity.toLocaleString()} {item.uom}
                              </div>
                            </div>

                            <div>
                              <div
                                style={{
                                  color: "#94a3b8",
                                  fontSize: 9,
                                }}
                              >
                                Unit price
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  marginTop: 4,
                                }}
                              >
                                {formatMoney(item.unitPrice, selectedOrder.currency)}
                              </div>
                            </div>

                            <div>
                              <div
                                style={{
                                  color: "#94a3b8",
                                  fontSize: 9,
                                }}
                              >
                                Received
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  marginTop: 4,
                                }}
                              >
                                {item.receivedQuantity.toLocaleString()} {item.uom}
                              </div>
                            </div>

                            <div>
                              <div
                                style={{
                                  color: "#94a3b8",
                                  fontSize: 9,
                                }}
                              >
                                Line value
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  marginTop: 4,
                                }}
                              >
                                {formatMoney(
                                  item.quantity * item.unitPrice,
                                  selectedOrder.currency
                                )}
                              </div>
                            </div>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 8,
                              marginTop: 14,
                              color: "#64748b",
                              fontSize: 9,
                            }}
                          >
                            <span>Receiving progress</span>
                            <span>{Math.round(progress)}%</span>
                          </div>

                          <div
                            style={{
                              height: 6,
                              borderRadius: 6,
                              background: "#e2e8f0",
                              overflow: "hidden",
                              marginTop: 6,
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${progress}%`,
                                borderRadius: 6,
                                background: progress === 100 ? "#16a34a" : "#6366f1",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      marginTop: 14,
                      padding: 12,
                      background: "#f8fafc",
                      borderRadius: 8,
                    }}
                  >
                    <div>
                      <div style={{ color: "#64748b", fontSize: 10 }}>
                        Total received quantity
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          marginTop: 5,
                        }}
                      >
                        {getReceivedQuantity(selectedOrder).toLocaleString()} /{" "}
                        {getOrderedQuantity(selectedOrder).toLocaleString()}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: "#64748b", fontSize: 10 }}>
                        Received value
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          marginTop: 5,
                        }}
                      >
                        {formatMoney(
                          getReceivedValue(selectedOrder),
                          selectedOrder.currency
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* APPROVAL INFORMATION */}
                <div style={{ marginTop: 24 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      marginBottom: 11,
                    }}
                  >
                    Approval information
                  </div>

                  <div
                    style={{
                      padding: 13,
                      border: "1px solid #edf0f5",
                      borderRadius: 9,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 11,
                        fontWeight: 750,
                      }}
                    >
                      {selectedOrder.status === "APPROVED" ||
                      selectedOrder.status === "ISSUED" ||
                      selectedOrder.status === "PARTIALLY RECEIVED" ||
                      selectedOrder.status === "COMPLETED" ? (
                        <CheckCircle2 size={15} color="#16a34a" />
                      ) : (
                        <Clock3 size={15} color="#d97706" />
                      )}
                      {selectedOrder.status === "APPROVED" ||
                      selectedOrder.status === "ISSUED" ||
                      selectedOrder.status === "PARTIALLY RECEIVED" ||
                      selectedOrder.status === "COMPLETED"
                        ? "Approval recorded in demo data"
                        : selectedOrder.status === "PENDING APPROVAL"
                          ? "Awaiting approval"
                          : "No approval recorded"}
                    </div>

                    <div
                      style={{
                        color: "#718096",
                        fontSize: 10,
                        lineHeight: 1.8,
                        marginTop: 9,
                      }}
                    >
                      Approval owner: {selectedOrder.approvalOwner}
                    </div>

                    {selectedOrder.approvalDate && (
                      <div
                        style={{
                          color: "#718096",
                          fontSize: 10,
                          lineHeight: 1.8,
                        }}
                      >
                        Approval date: {formatDate(selectedOrder.approvalDate)}
                      </div>
                    )}

                    <div
                      style={{
                        color: "#718096",
                        fontSize: 10,
                        lineHeight: 1.8,
                        marginTop: 9,
                      }}
                    >
                      {selectedOrder.notes}
                    </div>
                  </div>
                </div>

                {/* DEMO WORKFLOW ACTIONS */}
                <div
                  style={{
                    display: "grid",
                    gap: 9,
                    marginTop: 22,
                    paddingTop: 18,
                    borderTop: "1px solid #edf0f5",
                  }}
                >
                  {selectedOrder.status === "PENDING APPROVAL" && (
                    <button
                      type="button"
                      onClick={() =>
                        updateDemoStatus(selectedOrder, "APPROVED")
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
                      <CheckCircle2 size={14} />
                      Mark approved — demo
                    </button>
                  )}

                  {selectedOrder.status === "APPROVED" && (
                    <button
                      type="button"
                      onClick={() => updateDemoStatus(selectedOrder, "ISSUED")}
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
                      <Truck size={14} />
                      Mark issued — demo
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setNotice(
                        `${selectedOrder.id}: ${selectedOrder.status}. This action displays the demo record only; no external document was generated.`
                      )
                    }
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
                    <FileCheck size={14} />
                    View PO record
                  </button>
                </div>

                <div
                  style={{
                    color: "#94a3b8",
                    fontSize: 9,
                    lineHeight: 1.7,
                    marginTop: 13,
                  }}
                >
                  Demo actions change local screen state only. They do not
                  create formal approvals, send a PO, or update receiving
                  records in the backend.
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

        {/* CREATE DRAFT PO MODAL */}
        {showCreateForm && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-po-title"
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
              onSubmit={createDemoOrder}
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
                    PROCUREMENT WORKSPACE
                  </div>

                  <h2
                    id="create-po-title"
                    style={{
                      fontSize: 21,
                      fontWeight: 800,
                      margin: "7px 0 0",
                    }}
                  >
                    Create draft purchase order
                  </h2>
                </div>

                <button
                  type="button"
                  aria-label="Close create PO form"
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
                This creates a draft in the demo screen only. It does not
                represent an approved sourcing award or issue a real order.
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
                    htmlFor="po-supplier"
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 750,
                      marginBottom: 7,
                    }}
                  >
                    Supplier name *
                  </label>
                  <input
                    id="po-supplier"
                    required
                    value={newSupplier}
                    onChange={(event) => setNewSupplier(event.target.value)}
                    placeholder="Supplier legal name"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label
                    htmlFor="po-project"
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
                    id="po-project"
                    required
                    value={newProject}
                    onChange={(event) => setNewProject(event.target.value)}
                    placeholder="Project name"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label
                    htmlFor="po-location"
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
                    id="po-location"
                    required
                    value={newLocation}
                    onChange={(event) => setNewLocation(event.target.value)}
                    placeholder="City, country"
                    style={inputStyle}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label
                    htmlFor="po-material"
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
                    id="po-material"
                    required
                    value={newMaterial}
                    onChange={(event) => setNewMaterial(event.target.value)}
                    placeholder="Material or service"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label
                    htmlFor="po-material-code"
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
                    id="po-material-code"
                    required
                    value={newMaterialCode}
                    onChange={(event) => setNewMaterialCode(event.target.value)}
                    placeholder="e.g. VAL-001"
                    style={inputStyle}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  <div>
                    <label
                      htmlFor="po-quantity"
                      style={{
                        display: "block",
                        fontSize: 11,
                        fontWeight: 750,
                        marginBottom: 7,
                      }}
                    >
                      Quantity *
                    </label>
                    <input
                      id="po-quantity"
                      required
                      type="number"
                      min="1"
                      step="any"
                      value={newQuantity}
                      onChange={(event) => setNewQuantity(event.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="po-unit-price"
                      style={{
                        display: "block",
                        fontSize: 11,
                        fontWeight: 750,
                        marginBottom: 7,
                      }}
                    >
                      Unit price (USD) *
                    </label>
                    <input
                      id="po-unit-price"
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={newUnitPrice}
                      onChange={(event) => setNewUnitPrice(event.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="po-delivery-date"
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 750,
                      marginBottom: 7,
                    }}
                  >
                    Expected delivery *
                  </label>
                  <input
                    id="po-delivery-date"
                    required
                    type="date"
                    value={newDeliveryDate}
                    onChange={(event) => setNewDeliveryDate(event.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label
                    htmlFor="po-payment-terms"
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 750,
                      marginBottom: 7,
                    }}
                  >
                    Payment terms
                  </label>
                  <select
                    id="po-payment-terms"
                    value={newPaymentTerms}
                    onChange={(event) => setNewPaymentTerms(event.target.value)}
                    style={inputStyle}
                  >
                    <option value="Net 30">Net 30</option>
                    <option value="Net 45">Net 45</option>
                    <option value="Net 60">Net 60</option>
                    <option value="Advance payment">Advance payment</option>
                    <option value="Not agreed">Not agreed</option>
                  </select>
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
                  Create draft PO
                </button>
              </div>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
