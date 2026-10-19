"use client";

import ProcurementSidebar from "./components/ProcurementSidebar";
import { useEffect, useMemo, useState } from "react";


import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  Layers3,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Zap,
} from "lucide-react";

import { getControlTowerSummary } from "@/lib/api";

/* =============================================================== */
/* TYPES                                                           */
/* =============================================================== */

type ProcurementRow = {
  id: string;
  request_number: string;
  project_id: string;
  requested_by: string;
  required_date: string;
  priority: string;
  request_status: string;
  record_type: string;
  stage: string;
  stage_label: string;
  lifecycle_category: string;
  updated_at: string;
};

type ExceptionRow = {
  id: string;
  exception_number: string;
  exception_type: string;
  severity: string;
  title: string;
  description: string;
  business_impact: string;
  status: string;
  owner: string | null;
  recommended_action: string | null;
  detected_at: string;
};

type ShipmentRisk = {
  id: string;
  shipment_number: string;
  purchase_order_id: string;
  status: string;
  risk_status: string;
  delay_days: number | null;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  carrier_name: string | null;
  tracking_reference: string | null;
  remarks: string | null;
};

type ControlTowerData = {
  generated_at: string;

  kpis: {
    total_requests: number;
    open_requests: number;
    completed_requests: number;
    pending_approvals: number;
    active_purchase_orders: number;
    completed_purchase_orders: number;
    total_shipments: number;
    active_shipments: number;
    delivered_shipments: number;
    at_risk_shipments: number;
    open_exceptions: number;
    critical_exceptions: number;
    pending_inspections: number;
    accepted_goods_receipts: number;
  };

  pipeline: {
    procurement_requests: number;
    initiation: number;
    procurement: number;
    fulfillment: number;
    execution: number;
    completed: number;
    pending_approvals: number;
    purchase_requisitions: number;
    purchase_orders: number;
    active_purchase_orders: number;
    active_shipments: number;
    goods_receipts: number;
  };

  lifecycle_counts: {
    INITIATION: number;
    PROCUREMENT: number;
    FULFILLMENT: number;
    EXECUTION: number;
    COMPLETED: number;
  };

  procurement_overview: ProcurementRow[];
  exceptions: ExceptionRow[];
  shipment_risks: ShipmentRisk[];
};

/* =============================================================== */
/* LIFECYCLE                                                       */
/* =============================================================== */

const lifecycleSteps = [
  {
    key: "INITIATION",
    label: "Requirements",
    code: "REQ",
    icon: FileCheck2,
  },
  {
    key: "PROCUREMENT",
    label: "Sourcing",
    code: "RFQ",
    icon: Search,
  },
  {
    key: "FULFILLMENT",
    label: "Ordering",
    code: "PO",
    icon: ShoppingCart,
  },
  {
    key: "EXECUTION",
    label: "Execution",
    code: "SHIP",
    icon: Truck,
  },
  {
    key: "COMPLETED",
    label: "Completed",
    code: "GRN",
    icon: PackageCheck,
  },
];

/* =============================================================== */
/* HELPERS                                                         */
/* =============================================================== */

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getPriorityClass(priority: string) {
  switch (priority?.toUpperCase()) {
    case "HIGH":
      return "priority-high";

    case "MEDIUM":
      return "priority-medium";

    case "LOW":
      return "priority-low";

    default:
      return "priority-neutral";
  }
}

function getSeverityClass(severity: string) {
  switch (severity?.toUpperCase()) {
    case "CRITICAL":
      return "severity-critical";

    case "HIGH":
      return "severity-high";

    case "MEDIUM":
      return "severity-medium";

    default:
      return "severity-low";
  }
}

function openRequest(requestNumber: string) {
  window.location.href = `/procurement/${requestNumber}`;
}

/* =============================================================== */
/* MAIN PAGE                                                       */
/* =============================================================== */

export default function Home() {
  const [data, setData] = useState<ControlTowerData | null>(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");

  async function loadDashboard(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const result = await getControlTowerSummary();

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load Control Tower data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const filteredRequests = useMemo(() => {
    if (!data) {
      return [];
    }

    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return data.procurement_overview;
    }

    return data.procurement_overview.filter((request) =>
      [
        request.request_number,
        request.project_id,
        request.requested_by,
        request.stage_label,
        request.priority,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [data, searchTerm]);

  if (loading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return (
      <main className="app-shell">
        <ProcurementSidebar />

        <section className="control-tower-shell">
          <div className="error-state">
            <div className="error-icon">
              <AlertCircle size={24} />
            </div>

            <h2>Control Tower unavailable</h2>

            <p>
              {error ||
                "The procurement intelligence service did not return data."}
            </p>

            <button
              className="primary-button"
              onClick={() => loadDashboard()}
            >
              <RefreshCw size={16} />
              Retry
            </button>
          </div>
        </section>
      </main>
    );
  }

  const { kpis, pipeline, lifecycle_counts } = data;

  const operationsHealthy =
    kpis.open_exceptions === 0 &&
    kpis.at_risk_shipments === 0 &&
    kpis.pending_approvals === 0;

  const healthStatus =
    kpis.critical_exceptions > 0
      ? "CRITICAL"
      : operationsHealthy
        ? "HEALTHY"
        : "ATTENTION";

  const completedPercentage =
    kpis.total_requests > 0
      ? Math.round(
          (kpis.completed_requests / kpis.total_requests) * 100
        )
      : 0;

  return (
    <main className="app-shell">
      <ProcurementSidebar />

      <section className="control-tower-shell">
        {/* =================================================== */}
        {/* TOP HEADER                                          */}
        {/* =================================================== */}

        <header className="top-header">
          <div className="mobile-page-brand">
            <div className="brand-mark">
              <Zap size={18} />
            </div>

            <div>
              <div className="brand-name">PROCUREMENT AI</div>

              <div className="brand-subtitle">CONTROL TOWER</div>
            </div>
          </div>

          <div className="header-actions">
            <div className="live-status">
              <span className="live-dot" />
              Live
            </div>

            <button
              className="icon-button"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell size={18} />

              {kpis.open_exceptions > 0 && (
                <span className="notification-badge">
                  {kpis.open_exceptions}
                </span>
              )}
            </button>

            <div className="user-avatar">VJ</div>
          </div>
        </header>

        {/* =================================================== */}
        {/* PAGE HEADER                                         */}
        {/* =================================================== */}

        <section className="page-header">
          <div className="page-heading">
            <div className="eyebrow">GLOBAL PROCUREMENT OPERATIONS</div>

            <h1>Executive Control Tower</h1>

            <p>
              Real-time visibility across requirements, sourcing,
              approvals, orders and fulfillment.
            </p>
          </div>

          <div className="header-meta">
            <div
              className={`health-pill ${healthStatus.toLowerCase()}`}
            >
              <span />

              {healthStatus === "HEALTHY"
                ? "Operations Healthy"
                : healthStatus === "CRITICAL"
                  ? "Critical Attention"
                  : "Attention Required"}
            </div>

            <div className="last-updated">
              <Clock3 size={14} />

              Updated {formatDateTime(data.generated_at)}
            </div>

            <button
              className="refresh-button"
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
            >
              <RefreshCw
                size={15}
                className={refreshing ? "spin" : ""}
              />

              Refresh
            </button>
          </div>
        </section>

        {/* =================================================== */}
        {/* KPI GRID                                            */}
        {/* =================================================== */}

        <section className="kpi-grid">
          <KpiCard
            label="Procurement Requests"
            value={kpis.total_requests}
            detail={`${kpis.completed_requests} completed`}
            icon={FileCheck2}
            tone="blue"
          />

          <KpiCard
            label="Awaiting Approval"
            value={kpis.pending_approvals}
            detail={
              kpis.pending_approvals === 0
                ? "No approval bottlenecks"
                : "Requires attention"
            }
            icon={ShieldCheck}
            tone={kpis.pending_approvals > 0 ? "amber" : "green"}
          />

          <KpiCard
            label="Active Purchase Orders"
            value={kpis.active_purchase_orders}
            detail={`${kpis.completed_purchase_orders} completed`}
            icon={ShoppingCart}
            tone="purple"
          />

          <KpiCard
            label="Delivery Risk"
            value={kpis.at_risk_shipments}
            detail={
              kpis.at_risk_shipments === 0
                ? "All shipments on track"
                : "Shipment attention required"
            }
            icon={Truck}
            tone={kpis.at_risk_shipments > 0 ? "red" : "green"}
          />

          <KpiCard
            label="Open Exceptions"
            value={kpis.open_exceptions}
            detail={
              kpis.open_exceptions === 0
                ? "No active exceptions"
                : `${kpis.critical_exceptions} critical`
            }
            icon={AlertCircle}
            tone={kpis.open_exceptions > 0 ? "red" : "green"}
          />

          <KpiCard
            label="Goods Receipts"
            value={kpis.accepted_goods_receipts}
            detail={`${kpis.pending_inspections} inspections pending`}
            icon={PackageCheck}
            tone="green"
          />
        </section>

        {/* =================================================== */}
        {/* DASHBOARD GRID                                      */}
        {/* =================================================== */}

        <section className="dashboard-grid">
          {/* ================================================= */}
          {/* OPERATIONAL LIFECYCLE                             */}
          {/* ================================================= */}

          <div className="panel lifecycle-panel">
            <PanelHeader
              eyebrow="PROCUREMENT FLOW"
              title="Operational Lifecycle"
              description="Current production portfolio by lifecycle stage."
              icon={Activity}
            />

            <div className="lifecycle-flow">
              {lifecycleSteps.map((step, index) => {
                const count =
                  lifecycle_counts[
                    step.key as keyof typeof lifecycle_counts
                  ];

                const Icon = step.icon;

                return (
                  <div
                    className="lifecycle-stage"
                    key={step.key}
                  >
                    <div
                      className={`lifecycle-node ${
                        count > 0 ? "has-work" : ""
                      } ${
                        step.key === "COMPLETED" && count > 0
                          ? "completed"
                          : ""
                      }`}
                    >
                      <Icon size={19} />

                      <span>{count}</span>
                    </div>

                    <div className="lifecycle-label">
                      <strong>{step.label}</strong>

                      <span>{step.code}</span>
                    </div>

                    {index < lifecycleSteps.length - 1 && (
                      <div className="lifecycle-arrow">
                        <ArrowRight size={15} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="lifecycle-progress">
              <div className="progress-header">
                <span>Portfolio completion</span>

                <strong>{completedPercentage}%</strong>
              </div>

              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${completedPercentage}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* ================================================= */}
          {/* ATTENTION CENTER                                  */}
          {/* ================================================= */}

          <div className="panel attention-panel">
            <PanelHeader
              eyebrow="AI OPERATIONS"
              title="Attention Center"
              description="What needs procurement leadership attention."
              icon={Zap}
            />

            <div className="attention-list">
              {kpis.pending_approvals > 0 && (
                <AttentionItem
                  type="warning"
                  title={`${kpis.pending_approvals} approval${
                    kpis.pending_approvals > 1 ? "s" : ""
                  } pending`}
                  description="Procurement decisions are waiting for approval."
                  action="Review approvals"
                />
              )}

              {kpis.at_risk_shipments > 0 && (
                <AttentionItem
                  type="danger"
                  title={`${kpis.at_risk_shipments} shipment${
                    kpis.at_risk_shipments > 1 ? "s" : ""
                  } at risk`}
                  description="Delivery performance requires intervention."
                  action="View shipment risk"
                />
              )}

              {kpis.open_exceptions > 0 && (
                <AttentionItem
                  type="danger"
                  title={`${kpis.open_exceptions} open exception${
                    kpis.open_exceptions > 1 ? "s" : ""
                  }`}
                  description="Exceptions are impacting procurement operations."
                  action="Review exceptions"
                />
              )}

              {kpis.pending_inspections > 0 && (
                <AttentionItem
                  type="warning"
                  title={`${kpis.pending_inspections} inspection${
                    kpis.pending_inspections > 1 ? "s" : ""
                  } pending`}
                  description="Received materials are awaiting quality inspection."
                  action="Review inspections"
                />
              )}

              {kpis.pending_approvals === 0 &&
                kpis.at_risk_shipments === 0 &&
                kpis.open_exceptions === 0 &&
                kpis.pending_inspections === 0 && (
                  <div className="all-clear">
                    <div className="all-clear-icon">
                      <CheckCircle2 size={25} />
                    </div>

                    <div>
                      <strong>No immediate action required</strong>

                      <p>
                        Production procurement is currently operating
                        without approval, delivery or exception
                        bottlenecks.
                      </p>
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* ================================================= */}
          {/* PROCUREMENT PORTFOLIO                             */}
          {/* ================================================= */}

          <div className="panel portfolio-panel">
            <PanelHeader
              eyebrow="PROCUREMENT PORTFOLIO"
              title="Requests & Execution Status"
              description="Production procurement currently tracked by the Control Tower."
              icon={Layers3}
              action={
                <div className="search-box">
                  <Search size={15} />

                  <input
                    value={searchTerm}
                    onChange={(event) =>
                      setSearchTerm(event.target.value)
                    }
                    placeholder="Search requests..."
                    aria-label="Search procurement requests"
                  />
                </div>
              }
            />

            <div className="table-wrapper">
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>Project</th>
                    <th>Priority</th>
                    <th>Stage</th>
                    <th>Required</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {filteredRequests.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <div className="request-cell">
                          <button
                            className="request-link"
                            onClick={() =>
                              openRequest(request.request_number)
                            }
                          >
                            {request.request_number}
                          </button>

                          <span>
                            Requested by {request.requested_by}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className="project-code">
                          {request.project_id}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`priority-badge ${getPriorityClass(
                            request.priority
                          )}`}
                        >
                          {request.priority}
                        </span>
                      </td>

                      <td>
                        <div className="stage-cell">
                          <span
                            className={`stage-dot ${
                              request.lifecycle_category === "COMPLETED"
                                ? "completed"
                                : "active"
                            }`}
                          />

                          {request.stage_label}
                        </div>
                      </td>

                      <td>
                        <span className="date-value">
                          {formatDate(request.required_date)}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`status-badge ${
                            request.lifecycle_category === "COMPLETED"
                              ? "success"
                              : "active-status"
                          }`}
                        >
                          {request.lifecycle_category === "COMPLETED" ? (
                            <CheckCircle2 size={13} />
                          ) : (
                            <Activity size={13} />
                          )}

                          {request.lifecycle_category === "COMPLETED"
                            ? "Completed"
                            : "In Progress"}
                        </span>
                      </td>

                      <td>
                        <button
                          className="row-action"
                          title="Open request"
                          aria-label={`Open ${request.request_number}`}
                          onClick={() =>
                            openRequest(request.request_number)
                          }
                        >
                          <ChevronRight size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredRequests.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <div className="empty-table">
                          <Search size={20} />

                          <span>
                            No procurement requests match your search.
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ================================================= */}
          {/* FULFILLMENT HEALTH                                */}
          {/* ================================================= */}

          <div className="panel health-panel">
            <PanelHeader
              eyebrow="EXECUTION HEALTH"
              title="Fulfillment Overview"
              description="Operational status across orders, logistics and receipt."
              icon={Activity}
            />

            <div className="health-metrics">
              <HealthMetric
                label="Purchase Requisitions"
                value={pipeline.purchase_requisitions}
                total={pipeline.procurement_requests}
                icon={FileCheck2}
              />

              <HealthMetric
                label="Purchase Orders"
                value={pipeline.purchase_orders}
                total={pipeline.procurement_requests}
                icon={ShoppingCart}
              />

              <HealthMetric
                label="Shipments"
                value={pipeline.goods_receipts}
                total={pipeline.purchase_orders}
                icon={Truck}
              />

              <HealthMetric
                label="Accepted GRNs"
                value={kpis.accepted_goods_receipts}
                total={pipeline.goods_receipts}
                icon={PackageCheck}
              />
            </div>

            <div className="health-footer">
              <div className="health-footer-icon">
                <CheckCircle2 size={17} />
              </div>

              <div>
                <strong>
                  {kpis.at_risk_shipments === 0
                    ? "Fulfillment is on track"
                    : "Fulfillment requires attention"}
                </strong>

                <span>
                  {kpis.delivered_shipments} of {kpis.total_shipments}{" "}
                  shipments delivered
                </span>
              </div>
            </div>
          </div>

          {/* ================================================= */}
          {/* SHIPMENT RISK                                     */}
          {/* ================================================= */}

          <div className="panel risks-panel">
            <PanelHeader
              eyebrow="LOGISTICS CONTROL"
              title="Shipment Risk"
              description="Exceptions detected across active logistics."
              icon={Truck}
            />

            {data.shipment_risks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon green">
                  <ShieldCheck size={22} />
                </div>

                <strong>No shipment risks detected</strong>

                <p>
                  All production shipments currently reported by the
                  Control Tower are within expected delivery parameters.
                </p>
              </div>
            ) : (
              <div className="risk-list">
                {data.shipment_risks.map((shipment) => (
                  <div className="risk-row" key={shipment.id}>
                    <div className="risk-icon">
                      <Truck size={18} />
                    </div>

                    <div className="risk-content">
                      <strong>{shipment.shipment_number}</strong>

                      <span>
                        {shipment.carrier_name ||
                          "Carrier not specified"}
                      </span>
                    </div>

                    <div
                      className={`risk-status ${shipment.risk_status.toLowerCase()}`}
                    >
                      {shipment.risk_status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ================================================= */}
          {/* EXCEPTIONS                                        */}
          {/* ================================================= */}

          <div className="panel exceptions-panel">
            <PanelHeader
              eyebrow="EXCEPTION MANAGEMENT"
              title="Open Exceptions"
              description="Issues requiring operational intervention."
              icon={AlertCircle}
            />

            {data.exceptions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon green">
                  <CheckCircle2 size={22} />
                </div>

                <strong>All clear</strong>

                <p>
                  There are currently no unresolved procurement exceptions
                  in the production portfolio.
                </p>
              </div>
            ) : (
              <div className="exception-list">
                {data.exceptions.map((exception) => (
                  <div
                    className="exception-row"
                    key={exception.id}
                  >
                    <div
                      className={`severity-icon ${getSeverityClass(
                        exception.severity
                      )}`}
                    >
                      <AlertCircle size={18} />
                    </div>

                    <div className="exception-content">
                      <div className="exception-title">
                        <strong>{exception.title}</strong>

                        <span
                          className={`severity-badge ${getSeverityClass(
                            exception.severity
                          )}`}
                        >
                          {exception.severity}
                        </span>
                      </div>

                      <p>{exception.description}</p>

                      <span className="exception-meta">
                        {exception.exception_number} ·{" "}
                        {formatDateTime(exception.detected_at)}
                      </span>
                    </div>

                    <ChevronRight size={17} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* =================================================== */}
        {/* FOOTER                                              */}
        {/* =================================================== */}

        <footer className="control-footer">
          <div>
            <span className="footer-dot" />
            Procurement Intelligence Engine connected
          </div>

          <div className="footer-right">
            Production data only

            <span>•</span>

            {kpis.total_requests} request
            {kpis.total_requests === 1 ? "" : "s"} monitored
          </div>
        </footer>
      </section>
    </main>
  );
}

/* =============================================================== */
/* PANEL HEADER                                                    */
/* =============================================================== */

function PanelHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ElementType;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel-header">
      <div className="panel-title-group">
        <div className="panel-icon">
          <Icon size={16} />
        </div>

        <div>
          <div className="panel-eyebrow">{eyebrow}</div>

          <h2>{title}</h2>

          <p>{description}</p>
        </div>
      </div>

      {action}
    </div>
  );
}

/* =============================================================== */
/* KPI CARD                                                         */
/* =============================================================== */

function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  icon: React.ElementType;
  tone: string;
}) {
  return (
    <div className="kpi-card">
      <div className={`kpi-icon ${tone}`}>
        <Icon size={18} />
      </div>

      <div className="kpi-content">
        <span>{label}</span>

        <strong>{value}</strong>

        <small>{detail}</small>
      </div>
    </div>
  );
}

/* =============================================================== */
/* ATTENTION ITEM                                                   */
/* =============================================================== */

function AttentionItem({
  type,
  title,
  description,
  action,
}: {
  type: "warning" | "danger";
  title: string;
  description: string;
  action: string;
}) {
  return (
    <div className={`attention-item ${type}`}>
      <div className="attention-icon">
        {type === "danger" ? (
          <AlertCircle size={18} />
        ) : (
          <Clock3 size={18} />
        )}
      </div>

      <div className="attention-content">
        <strong>{title}</strong>

        <p>{description}</p>
      </div>

      <button>{action}</button>
    </div>
  );
}

/* =============================================================== */
/* HEALTH METRIC                                                    */
/* =============================================================== */

function HealthMetric({
  label,
  value,
  total,
  icon: Icon,
}: {
  label: string;
  value: number;
  total: number;
  icon: React.ElementType;
}) {
  const percentage =
    total > 0
      ? Math.min(100, Math.round((value / total) * 100))
      : 0;

  return (
    <div className="health-metric">
      <div className="health-metric-top">
        <div className="health-metric-icon">
          <Icon size={16} />
        </div>

        <span>{label}</span>

        <strong>{value}</strong>
      </div>

      <div className="mini-progress">
        <div
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

      <small>
        {total === 0
          ? "No records"
          : `${percentage}% of portfolio`}
      </small>
    </div>
  );
}

/* =============================================================== */
/* LOADING                                                         */
/* =============================================================== */

function LoadingState() {
  return (
    <main className="app-shell">
      <ProcurementSidebar />

      <section className="control-tower-shell">
        <header className="top-header">
          <div className="mobile-page-brand">
            <div className="brand-mark">
              <Zap size={18} />
            </div>

            <div>
              <div className="brand-name">PROCUREMENT AI</div>

              <div className="brand-subtitle">CONTROL TOWER</div>
            </div>
          </div>
        </header>

        <div className="dashboard-loading">
          <div className="loading-orb">
            <Activity size={25} />
          </div>

          <h2>Loading Control Tower</h2>

          <p>
            Connecting to the procurement intelligence engine...
          </p>

          <div className="loading-bar">
            <div />
          </div>
        </div>
      </section>
    </main>
  );
}