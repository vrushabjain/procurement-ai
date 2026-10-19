"use client";

import { useCallback, useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import {

  ArrowLeft,

  ArrowRight,

  CheckCircle2,

  Clock3,

  FileText,

  RefreshCw,

  ShieldCheck,

  Sparkles,

  Truck,

  AlertCircle,

  Users,

} from "lucide-react";

import ProcurementSidebar from "../../../components/ProcurementSidebar";

import {

  createRFQ,

  getProcurementRequestByNumber,
  getRFQForProcurementItem,

  getSupplyDecision,

  getSupplierEligibility,

} from "@/lib/api";

type Data = Record<string, any>;

const ui: Record<string, React.CSSProperties> = {

  page: {

    minHeight: "100vh",

    background: "#f4f7fb",

    color: "#172033",

    fontFamily: "Arial, Helvetica, sans-serif",

  },

  header: {

    height: 70,

    padding: "0 30px",

    display: "flex",

    alignItems: "center",

    justifyContent: "space-between",

    gap: 16,

    background: "#fff",

    borderBottom: "1px solid #e5eaf1",

  },

  content: {

    maxWidth: 1500,

    margin: "0 auto",

    padding: "26px 30px 40px",

  },

  eyebrow: {

    fontSize: 10,

    color: "#7b8799",

    fontWeight: 700,

    letterSpacing: "0.13em",

    textTransform: "uppercase",

  },

  breadcrumb: {

    display: "flex",

    gap: 8,

    alignItems: "center",

    marginTop: 6,

    fontSize: 12,

    color: "#64748b",

  },

  back: {

    display: "inline-flex",

    alignItems: "center",

    gap: 8,

    marginBottom: 20,

    color: "#64748b",

    fontSize: 12,

    fontWeight: 600,

    cursor: "pointer",

    border: 0,

    background: "transparent",

    padding: 0,

  },

  card: {

    background: "#fff",

    border: "1px solid #e3e9f1",

    borderRadius: 14,

    padding: 24,

    minWidth: 0,

  },

  title: {

    fontSize: 25,

    lineHeight: 1.35,

    letterSpacing: "-0.4px",

    fontWeight: 750,

    margin: "9px 0",

  },

  subtitle: {

    fontSize: 12,

    lineHeight: 1.8,

    color: "#64748b",

    margin: 0,

  },

  grid: {

    display: "grid",

    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",

    gap: 14,

    marginTop: 20,

  },

  metric: {

    background: "#fff",

    border: "1px solid #e3e9f1",

    borderRadius: 12,

    padding: 19,

    minWidth: 0,

  },

  label: {

    color: "#7b8799",

    fontSize: 10,

    fontWeight: 700,

    letterSpacing: "0.08em",

    textTransform: "uppercase",

  },

  metricValue: {

    fontSize: 25,

    fontWeight: 750,

    marginTop: 11,

    overflowWrap: "anywhere",

  },

  sectionTitle: {

    fontSize: 15,

    fontWeight: 750,

    margin: 0,

  },

  sectionSub: {

    color: "#7b8799",

    fontSize: 12,

    lineHeight: 1.7,

    margin: "6px 0 0",

  },

  badge: {

    display: "inline-flex",

    alignItems: "center",

    gap: 5,

    padding: "6px 10px",

    borderRadius: 20,

    fontSize: 10,

    fontWeight: 700,

    whiteSpace: "nowrap",

  },

  supplier: {

    border: "1px solid #e3e9f1",

    borderRadius: 12,

    padding: 20,

    background: "#fff",

    minWidth: 0,

  },

  button: {

    display: "inline-flex",

    alignItems: "center",

    justifyContent: "center",

    gap: 9,

    border: 0,

    borderRadius: 8,

    padding: "12px 16px",

    background: "#172033",

    color: "#fff",

    fontSize: 12,

    fontWeight: 700,

    cursor: "pointer",

  },

  secondary: {

    display: "inline-flex",

    alignItems: "center",

    justifyContent: "center",

    gap: 8,

    border: "1px solid #dce3ed",

    borderRadius: 8,

    padding: "10px 13px",

    background: "#fff",

    color: "#334155",

    fontSize: 12,

    fontWeight: 600,

    cursor: "pointer",

  },

  divider: {

    height: 1,

    background: "#edf0f5",

    margin: "18px 0",

  },

};

function number(value: any): string {

  if (value === null || value === undefined || value === "") return "—";

  const parsed = Number(value);

  return Number.isFinite(parsed)

    ? parsed.toLocaleString("en-IN", { maximumFractionDigits: 3 })

    : String(value);

}

function Badge({

  children,

  color = "#475569",

  background = "#eef2f7",

}: {

  children: React.ReactNode;

  color?: string;

  background?: string;

}) {

  return (

    <span style={{ ...ui.badge, color, background }}>

      {children}

    </span>

  );

}

export default function SourcingPage() {

  const params = useParams<{ requestNumber: string }>();

  const router = useRouter();

  const requestNumber = decodeURIComponent(

    String(params.requestNumber ?? "")

  );

  const [request, setRequest] = useState<Data | null>(null);

  const [decision, setDecision] = useState<Data | null>(null);

  const [eligibility, setEligibility] = useState<Data | null>(null);

  const [selectedSupplier, setSelectedSupplier] = useState("");

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [creatingRFQ, setCreatingRFQ] = useState(false);

  const [rfqError, setRfqError] = useState("");

  const [createdRFQ, setCreatedRFQ] = useState<Data | null>(null);
  const [existingRFQ, setExistingRFQ] = useState<Data | null>(null);

  const loadData = useCallback(async (refresh = false) => {

    if (refresh) setRefreshing(true);

    else setLoading(true);

    setError("");

    try {

      const req: Data = await getProcurementRequestByNumber(requestNumber);

      setRequest(req);

      const item = Array.isArray(req.items) ? req.items[0] : null;

      if (!req.id || !item?.id) {

        throw new Error("The request has no identifiable procurement item.");

      }

      // Load an RFQ already associated with this request item.
      // A 404 means no RFQ exists yet; other errors are surfaced.
      try {
        const rfq: Data = await getRFQForProcurementItem(
          String(req.id),
          String(item.id)
        );
        setExistingRFQ(rfq);
        setRfqError("");
      } catch (rfqLookupError) {
        const message =
          rfqLookupError instanceof Error
            ? rfqLookupError.message
            : "Unable to check for an existing RFQ.";

        if (message.toLowerCase().includes("no rfq exists") ||
            message.toLowerCase().includes("404")) {
          setExistingRFQ(null);
        } else {
          setExistingRFQ(null);
          setRfqError(message);
        }
      }

      const results = await Promise.allSettled([

        getSupplyDecision(String(req.id), String(item.id)),

        getSupplierEligibility(String(req.id), String(item.id)),

      ]);

      if (results[0].status === "fulfilled") {

        setDecision(results[0].value as Data);

      } else {

        setDecision(null);

      }

      if (results[1].status === "fulfilled") {

        const supplierData = results[1].value as Data;

        setEligibility(supplierData);

        const suppliers = Array.isArray(supplierData.eligible_suppliers)

          ? supplierData.eligible_suppliers

          : [];

        setSelectedSupplier((current) => {

          if (suppliers.some((s: Data) => s.supplier_id === current)) {

            return current;

          }

          return "";

        });

      } else {

        setEligibility(null);

      }

      const failures = results.filter((result) => result.status === "rejected");

      if (failures.length) {

        setError(

          "The request loaded, but one or more sourcing data services failed. Refresh to retry."

        );

      }

    } catch (err) {

      setError(

        err instanceof Error ? err.message : "Unable to load sourcing data."

      );

    } finally {

      setLoading(false);

      setRefreshing(false);

    }

  }, [requestNumber]);

  const handleCreateRFQ = async () => {

  const firstItem = Array.isArray(request?.items)

    ? request.items[0]

    : null;

  if (existingRFQ) {
    setRfqError(
      `RFQ ${existingRFQ.rfq_number ?? ""} already exists for this item.`
    );
    return;
  }

  if (!request?.id || !firstItem?.id) {

    setRfqError("The request or item ID is missing.");

    return;

  }

  setCreatingRFQ(true);

  setRfqError("");

  setCreatedRFQ(null);

  try {

    const result = await createRFQ(

      String(request.id),

      String(firstItem.id),

      7

    );

    setCreatedRFQ(result as Data);
    setExistingRFQ(result as Data);

  } catch (err) {

    setRfqError(

      err instanceof Error

        ? err.message

        : "Unable to create the RFQ. Please try again."

    );

  } finally {

    setCreatingRFQ(false);

  }

};

  useEffect(() => {

    void loadData();

  }, [loadData]);

  if (loading) {

    return (

      <main className="app-shell">

        <ProcurementSidebar />

        <section className="control-tower-shell" style={ui.page}>

          <div style={{ padding: 60, textAlign: "center", color: "#64748b" }}>

            <RefreshCw size={25} />

            <p>Loading sourcing workspace…</p>

          </div>

        </section>

      </main>

    );

  }

  const item = request?.items?.[0] ?? {};

  const suppliers: Data[] = Array.isArray(eligibility?.eligible_suppliers)

    ? eligibility.eligible_suppliers

    : [];

  const excludedSuppliers: Data[] = Array.isArray(eligibility?.evaluated_suppliers)

    ? eligibility.evaluated_suppliers.filter((s: Data) => !s.eligible)

    : [];

  const externalQuantity = decision?.shortage_quantity;

  const requiredQuantity = decision?.required_quantity ?? item.quantity;

  const selected = suppliers.find((s) => s.supplier_id === selectedSupplier);
  const activeRFQ = existingRFQ ?? createdRFQ;

  return (

    <main className="app-shell">

      <ProcurementSidebar />

      <section className="control-tower-shell" style={ui.page}>

        <header style={ui.header}>

          <div>

            <div style={ui.eyebrow}>Procurement workspace</div>

            <div style={ui.breadcrumb}>

              <span

                role="button"

                tabIndex={0}

                style={{ cursor: "pointer" }}

                onClick={() => router.push("/")}

                onKeyDown={(e) => e.key === "Enter" && router.push("/")}

              >

                Control Tower

              </span>

              <span>›</span>

              <span

                role="button"

                tabIndex={0}

                style={{ cursor: "pointer" }}

                onClick={() =>

                  router.push(`/procurement/${encodeURIComponent(requestNumber)}`)

                }

                onKeyDown={(e) =>

                  e.key === "Enter" &&

                  router.push(`/procurement/${encodeURIComponent(requestNumber)}`)

                }

              >

                Request 360

              </span>

              <span>›</span>

              <span>Sourcing</span>

            </div>

          </div>

          <button

            type="button"

            style={ui.secondary}

            disabled={refreshing}

            onClick={() => void loadData(true)}

          >

            <RefreshCw size={14} />

            Refresh

          </button>

        </header>

        <div style={ui.content}>

          <button

            type="button"

            style={ui.back}

            onClick={() =>

              router.push(`/procurement/${encodeURIComponent(requestNumber)}`)

            }

          >

            <ArrowLeft size={15} />

            Back to Request 360

          </button>

          {error && (

            <div

              role="alert"

              style={{

                background: "#fff7ed",

                color: "#9a3412",

                border: "1px solid #fed7aa",

                borderRadius: 10,

                padding: 14,

                marginBottom: 18,

                fontSize: 12,

              }}

            >

              <AlertCircle size={15} style={{ verticalAlign: "middle", marginRight: 8 }} />

              {error}

            </div>

          )}

          <section style={ui.card}>

            <div

              style={{

                display: "flex",

                justifyContent: "space-between",

                alignItems: "flex-start",

                gap: 18,

                flexWrap: "wrap",

              }}

            >

              <div style={{ flex: "1 1 400px", minWidth: 0 }}>

                <div style={ui.eyebrow}>Sourcing & supplier selection</div>

                <h1 style={ui.title}>Find the right supplier</h1>

                <p style={ui.subtitle}>

                  Compare qualified suppliers for the externally required quantity.

                  Commercial terms and quotations must be evaluated before award.

                </p>

                <div style={{ ...ui.breadcrumb, flexWrap: "wrap" }}>

                  <span>{request?.request_number ?? requestNumber}</span>

                  <span>·</span>

                  <span>{item.material_name ?? eligibility?.material_name ?? "Requested material"}</span>

                </div>

              </div>

              <Badge color="#3657b7" background="#e9efff">

                <Sparkles size={12} />

                AI-assisted sourcing

              </Badge>

            </div>

          </section>

          <div style={ui.grid}>

            <div style={ui.metric}>

              <div style={ui.label}>External quantity</div>

              <div style={ui.metricValue}>

                {externalQuantity === null || externalQuantity === undefined

                  ? "—"

                  : `${number(externalQuantity)} ${item.uom ?? ""}`}

              </div>

              <p style={ui.subtitle}>From the supply decision API</p>

            </div>

            <div style={ui.metric}>

              <div style={ui.label}>Total requested</div>

              <div style={ui.metricValue}>

                {number(requiredQuantity)} {item.uom ?? ""}

              </div>

              <p style={ui.subtitle}>Original procurement requirement</p>

            </div>

            <div style={ui.metric}>

              <div style={ui.label}>Eligible suppliers</div>

              <div style={ui.metricValue}>

                {eligibility?.eligible_supplier_count ?? suppliers.length}

              </div>

              <p style={ui.subtitle}>Passed supplier eligibility checks</p>

            </div>

            <div style={ui.metric}>

              <div style={ui.label}>Commercial evaluation</div>

              <div style={{ ...ui.metricValue, fontSize: 20 }}>Pending</div>

              <p style={ui.subtitle}>Quotes and terms not yet compared</p>

            </div>

          </div>

          <section style={{ ...ui.card, marginTop: 20 }}>

            <div

              style={{

                display: "flex",

                justifyContent: "space-between",

                alignItems: "flex-start",

                gap: 16,

                flexWrap: "wrap",

              }}

            >

              <div>

                <h2 style={ui.sectionTitle}>Eligible supplier network</h2>

                <p style={ui.sectionSub}>

                  Select a supplier to mark it for further commercial evaluation.

                  Selection here does not award the contract.

                </p>

              </div>

              <Badge color="#087443" background="#e6f8ef">

                <ShieldCheck size={12} />

                Qualification checked

              </Badge>

            </div>

            {suppliers.length === 0 ? (

              <div style={{ padding: "30px 0", color: "#64748b", fontSize: 13 }}>

                No eligible suppliers were returned. Refresh or verify the supplier eligibility API.

              </div>

            ) : (

              <div style={ui.grid}>

                {suppliers.map((supplier) => {

                  const isSelected = selectedSupplier === supplier.supplier_id;

                  return (

                    <div

                      key={supplier.supplier_id}

                      style={{

                        ...ui.supplier,

                        border: isSelected

                          ? "2px solid #496bd3"

                          : "1px solid #e3e9f1",

                        background: isSelected ? "#f8faff" : "#fff",

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

                            width: 42,

                            height: 42,

                            borderRadius: 11,

                            background: "#edf2ff",

                            color: "#3657b7",

                            display: "flex",

                            alignItems: "center",

                            justifyContent: "center",

                            flexShrink: 0,

                          }}

                        >

                          <Users size={20} />

                        </div>

                        <Badge color="#087443" background="#e6f8ef">

                          Eligible

                        </Badge>

                      </div>

                      <h3

                        style={{

                          fontSize: 15,

                          lineHeight: 1.5,

                          margin: "16px 0 5px",

                          overflowWrap: "anywhere",

                        }}

                      >

                        {supplier.supplier_name}

                      </h3>

                      <p style={{ color: "#7b8799", fontSize: 11, margin: 0 }}>

                        {supplier.supplier_code}

                      </p>

                      <div style={ui.divider} />

                      <div style={{ display: "grid", gap: 12 }}>

                        {[

                          ["Qualification", supplier.qualification_status],

                          ["Supplier approved", supplier.supplier_approved ? "Yes" : "No"],

                          ["Technical approval", supplier.technical_approval ? "Valid" : "Not valid"],

                          ["Quality approval", supplier.quality_approval ? "Valid" : "Not valid"],

                        ].map(([label, value]) => (

                          <div

                            key={label}

                            style={{

                              display: "flex",

                              justifyContent: "space-between",

                              alignItems: "center",

                              gap: 12,

                              fontSize: 11,

                            }}

                          >

                            <span style={{ color: "#64748b" }}>{label}</span>

                            <strong>{value}</strong>

                          </div>

                        ))}

                      </div>

                      <button

                        type="button"

                        aria-pressed={isSelected}

                        onClick={() =>

                          setSelectedSupplier(

                            isSelected ? "" : supplier.supplier_id

                          )

                        }

                        style={{

                          ...ui.secondary,

                          width: "100%",

                          marginTop: 20,

                          borderColor: isSelected ? "#496bd3" : "#dce3ed",

                          background: isSelected ? "#e9efff" : "#fff",

                          color: isSelected ? "#3157a4" : "#334155",

                        }}

                      >

                        {isSelected ? (

                          <>

                            <CheckCircle2 size={15} />

                            Selected for evaluation

                          </>

                        ) : (

                          "Select for evaluation"

                        )}

                      </button>

                    </div>

                  );

                })}

              </div>

            )}

          </section>

          {excludedSuppliers.length > 0 && (

            <section

              style={{

                ...ui.card,

                marginTop: 20,

                borderColor: "#f2d4a7",

                background: "#fffcf5",

              }}

            >

              <h2 style={ui.sectionTitle}>Excluded suppliers</h2>

              <p style={ui.sectionSub}>

                These suppliers were evaluated but did not pass all eligibility checks.

              </p>

              {excludedSuppliers.map((supplier) => (

                <div

                  key={supplier.supplier_id}

                  style={{

                    padding: "14px 0",

                    borderBottom: "1px solid #f1e7d4",

                  }}

                >

                  <div

                    style={{

                      display: "flex",

                      justifyContent: "space-between",

                      gap: 12,

                      flexWrap: "wrap",

                    }}

                  >

                    <strong style={{ fontSize: 12 }}>

                      {supplier.supplier_name} ({supplier.supplier_code})

                    </strong>

                    <Badge color="#9a3412" background="#ffedd5">

                      Not eligible

                    </Badge>

                  </div>

                  <p style={{ color: "#9a3412", fontSize: 11, lineHeight: 1.7 }}>

                    {(supplier.exclusion_reasons ?? []).join(" ") ||

                      "One or more qualification requirements were not met."}

                  </p>

                </div>

              ))}

            </section>

          )}

          <section style={{ ...ui.card, marginTop: 20 }}>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

              <FileText size={19} color="#64748b" />

              <div>

                <h2 style={ui.sectionTitle}>Quotation comparison</h2>

                <p style={ui.sectionSub}>

                  Commercial comparison becomes available after supplier quotations are received.

                </p>

              </div>

            </div>

            <div style={{ overflowX: "auto", marginTop: 18 }}>

              <table

                style={{

                  width: "100%",

                  borderCollapse: "collapse",

                  fontSize: 12,

                  minWidth: 520,

                }}

              >

                <thead>

                  <tr style={{ background: "#f8fafc", textAlign: "left" }}>

                    {[

                      "Supplier",

                      "Unit price",

                      "Lead time",

                      "Payment terms",

                      "Quote status",

                    ].map((heading) => (

                      <th

                        key={heading}

                        style={{

                          padding: 13,

                          color: "#64748b",

                          fontSize: 10,

                          textTransform: "uppercase",

                          letterSpacing: "0.06em",

                          borderBottom: "1px solid #e3e9f1",

                        }}

                      >

                        {heading}

                      </th>

                    ))}

                  </tr>

                </thead>

                <tbody>

                  {suppliers.map((supplier) => (

                    <tr key={supplier.supplier_id}>

                      <td style={{ padding: 13, borderBottom: "1px solid #edf0f5" }}>

                        <strong>{supplier.supplier_name}</strong>

                      </td>

                      <td style={{ padding: 13, borderBottom: "1px solid #edf0f5", color: "#94a3b8" }}>

                        Not received

                      </td>

                      <td style={{ padding: 13, borderBottom: "1px solid #edf0f5", color: "#94a3b8" }}>

                        Not received

                      </td>

                      <td style={{ padding: 13, borderBottom: "1px solid #edf0f5", color: "#94a3b8" }}>

                        Not received

                      </td>

                      <td style={{ padding: 13, borderBottom: "1px solid #edf0f5" }}>

                        <Badge>Awaiting quote</Badge>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

            <div

              style={{

                marginTop: 18,

                padding: 14,

                background: "#f8fafc",

                border: "1px solid #e3e9f1",

                borderRadius: 9,

                color: "#64748b",

                fontSize: 12,

                lineHeight: 1.8,

              }}

            >

              <Clock3 size={15} style={{ verticalAlign: "middle", marginRight: 7 }} />

              No commercial winner is recommended yet. Price, delivery commitment,

              payment terms, and technical compliance should be compared once quotes are available.

            </div>

          </section>

          <section style={{ ...ui.card, marginTop: 20 }}>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>

              <div

                style={{

                  width: 40,

                  height: 40,

                  borderRadius: 10,

                  background: "#e9efff",

                  color: "#3657b7",

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "center",

                  flexShrink: 0,

                }}

              >

                <Truck size={19} />

              </div>

              <div style={{ flex: 1 }}>

                <h2 style={ui.sectionTitle}>Next action</h2>

                <p style={ui.sectionSub}>

                  The supply engine indicates that external sourcing is required for{" "}

                  {externalQuantity === null || externalQuantity === undefined

                    ? "the remaining shortage"

                    : `${number(externalQuantity)} ${item.uom ?? ""}`}.

                  Create an RFQ through the approved backend workflow, invite eligible suppliers,

                  and compare their responses before seeking award approval.

                </p>

                {selected && (

                  <p style={{ fontSize: 12, marginTop: 12, color: "#3157a4" }}>

                    Selected for evaluation: <strong>{selected.supplier_name}</strong>.

                    This is a working selection only; it has not been saved as a sourcing award.

                  </p>

                )}

                {rfqError && (

                  <div

                    role="alert"

                    style={{

                      display: "flex",

                      alignItems: "flex-start",

                      gap: 8,

                      marginTop: 16,

                      padding: 14,

                      borderRadius: 10,

                      background: "#fef2f2",

                      color: "#991b1b",

                      border: "1px solid #fecaca",

                      fontSize: 12,

                      lineHeight: 1.7,

                    }}

                  >

                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />

                    <div>

                      <strong>RFQ creation failed</strong>

                      <div>{rfqError}</div>

                    </div>

                  </div>

                )}

                {activeRFQ && (

                  <div

                    role="status"

                    style={{

                      display: "flex",

                      alignItems: "flex-start",

                      gap: 12,

                      marginTop: 16,

                      padding: 16,

                      borderRadius: 10,

                      background: "#f0fdf4",

                      color: "#166534",

                      border: "1px solid #bbf7d0",

                      fontSize: 12,

                      lineHeight: 1.8,

                    }}

                  >

                    <CheckCircle2 size={20} style={{ flexShrink: 0, marginTop: 2 }} />

                    <div style={{ flex: 1, minWidth: 0 }}>

                      <strong style={{ fontSize: 14 }}>
                        {activeRFQ.status === "ISSUED"
                          ? "Existing RFQ issued to suppliers"
                          : activeRFQ.status === "DRAFT"
                            ? "RFQ draft available"
                            : "Existing RFQ found"}
                      </strong>

                      <div style={{ marginTop: 8 }}>

                        RFQ number: <strong>{activeRFQ.rfq_number ?? "Not returned"}</strong>

                      </div>

                      <div>

                        Status: <strong>{activeRFQ.status ?? "UNKNOWN"}</strong>

                      </div>

                      {activeRFQ.issue_date && (
                        <div>
                          Issue date: <strong>{activeRFQ.issue_date}</strong>
                        </div>
                      )}

                      {activeRFQ.response_due_date && (

                        <div>

                          Response due date: <strong>{activeRFQ.response_due_date}</strong>

                        </div>

                      )}

                      <p style={{ margin: "8px 0 0", color: "#166534" }}>
                        {activeRFQ.status === "ISSUED"
                          ? "This RFQ has already been issued. Do not create or issue it again. Continue with supplier quotation tracking."
                          : "This RFQ has not been issued to suppliers. Complete the required authorization workflow before issuance."}
                      </p>

                    </div>

                  </div>

                )}

                <div

                  style={{

                    display: "flex",

                    gap: 10,

                    flexWrap: "wrap",

                    marginTop: 18,

                  }}

                >

                  {!activeRFQ && (
                    <button
                      type="button"
                      style={{
                        ...ui.button,
                        opacity: creatingRFQ ? 0.65 : 1,
                        cursor: creatingRFQ ? "wait" : "pointer",
                      }}
                      disabled={
                        creatingRFQ ||
                        !request?.id ||
                        !item?.id ||
                        !(Number(externalQuantity) > 0)
                      }
                      onClick={() => void handleCreateRFQ()}
                    >
                      {creatingRFQ ? <RefreshCw size={14} /> : <FileText size={14} />}
                      {creatingRFQ ? "Creating draft RFQ…" : "Create RFQ draft"}
                    </button>
                  )}

                  {activeRFQ?.status === "ISSUED" && (
                    <button
                      type="button"
                      style={ui.button}
                      onClick={() =>
                        router.push(
                          `/procurement/${encodeURIComponent(requestNumber)}/sourcing/quotations`
                        )
                      }
                    >
                      <ArrowRight size={14} />
                      Continue to Quotation Tracking
                      </button>
                    )}

                  <button

                    type="button"

                    style={ui.secondary}

                    onClick={() =>

                      router.push(`/procurement/${encodeURIComponent(requestNumber)}`)

                    }

                  >

                    <ArrowLeft size={14} />

                    Return to Request 360

                  </button>

                </div>

              </div>

            </div>

          </section>

          <footer

            style={{

              display: "flex",

              justifyContent: "space-between",

              gap: 12,

              flexWrap: "wrap",

              padding: "25px 0",

              color: "#94a3b8",

              fontSize: 10,

            }}

          >

            <span>Procurement AI · Sourcing workspace</span>

            <span>Supplier selection requires commercial review and approval</span>

          </footer>

        </div>

      </section>

    </main>

  );

}
