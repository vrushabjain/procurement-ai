
"use client";

import ProcurementSidebar from "../../../../../../components/ProcurementSidebar";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  ShieldCheck,
  AlertTriangle,
  FileText,
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
    maxWidth: 1100,
    margin: "0 auto",
    padding: "26px 28px 44px",
  },
  card: {
    background: "#fff",
    border: "1px solid #e5eaf1",
    borderRadius: 13,
    padding: 24,
    marginBottom: 18,
    boxShadow: "0 2px 8px rgba(15,23,42,0.025)",
  },
  label: {
    color: "#718096",
    fontSize: 11,
    marginBottom: 7,
  },
  value: {
    color: "#172033",
    fontSize: 13,
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
};

export default function ConfirmReviewPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestNumber = String(params.requestNumber ?? "");
  const quoteId = searchParams.get("quoteId") ?? "";
  const note = searchParams.get("note") ?? "";

  const goBack = () => {
    const query = new URLSearchParams({ quoteId, note });

    router.push(
      `/procurement/${encodeURIComponent(requestNumber)}/sourcing/award/review?${query.toString()}`
    );
  };

  const goToAwardDecision = () => {
    router.push(
      `/procurement/${encodeURIComponent(requestNumber)}/sourcing/award`
    );
  };

  return (
    <main className="app-shell">
      <ProcurementSidebar />

      <section className="control-tower-shell" style={styles.page}>
        <header style={styles.header}>
          <div
            style={{
              color: "#64748b",
              fontSize: 10,
              fontWeight: 750,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
            }}
          >
            Procurement workspace
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 12,
              color: "#64748b",
              fontSize: 11,
              flexWrap: "wrap",
            }}
          >
            <span>Request 360</span>
            <span>›</span>
            <span>Sourcing</span>
            <span>›</span>
            <span>Award Decision</span>
            <span>›</span>
            <strong style={{ color: "#172033" }}>Confirm Review</strong>
          </div>
        </header>

        <div style={styles.content}>
          <div style={{ textAlign: "center", padding: "18px 0 28px" }}>
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: 18,
                background: "#e0e7ff",
                color: "#4338ca",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ClipboardCheck size={28} />
            </div>

            <h1
              style={{
                fontSize: 27,
                fontWeight: 800,
                letterSpacing: "-0.04em",
                margin: "16px 0 8px",
              }}
            >
              Confirm review
            </h1>

            <p
              style={{
                color: "#64748b",
                fontSize: 12,
                lineHeight: 1.8,
                maxWidth: 680,
                margin: "0 auto",
              }}
            >
              Review the details below before the proposed supplier selection
              proceeds to the formal human-approval process.
            </p>
          </div>

          <section style={styles.card}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                marginBottom: 22,
              }}
            >
              <FileText size={21} color="#4f46e5" />
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 750, margin: 0 }}>
                  Selection summary
                </h2>
                <p
                  style={{
                    color: "#64748b",
                    fontSize: 12,
                    lineHeight: 1.7,
                    margin: "6px 0 0",
                  }}
                >
                  Verify the identifiers and justification carried forward
                  from the previous screen.
                </p>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 14,
              }}
            >
              <div
                style={{
                  padding: 16,
                  border: "1px solid #e5eaf1",
                  borderRadius: 10,
                }}
              >
                <div style={styles.label}>Procurement request</div>
                <div style={styles.value}>{requestNumber || "Not provided"}</div>
              </div>

              <div
                style={{
                  padding: 16,
                  border: "1px solid #e5eaf1",
                  borderRadius: 10,
                }}
              >
                <div style={styles.label}>Selected quotation ID</div>
                <div style={styles.value}>{quoteId || "Not provided"}</div>
              </div>

              <div
                style={{
                  padding: 16,
                  border: "1px solid #e5eaf1",
                  borderRadius: 10,
                }}
              >
                <div style={styles.label}>Approval status</div>
                <div style={{ ...styles.value, color: "#b45309" }}>
                  Pending submission
                </div>
              </div>
            </div>

            <div style={{ marginTop: 22 }}>
              <div style={styles.label}>Decision justification</div>
              <div
                style={{
                  padding: 16,
                  border: "1px solid #e5eaf1",
                  borderRadius: 10,
                  background: "#f8fafc",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  color: note ? "#334155" : "#94a3b8",
                  lineHeight: 1.8,
                }}
              >
                {note || "No justification was provided."}
              </div>
            </div>
          </section>

          <section style={styles.card}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <ShieldCheck size={23} color="#64748b" />
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 750, margin: 0 }}>
                  Approval and control checks
                </h2>

                <ul
                  style={{
                    color: "#475569",
                    fontSize: 12,
                    lineHeight: 2,
                    paddingLeft: 19,
                    marginTop: 12,
                  }}
                >
                  <li>Supplier selection remains a proposal.</li>
                  <li>Supplier eligibility and quotation evaluation must be verified.</li>
                  <li>Required authorization must be obtained before an award.</li>
                  <li>Purchase-order creation remains a separate controlled action.</li>
                </ul>
              </div>
            </div>
          </section>

          <section
            style={{
              ...styles.card,
              background: "#fff7ed",
              borderColor: "#fed7aa",
            }}
          >
            <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
              <AlertTriangle size={20} color="#b45309" />
              <div>
                <div
                  style={{
                    fontWeight: 750,
                    color: "#9a3412",
                    marginBottom: 6,
                  }}
                >
                  Formal approval is not yet connected
                </div>
                <div
                  style={{
                    color: "#9a3412",
                    fontSize: 12,
                    lineHeight: 1.8,
                  }}
                >
                  This confirmation screen has not saved a decision or
                  submitted an approval request. No supplier has been awarded
                  a contract, and no purchase order has been created.
                  Backend integration is required to complete those actions.
                </div>
              </div>
            </div>
          </section>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <button type="button" style={styles.button} onClick={goBack}>
              <ArrowLeft size={15} />
              Back to Review Selection
            </button>

            <button
              type="button"
              style={styles.button}
              onClick={goToAwardDecision}
            >
              Return to Award Decision
            </button>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 9,
              color: "#64748b",
              fontSize: 11,
              lineHeight: 1.7,
              marginTop: 20,
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>
              Review details are displayed for confirmation only. This page
              does not claim that any information has been persisted.
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
