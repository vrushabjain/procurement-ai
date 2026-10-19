
"use client";

import ProcurementSidebar from "../../../../components/ProcurementSidebar";
import {
  getProcurementRequestByNumber,
  getRFQForProcurementItem,
  getSourcingRecommendation,
} from "@/lib/api";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Award,
  CheckCircle2,
  Clock3,
  FileCheck2,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  Truck,
  PackageCheck,
} from "lucide-react";

type Data = Record<string, any>;

type QuoteOption = {
  quote_id: string;
  supplier_id?: string;
  supplier_code?: string;
  supplier_name: string;
  landed_cost?: number | string | null;
  expected_delivery_date?: string | null;
  days_early_or_late?: number | null;
  overall_score?: number | string | null;
  is_recommended: boolean;
  trade_offs: string[];
};

const ui: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f6f8fb",
    color: "#172033",
    fontSize: 12,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "18px 28px",
    background: "#ffffff",
    borderBottom: "1px solid #e7ebf1",
  },
  content: {
    maxWidth: 1440,
    margin: "0 auto",
    padding: "22px 28px 40px",
  },
  eyebrow: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.09em",
  },
  title: {
    fontSize: 25,
    lineHeight: 1.25,
    fontWeight: 750,
    letterSpacing: "-0.04em",
    margin: "7px 0",
    color: "#111827",
  },
  subtitle: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.7,
    maxWidth: 760,
    margin: 0,
  },
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    flexWrap: "wrap",
    color: "#64748b",
    fontSize: 11,
    marginBottom: 20,
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e5eaf1",
    borderRadius: 13,
    padding: 20,
    marginBottom: 16,
    boxShadow: "0 2px 8px rgba(15,23,42,0.025)",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 750,
    color: "#172033",
    margin: "0 0 5px",
  },
  sectionDescription: {
    color: "#718096",
    fontSize: 11,
    lineHeight: 1.6,
    margin: "0 0 16px",
  },
  label: {
    color: "#718096",
    fontSize: 10,
    marginBottom: 6,
  },
  value: {
    color: "#172033",
    fontSize: 13,
    fontWeight: 700,
    overflowWrap: "anywhere",
  },
  secondary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    background: "#ffffff",
    color: "#334155",
    border: "1px solid #dbe2ea",
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: 11,
    fontWeight: 650,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  primary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    background: "#172554",
    color: "#ffffff",
    border: "1px solid #172554",
    borderRadius: 8,
    padding: "11px 15px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  },
  muted: {
    color: "#64748b",
    fontSize: 11,
    lineHeight: 1.6,
  },
  tableWrap: {
    width: "100%",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 11,
    minWidth: 650,
  },
  th: {
    textAlign: "left",
    color: "#64748b",
    fontWeight: 700,
    fontSize: 10,
    padding: "11px 12px",
    background: "#f8fafc",
    borderBottom: "1px solid #e8edf3",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "13px 12px",
    borderBottom: "1px solid #edf0f5",
    verticalAlign: "top",
  },
};

function money(value: unknown, currency = "USD") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function number(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
      }).format(amount)
    : "—";
}

function date(value: unknown) {
  if (!value) return "—";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function statusStyle(status: string): React.CSSProperties {
  const normalized = status.toUpperCase();

  const good = [
    "APPROVED",
    "ELIGIBLE",
    "COMPLIANT",
    "READY_FOR_REVIEW",
  ].includes(normalized);

  const warning = [
    "PENDING",
    "REVIEW",
    "CONDITIONAL",
  ].some((value) => normalized.includes(value));

  return {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 20,
    padding: "5px 9px",
    fontSize: 10,
    fontWeight: 700,
    background: good
      ? "#ecfdf3"
      : warning
        ? "#fff7ed"
        : "#f1f5f9",
    color: good
      ? "#166534"
      : warning
        ? "#9a3412"
        : "#475569",
    whiteSpace: "nowrap",
  };
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div
      style={{
        padding: 15,
        border: "1px solid #e8edf3",
        borderRadius: 10,
        background: "#ffffff",
        minWidth: 0,
      }}
    >
      <div style={ui.label}>{label}</div>
      <div
        style={{
          fontSize: 20,
          lineHeight: 1.3,
          fontWeight: 750,
          letterSpacing: "-0.03em",
          color: "#172033",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </div>
      {detail && (
        <div style={{ ...ui.muted, marginTop: 5 }}>{detail}</div>
      )}
    </div>
  );
}

export default function SourcingAwardPage() {
  const params = useParams();
  const router = useRouter();

  const requestNumber = decodeURIComponent(
    String(params.requestNumber ?? "")
  );

  const [request, setRequest] = useState<Data | null>(null);
  const [rfq, setRfq] = useState<Data | null>(null);
  const [recommendation, setRecommendation] =
    useState<Data | null>(null);

  const [selectedQuoteId, setSelectedQuoteId] = useState("");
  const [decisionNote, setDecisionNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [decisionAcknowledged, setDecisionAcknowledged] =
    useState(false);

  const loadData = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const req: Data = await getProcurementRequestByNumber(
        requestNumber
      );

      setRequest(req);

      const item = Array.isArray(req.items) ? req.items[0] : null;

      if (!req.id || !item?.id) {
        throw new Error(
          "The procurement request or its item could not be identified."
        );
      }

      const rfqResult: Data = await getRFQForProcurementItem(
        String(req.id),
        String(item.id)
      );

      if (!rfqResult?.id) {
        throw new Error(
          "No RFQ is linked to this request item yet."
        );
      }

      setRfq(rfqResult);

      const result: Data = await getSourcingRecommendation(
        String(rfqResult.id)
      );

      setRecommendation(result);

      setSelectedQuoteId((current) => {
        const options = [
          result.recommended_quote_id,
          ...(Array.isArray(result.alternatives)
            ? result.alternatives.map((a: Data) => a.quote_id)
            : []),
        ].filter(Boolean);

        return options.includes(current)
          ? current
          : String(result.recommended_quote_id ?? "");
      });

      setDecisionAcknowledged(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load the sourcing recommendation."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [requestNumber]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const alternatives: Data[] = Array.isArray(
    recommendation?.alternatives
  )
    ? recommendation.alternatives
    : [];

  const quoteOptions = useMemo<QuoteOption[]>(() => {
  if (!recommendation) return [];

  const recommended: QuoteOption = {
    quote_id: String(recommendation.recommended_quote_id ?? ""),
    supplier_id: recommendation.recommended_supplier_id
      ? String(recommendation.recommended_supplier_id)
      : undefined,
    supplier_code: recommendation.recommended_supplier_code
      ? String(recommendation.recommended_supplier_code)
      : undefined,
    supplier_name: String(
      recommendation.recommended_supplier_name ?? "Unknown supplier"
    ),
    landed_cost: recommendation.landed_cost ?? null,
    expected_delivery_date:
      recommendation.expected_delivery_date ?? null,
    days_early_or_late:
      recommendation.days_early_or_late ?? null,
    overall_score: recommendation.overall_score ?? null,
    is_recommended: true,
    trade_offs: [],
  };

  const alternativeQuotes: QuoteOption[] = alternatives
    .filter((alternative: Data) => Boolean(alternative.quote_id))
    .map((alternative: Data) => ({
      quote_id: String(alternative.quote_id),
      supplier_id: alternative.supplier_id
        ? String(alternative.supplier_id)
        : undefined,
      supplier_code: alternative.supplier_code
        ? String(alternative.supplier_code)
        : undefined,
      supplier_name: String(
        alternative.supplier_name ?? "Unknown supplier"
      ),
      landed_cost: alternative.landed_cost ?? null,
      expected_delivery_date:
        alternative.expected_delivery_date ?? null,
      days_early_or_late:
        alternative.days_early_or_late ?? null,
      overall_score: alternative.overall_score ?? null,
      is_recommended: false,
      trade_offs: Array.isArray(alternative.trade_offs)
        ? alternative.trade_offs.map(String)
        : [],
    }));

  return [
    ...(recommended.quote_id ? [recommended] : []),
    ...alternativeQuotes,
  ];
}, [recommendation, alternatives]);


  const selectedQuote = quoteOptions.find(
    (quote) => quote.quote_id === selectedQuoteId
  );

  const item = request?.items?.[0] ?? {};
  const currency = rfq?.currency_code ?? "USD";

  const requiredQuantity = Number(item.quantity ?? 1000);
  const externalQuantity = Number(
    recommendation?.recommended_quantity ??
      recommendation?.external_quantity ??
      0
  );
  const internalQuantity = Math.max(
    0,
    requiredQuantity - externalQuantity
  );

  const requiredDate = item.required_date ?? request?.required_date;

  const recommendationReady =
    Boolean(recommendation?.recommended_quote_id) &&
    quoteOptions.length > 0;

  const recommendationReasons: string[] = Array.isArray(
    recommendation?.recommendation_reason
  )
    ? recommendation.recommendation_reason
    : [];

  const riskFlags: string[] = Array.isArray(
    recommendation?.risk_flags
  )
    ? recommendation.risk_flags
    : [];

  if (loading) {
    return (
      <main className="app-shell">
        <ProcurementSidebar />
        <section
          className="control-tower-shell"
          style={ui.page}
        >
          <div
            style={{
              padding: 60,
              textAlign: "center",
              color: "#64748b",
            }}
          >
            <RefreshCw size={24} />
            <p>Loading sourcing recommendation…</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <ProcurementSidebar />

      <section
        className="control-tower-shell"
        style={ui.page}
      >
        <header style={ui.header}>
          <div>
            <div style={ui.eyebrow}>Procurement workspace</div>
            <div style={{ ...ui.breadcrumb, margin: "7px 0 0" }}>
              <span
                role="button"
                tabIndex={0}
                style={{ cursor: "pointer" }}
                onClick={() => router.push("/")}
                onKeyDown={(e) =>
                  e.key === "Enter" && router.push("/")
                }
              >
                Control Tower
              </span>
              <span>›</span>
              <span
                role="button"
                tabIndex={0}
                style={{ cursor: "pointer" }}
                onClick={() =>
                  router.push(
                    `/procurement/${encodeURIComponent(requestNumber)}`
                  )
                }
              >
                Request 360
              </span>
              <span>›</span>
              <span
                role="button"
                tabIndex={0}
                style={{ cursor: "pointer" }}
                onClick={() =>
                  router.push(
                    `/procurement/${encodeURIComponent(requestNumber)}/sourcing`
                  )
                }
              >
                Sourcing
              </span>
              <span>›</span>
              <span style={{ color: "#172033", fontWeight: 700 }}>
                Award decision
              </span>
            </div>
          </div>

          <button
            type="button"
            style={ui.secondary}
            disabled={refreshing}
            onClick={() => void loadData(true)}
          >
            <RefreshCw size={14} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </header>

        <div style={ui.content}>
          <button
            type="button"
            style={{
              ...ui.secondary,
              border: "none",
              paddingLeft: 0,
              marginBottom: 18,
            }}
            onClick={() =>
              router.push(
                `/procurement/${encodeURIComponent(requestNumber)}/sourcing/quotations`
              )
            }
          >
            <ArrowLeft size={14} />
            Back to quotation tracking
          </button>

          {error && (
            <div
              role="alert"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: 14,
                marginBottom: 16,
                borderRadius: 10,
                border: "1px solid #fed7aa",
                background: "#fff7ed",
                color: "#9a3412",
                lineHeight: 1.6,
              }}
            >
              <AlertCircle size={17} />
              <div>
                <strong>Unable to load the recommendation</strong>
                <div>{error}</div>
                <div style={{ marginTop: 5 }}>
                  Confirm the recommendation endpoint is available
                  and the RFQ has evaluated supplier quotations.
                </div>
              </div>
            </div>
          )}

          <section style={{ marginBottom: 22 }}>
            <div style={ui.eyebrow}>
              Sourcing intelligence · Decision workspace
            </div>
            <h1 style={ui.title}>
              Sourcing Recommendation & Award Decision
            </h1>
            <p style={ui.subtitle}>
              Review the recommended supplier, compare the commercial
              and delivery trade-offs, and record which quotation
              should move forward for human approval. This screen
              does not approve the award or create a purchase order.
            </p>
          </section>

          <section style={ui.card}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div style={ui.eyebrow}>Procurement request</div>
                <h2 style={{ ...ui.sectionTitle, marginTop: 7 }}>
                  {request?.request_number ?? requestNumber}
                </h2>
                <div style={ui.muted}>
                  {item.material_name ??
                    item.material_code ??
                    "Requested material"}
                  {item.specification
                    ? ` · ${item.specification}`
                    : ""}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={statusStyle(String(rfq?.status ?? "UNKNOWN"))}>
                  RFQ {rfq?.status ?? "Unknown"}
                </span>
                <span
                  style={statusStyle(
                    String(
                      recommendation?.approval_status ?? "PENDING REVIEW"
                    )
                  )}
                >
                  {recommendation?.approval_required
                    ? "Human approval required"
                    : "Review required"}
                </span>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 12,
                marginTop: 20,
              }}
            >
              <Metric
                label="Requested quantity"
                value={`${number(requiredQuantity)} ${item.uom ?? "EA"}`}
                detail={`Required by ${date(requiredDate)}`}
              />
              <Metric
                label="Internal supply"
                value={`${number(internalQuantity)} ${item.uom ?? "EA"}`}
                detail="Planned from internal inventory / transfer"
              />
              <Metric
                label="External sourcing gap"
                value={`${number(externalQuantity)} ${item.uom ?? "EA"}`}
                detail="Quantity to cover through the RFQ"
              />
              <Metric
                label="Eligible quote options"
                value={String(quoteOptions.length)}
                detail="Based on the recommendation response"
              />
            </div>
          </section>

          {!recommendationReady && (
            <section style={ui.card}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <AlertCircle size={18} color="#b45309" />
                <div>
                  <h2 style={ui.sectionTitle}>
                    Recommendation is not ready
                  </h2>
                  <p style={ui.sectionDescription}>
                    The backend has not returned a recommended quote.
                    Verify that the RFQ is issued, supplier responses
                    are received, and quote evaluation has completed.
                    Do not select a supplier based on price alone.
                  </p>
                </div>
              </div>
            </section>
          )}

          {recommendationReady && (
            <>
              <section
                style={{
                  ...ui.card,
                  border: "1px solid #c7d2fe",
                  background:
                    "linear-gradient(135deg, #ffffff 0%, #f8faff 100%)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ flex: "1 1 420px", minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        color: "#4338ca",
                        fontWeight: 750,
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      <Award size={16} />
                      Backend-recommended supplier
                    </div>
                    <h2
                      style={{
                        ...ui.title,
                        fontSize: 22,
                        marginTop: 12,
                      }}
                    >
                      {recommendation?.recommended_supplier_name}
                    </h2>
                    <p style={ui.subtitle}>
                      {recommendation?.recommendation_reason?.[0] ??
                        "Recommended by the sourcing evaluation engine."}
                    </p>
                  </div>

                  <div
                    style={{
                      background: "#eef2ff",
                      border: "1px solid #c7d2fe",
                      borderRadius: 12,
                      padding: "13px 17px",
                      minWidth: 135,
                    }}
                  >
                    <div style={ui.label}>Overall score</div>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 800,
                        color: "#3730a3",
                        letterSpacing: "-0.04em",
                      }}
                    >
                      {number(recommendation?.overall_score)}
                    </div>
                    <div style={ui.muted}>Out of 100</div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: 12,
                    marginTop: 20,
                  }}
                >
                  <Metric
                    label="Recommended landed cost"
                    value={money(
                      recommendation?.landed_cost,
                      currency
                    )}
                    detail="For the recommended external quote"
                  />
                  <Metric
                    label="Expected delivery"
                    value={date(
                      recommendation?.expected_delivery_date
                    )}
                    detail={
                      recommendation?.days_early_or_late != null
                        ? `${number(
                            recommendation.days_early_or_late
                          )} days before / after required date`
                        : "Delivery buffer not supplied"
                    }
                  />
                  <Metric
                    label="Recommended award quantity"
                    value={`${number(
                      recommendation?.recommended_quantity
                    )} ${item.uom ?? "EA"}`}
                    detail="External quantity only"
                  />
                  <Metric
                    label="Approval status"
                    value={
                      recommendation?.approval_status ?? "Pending review"
                    }
                    detail="Recommendation is not an approval"
                  />
                </div>
              </section>

              <section style={ui.card}>
                <h2 style={ui.sectionTitle}>
                  Supplier comparison & award selection
                </h2>
                <p style={ui.sectionDescription}>
                  Compare the backend recommendation with the evaluated
                  alternatives. Select the quote you want to put forward
                  for approval; choosing an alternative does not change
                  the system recommendation.
                </p>

                <div style={ui.tableWrap}>
                  <table style={ui.table}>
                    <thead>
                      <tr>
                        <th style={ui.th}>Select</th>
                        <th style={ui.th}>Supplier</th>
                        <th style={ui.th}>Landed cost</th>
                        <th style={ui.th}>Delivery date</th>
                        <th style={ui.th}>Delivery buffer</th>
                        <th style={ui.th}>Score</th>
                        <th style={ui.th}>Evaluation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quoteOptions.map((quote) => {
                        const selected =
                          selectedQuoteId === quote.quote_id;

                        return (
                          <tr
                            key={quote.quote_id}
                            style={{
                              background: selected
                                ? "#f5f7ff"
                                : "#ffffff",
                            }}
                          >
                            <td style={ui.td}>
                              <input
                                type="radio"
                                name="selected-award-quote"
                                aria-label={`Select ${quote.supplier_name}`}
                                checked={selected}
                                onChange={() => {
                                  setSelectedQuoteId(
                                    String(quote.quote_id)
                                  );
                                  setDecisionAcknowledged(false);
                                }}
                              />
                            </td>
                            <td style={ui.td}>
                              <div
                                style={{
                                  fontWeight: 750,
                                  color: "#172033",
                                }}
                              >
                                {quote.supplier_name}
                              </div>
                              <div
                                style={{
                                  ...ui.muted,
                                  marginTop: 4,
                                }}
                              >
                                {quote.supplier_code ?? "Supplier"}
                              </div>
                              {quote.is_recommended && (
                                <div style={{ marginTop: 6 }}>
                                  <span
                                    style={{
                                      ...statusStyle("ELIGIBLE"),
                                    }}
                                  >
                                    System recommended
                                  </span>
                                </div>
                              )}
                            </td>
                            <td style={ui.td}>
                              <strong>
                                {money(quote.landed_cost, currency)}
                              </strong>
                            </td>
                            <td style={ui.td}>
                              {date(quote.expected_delivery_date)}
                            </td>
                            <td style={ui.td}>
                              {quote.days_early_or_late == null
                                ? "—"
                                : `${number(
                                    quote.days_early_or_late
                                  )} days`}
                            </td>
                            <td style={ui.td}>
                              <strong>
                                {number(quote.overall_score)}
                              </strong>
                              <span style={ui.muted}> / 100</span>
                            </td>
                            <td style={ui.td}>
                              {selected ? (
                                <span style={statusStyle("ELIGIBLE")}>
                                  Selected for review
                                </span>
                              ) : (
                                <span style={ui.muted}>
                                  Alternative
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {selectedQuote && selectedQuote.trade_offs.length > 0 && (
                    <div
                        style={{
                            marginTop: 16,
                            padding: 14,
                            borderRadius: 9,
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                        }}
                    >
                        <div
                            style={{
                                fontWeight: 750,
                                marginBottom: 8,
                            }}
                        >
                        Trade-offs for selected alternative
                        </div>

                        <ul
                            style={{
                                margin: 0,
                                paddingLeft: 18,
                                color: "#64748b",
                                lineHeight: 1.8,
                            }}
                        >
                            {selectedQuote.trade_offs.map(
                                (tradeOff: string, index: number) => (
                                    <li key={`${index}-${tradeOff}`}>
                                        {tradeOff}
                                    </li>
                                )
                            )}
                        </ul>
                    </div>
                )}

              </section>

              <section style={ui.card}>
                <h2 style={ui.sectionTitle}>
                  Recommendation rationale
                </h2>
                <p style={ui.sectionDescription}>
                  Reasons returned by the sourcing recommendation
                  engine.
                </p>

                {recommendationReasons.length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {recommendationReasons.map(
                      (reason, index) => (
                        <div
                          key={`${index}-${reason}`}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                            lineHeight: 1.65,
                            color: "#334155",
                          }}
                        >
                          <CheckCircle2
                            size={15}
                            color="#64748b"
                            style={{
                              flexShrink: 0,
                              marginTop: 2,
                            }}
                          />
                          <span>{reason}</span>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p style={ui.muted}>
                    No recommendation rationale was returned.
                  </p>
                )}

                {riskFlags.length > 0 && (
                  <div
                    style={{
                      marginTop: 18,
                      padding: 14,
                      borderRadius: 9,
                      background: "#fff7ed",
                      border: "1px solid #fed7aa",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        fontWeight: 750,
                        color: "#9a3412",
                        marginBottom: 8,
                      }}
                    >
                      <AlertCircle size={15} />
                      Risk flags requiring review
                    </div>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: 18,
                        color: "#9a3412",
                        lineHeight: 1.8,
                      }}
                    >
                      {riskFlags.map((flag, index) => (
                        <li key={`${index}-${flag}`}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              <section style={ui.card}>
                <h2 style={ui.sectionTitle}>
                  Award decision review
                </h2>
                <p style={ui.sectionDescription}>
                  Review the selected quotation and record the business
                  justification before sending it through the approval
                  workflow.
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(230px, 1fr))",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      border: "1px solid #e5eaf1",
                      borderRadius: 10,
                      padding: 14,
                    }}
                  >
                    <div style={ui.label}>Selected supplier</div>
                    <div style={ui.value}>
                      {selectedQuote?.supplier_name ?? "Select a quote"}
                    </div>
                  </div>
                  <div
                    style={{
                      border: "1px solid #e5eaf1",
                      borderRadius: 10,
                      padding: 14,
                    }}
                  >
                    <div style={ui.label}>Proposed award value</div>
                    <div style={ui.value}>
                      {selectedQuote
                        ? money(selectedQuote.landed_cost, currency)
                        : "—"}
                    </div>
                  </div>
                  <div
                    style={{
                      border: "1px solid #e5eaf1",
                      borderRadius: 10,
                      padding: 14,
                    }}
                  >
                    <div style={ui.label}>Award quantity</div>
                    <div style={ui.value}>
                      {selectedQuote
                        ? `${number(externalQuantity)} ${item.uom ?? "EA"}`
                        : "—"}
                    </div>
                  </div>
                </div>

                <label
                  htmlFor="award-note"
                  style={{
                    display: "block",
                    fontWeight: 700,
                    color: "#334155",
                    marginBottom: 7,
                  }}
                >
                  Decision justification
                </label>
                <textarea
                  id="award-note"
                  value={decisionNote}
                  onChange={(event) => {
                    setDecisionNote(event.target.value);
                    setDecisionAcknowledged(false);
                  }}
                  placeholder="Document why this supplier should proceed, including any delivery, price, or compliance trade-offs…"
                  rows={4}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    resize: "vertical",
                    border: "1px solid #dbe2ea",
                    borderRadius: 9,
                    padding: 12,
                    font: "inherit",
                    fontSize: 12,
                    lineHeight: 1.7,
                    outlineColor: "#818cf8",
                    marginBottom: 14,
                  }}
                />

                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 9,
                    color: "#475569",
                    fontSize: 11,
                    lineHeight: 1.7,
                    marginBottom: 16,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={decisionAcknowledged}
                    onChange={(event) =>
                      setDecisionAcknowledged(event.target.checked)
                    }
                    style={{ marginTop: 3 }}
                  />
                  I have reviewed the supplier comparison, quantity
                  coverage, delivery commitment, technical and quality
                  compliance, and any listed risk flags. I understand
                  that this selection is not an approval or a purchase
                  order.
                </label>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 14,
                    flexWrap: "wrap",
                    borderTop: "1px solid #edf0f5",
                    paddingTop: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      maxWidth: 650,
                    }}
                  >
                    <ShieldCheck
                      size={17}
                      color="#64748b"
                      style={{ flexShrink: 0, marginTop: 1 }}
                    />
                    <div style={ui.muted}>
                      Approval and purchase-order creation remain
                      separate controlled steps. This screen records
                      the review selection in the current UI only;
                      it does not submit an approval request.
                    </div>
                  </div>

                  <button
                    type="button"
                    style={{
                      ...ui.primary,
                      opacity:
                        selectedQuote && decisionAcknowledged
                          ? 1
                          : 0.45,
                      cursor:
                        selectedQuote && decisionAcknowledged
                          ? "pointer"
                          : "not-allowed",
                    }}
                    disabled={
                      !selectedQuote || !decisionAcknowledged
                    }
                    onClick={() => {
                        if (!selectedQuote || !decisionAcknowledged) return;

                        const query = new URLSearchParams({
                            quoteId: String(selectedQuote.quote_id),
                            note: decisionNote.trim(),
                        });

                        router.push(
                          `/procurement/${encodeURIComponent(requestNumber)}/sourcing/award/review?${query.toString()}`
                        );
                    }}
                >
                    Review selection
                    <ArrowRight size={14} />
                </button>
                </div>
              </section>
            </>
          )}

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              paddingTop: 4,
            }}
          >
            <button
              type="button"
              style={ui.secondary}
              onClick={() =>
                router.push(
                  `/procurement/${encodeURIComponent(requestNumber)}/sourcing/quotations`
                )
              }
            >
              <FileCheck2 size={14} />
              Quotation tracking
            </button>

            <button
              type="button"
              style={ui.secondary}
              onClick={() =>
                router.push(
                  `/procurement/${encodeURIComponent(requestNumber)}`
                )
              }
            >
              <ArrowLeft size={14} />
              Request 360
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
