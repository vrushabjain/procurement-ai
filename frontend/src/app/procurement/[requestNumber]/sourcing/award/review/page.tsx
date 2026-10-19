
"use client";

import ProcurementSidebar from "../../../../../components/ProcurementSidebar";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f6f8fb",
    color: "#172033",
    fontSize: 13,
  },
  header: {
    padding: "20px 28px",
    background: "#fff",
    borderBottom: "1px solid #e5eaf1",
  },
  content: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "24px 28px 40px",
  },
  card: {
    background: "#fff",
    border: "1px solid #e5eaf1",
    borderRadius: 13,
    padding: 22,
    marginBottom: 18,
    boxShadow: "0 2px 8px rgba(15,23,42,0.025)",
  },
  eyebrow: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: 750,
    textTransform: "uppercase",
    letterSpacing: "0.09em",
  },
  title: {
    fontSize: 26,
    lineHeight: 1.3,
    fontWeight: 800,
    letterSpacing: "-0.04em",
    margin: "8px 0",
    color: "#111827",
  },
  subtitle: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.8,
    margin: 0,
    maxWidth: 800,
  },
  label: {
    color: "#718096",
    fontSize: 11,
    marginBottom: 7,
  },
  value: {
    color: "#172033",
    fontSize: 14,
    fontWeight: 750,
    overflowWrap: "anywhere",
  },
  button: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    background: "#fff",
    color: "#334155",
    border: "1px solid #dbe2ea",
    borderRadius: 8,
    padding: "11px 15px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  primaryButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    background: "#172554",
    color: "#fff",
    border: "1px solid #172554",
    borderRadius: 8,
    padding: "11px 16px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
};

function formatMoney(value: string | null, currency = "USD") {
  if (!value || !Number.isFinite(Number(value))) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function AwardReviewPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestNumber = decodeURIComponent(
    String(params.requestNumber ?? "")
  );

  const quoteId = searchParams.get("quoteId") ?? "";
  const decisionNote = searchParams.get("note") ?? "";

  const [acknowledged, setAcknowledged] = useState(false);

  // This page intentionally presents the quote ID and justification
  // passed from the Award Decision screen. It does not trust URL data
  // as authoritative approval or award data.
  useEffect(() => {
    setAcknowledged(false);
  }, [quoteId, decisionNote]);

  const backToAward = () => {
    router.push(
      `/procurement/${encodeURIComponent(requestNumber)}/sourcing/award`
    );
  };

  return (
    <main className="app-shell">
      <ProcurementSidebar />

      <section
        className="control-tower-shell"
        style={styles.page}
      >
        <header style={styles.header}>
          <div style={styles.eyebrow}>Procurement workspace</div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              marginTop: 10,
            }}
          >
            <div>
              <div style={{ color: "#64748b", fontSize: 11 }}>
                Control Tower　›　Request 360　›　Sourcing　›　Award Decision　›
                <strong style={{ color: "#172033" }}> Review Selection</strong>
              </div>
              <h1 style={{ ...styles.title, fontSize: 22 }}>
                Review supplier selection
              </h1>
            </div>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                background: "#fff7ed",
                color: "#9a3412",
                border: "1px solid #fed7aa",
                borderRadius: 20,
                padding: "7px 11px",
                fontSize: 11,
                fontWeight: 750,
              }}
            >
              <ShieldCheck size={14} />
              Approval pending
            </span>
          </div>
        </header>

        <div style={styles.content}>
          <button
            type="button"
            style={{
              ...styles.button,
              border: "none",
              paddingLeft: 0,
              marginBottom: 18,
            }}
            onClick={backToAward}
          >
            <ArrowLeft size={15} />
            Back to Award Decision
          </button>

          <section style={styles.card}>
            <div style={styles.eyebrow}>Review summary</div>
            <h2 style={{ ...styles.title, fontSize: 21 }}>
              Confirm your proposed supplier
            </h2>
            <p style={styles.subtitle}>
              Review the selected quotation and justification before
              proceeding to the controlled approval workflow. This review
              does not constitute supplier award approval.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 14,
                marginTop: 24,
              }}
            >
              <div
                style={{
                  border: "1px solid #e5eaf1",
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <div style={styles.label}>Procurement request</div>
                <div style={styles.value}>{requestNumber || "—"}</div>
              </div>

              <div
                style={{
                  border: "1px solid #e5eaf1",
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <div style={styles.label}>Selected quotation ID</div>
                <div style={styles.value}>{quoteId || "Not provided"}</div>
              </div>

              <div
                style={{
                  border: "1px solid #e5eaf1",
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <div style={styles.label}>Review status</div>
                <div style={styles.value}>Pending approval submission</div>
              </div>
            </div>
          </section>

          {!quoteId && (
            <section
              role="alert"
              style={{
                ...styles.card,
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                background: "#fff7ed",
                borderColor: "#fed7aa",
                color: "#9a3412",
              }}
            >
              <AlertCircle size={19} />
              <div>
                <strong>No quotation selected</strong>
                <p style={{ marginBottom: 0, lineHeight: 1.7 }}>
                  Return to Award Decision and select a quotation before
                  reviewing the decision.
                </p>
              </div>
            </section>
          )}

          <section style={styles.card}>
            <h2 style={{ ...styles.title, fontSize: 17 }}>
              Decision justification
            </h2>
            <p style={styles.subtitle}>
              The business rationale entered on the Award Decision screen.
            </p>

            <div
              style={{
                marginTop: 16,
                padding: 16,
                border: "1px solid #e5eaf1",
                borderRadius: 10,
                background: "#f8fafc",
                color: decisionNote ? "#334155" : "#94a3b8",
                lineHeight: 1.8,
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
              }}
            >
              {decisionNote || "No decision justification was provided."}
            </div>

            <button
              type="button"
              style={{
                ...styles.button,
                marginTop: 14,
              }}
              onClick={backToAward}
            >
              Edit selection or justification
            </button>
          </section>

          <section style={styles.card}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <FileCheck2 size={22} color="#4f46e5" />

              <div>
                <h2 style={{ ...styles.title, fontSize: 17 }}>
                  Before approval
                </h2>
                <p style={styles.subtitle}>
                  Confirm that you have reviewed the commercial terms,
                  delivery commitment, supplier eligibility, and quantity
                  coverage. The final decision must be validated and
                  recorded by the backend approval workflow.
                </p>
              </div>
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                marginTop: 22,
                color: "#334155",
                fontSize: 12,
                lineHeight: 1.8,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                style={{ marginTop: 4 }}
              />
              I confirm that I have reviewed this selection and understand
              that it is a proposal, not an approved award or purchase order.
            </label>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                marginTop: 22,
                paddingTop: 18,
                borderTop: "1px solid #edf0f5",
              }}
            >
              <button
                type="button"
                style={styles.button}
                onClick={backToAward}
              >
                <ArrowLeft size={15} />
                Back to Award Decision
              </button>

              <button
                type="button"
                disabled={!quoteId || !acknowledged}
                style={{
                  ...styles.primaryButton,
                  opacity: quoteId && acknowledged ? 1 : 0.5,
                  cursor:
                    quoteId && acknowledged ? "pointer" : "not-allowed",
                }}
                onClick={() => {
                    if (!quoteId || !acknowledged) return;

                    const query = new URLSearchParams({
                        quoteId,
                        note: decisionNote,
                    });

                    router.push(
                        `/procurement/${encodeURIComponent(requestNumber)}/sourcing/award/review/confirm?${query.toString()}`
                    );
                }}
              >
                <CheckCircle2 size={15} />
                Confirm review
                <ArrowRight size={15} />
              </button>
            </div>

            <div
              style={{
                marginTop: 18,
                padding: 13,
                borderRadius: 9,
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                color: "#9a3412",
                fontSize: 11,
                lineHeight: 1.7,
              }}
            >
              Human approval is still required. This screen does not save a
              decision to the backend, approve a supplier, issue an award, or
              create a purchase order.
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
