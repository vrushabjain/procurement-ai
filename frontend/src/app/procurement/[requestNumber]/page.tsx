

"use client";

import { useCallback, useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import {

  ArrowLeft,

  ArrowRight,

  CalendarDays,

  CheckCircle2,

  Clock3,


  RefreshCw,

  Sparkles,

  Truck,

  Warehouse,

  AlertCircle,

  ClipboardCheck,

} from "lucide-react";

import ProcurementSidebar from "../../components/ProcurementSidebar";

import {

  getProcurementRequestByNumber,

  getMaterials,

  getSupplyAnalysis,

  getSupplyDecision,

  getSupplierEligibility,

} from "@/lib/api";

type AnyRecord = Record<string, any>;

const styles: Record<string, React.CSSProperties> = {

  page: {

    minHeight: "100vh",

    background: "#f4f7fb",

    color: "#172033",

    fontFamily: "Arial, Helvetica, sans-serif",

  },

  header: {

    height: 70,

    padding: "0 30px",

    background: "#ffffff",

    borderBottom: "1px solid #e5eaf1",

    display: "flex",

    justifyContent: "space-between",

    alignItems: "center",

    gap: 16,

  },

  headerEyebrow: {

    color: "#64748b",

    fontSize: 11,

    fontWeight: 700,

    letterSpacing: "0.12em",

    textTransform: "uppercase",

  },

  breadcrumb: {

    display: "flex",

    alignItems: "center",

    gap: 8,

    marginTop: 6,

    color: "#64748b",

    fontSize: 12,

  },

  avatar: {

    width: 36,

    height: 36,

    borderRadius: "50%",

    background: "#e8eefc",

    color: "#3157a4",

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    fontSize: 12,

    fontWeight: 700,

  },

  content: {

    maxWidth: 1500,

    margin: "0 auto",

    padding: "26px 30px 36px",

  },

  backLink: {

    display: "inline-flex",

    alignItems: "center",

    gap: 8,

    color: "#64748b",

    textDecoration: "none",

    fontSize: 12,

    fontWeight: 600,

    marginBottom: 20,

  },

  card: {

    background: "#ffffff",

    border: "1px solid #e3e9f1",

    borderRadius: 14,

    boxShadow: "0 2px 8px rgba(20, 35, 60, 0.025)",

    overflow: "hidden",

  },

  hero: {

    padding: "25px 28px",

    borderBottom: "1px solid #edf0f5",

  },

  eyebrow: {

    color: "#64748b",

    fontSize: 10,

    fontWeight: 700,

    letterSpacing: "0.13em",

    textTransform: "uppercase",

  },

  title: {

    margin: "12px 0 7px",

    fontSize: 25,

    lineHeight: 1.35,

    fontWeight: 700,

    letterSpacing: "-0.5px",

    color: "#172033",

  },

  subtitle: {

    margin: 0,

    fontSize: 13,

    color: "#64748b",

    lineHeight: 1.7,

  },

  badgeRow: {

    display: "flex",

    alignItems: "center",

    flexWrap: "wrap",

    gap: 8,

  },

  badge: {

    display: "inline-flex",

    alignItems: "center",

    padding: "6px 10px",

    borderRadius: 20,

    fontSize: 10,

    fontWeight: 700,

    letterSpacing: "0.03em",

  },

  button: {

    display: "inline-flex",

    alignItems: "center",

    justifyContent: "center",

    gap: 9,

    border: "none",

    borderRadius: 8,

    background: "#172033",

    color: "#ffffff",

    padding: "12px 16px",

    fontSize: 12,

    fontWeight: 700,

    textDecoration: "none",

    cursor: "pointer",

    whiteSpace: "nowrap",

  },

  secondaryButton: {

    display: "inline-flex",

    alignItems: "center",

    justifyContent: "center",

    gap: 8,

    border: "1px solid #dce3ed",

    borderRadius: 8,

    background: "#ffffff",

    color: "#334155",

    padding: "10px 12px",

    fontSize: 12,

    fontWeight: 600,

    cursor: "pointer",

  },

  section: {

    marginTop: 20,

    padding: 24,

    background: "#ffffff",

    border: "1px solid #e3e9f1",

    borderRadius: 14,

  },

  sectionTitle: {

    margin: 0,

    fontSize: 15,

    fontWeight: 700,

    color: "#172033",

  },

  sectionSubtitle: {

    margin: "6px 0 0",

    fontSize: 12,

    lineHeight: 1.6,

    color: "#7b8799",

  },

  infoGrid: {

    display: "grid",

    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",

  },

  infoItem: {

    padding: "20px 22px",

    borderRight: "1px solid #edf0f5",

    borderBottom: "1px solid #edf0f5",

    minWidth: 0,

  },

  label: {

    color: "#8994a5",

    fontSize: 10,

    fontWeight: 700,

    letterSpacing: "0.08em",

    textTransform: "uppercase",

  },

  value: {

    marginTop: 8,

    fontSize: 13,

    fontWeight: 700,

    color: "#273449",

    overflowWrap: "anywhere",

  },

  aiCard: {

    marginTop: 20,

    padding: 24,

    border: "1px solid #dbe5fb",

    borderRadius: 14,

    background: "linear-gradient(115deg, #f0f5ff, #ffffff 80%)",

  },

  aiIcon: {

    width: 42,

    height: 42,

    borderRadius: 12,

    background: "#dfe9ff",

    color: "#315bc0",

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    flexShrink: 0,

  },

  grid: {

    display: "grid",

    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 290px), 1fr))",

    gap: 18,

    marginTop: 18,

  },

  warehouseCard: {

    padding: 20,

    background: "#ffffff",

    border: "1px solid #e3e9f1",

    borderRadius: 12,

    minWidth: 0,

  },

  metric: {

    padding: "12px 0",

    borderBottom: "1px solid #edf0f5",

    display: "flex",

    alignItems: "center",

    justifyContent: "space-between",

    gap: 12,

    fontSize: 12,

  },

  planStep: {

    padding: 16,

    border: "1px solid #e3e9f1",

    borderRadius: 10,

    background: "#ffffff",

  },

  stepNumber: {

    width: 27,

    height: 27,

    borderRadius: "50%",

    background: "#e9efff",

    color: "#315bc0",

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    fontWeight: 700,

    fontSize: 11,

    marginBottom: 12,

  },

  loading: {

    minHeight: "55vh",

    display: "flex",

    flexDirection: "column",

    alignItems: "center",

    justifyContent: "center",

    gap: 12,

    color: "#64748b",

    textAlign: "center",

    padding: 24,

  },

  footer: {

    display: "flex",

    flexWrap: "wrap",

    justifyContent: "space-between",

    gap: 10,

    padding: "24px 0",

    color: "#94a3b8",

    fontSize: 10,

  },

};

function asObject(value: any): AnyRecord {

  if (value && typeof value === "object") return value;

  return {};

}

function firstValue(

  object: AnyRecord,

  keys: string[],

  fallback: any = null

): any {

  for (const key of keys) {

    if (object[key] !== undefined && object[key] !== null) {

      return object[key];

    }

  }

  return fallback;

}

function formatQuantity(value: any): string {

  if (value === null || value === undefined || value === "") {

    return "—";

  }

  const number = Number(value);

  return Number.isFinite(number)

    ? number.toLocaleString("en-IN", {

        maximumFractionDigits: 3,

      })

    : String(value);

}

function displayDate(value: any): string {

  if (!value) return "—";

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB", {

    day: "2-digit",

    month: "short",

    year: "numeric",

  });

}

function Badge({

  children,

  background = "#eef2f7",

  color = "#475569",

}: {

  children: React.ReactNode;

  background?: string;

  color?: string;

}) {

  return (

    <span style={{ ...styles.badge, background, color }}>

      {children}

    </span>

  );

}

function InfoItem({

  label,

  value,

}: {

  label: string;

  value: React.ReactNode;

}) {

  return (

    <div style={styles.infoItem}>

      <div style={styles.label}>{label}</div>

      <div style={styles.value}>{value || "—"}</div>

    </div>

  );

}

function MetricRow({

  label,

  value,

  strong = false,

}: {

  label: string;

  value: React.ReactNode;

  strong?: boolean;

}) {

  return (

    <div style={styles.metric}>

      <span style={{ color: "#64748b" }}>{label}</span>

      <strong

        style={{

          color: strong ? "#172033" : "#334155",

          textAlign: "right",

          overflowWrap: "anywhere",

        }}

      >

        {value ?? "—"}

      </strong>

    </div>

  );

}

export default function ProcurementRequestPage() {

  const params = useParams<{ requestNumber: string }>();

  const router = useRouter();

  const requestNumber = String(params.requestNumber ?? "");

  const [request, setRequest] = useState<AnyRecord | null>(null);

  const [supplyAnalysis, setSupplyAnalysis] = useState<AnyRecord | null>(null);

  const [supplyDecision, setSupplyDecision] = useState<AnyRecord | null>(null);

  const [supplierEligibility, setSupplierEligibility] =

    useState<AnyRecord | null>(null);

  const [materialCatalog, setMaterialCatalog] = useState<AnyRecord[]>([]);

  const [serviceErrors, setServiceErrors] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const loadRequest = useCallback(

    async (refresh = false) => {

      if (!requestNumber) {

        setError("No procurement request number was provided.");

        setLoading(false);

        return;

      }

      if (refresh) setRefreshing(true);

      else setLoading(true);

      setError("");

      try {

        const requestResult = asObject(

          await getProcurementRequestByNumber(requestNumber)

        );

        const items = Array.isArray(requestResult.items)

          ? requestResult.items

          : [];

        setRequest(requestResult);

        setServiceErrors([]);

        try {
          const materialsResult = await getMaterials();
          setMaterialCatalog(Array.isArray(materialsResult) ? materialsResult : []);
        } catch {
          setMaterialCatalog([]);
        }
        setServiceErrors([]);

        if (!items.length) {

          setSupplyAnalysis(null);

          setSupplyDecision(null);

          setSupplierEligibility(null);

          setServiceErrors([]);

          return;

        }

        const requestId = String(requestResult.id);

        const itemId = String(items[0].id);

        const results = await Promise.allSettled([

          getSupplyAnalysis(requestId, itemId),

          getSupplyDecision(requestId, itemId),

          getSupplierEligibility(requestId, itemId),

        ]);

        setSupplyAnalysis(

          results[0].status === "fulfilled"

            ? asObject(results[0].value)

            : null

        );

        setSupplyDecision(

          results[1].status === "fulfilled"

            ? asObject(results[1].value)

            : null

        );

        setSupplierEligibility(

          results[2].status === "fulfilled"

            ? asObject(results[2].value)

            : null

        );

        const serviceNames = ["Supply analysis", "Supply decision", "Supplier eligibility"];
        const failedServices = results
          .map((result, index) => result.status === "rejected" ? serviceNames[index] : null)
          .filter((name): name is string => Boolean(name));
        setServiceErrors(failedServices);

      } catch (err) {

        setError(

          err instanceof Error

            ? err.message

            : "Unable to load the procurement request."

        );

      } finally {

        setLoading(false);

        setRefreshing(false);

      }

    },

    [requestNumber]

  );

  useEffect(() => {

    void loadRequest();

  }, [loadRequest]);

  const item = request?.items?.[0] ?? {};

  const decision = supplyDecision ?? {};

  const analysis = supplyAnalysis ?? {};

  const eligibility = supplierEligibility ?? {};

  const decisionType = String(

    firstValue(decision, ["decision", "decision_type", "recommendation"], "PENDING")

  );

  const decisionReason = String(

    firstValue(

      decision,

      ["reason", "explanation", "summary", "decision_reason"],

      "Supply analysis has not returned a decision summary."

    )

  );

  const internalQuantity = firstValue(

    decision,

    ["recommended_quantity", "internal_transfer_quantity", "internal_quantity"],

    null

  );

  const externalQuantity = firstValue(

    decision,

    ["shortage_quantity", "external_quantity", "external_sourcing_quantity"],

    null

  );

  const supplierCount = firstValue(

    eligibility,

    ["eligible_supplier_count", "eligible_count", "total_eligible", "count"],

    Array.isArray(eligibility.suppliers) ? eligibility.suppliers.length : null

  );

  const priority = String(request?.priority ?? "NORMAL").toUpperCase();

  const status = String(request?.status ?? "UNKNOWN").replaceAll("_", " ");

  const selectedMaterial = materialCatalog.find(
    (material) => String(material.id) === String(item.material_id)
  );

  const materialTitle = String(
    firstValue(
      item,
      ["material_name", "material_description", "name"],
      selectedMaterial?.material_name || selectedMaterial?.material_code || item.material_id || "Procurement Material"
    )
  );

  const specification = String(

    firstValue(item, ["technical_specification"], "No technical specification provided.")

  );

  const analysisRows = [

    {

      label: "Local available to promise",

      value: firstValue(

        analysis,

        ["local_atp", "local_available_to_promise", "local_available_quantity"],

        null

      ),

    },

    {

      label: "Internal network availability",

      value: firstValue(

        analysis,

        ["total_internal_atp", "internal_atp", "internal_available_quantity"],

        null

      ),

    },

    {

      label: "Requested quantity",

      value: item.quantity,

    },

    {

      label: "Unit of measure",

      value: item.uom,

    },

  ];

  if (loading) {

    return (

      <main className="app-shell">

        <ProcurementSidebar />

        <section className="control-tower-shell" style={styles.page}>

          <div style={styles.loading}>

            <RefreshCw size={28} />

            <strong style={{ color: "#172033", fontSize: 16 }}>

              Loading Request 360

            </strong>

            <span style={{ fontSize: 13 }}>

              Retrieving procurement and supply intelligence…

            </span>

          </div>

        </section>

      </main>

    );

  }

  if (error && !request) {

    return (

      <main className="app-shell">

        <ProcurementSidebar />

        <section className="control-tower-shell" style={styles.page}>

          <div style={styles.content}>

            <div style={styles.section}>

              <AlertCircle size={28} color="#dc2626" />

              <h1 style={{ fontSize: 20 }}>Unable to load this request</h1>

              <p style={{ color: "#64748b", fontSize: 13 }}>{error}</p>

              <button

                style={styles.button}

                onClick={() => void loadRequest()}

              >

                <RefreshCw size={15} />

                Retry

              </button>

            </div>

          </div>

        </section>

      </main>

    );

  }

  return (

    <main className="app-shell">

      <ProcurementSidebar />

      <section className="control-tower-shell" style={styles.page}>

        <header style={styles.header}>

          <div>

            <div style={styles.headerEyebrow}>Procurement</div>

            <div style={styles.breadcrumb}>

              <span

                role="button"

                tabIndex={0}

                style={{ cursor: "pointer" }}

                onClick={() => router.push("/")}

                onKeyDown={(event) => {

                  if (event.key === "Enter") router.push("/");

                }}

              >

                Control Tower

              </span>

              <span>›</span>

              <span>Request 360</span>

            </div>

          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

            <button

              type="button"

              aria-label="Refresh request"

              title="Refresh request"

              style={styles.secondaryButton}

              onClick={() => void loadRequest(true)}

              disabled={refreshing}

            >

              <RefreshCw

                size={15}

                style={{

                  animation: refreshing ? "spin 1s linear infinite" : "none",

                }}

              />

            </button>

            <div style={styles.avatar}>VJ</div>

          </div>

        </header>

        <div style={styles.content}>

          <a

            href="/"

            onClick={(event) => {

              event.preventDefault();

              router.push("/");

            }}

            style={styles.backLink}

          >

            <ArrowLeft size={15} />

            Back to Control Tower

          </a>

          <section style={styles.card}>

            <div style={styles.hero}>

              <div

                style={{

                  display: "flex",

                  justifyContent: "space-between",

                  alignItems: "flex-start",

                  gap: 22,

                  flexWrap: "wrap",

                }}

              >

                <div style={{ flex: "1 1 420px", minWidth: 0 }}>

                  <div style={styles.badgeRow}>

                    <span

                      style={{

                        color: "#64748b",

                        fontFamily: "monospace",

                        fontSize: 12,

                        fontWeight: 700,

                      }}

                    >

                      {request?.request_number ?? requestNumber}

                    </span>

                    <Badge

                      background={

                        priority === "HIGH" || priority === "CRITICAL"

                          ? "#fff3e7"

                          : "#eef2f7"

                      }

                      color={

                        priority === "HIGH" || priority === "CRITICAL"

                          ? "#c2410c"

                          : "#475569"

                      }

                    >

                      {priority} PRIORITY

                    </Badge>

                    <Badge background="#e9efff" color="#3657b7">

                      <Sparkles size={11} style={{ marginRight: 5 }} />

                      AI ANALYSIS

                    </Badge>

                  </div>

                  <h1 style={styles.title}>{materialTitle}</h1>

                  <p style={styles.subtitle}>

                    {specification}

                  </p>

                </div>

                <button

                  type="button"

                  style={styles.button}

                  onClick={() =>

                    router.push(

                      `/procurement/${encodeURIComponent(requestNumber)}/sourcing`

                    )

                  }

                >

                  Continue Procurement

                  <ArrowRight size={15} />

                </button>

              </div>

            </div>

            <div style={styles.infoGrid}>

              <InfoItem

                label="Quantity"

                value={`${formatQuantity(item.quantity)} ${item.uom ?? ""}`}

              />

              <InfoItem

                label="Required date"

                value={

                  <span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}>

                    <CalendarDays size={14} color="#64748b" />

                    {displayDate(request?.required_date)}

                  </span>

                }

              />

              <InfoItem

                label="Project ID"

                value={request?.project_id}

              />

              <InfoItem

                label="Requested by"

                value={request?.requested_by}

              />

              <InfoItem

                label="Request status"

                value={

                  <Badge

                    background={status === "DRAFT" ? "#fff7e8" : "#e8f8ef"}

                    color={status === "DRAFT" ? "#a16207" : "#15803d"}

                  >

                    {status}

                  </Badge>

                }

              />

            </div>

          </section>

          {(error || serviceErrors.length > 0) && (
            <div
              role="status"
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 10,
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                color: "#9a3412",
                fontSize: 12,
                lineHeight: 1.7,
              }}
            >
              {error
                ? `Request warning: ${error}`
                : `The request loaded, but these services could not be refreshed: ${serviceErrors.join(", ")}.`}
              <button
                type="button"
                onClick={() => void loadRequest(true)}
                disabled={refreshing}
                style={{ ...styles.secondaryButton, marginLeft: 12, padding: "6px 10px" }}
              >
                <RefreshCw size={13} /> Retry services
              </button>
            </div>
          )}

          <section style={styles.aiCard}>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 15 }}>

              <div style={styles.aiIcon}>

                <Sparkles size={22} />

              </div>

              <div style={{ flex: 1, minWidth: 0 }}>

                <div

                  style={{

                    display: "flex",

                    flexWrap: "wrap",

                    alignItems: "center",

                    gap: 10,

                  }}

                >

                  <h2 style={{ ...styles.sectionTitle, fontSize: 16 }}>

                    AI Supply Decision

                  </h2>

                  <Badge background="#e6f8ef" color="#087443">

                    {decisionType.replaceAll("_", " ")}

                  </Badge>

                </div>

                <p

                  style={{

                    color: "#52627a",

                    fontSize: 13,

                    lineHeight: 1.8,

                    margin: "10px 0 0",

                  }}

                >

                  {decisionReason}

                </p>

              </div>

            </div>

          </section>

          <section style={styles.section}>

            <div

              style={{

                display: "flex",

                justifyContent: "space-between",

                gap: 14,

                alignItems: "flex-start",

                flexWrap: "wrap",

              }}

            >

              <div>

                <h2 style={styles.sectionTitle}>Supply Analysis</h2>

                <p style={styles.sectionSubtitle}>

                  Availability and fulfillment indicators returned by the supply engine.

                </p>

              </div>

              <Badge background="#e9efff" color="#3657b7">

                <Warehouse size={12} style={{ marginRight: 5 }} />

                Internal network

              </Badge>

            </div>

            <div style={styles.grid}>

              {analysisRows.map((row) => (

                <div key={row.label} style={styles.warehouseCard}>

                  <div style={styles.label}>{row.label}</div>

                  <div

                    style={{

                      fontSize: 23,

                      fontWeight: 750,

                      marginTop: 12,

                      color: "#172033",

                    }}

                  >

                    {row.value === null || row.value === undefined

                      ? "—"

                      : formatQuantity(row.value)}

                    {row.label === "Requested quantity" && item.uom

                      ? ` ${item.uom}`

                      : ""}

                  </div>

                </div>

              ))}

            </div>

            <div style={{ ...styles.grid, marginTop: 18 }}>

              <div style={styles.warehouseCard}>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

                  <div style={styles.aiIcon}>

                    <Warehouse size={18} />

                  </div>

                  <div>

                    <div style={{ fontSize: 13, fontWeight: 700 }}>

                      Internal transfer

                    </div>

                    <div style={{ fontSize: 11, color: "#7b8799", marginTop: 4 }}>

                      Recommended quantity

                    </div>

                  </div>

                </div>

                <div style={{ fontSize: 25, fontWeight: 750, marginTop: 20 }}>

                  {internalQuantity === null

                    ? "—"

                    : `${formatQuantity(internalQuantity)} ${item.uom ?? ""}`}

                </div>

                <p style={{ color: "#64748b", fontSize: 12, lineHeight: 1.7 }}>

                  Quantity indicated by the supply decision service for internal fulfillment.

                </p>

              </div>

              <div style={styles.warehouseCard}>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

                  <div

                    style={{

                      ...styles.aiIcon,

                      background: "#fff1df",

                      color: "#b45309",

                    }}

                  >

                    <Truck size={18} />

                  </div>

                  <div>

                    <div style={{ fontSize: 13, fontWeight: 700 }}>

                      External sourcing

                    </div>

                    <div style={{ fontSize: 11, color: "#7b8799", marginTop: 4 }}>

                      Remaining quantity

                    </div>

                  </div>

                </div>

                <div style={{ fontSize: 25, fontWeight: 750, marginTop: 20 }}>

                  {externalQuantity === null

                    ? "—"

                    : `${formatQuantity(externalQuantity)} ${item.uom ?? ""}`}

                </div>

                <p style={{ color: "#64748b", fontSize: 12, lineHeight: 1.7 }}>

                  Quantity indicated by the decision service for external procurement.

                </p>

              </div>

            </div>

          </section>

          <section style={styles.section}>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

              <ClipboardCheck size={19} color="#64748b" />

              <div>

                <h2 style={styles.sectionTitle}>Procurement Decision</h2>

                <p style={styles.sectionSubtitle}>

                  Recommended next steps. Review the decision before taking procurement action.

                </p>

              </div>

            </div>

            <div style={styles.grid}>

              {[

                {

                  number: "01",

                  title: "Confirm internal transfer",

                  detail:

                    internalQuantity === null

                      ? "Review internal availability and the recommended transfer quantity."

                      : `Review the proposed transfer of ${formatQuantity(internalQuantity)} ${item.uom ?? ""}.`,

                },

                {

                  number: "02",

                  title: "Source remaining shortage",

                  detail:

                    externalQuantity === null

                      ? "Confirm whether external sourcing is required."

                      : `Review external sourcing for ${formatQuantity(externalQuantity)} ${item.uom ?? ""}.`,

                },

                {

                  number: "03",

                  title: "Review eligible suppliers",

                  detail:

                    supplierCount === null

                      ? "Supplier eligibility data is not available."

                      : `${formatQuantity(supplierCount)} eligible supplier(s) reported by the eligibility service.`,

                },

              ].map((step) => (

                <div key={step.number} style={styles.planStep}>

                  <div style={styles.stepNumber}>{step.number}</div>

                  <div style={{ fontSize: 13, fontWeight: 700 }}>

                    {step.title}

                  </div>

                  <p

                    style={{

                      margin: "8px 0 0",

                      color: "#64748b",

                      fontSize: 12,

                      lineHeight: 1.7,

                    }}

                  >

                    {step.detail}

                  </p>

                </div>

              ))}

            </div>

            <div

              style={{

                display: "flex",

                alignItems: "flex-start",

                gap: 10,

                background: "#fff8e8",

                border: "1px solid #f6e3b4",

                borderRadius: 10,

                padding: 15,

                marginTop: 18,

                color: "#92400e",

                fontSize: 12,

                lineHeight: 1.7,

              }}

            >

              <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />

              <span>

                This screen presents recommendations only. Review and approval are

                required before committing to transfers, supplier selection, or purchase orders.

              </span>

            </div>

            <button

              type="button"

              style={{ ...styles.button, marginTop: 18 }}

              onClick={() =>

                router.push(

                  `/procurement/${encodeURIComponent(requestNumber)}/sourcing`

                )

              }

            >

              Continue to Sourcing

              <ArrowRight size={15} />

            </button>

          </section>

          <section style={styles.section}>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

              <CheckCircle2 size={19} color="#15965a" />

              <div>

                <h2 style={styles.sectionTitle}>Technical Requirement</h2>

                <p style={styles.sectionSubtitle}>

                  Requirement captured from the procurement request.

                </p>

              </div>

            </div>

            <div

              style={{

                marginTop: 18,

                padding: 17,

                background: "#f8fafc",

                border: "1px solid #e8edf4",

                borderRadius: 10,

                color: "#52627a",

                fontSize: 13,

                lineHeight: 1.9,

                overflowWrap: "anywhere",

              }}

            >

              {specification}

            </div>

          </section>

          <section style={styles.section}>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

              <Clock3 size={19} color="#64748b" />

              <div>

                <h2 style={styles.sectionTitle}>Procurement Journey</h2>

                <p style={styles.sectionSubtitle}>

                  Current request and analysis milestones.

                </p>

              </div>

            </div>

            <div style={styles.grid}>

              {[

                {

                  title: "Request",

                  detail: status,

                  complete: true,

                },

                {

                  title: "Supply analysis",

                  detail: supplyAnalysis ? "Data received" : "Unavailable",

                  complete: Boolean(supplyAnalysis),

                },

                {

                  title: "Supply decision",

                  detail: supplyDecision ? "Data received" : "Unavailable",

                  complete: Boolean(supplyDecision),

                },

                {

                  title: "Supplier eligibility",

                  detail: supplierEligibility ? "Data received" : "Unavailable",

                  complete: Boolean(supplierEligibility),

                },

                {

                  title: "Approval",

                  detail: "Review required",

                  complete: false,

                },

              ].map((stage) => (

                <div

                  key={stage.title}

                  style={{

                    padding: 15,

                    border: "1px solid #e3e9f1",

                    borderRadius: 10,

                    background: "#ffffff",

                  }}

                >

                  <div

                    style={{

                      display: "flex",

                      alignItems: "center",

                      gap: 8,

                      marginBottom: 12,

                    }}

                  >

                    {stage.complete ? (

                      <CheckCircle2 size={17} color="#15965a" />

                    ) : (

                      <Clock3 size={17} color="#b7791f" />

                    )}

                    <span style={{ fontSize: 12, fontWeight: 700 }}>

                      {stage.title}

                    </span>

                  </div>

                  <div style={{ color: "#64748b", fontSize: 11 }}>

                    {stage.detail}

                  </div>

                </div>

              ))}

            </div>

          </section>

          <footer style={styles.footer}>

            <span>Procurement AI · Request 360</span>

            <span>Live procurement data</span>

          </footer>

        </div>

      </section>

    </main>

  );

}
