
"use client";

import ProcurementSidebar from "../../../../components/ProcurementSidebar";
import {
  getProcurementRequestByNumber,
  getRFQForProcurementItem,
  getRFQQuotations,
  evaluateRFQQuotations,
} from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FileSearch,
  RefreshCw,
  ShieldCheck,
  Truck,
  AlertTriangle,
  Users,
  Scale,
  Package,
  CalendarDays,
} from "lucide-react";

type AnyData = Record<string, any>;

type Quote = {
  quote_id: string;
  quote_number: string;
  status: string;
  quote_date?: string | null;
  valid_until?: string | null;
  currency_code?: string;
  quantity: number | string;
  unit_price: number | string;
  lead_time_days?: number | null;
  technical_compliance: boolean;
  quality_compliance: boolean;
  freight_cost?: number | string;
  insurance_cost?: number | string;
  tax_cost?: number | string;
  total_quote_value?: number | string | null;
  payment_terms?: string | null;
  incoterm?: string | null;
  remarks?: string | null;
};

type SupplierRow = {
  supplier_id: string;
  supplier_code: string;
  supplier_name: string;
  country_code?: string;
  invitation_status: string;
  invited_at?: string | null;
  responded_at?: string | null;
  quote_count: number;
  quotes: Quote[];
};

type TrackingData = {
  rfq_id: string;
  rfq_number: string;
  rfq_status: string;
  currency_code: string;
  supplier_count: number;
  responded_supplier_count: number;
  pending_supplier_count: number;
  received_quote_count: number;
  suppliers: SupplierRow[];
};

type Evaluation = {
  rfq_id?: string;
  rfq_number?: string;
  required_date?: string;
  evaluated_quote_count?: number;
  results?: AnyData[];
};

const colors = {
  ink: "#172033",
  muted: "#718096",
  line: "#e5eaf1",
  canvas: "#f4f7fb",
  blue: "#2855d9",
  green: "#087f5b",
  amber: "#a16207",
  red: "#b42318",
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: colors.canvas,
    color: colors.ink,
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  header: {
    minHeight: 72,
    background: "#fff",
    borderBottom: `1px solid ${colors.line}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "14px 28px",
    flexWrap: "wrap",
  },
  content: {
    maxWidth: 1600,
    margin: "0 auto",
    padding: "26px 28px 44px",
  },
  card: {
    background: "#fff",
    border: `1px solid ${colors.line}`,
    borderRadius: 13,
    padding: 20,
    minWidth: 0,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
  heading: {
    fontSize: 25,
    letterSpacing: "-0.5px",
    lineHeight: 1.3,
    margin: "7px 0",
    fontWeight: 750,
  },
  sub: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 1.7,
    margin: 0,
  },
  button: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "10px 13px",
    border: `1px solid ${colors.line}`,
    borderRadius: 8,
    background: "#fff",
    color: colors.ink,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  primaryButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "11px 15px",
    border: "1px solid #172033",
    borderRadius: 8,
    background: "#172033",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  tableWrap: {
    width: "100%",
    overflowX: "auto",
  },
  table: {
    borderCollapse: "collapse",
    width: "100%",
    minWidth: 850,
    fontSize: 12,
  },
  th: {
    textAlign: "left",
    padding: "12px 13px",
    background: "#f8fafc",
    color: colors.muted,
    fontSize: 10,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: `1px solid ${colors.line}`,
    whiteSpace: "nowrap",
  },
  td: {
    padding: "14px 13px",
    borderBottom: `1px solid #edf1f6`,
    verticalAlign: "middle",
  },
};

function asNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function fmtNumber(value: unknown, decimals = 0): string {
  if (value === null || value === undefined || value === "") return "—";
  return Number(value).toLocaleString("en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  });
}

function fmtMoney(value: unknown, currency = "USD"): string {
  if (value === null || value === undefined || value === "") return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(asNumber(value));
}

function fmtDate(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "blue";
}) {
  const palette = {
    neutral: { color: "#475569", bg: "#eef2f7" },
    success: { color: "#087f5b", bg: "#e5f7ef" },
    warning: { color: "#a16207", bg: "#fff5d9" },
    danger: { color: "#b42318", bg: "#ffebe9" },
    blue: { color: "#2855d9", bg: "#eaf0ff" },
  }[tone];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 9px",
        borderRadius: 30,
        background: palette.bg,
        color: palette.color,
        fontSize: 10,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Metric({
  label,
  value,
  caption,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  caption: string;
  icon: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const accent =
    tone === "success"
      ? colors.green
      : tone === "warning"
        ? colors.amber
        : tone === "danger"
          ? colors.red
          : colors.ink;

  return (
    <div style={styles.card}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "center",
        }}
      >
        <span style={{ ...styles.eyebrow, letterSpacing: "0.04em" }}>
          {label}
        </span>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div
        style={{
          fontSize: 27,
          fontWeight: 800,
          color: accent,
          marginTop: 13,
          letterSpacing: "-0.6px",
        }}
      >
        {value}
      </div>
      <div style={{ color: colors.muted, fontSize: 11, marginTop: 7 }}>
        {caption}
      </div>
    </div>
  );
}

export default function SupplierQuotationTrackingPage() {
  const params = useParams<{ requestNumber: string }>();
  const router = useRouter();

  const requestNumber = decodeURIComponent(
    String(params.requestNumber ?? "")
  );

  const [request, setRequest] = useState<AnyData | null>(null);
  const [rfq, setRfq] = useState<AnyData | null>(null);
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState("");
  const [evaluationMessage, setEvaluationMessage] = useState("");

  const loadData = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    setError("");
    setEvaluationMessage("");

    try {
      const req = (await getProcurementRequestByNumber(
        requestNumber
      )) as AnyData;

      setRequest(req);

      const item = Array.isArray(req.items) ? req.items[0] : null;

      if (!req.id || !item?.id) {
        throw new Error("This procurement request has no identifiable item.");
      }

      const existingRfq = (await getRFQForProcurementItem(
        String(req.id),
        String(item.id)
      )) as AnyData;

      if (!existingRfq?.id) {
        throw new Error("No RFQ exists for this procurement item yet.");
      }

      setRfq(existingRfq);

      const trackingData = (await getRFQQuotations(
        String(existingRfq.id)
      )) as TrackingData;

      setTracking(trackingData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load supplier quotations."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [requestNumber]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const item: AnyData = request?.items?.[0] ?? {};

  const requestedQuantity = useMemo(() => {
    const possibleValues = [
      item.quantity,
      item.requested_quantity,
      item.quantity_requested,
      item.required_quantity,
    ];

    const found = possibleValues.find(
      (value) => value !== undefined && value !== null && value !== ""
    );

    return found === undefined ? null : asNumber(found);
  }, [item]);

  const suppliers = tracking?.suppliers ?? [];

  const allQuotes = useMemo(
    () =>
      suppliers.flatMap((supplier) =>
        (supplier.quotes ?? []).map((quote) => ({
          ...quote,
          supplier_id: supplier.supplier_id,
          supplier_code: supplier.supplier_code,
          supplier_name: supplier.supplier_name,
        }))
      ),
    [suppliers]
  );

  const highestIndividualOffer = useMemo(
    () =>
      allQuotes.reduce(
        (max, quote) => Math.max(max, asNumber(quote.quantity)),
        0
      ),
    [allQuotes]
  );

  const arithmeticQuoteTotal = useMemo(
    () => allQuotes.reduce((sum, quote) => sum + asNumber(quote.quantity), 0),
    [allQuotes]
  );

  const individualGap =
    requestedQuantity === null
      ? null
      : Math.max(0, requestedQuantity - highestIndividualOffer);

  const combinedGap =
    requestedQuantity === null
      ? null
      : Math.max(0, requestedQuantity - arithmeticQuoteTotal);

  const coveragePercent =
    requestedQuantity && requestedQuantity > 0
      ? Math.min(100, (highestIndividualOffer / requestedQuantity) * 100)
      : null;

  const evaluatedResults = evaluation?.results ?? [];

  const evaluationByQuote = useMemo(() => {
    const map = new Map<string, AnyData>();
    evaluatedResults.forEach((result) => {
      if (result.quote_id) map.set(String(result.quote_id), result);
    });
    return map;
  }, [evaluatedResults]);

  const canOpenAwardDecision =
   Boolean(evaluation) &&
  allQuotes.some(
    (quote) =>
      evaluationByQuote.get(quote.quote_id)
        ?.eligible_for_recommendation === true
  );

  const rankedQuotes = useMemo(() => {
    return [...allQuotes].sort((a, b) => {
      const scoreA = asNumber(
        evaluationByQuote.get(a.quote_id)?.overall_score
      );
      const scoreB = asNumber(
        evaluationByQuote.get(b.quote_id)?.overall_score
      );
      return scoreB - scoreA;
    });
  }, [allQuotes, evaluationByQuote]);

  async function handleEvaluate() {
    if (!rfq?.id) return;

    setEvaluating(true);
    setEvaluationMessage("");

    try {
      const result = (await evaluateRFQQuotations(
        String(rfq.id)
      )) as Evaluation;

      setEvaluation(result);
      setEvaluationMessage(
        `${result.evaluated_quote_count ?? result.results?.length ?? 0} quotation(s) evaluated successfully.`
      );
    } catch (err) {
      setEvaluationMessage(
        err instanceof Error
          ? err.message
          : "Quote evaluation failed. Check the backend response."
      );
    } finally {
      setEvaluating(false);
    }
  }

  if (loading) {
    return (
      <main className="app-shell" style={styles.page}>
        <ProcurementSidebar />
        <section className="control-tower-shell">
          <div style={{ padding: 60, textAlign: "center", color: colors.muted }}>
            <RefreshCw size={22} />
            <p>Loading supplier quotations…</p>
          </div>
        </section>
      </main>
    );
  }

  const currency = tracking?.currency_code ?? "USD";
  const receivedCount = tracking?.received_quote_count ?? allQuotes.length;
  const respondedCount = tracking?.responded_supplier_count ?? 0;
  const pendingCount = tracking?.pending_supplier_count ?? 0;

  return (
    <main className="app-shell" style={styles.page}>
      <ProcurementSidebar />

      <section className="control-tower-shell" style={{ minWidth: 0 }}>
        <header style={styles.header}>
          <div>
            <div style={styles.eyebrow}>Procurement workspace</div>
            <div style={{ fontSize: 15, fontWeight: 800, marginTop: 5 }}>
              Supplier Quotation Tracking
            </div>
          </div>

          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            <button
              type="button"
              style={styles.button}
              onClick={() =>
                router.push(`/procurement/${encodeURIComponent(requestNumber)}/sourcing`)
              }
            >
              <ArrowLeft size={15} />
              Back to Sourcing
            </button>

            <button
              type="button"
              style={styles.button}
              onClick={() => void loadData(true)}
              disabled={refreshing}
            >
              <RefreshCw size={15} />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>

            <button
              type="button"
              style={{
                ...styles.primaryButton,
                opacity: evaluating || !allQuotes.length ? 0.6 : 1,
              }}
              onClick={() => void handleEvaluate()}
              disabled={evaluating || !allQuotes.length}
            >
              <Scale size={15} />
              {evaluating ? "Evaluating…" : "Evaluate Quotes"}
            </button>


            <button
                type="button"
                style={{
                    ...styles.primaryButton,
                    background: canOpenAwardDecision ? "#2855d9" : "#94a3b8",
                    borderColor: canOpenAwardDecision ? "#2855d9" : "#94a3b8",
                    opacity: canOpenAwardDecision ? 1 : 0.65,
                    cursor: canOpenAwardDecision ? "pointer" : "not-allowed",
                }}
                disabled={!canOpenAwardDecision}
                title={
                    canOpenAwardDecision
                        ? "Review the sourcing recommendation and alternatives"
                        : "Evaluate quotations and ensure at least one quote is eligible first"
                }
                onClick={() =>
                    router.push(
                        `/procurement/${encodeURIComponent(requestNumber)}/sourcing/award`
                    )
                }
            >
                <Scale size={15} />
                Award Decision
            </button>
          </div>
        </header>

        <div style={styles.content}>
          {error && (
            <div
              role="alert"
              style={{
                background: "#ffebe9",
                border: "1px solid #fecaca",
                color: colors.red,
                borderRadius: 10,
                padding: 15,
                fontSize: 12,
                marginBottom: 18,
              }}
            >
              <strong>Unable to load quotation tracking.</strong>
              <div style={{ marginTop: 5 }}>{error}</div>
              <button
                type="button"
                style={{ ...styles.button, marginTop: 10 }}
                onClick={() => void loadData(true)}
              >
                Retry
              </button>
            </div>
          )}

          <div style={{ marginBottom: 22 }}>
            <div style={styles.eyebrow}>Sourcing / Quotations</div>
            <h1 style={styles.heading}>Supplier responses & comparison</h1>
            <p style={styles.sub}>
              Track supplier responses, compare submitted offers, and identify
              quantity coverage before making an award decision.
            </p>
          </div>

          <div
            style={{
              ...styles.card,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <div>
              <div style={styles.eyebrow}>Request</div>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 7 }}>
                {request?.request_number ?? requestNumber}
              </div>
              <div style={{ ...styles.sub, marginTop: 5 }}>
                {item.material_code ?? item.material?.material_code ?? "Material"}
                {" · "}
                {item.material_name ?? item.material?.material_name ?? item.description ?? "Procurement item"}
              </div>
            </div>

            <div>
              <div style={styles.eyebrow}>Request required date</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 8 }}>
                <CalendarDays size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
                {fmtDate(request?.required_date)}
              </div>
            </div>

            <div>
              <div style={styles.eyebrow}>RFQ reference</div>
              <div style={{ fontSize: 14, fontWeight: 800, marginTop: 8 }}>
                {tracking?.rfq_number ?? rfq?.rfq_number ?? "—"}
              </div>
              <div style={{ marginTop: 5 }}>
                <Badge tone={tracking?.rfq_status === "ISSUED" ? "blue" : "neutral"}>
                  {tracking?.rfq_status ?? rfq?.status ?? "Unknown"}
                </Badge>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <Metric
              label="Invited suppliers"
              value={fmtNumber(tracking?.supplier_count ?? 0)}
              caption="Suppliers on this RFQ"
              icon={<Users size={18} />}
            />
            <Metric
              label="Responses received"
              value={`${respondedCount} / ${tracking?.supplier_count ?? 0}`}
              caption={`${pendingCount} supplier(s) still pending`}
              icon={<CheckCircle2 size={18} />}
              tone={pendingCount ? "warning" : "success"}
            />
            <Metric
              label="Quotes received"
              value={fmtNumber(receivedCount)}
              caption="Persisted quotation records"
              icon={<FileSearch size={18} />}
            />
            <Metric
              label="Highest single offer"
              value={
                requestedQuantity === null
                  ? fmtNumber(highestIndividualOffer)
                  : `${fmtNumber(highestIndividualOffer)} / ${fmtNumber(requestedQuantity)}`
              }
              caption={
                individualGap === null
                  ? "Quantity coverage"
                  : `${fmtNumber(individualGap)} units short of full quantity`
              }
              icon={<Package size={18} />}
              tone={individualGap && individualGap > 0 ? "warning" : "success"}
            />
          </div>

          <div style={{ ...styles.card, marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={styles.eyebrow}>Quantity coverage</div>
                <h2 style={{ fontSize: 16, margin: "7px 0", fontWeight: 800 }}>
                  Outstanding requirement
                </h2>
                <p style={styles.sub}>
                  Coverage is measured against the largest individual supplier
                  offer. Competing quotations are not treated as a combined award.
                </p>
              </div>

              <Badge tone={individualGap && individualGap > 0 ? "warning" : "success"}>
                {individualGap && individualGap > 0
                  ? "Quantity gap remains"
                  : "Quantity covered"}
              </Badge>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
                gap: 14,
                marginTop: 20,
              }}
            >
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: 16 }}>
                <div style={styles.eyebrow}>Requested</div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>
                  {requestedQuantity === null ? "—" : fmtNumber(requestedQuantity)}
                </div>
                <div style={styles.sub}>Units required</div>
              </div>

              <div style={{ background: "#f0fdf4", borderRadius: 10, padding: 16 }}>
                <div style={{ ...styles.eyebrow, color: colors.green }}>
                  Best individual offer
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: colors.green, marginTop: 8 }}>
                  {fmtNumber(highestIndividualOffer)}
                </div>
                <div style={styles.sub}>
                  {coveragePercent === null ? "Coverage unavailable" : `${coveragePercent.toFixed(1)}% of request`}
                </div>
              </div>

              <div style={{ background: "#fff7ed", borderRadius: 10, padding: 16 }}>
                <div style={{ ...styles.eyebrow, color: colors.amber }}>
                  Single-supplier gap
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: colors.amber, marginTop: 8 }}>
                  {individualGap === null ? "—" : fmtNumber(individualGap)}
                </div>
                <div style={styles.sub}>Units not covered by the largest offer</div>
              </div>

              <div style={{ background: "#f8fafc", borderRadius: 10, padding: 16 }}>
                <div style={styles.eyebrow}>Arithmetic total quoted</div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>
                  {fmtNumber(arithmeticQuoteTotal)}
                </div>
                <div style={styles.sub}>
                  {combinedGap === null
                    ? "Across all offers"
                    : `${fmtNumber(combinedGap)} unit gap if offers were split-awarded`}
                </div>
              </div>
            </div>

            {requestedQuantity !== null && requestedQuantity > 0 && (
              <div style={{ marginTop: 20 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    color: colors.muted,
                    marginBottom: 8,
                  }}
                >
                  <span>Largest supplier offer</span>
                  <strong>{Math.min(100, coveragePercent ?? 0).toFixed(1)}% coverage</strong>
                </div>
                <div style={{ height: 10, borderRadius: 20, background: "#edf1f6", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${Math.min(100, coveragePercent ?? 0)}%`,
                      height: "100%",
                      background: individualGap && individualGap > 0 ? "#d97706" : "#16a34a",
                      borderRadius: 20,
                    }}
                  />
                </div>
              </div>
            )}

            {individualGap !== null && individualGap > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  marginTop: 17,
                  padding: 13,
                  borderRadius: 9,
                  background: "#fffbeb",
                  color: "#92400e",
                  fontSize: 12,
                  lineHeight: 1.65,
                }}
              >
                <AlertTriangle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <strong>Do not award the full requirement yet.</strong>
                  {" "}The largest individual offer does not cover the full requested
                  quantity. Confirm whether suppliers can revise their offers or
                  whether a formally approved split award is possible.
                </div>
              </div>
            )}
          </div>

          <div style={{ ...styles.card, marginBottom: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={styles.eyebrow}>Supplier responses</div>
              <h2 style={{ fontSize: 16, margin: "7px 0", fontWeight: 800 }}>
                Invitation and response status
              </h2>
              <p style={styles.sub}>
                Statuses below are read from the backend. No response is inferred
                from a quotation score.
              </p>
            </div>

            {suppliers.length === 0 ? (
              <div style={{ padding: 28, textAlign: "center", color: colors.muted, fontSize: 12 }}>
                No supplier invitations were returned for this RFQ.
              </div>
            ) : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Supplier</th>
                      <th style={styles.th}>Country</th>
                      <th style={styles.th}>Response status</th>
                      <th style={styles.th}>Quotes</th>
                      <th style={styles.th}>Invited</th>
                      <th style={styles.th}>Responded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((supplier) => {
                      const responded =
                        supplier.invitation_status?.toUpperCase() === "RESPONDED";

                      return (
                        <tr key={supplier.supplier_id}>
                          <td style={styles.td}>
                            <div style={{ fontWeight: 800 }}>
                              {supplier.supplier_name}
                            </div>
                            <div style={{ fontSize: 10, color: colors.muted, marginTop: 5 }}>
                              {supplier.supplier_code}
                            </div>
                          </td>
                          <td style={styles.td}>{supplier.country_code ?? "—"}</td>
                          <td style={styles.td}>
                            <Badge tone={responded ? "success" : "warning"}>
                              {responded ? (
                                <CheckCircle2 size={12} />
                              ) : (
                                <Clock3 size={12} />
                              )}
                              {supplier.invitation_status || "UNKNOWN"}
                            </Badge>
                          </td>
                          <td style={styles.td}>{supplier.quote_count ?? 0}</td>
                          <td style={styles.td}>{fmtDate(supplier.invited_at)}</td>
                          <td style={styles.td}>{fmtDate(supplier.responded_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ ...styles.card, marginBottom: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={styles.eyebrow}>Commercial comparison</div>
              <h2 style={{ fontSize: 16, margin: "7px 0", fontWeight: 800 }}>
                Submitted quotations
              </h2>
              <p style={styles.sub}>
                Prices and quantities reflect submitted quotes. Scores appear only
                after evaluation has completed successfully.
              </p>
            </div>

            {rankedQuotes.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: colors.muted, fontSize: 12 }}>
                <FileSearch size={25} style={{ margin: "0 auto 10px" }} />
                <div style={{ fontWeight: 700, color: colors.ink }}>No quotations received yet</div>
                <div style={{ marginTop: 6 }}>Supplier offers will appear here once recorded.</div>
              </div>
            ) : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Supplier / quote</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Quantity</th>
                      <th style={styles.th}>Unit price</th>
                      <th style={styles.th}>Landed cost</th>
                      <th style={styles.th}>Lead time</th>
                      <th style={styles.th}>Technical / quality</th>
                      <th style={styles.th}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankedQuotes.map((quote) => {
                      const result = evaluationByQuote.get(quote.quote_id);
                      const eligible = result?.eligible_for_recommendation === true;

                      return (
                        <tr key={quote.quote_id}>
                          <td style={styles.td}>
                            <div style={{ fontWeight: 800 }}>{quote.supplier_name}</div>
                            <div style={{ color: colors.muted, fontSize: 10, marginTop: 5 }}>
                              {quote.quote_number}
                            </div>
                            <div style={{ color: colors.muted, fontSize: 10, marginTop: 4 }}>
                              Valid until {fmtDate(quote.valid_until)}
                            </div>
                          </td>
                          <td style={styles.td}>
                            <Badge tone={quote.status === "RECEIVED" ? "success" : "neutral"}>
                              {quote.status}
                            </Badge>
                          </td>
                          <td style={styles.td}>
                            <strong>{fmtNumber(quote.quantity)}</strong>
                            {requestedQuantity !== null && asNumber(quote.quantity) < requestedQuantity && (
                              <div style={{ color: colors.amber, fontSize: 10, marginTop: 5 }}>
                                <AlertTriangle size={11} style={{ verticalAlign: "middle", marginRight: 3 }} />
                                Partial offer
                              </div>
                            )}
                          </td>
                          <td style={styles.td}>
                            {fmtMoney(quote.unit_price, quote.currency_code ?? currency)}
                          </td>
                          <td style={styles.td}>
                            <strong>
                              {fmtMoney(
                                quote.total_quote_value,
                                quote.currency_code ?? currency
                              )}
                            </strong>
                            <div style={{ color: colors.muted, fontSize: 10, marginTop: 5 }}>
                              Freight {fmtMoney(quote.freight_cost, quote.currency_code ?? currency)}
                            </div>
                          </td>
                          <td style={styles.td}>
                            <div style={{ fontWeight: 800 }}>
                              {quote.lead_time_days ?? "—"}{quote.lead_time_days != null ? " days" : ""}
                            </div>
                            {result && (
                              <div style={{ color: result.meets_required_date ? colors.green : colors.red, fontSize: 10, marginTop: 5 }}>
                                {result.meets_required_date ? "Meets required date" : "Late delivery"}
                              </div>
                            )}
                          </td>
                          <td style={styles.td}>
                            <div>
                              <Badge tone={quote.technical_compliance ? "success" : "danger"}>
                                Tech {quote.technical_compliance ? "Pass" : "Fail"}
                              </Badge>
                            </div>
                            <div style={{ marginTop: 6 }}>
                              <Badge tone={quote.quality_compliance ? "success" : "danger"}>
                                Quality {quote.quality_compliance ? "Pass" : "Fail"}
                              </Badge>
                            </div>
                          </td>
                          <td style={styles.td}>
                            {result ? (
                              <>
                                <div style={{ fontSize: 18, fontWeight: 800 }}>
                                  {fmtNumber(result.overall_score, 2)}
                                </div>
                                <div style={{ marginTop: 5 }}>
                                  <Badge tone={eligible ? "success" : "danger"}>
                                    {eligible ? "Eligible" : "Review"}
                                  </Badge>
                                </div>
                              </>
                            ) : (
                              <Badge tone="neutral">Not evaluated</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {rankedQuotes.length > 0 && (
              <div style={{ color: colors.muted, fontSize: 10, lineHeight: 1.7, marginTop: 13 }}>
                Landed cost and scores are based on the backend quote and evaluation
                response. Scores do not confirm full quantity availability.
              </div>
            )}
          </div>

          {evaluation && (
            <div style={{ ...styles.card, marginBottom: 20 }}>
              <div style={styles.eyebrow}>Evaluation result</div>
              <h2 style={{ fontSize: 16, margin: "7px 0", fontWeight: 800 }}>
                Evaluation completed
              </h2>
              <p style={styles.sub}>
                {evaluation.evaluated_quote_count ?? evaluatedResults.length} quote(s)
                evaluated against required date {fmtDate(evaluation.required_date)}.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
                  gap: 12,
                  marginTop: 15,
                }}
              >
                {rankedQuotes.map((quote, index) => {
                  const result = evaluationByQuote.get(quote.quote_id);
                  if (!result) return null;

                  return (
                    <div
                      key={quote.quote_id}
                      style={{
                        border: `1px solid ${colors.line}`,
                        borderRadius: 10,
                        padding: 15,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <span style={styles.eyebrow}>
                          {index === 0 ? "Highest score" : "Evaluated offer"}
                        </span>
                        {index === 0 && <ArrowUpRight size={15} color={colors.green} />}
                      </div>
                      <div style={{ fontWeight: 800, marginTop: 9 }}>
                        {quote.supplier_name}
                      </div>
                      <div style={{ fontSize: 25, fontWeight: 800, marginTop: 8 }}>
                        {fmtNumber(result.overall_score, 2)}
                        <span style={{ fontSize: 11, color: colors.muted }}> / 100</span>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <Badge tone={result.eligible_for_recommendation ? "success" : "danger"}>
                          {result.eligible_for_recommendation ? "Eligible" : "Not eligible"}
                        </Badge>
                      </div>
                      {Array.isArray(result.evaluation_flags) &&
                        result.evaluation_flags.length > 0 && (
                          <ul style={{ color: colors.amber, fontSize: 11, lineHeight: 1.7, paddingLeft: 17 }}>
                            {result.evaluation_flags.map((flag: string) => (
                              <li key={flag}>{flag}</li>
                            ))}
                          </ul>
                        )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {evaluationMessage && (
            <div
              role="status"
              style={{
                border: `1px solid ${evaluation ? "#b7ebd0" : "#fed7aa"}`,
                background: evaluation ? "#f0fdf4" : "#fff7ed",
                color: evaluation ? colors.green : colors.amber,
                padding: 13,
                borderRadius: 9,
                fontSize: 12,
                marginBottom: 16,
              }}
            >
              {evaluationMessage}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              padding: "12px 2px",
              color: colors.muted,
              fontSize: 11,
              lineHeight: 1.7,
            }}
          >
            <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              This screen supports monitoring and comparison. It does not issue
              purchase orders or approve supplier awards. Confirm quantity coverage,
              compliance, and internal approvals before award.
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
