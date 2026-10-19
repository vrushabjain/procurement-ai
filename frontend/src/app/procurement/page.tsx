"use client";

import ProcurementSidebar from "../components/ProcurementSidebar";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  AlertCircle,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
  Zap,
} from "lucide-react";

import { getControlTowerSummary } from "@/lib/api";

import type { LucideIcon } from "lucide-react";

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
/* HELPERS                                                         */
/* =============================================================== */

function formatDate(
  value: string | null | undefined
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date);
}

function formatDateTime(
  value: string | null | undefined
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

function getPriorityClass(
  priority: string
) {
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

function getStatusClass(
  status: string
) {
  const normalized =
    status?.toUpperCase() || "";

  if (
    normalized.includes("COMPLETE") ||
    normalized.includes("CLOSED") ||
    normalized.includes("APPROVED")
  ) {
    return "status-completed";
  }

  if (
    normalized.includes("OPEN") ||
    normalized.includes("PENDING") ||
    normalized.includes("WAITING")
  ) {
    return "status-pending";
  }

  if (
    normalized.includes("RISK") ||
    normalized.includes("EXCEPTION") ||
    normalized.includes("BLOCK")
  ) {
    return "status-risk";
  }

  return "status-neutral";
}

function getNextAction(
  request: ProcurementRow
) {
  const stage =
    request.stage?.toUpperCase() || "";

  const status =
    request.request_status?.toUpperCase() ||
    "";

  if (
    status.includes("COMPLETE") ||
    status.includes("CLOSED")
  ) {
    return "View Request";
  }

  if (stage === "INITIATION") {
    return "Review Requirement";
  }

  if (stage === "PROCUREMENT") {
    return "Review Sourcing";
  }

  if (stage === "FULFILLMENT") {
    return "Review PO";
  }

  if (stage === "EXECUTION") {
    return "Monitor Delivery";
  }

  return "Open Request";
}

/* =============================================================== */
/* MAIN PAGE                                                       */
/* =============================================================== */

export default function ProcurementPage() {
  const [data, setData] =
    useState<ControlTowerData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [stageFilter, setStageFilter] =
    useState("ALL");

  const [priorityFilter, setPriorityFilter] =
    useState("ALL");

  /* ============================================================= */
  /* LOAD DATA                                                      */
  /* ============================================================= */

  async function loadProcurement(
    isRefresh = false
  ) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const result =
        await getControlTowerSummary();

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load procurement workspace."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadProcurement();
  }, []);

  /* ============================================================= */
  /* FILTER REQUESTS                                                */
  /* ============================================================= */

  const filteredRequests =
    useMemo(() => {
      if (!data) {
        return [];
      }

      const term =
        searchTerm
          .trim()
          .toLowerCase();

      return data.procurement_overview.filter(
        (request) => {
          const matchesSearch =
            !term ||
            [
              request.request_number,
              request.project_id,
              request.requested_by,
              request.stage_label,
              request.priority,
              request.request_status,
            ]
              .join(" ")
              .toLowerCase()
              .includes(term);

          const matchesStage =
            stageFilter === "ALL" ||
            request.stage?.toUpperCase() ===
              stageFilter;

          const matchesPriority =
            priorityFilter === "ALL" ||
            request.priority?.toUpperCase() ===
              priorityFilter;

          return (
            matchesSearch &&
            matchesStage &&
            matchesPriority
          );
        }
      );
    }, [
      data,
      searchTerm,
      stageFilter,
      priorityFilter,
    ]);

  /* ============================================================= */
  /* LOADING                                                        */
  /* ============================================================= */

  if (loading) {
    return (
      <main className="app-shell">
        <ProcurementSidebar />

        <section className="control-tower-shell">
          <div className="procurement-loading">
            <RefreshCw
              size={21}
              className="spin"
            />

            <span>
              Loading procurement workspace...
            </span>
          </div>
        </section>
      </main>
    );
  }

  /* ============================================================= */
  /* ERROR                                                          */
  /* ============================================================= */

  if (error || !data) {
    return (
      <main className="app-shell">
        <ProcurementSidebar />

        <section className="control-tower-shell">
          <div className="error-state">
            <div className="error-icon">
              <AlertCircle size={24} />
            </div>

            <h2>
              Procurement workspace unavailable
            </h2>

            <p>
              {error ||
                "The procurement intelligence service did not return data."}
            </p>

            <button
              className="primary-button"
              onClick={() =>
                loadProcurement()
              }
            >
              <RefreshCw size={16} />
              Retry
            </button>
          </div>
        </section>
      </main>
    );
  }

  /* ============================================================= */
  /* DATA                                                            */
  /* ============================================================= */

  const {
    kpis,
    pipeline,
  } = data;

  const sourcingCount =
    data.lifecycle_counts.PROCUREMENT;

  const openRequestCount =
    kpis.open_requests;

  const purchaseRequisitionCount =
    pipeline.purchase_requisitions;

  const purchaseOrderCount =
    pipeline.purchase_orders;

  const hasImmediateActions =
    kpis.pending_approvals > 0 ||
    kpis.open_exceptions > 0 ||
    kpis.at_risk_shipments > 0 ||
    kpis.pending_inspections > 0;

  const firstActiveRequest =
    data.procurement_overview.find(
      (request) =>
        ![
          "COMPLETED",
          "CLOSED",
        ].includes(
          request.request_status?.toUpperCase()
        )
    );

  /* ============================================================= */
  /* MAIN UI                                                         */
  /* ============================================================= */

  return (
    <main className="app-shell">
      <ProcurementSidebar />

      <section className="control-tower-shell">
        {/* ======================================================= */}
        {/* TOP HEADER                                               */}
        {/* ======================================================= */}

        <header className="top-header">
          <div className="header-actions">
            <div className="live-status">
              <span className="live-dot" />
              Live
            </div>

            <button
              type="button"
              className="icon-button"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell size={17} />

              {kpis.open_exceptions > 0 && (
                <span className="notification-badge">
                  {kpis.open_exceptions}
                </span>
              )}
            </button>

            <div className="user-avatar">
              VJ
            </div>
          </div>
        </header>

        {/* ======================================================= */}
        {/* CONTENT                                                   */}
        {/* ======================================================= */}

        <div className="procurement-page">
          {/* ===================================================== */}
          {/* BREADCRUMB                                             */}
          {/* ===================================================== */}

          <div className="procurement-breadcrumb">
            <Link href="/">
              Control Tower
            </Link>

            <ChevronRight size={13} />

            <span>
              Procurement
            </span>
          </div>

          {/* ===================================================== */}
          {/* PAGE HEADER                                            */}
          {/* ===================================================== */}

          <section className="procurement-page-header">
            <div>
              <div className="procurement-eyebrow">
                PROCUREMENT OPERATIONS
              </div>

              <h1>
                Procurement Workspace
              </h1>

              <p>
                Execute procurement requests,
                manage sourcing decisions and
                move requirements toward purchase.
              </p>
            </div>

            <div className="procurement-header-actions">
              <div className="procurement-updated">
                <Clock3 size={13} />

                Updated{" "}
                {formatDateTime(
                  data.generated_at
                )}
              </div>

              <button
                type="button"
                className="refresh-button"
                onClick={() =>
                  loadProcurement(true)
                }
                disabled={refreshing}
              >
                <RefreshCw
                  size={14}
                  className={
                    refreshing
                      ? "spin"
                      : ""
                  }
                />

                Refresh
              </button>
            </div>
          </section>

          {/* ===================================================== */}
          {/* PROCUREMENT KPI CARDS                                  */}
          {/* ===================================================== */}

          <section className="procurement-summary-grid">
            <SummaryCard
              label="Open Requests"
              value={openRequestCount}
              detail={
                `${kpis.total_requests} total requests`
              }
              icon={FileCheck2}
              tone="blue"
            />

            <SummaryCard
              label="In Sourcing"
              value={sourcingCount}
              detail="Requests requiring sourcing"
              icon={Search}
              tone="purple"
            />

            <SummaryCard
              label="Awaiting Approval"
              value={kpis.pending_approvals}
              detail={
                kpis.pending_approvals === 0
                  ? "No approval action"
                  : "Action required"
              }
              icon={ShieldCheck}
              tone={
                kpis.pending_approvals > 0
                  ? "amber"
                  : "green"
              }
            />

            <SummaryCard
              label="Purchase Requisitions"
              value={
                purchaseRequisitionCount
              }
              detail="PRs in procurement flow"
              icon={FileCheck2}
              tone="blue"
            />

            <SummaryCard
              label="Purchase Orders"
              value={purchaseOrderCount}
              detail={
                `${kpis.active_purchase_orders} active`
              }
              icon={ShoppingCart}
              tone="green"
            />
          </section>

          {/* ===================================================== */}
          {/* AI RECOMMENDED ACTIONS                                 */}
          {/* ===================================================== */}

          <section className="procurement-ai-banner">
            <div className="procurement-ai-icon">
              <Sparkles size={19} />
            </div>

            <div className="procurement-ai-content">
              <div className="procurement-ai-title">
                AI Recommended Actions
              </div>

              <div className="procurement-ai-text">
                {kpis.pending_approvals > 0
                  ? `${kpis.pending_approvals} procurement decision${kpis.pending_approvals > 1 ? "s are" : " is"} awaiting approval.`
                  : kpis.open_exceptions > 0
                    ? `${kpis.open_exceptions} procurement exception${kpis.open_exceptions > 1 ? "s require" : " requires"} review.`
                    : kpis.at_risk_shipments > 0
                      ? `${kpis.at_risk_shipments} shipment${kpis.at_risk_shipments > 1 ? "s require" : " requires"} procurement attention.`
                      : firstActiveRequest
                        ? `${firstActiveRequest.request_number} is the next active procurement request in the workspace.`
                        : "No immediate procurement action is currently required."}
              </div>
            </div>

            {firstActiveRequest ? (
              <Link
                href={`/procurement/${firstActiveRequest.request_number}`}
                className="procurement-ai-link"
              >
                Review Request
                <ArrowRight size={14} />
              </Link>
            ) : (
              <Link
                href="/"
                className="procurement-ai-link"
              >
                View Control Tower
                <ArrowRight size={14} />
              </Link>
            )}
          </section>

          {/* ===================================================== */}
          {/* WORK QUEUE                                              */}
          {/* ===================================================== */}

          <section className="procurement-portfolio-panel">
            <div className="procurement-panel-header">
              <div>
                <div className="procurement-panel-eyebrow">
                  PROCUREMENT WORK QUEUE
                </div>

                <h2>
                  Requests Requiring Procurement Action
                </h2>

                <p>
                  Open a request to review its
                  requirement, AI decision, sourcing
                  and execution path.
                </p>
              </div>

              <div className="procurement-panel-icon">
                <Zap size={18} />
              </div>
            </div>

            {/* =================================================== */}
            {/* FILTER BAR                                           */}
            {/* =================================================== */}

            <div className="procurement-filter-bar">
              <div className="procurement-search">
                <Search size={15} />

                <input
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value
                    )
                  }
                  placeholder="Search requests..."
                  aria-label="Search procurement requests"
                />
              </div>

              <select
                value={stageFilter}
                onChange={(event) =>
                  setStageFilter(
                    event.target.value
                  )
                }
                className="procurement-filter"
                aria-label="Filter by stage"
              >
                <option value="ALL">
                  All stages
                </option>

                <option value="INITIATION">
                  Requirements
                </option>

                <option value="PROCUREMENT">
                  Sourcing
                </option>

                <option value="FULFILLMENT">
                  Ordering
                </option>

                <option value="EXECUTION">
                  Execution
                </option>

                <option value="COMPLETED">
                  Completed
                </option>
              </select>

              <select
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(
                    event.target.value
                  )
                }
                className="procurement-filter"
                aria-label="Filter by priority"
              >
                <option value="ALL">
                  All priorities
                </option>

                <option value="HIGH">
                  High
                </option>

                <option value="MEDIUM">
                  Medium
                </option>

                <option value="LOW">
                  Low
                </option>
              </select>
            </div>

            {/* =================================================== */}
            {/* WORK QUEUE TABLE                                     */}
            {/* =================================================== */}

            <div className="procurement-table-wrapper">
              <table className="procurement-table">
                <thead>
                  <tr>
                    <th>
                      Request
                    </th>

                    <th>
                      Project
                    </th>

                    <th>
                      Priority
                    </th>

                    <th>
                      Current Stage
                    </th>

                    <th>
                      Required
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Next Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRequests.map(
                    (request) => (
                      <tr
                        key={request.id}
                      >
                        {/* REQUEST */}
                        <td>
                          <div className="procurement-request-cell">
                            <Link
                              href={`/procurement/${request.request_number}`}
                              className="procurement-request-link"
                            >
                              {
                                request.request_number
                              }
                            </Link>

                            <span>
                              Requested by{" "}
                              {
                                request.requested_by
                              }
                            </span>
                          </div>
                        </td>

                        {/* PROJECT */}
                        <td>
                          <div className="procurement-project-cell">
                            <span>
                              {
                                request.project_id
                              }
                            </span>
                          </div>
                        </td>

                        {/* PRIORITY */}
                        <td>
                          <span
                            className={`procurement-priority ${getPriorityClass(
                              request.priority
                            )}`}
                          >
                            {
                              request.priority
                            }
                          </span>
                        </td>

                        {/* STAGE */}
                        <td>
                          <div className="procurement-stage-cell">
                            <span className="procurement-stage-dot" />

                            <span>
                              {
                                request.stage_label
                              }
                            </span>
                          </div>
                        </td>

                        {/* REQUIRED */}
                        <td>
                          <div className="procurement-date-cell">
                            <Clock3 size={13} />

                            {formatDate(
                              request.required_date
                            )}
                          </div>
                        </td>

                        {/* STATUS */}
                        <td>
                          <span
                            className={`procurement-status ${getStatusClass(
                              request.request_status
                            )}`}
                          >
                            {
                              request.request_status ||
                              "Open"
                            }
                          </span>
                        </td>

                        {/* ACTION */}
                        <td>
                          <Link
                            href={`/procurement/${request.request_number}`}
                            className="procurement-row-action"
                            title={getNextAction(
                              request
                            )}
                          >
                            <span>
                              {getNextAction(
                                request
                              )}
                            </span>

                            <ChevronRight
                              size={15}
                            />
                          </Link>
                        </td>
                      </tr>
                    )
                  )}

                  {filteredRequests.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="procurement-empty"
                      >
                        <div className="procurement-empty-icon">
                          <Search size={20} />
                        </div>

                        <strong>
                          No procurement requests found
                        </strong>

                        <span>
                          Try changing your search
                          or filters.
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="procurement-table-footer">
              <span>
                Showing{" "}
                <strong>
                  {filteredRequests.length}
                </strong>{" "}
                of{" "}
                <strong>
                  {data.procurement_overview.length}
                </strong>{" "}
                requests
              </span>

              <span>
                Procurement work queue
              </span>
            </div>
          </section>

          {/* ===================================================== */}
          {/* LOWER OPERATIONS GRID                                  */}
          {/* ===================================================== */}

          <section className="procurement-lower-grid">
            {/* =================================================== */}
            {/* ACTION QUEUE                                         */}
            {/* =================================================== */}

            <div className="procurement-lower-panel">
              <div className="procurement-lower-header">
                <div>
                  <div className="procurement-panel-eyebrow">
                    ACTION QUEUE
                  </div>

                  <h2>
                    Procurement Actions
                  </h2>
                </div>

                <Zap size={18} />
              </div>

              <div className="procurement-health-list">
                {kpis.pending_approvals >
                  0 && (
                  <ActionRow
                    icon={ShieldCheck}
                    label="Approvals requiring action"
                    value={
                      kpis.pending_approvals
                    }
                    tone="attention"
                  />
                )}

                {kpis.open_exceptions >
                  0 && (
                  <ActionRow
                    icon={AlertCircle}
                    label="Open procurement exceptions"
                    value={
                      kpis.open_exceptions
                    }
                    tone="attention"
                  />
                )}

                {kpis.at_risk_shipments >
                  0 && (
                  <ActionRow
                    icon={Truck}
                    label="Shipment risks"
                    value={
                      kpis.at_risk_shipments
                    }
                    tone="attention"
                  />
                )}

                {kpis.pending_inspections >
                  0 && (
                  <ActionRow
                    icon={PackageCheck}
                    label="Pending inspections"
                    value={
                      kpis.pending_inspections
                    }
                    tone="attention"
                  />
                )}

                {!hasImmediateActions && (
                  <div className="procurement-all-clear">
                    <div className="procurement-all-clear-icon">
                      <CheckCircle2
                        size={17}
                      />
                    </div>

                    <div>
                      <strong>
                        No immediate action
                        required
                      </strong>

                      <span>
                        Procurement operations
                        are currently clear.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <Link
                href="/"
                className="procurement-health-link"
              >
                Open Executive Control Tower
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* =================================================== */}
            {/* EXECUTION SNAPSHOT                                   */}
            {/* =================================================== */}

            <div className="procurement-lower-panel">
              <div className="procurement-lower-header">
                <div>
                  <div className="procurement-panel-eyebrow">
                    EXECUTION SNAPSHOT
                  </div>

                  <h2>
                    Procurement Pipeline
                  </h2>
                </div>

                <ShoppingCart size={18} />
              </div>

              <div className="procurement-health-list">
                <MetricRow
                  label="Purchase Requisitions"
                  value={
                    pipeline.purchase_requisitions
                  }
                  icon={FileCheck2}
                />

                <MetricRow
                  label="Purchase Orders"
                  value={
                    pipeline.purchase_orders
                  }
                  icon={ShoppingCart}
                />

                <MetricRow
                  label="Active Purchase Orders"
                  value={
                    pipeline.active_purchase_orders
                  }
                  icon={ShoppingCart}
                />

                <MetricRow
                  label="Active Shipments"
                  value={
                    pipeline.active_shipments
                  }
                  icon={Truck}
                />

                <MetricRow
                  label="Accepted Goods Receipts"
                  value={
                    kpis.accepted_goods_receipts
                  }
                  icon={PackageCheck}
                />
              </div>

              <div className="procurement-execution-note">
                <div className="procurement-execution-note-icon">
                  <Sparkles size={14} />
                </div>

                <span>
                  Use Request 360 to move from
                  procurement decision to execution.
                </span>
              </div>
            </div>
          </section>

          {/* ===================================================== */}
          {/* REQUEST 360 CTA                                        */}
          {/* ===================================================== */}

          <section className="procurement-request-cta">
            <div>
              <div className="procurement-panel-eyebrow">
                REQUEST 360
              </div>

              <h2>
                Need the full procurement decision?
              </h2>

              <p>
                Open a request to review AI supply
                decisions, internal availability,
                external sourcing and procurement
                execution.
              </p>
            </div>

            {firstActiveRequest ? (
              <Link
                href={`/procurement/${firstActiveRequest.request_number}`}
                className="procurement-primary-action"
              >
                Open Request 360
                <ArrowRight size={15} />
              </Link>
            ) : data.procurement_overview.length >
              0 ? (
              <Link
                href={`/procurement/${data.procurement_overview[0].request_number}`}
                className="procurement-primary-action"
              >
                Open Request 360
                <ArrowRight size={15} />
              </Link>
            ) : (
              <Link
                href="/"
                className="procurement-primary-action"
              >
                Back to Control Tower
                <ArrowRight size={15} />
              </Link>
            )}
          </section>

          {/* ===================================================== */}
          {/* FOOTER                                                 */}
          {/* ===================================================== */}

          <footer className="procurement-footer">
            <span>
              Procurement AI · Procurement
              Workspace
            </span>

            <span>
              Production Environment
            </span>
          </footer>
        </div>
      </section>
    </main>
  );
}

/* =============================================================== */
/* SUMMARY CARD                                                    */
/* =============================================================== */

function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  icon: LucideIcon;
  tone:
    | "blue"
    | "purple"
    | "amber"
    | "green"
    | "red";
}) {
  return (
    <div
      className={`procurement-summary-card ${tone}`}
    >
      <div className="procurement-summary-top">
        <div className="procurement-summary-icon">
          <Icon size={17} />
        </div>

        <span>
          {label}
        </span>
      </div>

      <div className="procurement-summary-value">
        {value}
      </div>

      <div className="procurement-summary-detail">
        {detail}
      </div>
    </div>
  );
}

/* =============================================================== */
/* ACTION ROW                                                       */
/* =============================================================== */

function ActionRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: "attention" | "good";
}) {
  return (
    <div className="procurement-health-row">
      <div className="procurement-health-label">
        <span
          className={`procurement-health-dot ${
            tone === "good"
              ? "good"
              : "attention"
          }`}
        />

        <Icon size={14} />

        <span>
          {label}
        </span>
      </div>

      <span
        className={`procurement-health-value ${
          tone === "good"
            ? "good"
            : "attention"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/* =============================================================== */
/* METRIC ROW                                                       */
/* =============================================================== */

function MetricRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <div className="procurement-health-row">
      <div className="procurement-health-label">
        <span className="procurement-health-dot good" />

        <Icon size={14} />

        <span>
          {label}
        </span>
      </div>

      <span className="procurement-health-value good">
        {value}
      </span>
    </div>
  );
}