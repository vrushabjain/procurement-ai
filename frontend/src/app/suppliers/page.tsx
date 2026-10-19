
"use client";

import ProcurementSidebar from "../components/ProcurementSidebar";
import {
  Search,
  Plus,
  Download,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Users,
  Star,
  TrendingUp,
  X,
  Mail,
  MapPin,
  CheckCircle2,
  Building2,
  Package,
} from "lucide-react";
import {
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";

type Qualification = "QUALIFIED" | "UNDER REVIEW" | "SUSPENDED";
type Approval = "VALID" | "PENDING" | "EXPIRED";
type Risk = "LOW" | "MEDIUM" | "HIGH";
type MaterialApproval = "APPROVED" | "PENDING" | "NOT APPROVED";

type MaterialDetail = {
  code: string;
  name: string;
  specification: string;
  manufacturer: string;
  standard: string;
  supplyLocation: string;
  approval: MaterialApproval;
};

type Supplier = {
  id: string;
  name: string;
  category: string;
  country: string;
  city: string;
  qualification: Qualification;
  technical: Approval;
  quality: Approval;
  approved: boolean;
  score: number;
  onTime: number;
  spend: number;
  currency: string;
  activeOrders: number;
  risk: Risk;
  email: string;
  lastOrder: string;
  leadTime: number;
  paymentTerms: string;
  materials: string[];
  materialDetails: MaterialDetail[];
};

const DEMO_SUPPLIERS: Supplier[] = [
  {
    id: "SUP-001",
    name: "Gulf Valve Industries",
    category: "Valves & Flow Control",
    country: "United Arab Emirates",
    city: "Dubai",
    qualification: "QUALIFIED",
    technical: "VALID",
    quality: "VALID",
    approved: true,
    score: 94,
    onTime: 96,
    spend: 1845000,
    currency: "USD",
    activeOrders: 8,
    risk: "LOW",
    email: "procurement@gulfvalve.example",
    lastOrder: "2026-10-02",
    leadTime: 25,
    paymentTerms: "Net 45",
    materials: [
      "API 6D valves",
      "Gate valves",
      "Carbon steel valves",
    ],
    materialDetails: [
      {
        code: "VAL-API6D-600-CS",
        name: "API 6D Class 600 Carbon Steel Valve",
        specification: "API 6D, Class 600, Carbon Steel, RF",
        manufacturer: "Demo manufacturer — verify",
        standard: "API 6D",
        supplyLocation: "Dubai, UAE",
        approval: "APPROVED",
      },
      {
        code: "VAL-GATE-CS",
        name: "Carbon Steel Gate Valve",
        specification: "Industrial gate valve; project specification required",
        manufacturer: "Demo manufacturer — verify",
        standard: "Project specification",
        supplyLocation: "Dubai, UAE",
        approval: "APPROVED",
      },
      {
        code: "VAL-FLOW-IND",
        name: "Industrial Flow Control Valve",
        specification: "Specification to be confirmed per project",
        manufacturer: "Demo manufacturer — verify",
        standard: "Project specification",
        supplyLocation: "Dubai, UAE",
        approval: "PENDING",
      },
    ],
  },
  {
    id: "SUP-002",
    name: "Emirates Process Equipment",
    category: "Industrial Equipment",
    country: "United Arab Emirates",
    city: "Abu Dhabi",
    qualification: "QUALIFIED",
    technical: "VALID",
    quality: "VALID",
    approved: true,
    score: 88,
    onTime: 91,
    spend: 1320000,
    currency: "USD",
    activeOrders: 5,
    risk: "LOW",
    email: "sourcing@emiratesprocess.example",
    lastOrder: "2026-09-28",
    leadTime: 40,
    paymentTerms: "Net 30",
    materials: [
      "Industrial valves",
      "Industrial fittings",
      "Process equipment",
    ],
    materialDetails: [
      {
        code: "VAL-IND-001",
        name: "Industrial Valve",
        specification: "Exact grade and pressure class to be confirmed",
        manufacturer: "Demo manufacturer — verify",
        standard: "Project specification",
        supplyLocation: "Abu Dhabi, UAE",
        approval: "APPROVED",
      },
      {
        code: "FIT-IND-001",
        name: "Industrial Fittings",
        specification: "Material grade and dimensions to be confirmed",
        manufacturer: "Demo manufacturer — verify",
        standard: "Project specification",
        supplyLocation: "Abu Dhabi, UAE",
        approval: "APPROVED",
      },
    ],
  },
  {
    id: "SUP-003",
    name: "Global Industrial Valves",
    category: "Valves & Flow Control",
    country: "India",
    city: "Mumbai",
    qualification: "UNDER REVIEW",
    technical: "VALID",
    quality: "EXPIRED",
    approved: false,
    score: 76,
    onTime: 82,
    spend: 485000,
    currency: "USD",
    activeOrders: 2,
    risk: "HIGH",
    email: "sales@globalvalves.example",
    lastOrder: "2026-08-19",
    leadTime: 32,
    paymentTerms: "Net 30",
    materials: ["Ball valves", "Industrial fittings"],
    materialDetails: [],
  },
  {
    id: "SUP-004",
    name: "Precision Steel Components",
    category: "Steel & Components",
    country: "India",
    city: "Pune",
    qualification: "QUALIFIED",
    technical: "VALID",
    quality: "VALID",
    approved: true,
    score: 91,
    onTime: 93,
    spend: 2140000,
    currency: "USD",
    activeOrders: 11,
    risk: "LOW",
    email: "sales@precisionsteel.example",
    lastOrder: "2026-10-05",
    leadTime: 18,
    paymentTerms: "Net 45",
    materials: ["Steel components", "Flanges", "Forgings"],
    materialDetails: [],
  },
  {
    id: "SUP-005",
    name: "Northstar Industrial Supply",
    category: "MRO & Industrial Supply",
    country: "United States",
    city: "Houston",
    qualification: "QUALIFIED",
    technical: "VALID",
    quality: "PENDING",
    approved: true,
    score: 82,
    onTime: 86,
    spend: 765000,
    currency: "USD",
    activeOrders: 4,
    risk: "MEDIUM",
    email: "orders@northstar.example",
    lastOrder: "2026-09-15",
    leadTime: 28,
    paymentTerms: "Net 30",
    materials: ["MRO materials", "Industrial supplies", "Spare parts"],
    materialDetails: [],
  },
  {
    id: "SUP-006",
    name: "Meridian Engineering Supplies",
    category: "Engineering Materials",
    country: "Germany",
    city: "Hamburg",
    qualification: "SUSPENDED",
    technical: "EXPIRED",
    quality: "EXPIRED",
    approved: false,
    score: 68,
    onTime: 72,
    spend: 325000,
    currency: "USD",
    activeOrders: 0,
    risk: "HIGH",
    email: "supply@meridian.example",
    lastOrder: "2026-06-12",
    leadTime: 35,
    paymentTerms: "Net 60",
    materials: ["Engineering materials", "Mechanical components"],
    materialDetails: [],
  },
];

const MATERIAL_TYPES = [
  "API 6D valves",
  "Gate valves",
  "Carbon steel valves",
  "Industrial valves",
  "Industrial fittings",
  "Process equipment",
  "Ball valves",
  "Steel components",
  "Flanges",
  "Forgings",
  "MRO materials",
  "Industrial supplies",
  "Spare parts",
  "Engineering materials",
  "Mechanical components",
];

const qualificationStyles: Record<Qualification, CSSProperties> = {
  QUALIFIED: { background: "#dcfce7", color: "#166534" },
  "UNDER REVIEW": { background: "#fef3c7", color: "#92400e" },
  SUSPENDED: { background: "#fee2e2", color: "#991b1b" },
};

const riskStyles: Record<Risk, CSSProperties> = {
  LOW: { background: "#dcfce7", color: "#166534" },
  MEDIUM: { background: "#fef3c7", color: "#92400e" },
  HIGH: { background: "#fee2e2", color: "#991b1b" },
};

const materialApprovalStyles: Record<MaterialApproval, CSSProperties> = {
  APPROVED: { background: "#dcfce7", color: "#166534" },
  PENDING: { background: "#fef3c7", color: "#92400e" },
  "NOT APPROVED": { background: "#fee2e2", color: "#991b1b" },
};

const labelStyle: CSSProperties = {
  color: "#718096",
  fontSize: 10,
  lineHeight: 1.5,
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: value >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function Badge({
  children,
  style,
}: {
  children: ReactNode;
  style: CSSProperties;
}) {
  return (
    <span
      style={{
        ...style,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 20,
        padding: "5px 9px",
        fontSize: 10,
        fontWeight: 750,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(DEMO_SUPPLIERS);
  const [search, setSearch] = useState("");
  const [materialTypeFilter, setMaterialTypeFilter] = useState("ALL");
  const [qualificationFilter, setQualificationFilter] = useState("ALL");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(
    null
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [notice, setNotice] = useState("");

  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierCountry, setNewSupplierCountry] = useState("");
  const [newSupplierCategory, setNewSupplierCategory] = useState("");

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return suppliers.filter((supplier) => {
      const searchableValues = [
        supplier.id,
        supplier.name,
        supplier.category,
        supplier.country,
        supplier.city,
        ...supplier.materials,
        ...supplier.materialDetails.flatMap((material) => [
          material.code,
          material.name,
          material.specification,
          material.standard,
          material.manufacturer,
        ]),
      ];

      const matchesSearch =
        !query ||
        searchableValues.some((value) =>
          value.toLowerCase().includes(query)
        );

      const matchesMaterialType =
        materialTypeFilter === "ALL" ||
        supplier.materials.some(
          (material) =>
            material.toLowerCase() === materialTypeFilter.toLowerCase()
        ) ||
        supplier.materialDetails.some(
          (material) =>
            material.name.toLowerCase().includes(materialTypeFilter.toLowerCase()) ||
            material.code.toLowerCase().includes(materialTypeFilter.toLowerCase())
        );

      const matchesQualification =
        qualificationFilter === "ALL" ||
        supplier.qualification === qualificationFilter;

      const matchesRisk =
        riskFilter === "ALL" || supplier.risk === riskFilter;

      return (
        matchesSearch &&
        matchesMaterialType &&
        matchesQualification &&
        matchesRisk
      );
    });
  }, [
    suppliers,
    search,
    materialTypeFilter,
    qualificationFilter,
    riskFilter,
  ]);

  const selectedSupplier =
    suppliers.find((supplier) => supplier.id === selectedSupplierId) ?? null;

  const qualifiedCount = suppliers.filter(
    (supplier) => supplier.qualification === "QUALIFIED"
  ).length;

  const approvedCount = suppliers.filter(
    (supplier) => supplier.approved
  ).length;

  const highRiskCount = suppliers.filter(
    (supplier) => supplier.risk === "HIGH"
  ).length;

  const averageScore = suppliers.length
    ? Math.round(
        suppliers.reduce((total, supplier) => total + supplier.score, 0) /
          suppliers.length
      )
    : 0;

  function addSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !newSupplierName.trim() ||
      !newSupplierCountry ||
      !newSupplierCategory
    ) {
      return;
    }

    const supplier: Supplier = {
      id: `DEMO-${String(suppliers.length + 1).padStart(3, "0")}`,
      name: newSupplierName.trim(),
      category: newSupplierCategory,
      country: newSupplierCountry,
      city: "Not specified",
      qualification: "UNDER REVIEW",
      technical: "PENDING",
      quality: "PENDING",
      approved: false,
      score: 0,
      onTime: 0,
      spend: 0,
      currency: "USD",
      activeOrders: 0,
      risk: "MEDIUM",
      email: "Not provided",
      lastOrder: "—",
      leadTime: 0,
      paymentTerms: "Not agreed",
      materials: [],
      materialDetails: [],
    };

    setSuppliers((previous) => [...previous, supplier]);
    setSelectedSupplierId(supplier.id);
    setSearch("");
    setMaterialTypeFilter("ALL");
    setQualificationFilter("ALL");
    setRiskFilter("ALL");
    setNewSupplierName("");
    setNewSupplierCountry("");
    setNewSupplierCategory("");
    setShowAddForm(false);
    setNotice(
      "Supplier added to this demo session. Qualification is pending; no backend record was created."
    );
  }

  function exportSuppliers() {
    const headers = [
      "Supplier ID",
      "Supplier Name",
      "Category",
      "Country",
      "Qualification",
      "Approved",
      "Performance Score",
      "On-Time Delivery %",
      "Risk",
      "Material Codes",
      "Materials",
    ];

    const rows = filteredSuppliers.map((supplier) => [
      supplier.id,
      supplier.name,
      supplier.category,
      supplier.country,
      supplier.qualification,
      supplier.approved ? "Yes" : "No",
      supplier.score,
      supplier.onTime,
      supplier.risk,
      supplier.materialDetails.map((material) => material.code).join("; "),
      supplier.materials.join("; "),
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
    anchor.download = "procurement-suppliers-demo.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    setNotice("Supplier register exported to CSV.");
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
            marginBottom: 24,
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
              Supplier Intelligence
            </h1>

            <p
              style={{
                color: "#64748b",
                margin: 0,
                lineHeight: 1.7,
              }}
            >
              Manage supplier qualification, materials, performance, compliance
              and risk across your global supply network.
            </p>
          </div>

          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={exportSuppliers}
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
                setShowAddForm(true);
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
              Add supplier
            </button>
          </div>
        </div>

        {/* DEMO DATA NOTICE */}
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
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            Demo workspace: supplier and material information is illustrative.
            Material approvals and specifications must be verified against
            authoritative records. Changes are temporary and are not saved to
            the procurement database.
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
              label: "Total suppliers",
              value: suppliers.length.toString(),
              helper: "Across the demo network",
              icon: <Users size={19} />,
            },
            {
              label: "Qualified suppliers",
              value: qualifiedCount.toString(),
              helper: `${suppliers.length - qualifiedCount} require review`,
              icon: <ShieldCheck size={19} />,
            },
            {
              label: "Approved suppliers",
              value: approvedCount.toString(),
              helper: "Approval flag in demo data",
              icon: <CheckCircle2 size={19} />,
            },
            {
              label: "Average performance",
              value: `${averageScore}/100`,
              helper: `${highRiskCount} suppliers flagged high risk`,
              icon: <TrendingUp size={19} />,
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

        {/* REGISTER AND DETAIL PANEL */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: selectedSupplier
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
            {/* REGISTER HEADER AND FILTERS */}
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
                    Supplier register
                  </h2>

                  <p
                    style={{
                      color: "#718096",
                      fontSize: 11,
                      margin: "6px 0 0",
                    }}
                  >
                    {filteredSuppliers.length} suppliers matching your filters
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setMaterialTypeFilter("ALL");
                    setQualificationFilter("ALL");
                    setRiskFilter("ALL");
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
                    "minmax(180px, 1fr) repeat(3, minmax(130px, 165px))",
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
                    placeholder="Search supplier, material, code..."
                    aria-label="Search suppliers and materials"
                    style={{
                      ...inputStyle,
                      paddingLeft: 35,
                    }}
                  />
                </div>

                {/* MATERIAL TYPE FILTER */}
                <select
                  value={materialTypeFilter}
                  onChange={(event) =>
                    setMaterialTypeFilter(event.target.value)
                  }
                  aria-label="Filter by material type"
                  style={inputStyle}
                >
                  <option value="ALL">All material types</option>
                  {MATERIAL_TYPES.map((materialType) => (
                    <option key={materialType} value={materialType}>
                      {materialType}
                    </option>
                  ))}
                </select>

                {/* QUALIFICATION FILTER */}
                <select
                  value={qualificationFilter}
                  onChange={(event) =>
                    setQualificationFilter(event.target.value)
                  }
                  aria-label="Filter by qualification"
                  style={inputStyle}
                >
                  <option value="ALL">All qualifications</option>
                  <option value="QUALIFIED">Qualified</option>
                  <option value="UNDER REVIEW">Under review</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>

                {/* RISK FILTER */}
                <select
                  value={riskFilter}
                  onChange={(event) => setRiskFilter(event.target.value)}
                  aria-label="Filter by risk"
                  style={inputStyle}
                >
                  <option value="ALL">All risk levels</option>
                  <option value="LOW">Low risk</option>
                  <option value="MEDIUM">Medium risk</option>
                  <option value="HIGH">High risk</option>
                </select>
              </div>
            </div>

            {/* SUPPLIER TABLE */}
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  minWidth: 850,
                  borderCollapse: "collapse",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {[
                      "SUPPLIER",
                      "MATERIALS",
                      "QUALIFICATION",
                      "PERFORMANCE",
                      "RISK",
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
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredSuppliers.map((supplier) => {
                    const selected = selectedSupplierId === supplier.id;

                    return (
                      <tr
                        key={supplier.id}
                        onClick={() => setSelectedSupplierId(supplier.id)}
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
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 9,
                                background: "#eef2ff",
                                color: "#4f46e5",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <Building2 size={17} />
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  color: "#172033",
                                  fontWeight: 750,
                                  fontSize: 11,
                                  maxWidth: 205,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {supplier.name}
                              </div>
                              <div
                                style={{
                                  color: "#94a3b8",
                                  fontSize: 10,
                                  marginTop: 4,
                                }}
                              >
                                {supplier.id}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* MATERIAL TAGS */}
                        <td
                          style={{
                            padding: "12px 14px",
                            borderBottom: "1px solid #edf0f5",
                            minWidth: 180,
                            maxWidth: 260,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 5,
                            }}
                          >
                            {supplier.materials.length > 0 ? (
                              <>
                                {supplier.materials.slice(0, 2).map((material) => (
                                  <span
                                    key={material}
                                    style={{
                                      background: "#f1f5f9",
                                      color: "#475569",
                                      borderRadius: 5,
                                      padding: "4px 6px",
                                      fontSize: 9,
                                      lineHeight: 1.5,
                                    }}
                                  >
                                    {material}
                                  </span>
                                ))}

                                {supplier.materials.length > 2 && (
                                  <span
                                    style={{
                                      color: "#64748b",
                                      fontSize: 10,
                                      padding: "4px 2px",
                                    }}
                                  >
                                    +{supplier.materials.length - 2}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span
                                style={{
                                  color: "#94a3b8",
                                  fontSize: 10,
                                }}
                              >
                                Not recorded
                              </span>
                            )}
                          </div>

                          {supplier.materialDetails.length > 0 && (
                            <div
                              style={{
                                marginTop: 5,
                                color: "#64748b",
                                fontSize: 9,
                              }}
                            >
                              {supplier.materialDetails.length} catalogue records
                            </div>
                          )}
                        </td>

                        <td
                          style={{
                            padding: "15px 14px",
                            borderBottom: "1px solid #edf0f5",
                          }}
                        >
                          <Badge
                            style={qualificationStyles[supplier.qualification]}
                          >
                            {supplier.qualification}
                          </Badge>
                        </td>

                        <td
                          style={{
                            padding: "15px 14px",
                            borderBottom: "1px solid #edf0f5",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              fontWeight: 800,
                              fontSize: 12,
                            }}
                          >
                            <Star size={13} color="#d97706" />
                            {supplier.score || "—"}
                            <span
                              style={{
                                fontSize: 10,
                                color: "#94a3b8",
                                fontWeight: 500,
                              }}
                            >
                              /100
                            </span>
                          </div>
                        </td>

                        <td
                          style={{
                            padding: "15px 14px",
                            borderBottom: "1px solid #edf0f5",
                          }}
                        >
                          <Badge style={riskStyles[supplier.risk]}>
                            {supplier.risk}
                          </Badge>
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

                  {filteredSuppliers.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          padding: 38,
                          textAlign: "center",
                          color: "#64748b",
                        }}
                      >
                        No suppliers match your search and filters.
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
              Illustrative supplier records · Select a row to inspect the
              supplier profile and material catalogue.
            </div>
          </section>

          {/* SUPPLIER DETAIL PANEL */}
          {selectedSupplier && (
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
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 43,
                      height: 43,
                      borderRadius: 12,
                      background: "#e0e7ff",
                      color: "#4338ca",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Building2 size={21} />
                  </div>

                  <button
                    type="button"
                    aria-label="Close supplier details"
                    onClick={() => setSelectedSupplierId(null)}
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
                    fontSize: 19,
                    lineHeight: 1.4,
                    letterSpacing: "-0.035em",
                    margin: "15px 0 6px",
                    overflowWrap: "anywhere",
                  }}
                >
                  {selectedSupplier.name}
                </h2>

                <div style={{ color: "#64748b", fontSize: 11 }}>
                  {selectedSupplier.id} · {selectedSupplier.category}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 7,
                    flexWrap: "wrap",
                    marginTop: 13,
                  }}
                >
                  <Badge
                    style={qualificationStyles[selectedSupplier.qualification]}
                  >
                    {selectedSupplier.qualification}
                  </Badge>
                  <Badge style={riskStyles[selectedSupplier.risk]}>
                    {selectedSupplier.risk} RISK
                  </Badge>
                </div>
              </div>

              <div style={{ padding: 20 }}>
                {/* PERFORMANCE AND COMMERCIAL METRICS */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  {[
                    {
                      label: "Performance score",
                      value: `${selectedSupplier.score}/100`,
                    },
                    {
                      label: "On-time delivery",
                      value: `${selectedSupplier.onTime}%`,
                    },
                    {
                      label: "Active orders",
                      value: String(selectedSupplier.activeOrders),
                    },
                    {
                      label: "Lead time",
                      value: selectedSupplier.leadTime
                        ? `${selectedSupplier.leadTime} days`
                        : "Not available",
                    },
                    {
                      label: "Recorded spend",
                      value: formatCurrency(selectedSupplier.spend),
                    },
                    {
                      label: "Payment terms",
                      value: selectedSupplier.paymentTerms,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        padding: 12,
                        border: "1px solid #edf0f5",
                        borderRadius: 9,
                        minWidth: 0,
                      }}
                    >
                      <div style={labelStyle}>{item.label}</div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          overflowWrap: "anywhere",
                          marginTop: 6,
                        }}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* SUPPLIER QUALIFICATION */}
                <div style={{ marginTop: 23 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      marginBottom: 12,
                    }}
                  >
                    Supplier qualification
                  </div>

                  {[
                    {
                      label: "Supplier approval",
                      value: selectedSupplier.approved
                        ? "Approved"
                        : "Not approved",
                      pass: selectedSupplier.approved,
                    },
                    {
                      label: "Technical approval",
                      value: selectedSupplier.technical,
                      pass: selectedSupplier.technical === "VALID",
                    },
                    {
                      label: "Quality approval",
                      value: selectedSupplier.quality,
                      pass: selectedSupplier.quality === "VALID",
                    },
                  ].map((check) => (
                    <div
                      key={check.label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "center",
                        padding: "11px 0",
                        borderBottom: "1px solid #edf0f5",
                      }}
                    >
                      <span style={{ color: "#64748b", fontSize: 11 }}>
                        {check.label}
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          color: check.pass ? "#15803d" : "#b45309",
                          fontWeight: 750,
                          fontSize: 10,
                          textAlign: "right",
                        }}
                      >
                        {check.pass ? (
                          <CheckCircle2 size={13} />
                        ) : (
                          <AlertTriangle size={13} />
                        )}
                        {check.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* MATERIALS SUPPLIED */}
                <div style={{ marginTop: 24 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      fontWeight: 800,
                      marginBottom: 5,
                    }}
                  >
                    <Package size={16} color="#4f46e5" />
                    Materials supplied
                  </div>

                  <div
                    style={{
                      color: "#718096",
                      fontSize: 10,
                      lineHeight: 1.7,
                      marginBottom: 13,
                    }}
                  >
                    Material catalogue and material-specific qualification.
                    Demo details require verification.
                  </div>

                  {selectedSupplier.materialDetails.length > 0 ? (
                    <div style={{ display: "grid", gap: 11 }}>
                      {selectedSupplier.materialDetails.map((material) => (
                        <div
                          key={material.code}
                          style={{
                            padding: 12,
                            border: "1px solid #e5eaf1",
                            borderRadius: 9,
                            background: "#fff",
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
                                  overflowWrap: "anywhere",
                                }}
                              >
                                {material.name}
                              </div>
                              <div
                                style={{
                                  color: "#64748b",
                                  fontSize: 9,
                                  marginTop: 3,
                                }}
                              >
                                {material.code}
                              </div>
                            </div>

                            <Badge
                              style={materialApprovalStyles[material.approval]}
                            >
                              {material.approval}
                            </Badge>
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: "10px 12px",
                              marginTop: 12,
                            }}
                          >
                            {[
                              {
                                label: "Specification",
                                value: material.specification,
                              },
                              {
                                label: "Standard",
                                value: material.standard,
                              },
                              {
                                label: "Manufacturer",
                                value: material.manufacturer,
                              },
                              {
                                label: "Supply location",
                                value: material.supplyLocation,
                              },
                            ].map((detail) => (
                              <div key={detail.label} style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    color: "#94a3b8",
                                    fontSize: 9,
                                    marginBottom: 4,
                                  }}
                                >
                                  {detail.label}
                                </div>
                                <div
                                  style={{
                                    color: "#475569",
                                    fontSize: 10,
                                    lineHeight: 1.6,
                                    overflowWrap: "anywhere",
                                  }}
                                >
                                  {detail.value}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: 15,
                        border: "1px dashed #cbd5e1",
                        borderRadius: 9,
                        color: "#64748b",
                        fontSize: 11,
                        lineHeight: 1.7,
                      }}
                    >
                      No detailed material catalogue has been recorded for this
                      supplier. General categories are not a substitute for
                      verified material approvals.
                    </div>
                  )}

                  {selectedSupplier.materials.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 750,
                          marginBottom: 9,
                        }}
                      >
                        General supply categories
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 7,
                        }}
                      >
                        {selectedSupplier.materials.map((material) => (
                          <span
                            key={material}
                            style={{
                              background: "#f1f5f9",
                              color: "#475569",
                              borderRadius: 6,
                              padding: "6px 8px",
                              fontSize: 10,
                            }}
                          >
                            {material}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* CONTACT AND LOCATION */}
                <div style={{ marginTop: 24 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      marginBottom: 11,
                    }}
                  >
                    Contact and location
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 9,
                      color: "#64748b",
                      fontSize: 11,
                      lineHeight: 1.8,
                      overflowWrap: "anywhere",
                    }}
                  >
                    <MapPin size={14} style={{ flexShrink: 0, marginTop: 3 }} />
                    {selectedSupplier.city}, {selectedSupplier.country}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 9,
                      color: "#64748b",
                      fontSize: 11,
                      lineHeight: 1.8,
                      marginTop: 8,
                      overflowWrap: "anywhere",
                    }}
                  >
                    <Mail size={14} style={{ flexShrink: 0, marginTop: 3 }} />
                    {selectedSupplier.email}
                  </div>
                </div>

                {/* DETAIL ACTIONS */}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 24,
                    paddingTop: 18,
                    borderTop: "1px solid #edf0f5",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setNotice(
                        `Supplier profile reviewed: ${selectedSupplier.name}. This action is demo-only.`
                      )
                    }
                    style={{
                      flex: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 7,
                      border: "1px solid #dbe2ea",
                      background: "#fff",
                      color: "#334155",
                      borderRadius: 8,
                      padding: "10px 8px",
                      fontSize: 10,
                      fontWeight: 750,
                      cursor: "pointer",
                    }}
                  >
                    <ShieldCheck size={14} />
                    Review profile
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setNotice(
                        `Supplier ${selectedSupplier.id} selected for inspection only. No qualification or award status has changed.`
                      )
                    }
                    style={{
                      flex: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 7,
                      border: "1px solid #172554",
                      background: "#172554",
                      color: "#fff",
                      borderRadius: 8,
                      padding: "10px 8px",
                      fontSize: 10,
                      fontWeight: 750,
                      cursor: "pointer",
                    }}
                  >
                    <Package size={14} />
                    View activity
                  </button>
                </div>

                <div
                  style={{
                    marginTop: 14,
                    color: "#94a3b8",
                    fontSize: 10,
                    lineHeight: 1.7,
                  }}
                >
                  Last recorded order: {selectedSupplier.lastOrder}
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
              maxWidth: 450,
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
            <CheckCircle2 size={17} style={{ flexShrink: 0, marginTop: 2 }} />
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

        {/* ADD SUPPLIER MODAL */}
        {showAddForm && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-supplier-title"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,0.48)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 18,
              zIndex: 1200,
            }}
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setShowAddForm(false);
              }
            }}
          >
            <form
              onSubmit={addSupplier}
              style={{
                width: "100%",
                maxWidth: 500,
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
                  alignItems: "center",
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
                    SUPPLIER MANAGEMENT
                  </div>
                  <h2
                    id="add-supplier-title"
                    style={{
                      fontSize: 21,
                      fontWeight: 800,
                      margin: "7px 0 0",
                    }}
                  >
                    Add supplier
                  </h2>
                </div>

                <button
                  type="button"
                  aria-label="Close form"
                  onClick={() => setShowAddForm(false)}
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
                  fontSize: 12,
                  lineHeight: 1.7,
                  margin: "12px 0 22px",
                }}
              >
                Add a demo supplier. It starts with qualification status Under
                Review and is not saved to the backend database.
              </p>

              <label
                htmlFor="supplier-name"
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 750,
                  marginBottom: 7,
                }}
              >
                Supplier name
              </label>
              <input
                id="supplier-name"
                required
                value={newSupplierName}
                onChange={(event) => setNewSupplierName(event.target.value)}
                placeholder="e.g. Apex Industrial Supplies"
                style={inputStyle}
              />

              <label
                htmlFor="supplier-country"
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 750,
                  margin: "16px 0 7px",
                }}
              >
                Country
              </label>
              <select
                id="supplier-country"
                required
                value={newSupplierCountry}
                onChange={(event) => setNewSupplierCountry(event.target.value)}
                style={inputStyle}
              >
                <option value="">Select country</option>
                <option value="India">India</option>
                <option value="United Arab Emirates">United Arab Emirates</option>
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Germany">Germany</option>
                <option value="Singapore">Singapore</option>
                <option value="Saudi Arabia">Saudi Arabia</option>
              </select>

              <label
                htmlFor="supplier-category"
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 750,
                  margin: "16px 0 7px",
                }}
              >
                Supplier category
              </label>
              <select
                id="supplier-category"
                required
                value={newSupplierCategory}
                onChange={(event) => setNewSupplierCategory(event.target.value)}
                style={inputStyle}
              >
                <option value="">Select category</option>
                <option value="Valves & Flow Control">Valves & Flow Control</option>
                <option value="Steel & Components">Steel & Components</option>
                <option value="Industrial Equipment">Industrial Equipment</option>
                <option value="Electrical Equipment">Electrical Equipment</option>
                <option value="MRO & Industrial Supply">MRO & Industrial Supply</option>
                <option value="Engineering Materials">Engineering Materials</option>
              </select>

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
                  onClick={() => setShowAddForm(false)}
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
                  Add to demo
                </button>
              </div>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
