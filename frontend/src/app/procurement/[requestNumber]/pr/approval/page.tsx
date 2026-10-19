"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  apiFetch,
  approvePurchaseRequisition,
  rejectPurchaseRequisition,
} from "@/lib/api";

const PR_ID = "8f572289-ebbb-4094-9efa-52947f0c57d6";

const APPROVER = "procurement.head@epc-demo.com";

type PRItem = {
  id: string;
  purchase_requisition_id: string;
  procurement_request_item_id: string;
  rfq_item_id: string;
  material_id: string;
  quantity: string;
  uom: string;
  unit_price: string;
  landed_cost: string;
  technical_specification: string | null;
};

type PurchaseRequisition = {
  id: string;
  pr_number: string;
  procurement_request_id: string;
  rfq_id: string;
  quote_id: string;
  approval_id: string;
  supplier_id: string;
  status: string;
  required_date: string;
  currency_code: string;
  total_amount: string;
  requested_by: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items: PRItem[];
};

export default function PRApprovalPage() {
  const params = useParams();
  const router = useRouter();

  const requestNumber = params.requestNumber as string;

  const [pr, setPr] = useState<PurchaseRequisition | null>(null);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [comments, setComments] = useState("");

  const [decision, setDecision] = useState<
    "APPROVED" | "REJECTED" | null
  >(null);

  useEffect(() => {
    loadPR();
  }, []);

  async function loadPR() {
    try {
      setLoading(true);
      setError(null);

      const data = await apiFetch(
        `/api/v1/purchase-requisitions/${PR_ID}`
      );

      setPr(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load purchase requisition."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!pr) return;

    try {
      setProcessing(true);
      setActionError(null);

      const updatedPR = await approvePurchaseRequisition(
        PR_ID,
        APPROVER,
        comments || "PR approved for purchase order processing."
      );

      setPr(updatedPR);
      setDecision("APPROVED");
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to approve purchase requisition."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject() {
    if (!pr) return;

    if (!comments.trim()) {
      setActionError(
        "Please provide a reason before rejecting the purchase requisition."
      );
      return;
    }

    try {
      setProcessing(true);
      setActionError(null);

      const updatedPR = await rejectPurchaseRequisition(
        PR_ID,
        APPROVER,
        comments
      );

      setPr(updatedPR);
      setDecision("REJECTED");
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to reject purchase requisition."
      );
    } finally {
      setProcessing(false);
    }
  }

  function formatCurrency(value: string | number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: pr?.currency_code || "USD",
      maximumFractionDigits: 2,
    }).format(Number(value));
  }

  function formatDate(value: string) {
    if (!value) return "—";

    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function formatDateTime(value: string) {
    if (!value) return "—";

    return new Date(value).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getStatusClasses(status: string) {
    switch (status) {
      case "SUBMITTED":
        return "border-blue-200 bg-blue-50 text-blue-700";

      case "APPROVED":
        return "border-emerald-200 bg-emerald-50 text-emerald-700";

      case "REJECTED":
        return "border-red-200 bg-red-50 text-red-700";

      case "DRAFT":
        return "border-slate-200 bg-slate-100 text-slate-700";

      default:
        return "border-slate-200 bg-slate-100 text-slate-700";
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto max-w-[1500px] px-8 py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-80 rounded-lg bg-slate-200" />

            <div className="h-32 rounded-2xl bg-white" />

            <div className="h-[500px] rounded-2xl bg-white" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !pr) {
    return (
      <main className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto max-w-[1500px] px-8 py-10">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="text-sm font-bold text-red-800">
              Unable to load PR
            </div>

            <div className="mt-2 text-sm text-red-700">
              {error || "Purchase requisition not found."}
            </div>

            <button
              onClick={loadPR}
              className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
            >
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  const isPending = pr.status === "SUBMITTED";
  const isApproved = pr.status === "APPROVED";
  const isRejected = pr.status === "REJECTED";

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-slate-900">

      {/* ===================================================== */}
      {/* HEADER */}
      {/* ===================================================== */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-8 py-5">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
              PA
            </div>

            <div>
              <div className="text-sm font-semibold text-slate-900">
                Procurement AI
              </div>

              <div className="text-xs text-slate-500">
                Procurement Control Tower
              </div>
            </div>

          </div>

          <div className="flex items-center gap-4">

            <div className="text-right">
              <div className="text-sm font-semibold text-slate-800">
                Procurement Head
              </div>

              <div className="text-xs text-slate-500">
                {APPROVER}
              </div>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
              PH
            </div>

          </div>
        </div>
      </header>

      {/* ===================================================== */}
      {/* PAGE */}
      {/* ===================================================== */}

      <div className="mx-auto max-w-[1500px] px-8 py-8">

        {/* Breadcrumb */}

        <div className="mb-5 flex items-center gap-2 text-sm text-slate-500">
          <span>Procurement</span>
          <span>›</span>
          <span>{requestNumber}</span>
          <span>›</span>
          <span>Purchase Requisition</span>
          <span>›</span>

          <span className="font-medium text-slate-900">
            Approval
          </span>
        </div>

        {/* =================================================== */}
        {/* TITLE */}
        {/* =================================================== */}

        <div className="mb-7 flex items-start justify-between">

          <div>

            <div className="flex items-center gap-3">

              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                PR Approval Workspace
              </h1>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(
                  pr.status
                )}`}
              >
                {pr.status}
              </span>

            </div>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Review the purchase requisition, sourcing decision,
              commercial value and project requirement before approving
              it for purchase order processing.
            </p>

          </div>

          <div className="text-right">

            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              PR Number
            </div>

            <div className="mt-1 text-xl font-bold text-slate-950">
              {pr.pr_number}
            </div>

          </div>

        </div>

        {/* =================================================== */}
        {/* KPI */}
        {/* =================================================== */}

        <div className="mb-7 grid grid-cols-4 gap-5">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              PR Value
            </div>

            <div className="mt-2 text-2xl font-bold text-slate-950">
              {formatCurrency(pr.total_amount)}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Total requisition value
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Supplier
            </div>

            <div className="mt-2 text-base font-bold text-slate-950">
              Gulf Valve Industries
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Approved supplier
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Required Date
            </div>

            <div className="mt-2 text-base font-bold text-slate-950">
              {formatDate(pr.required_date)}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Project requirement
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Requested By
            </div>

            <div className="mt-2 truncate text-sm font-bold text-slate-950">
              {pr.requested_by}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Procurement Manager
            </div>
          </div>

        </div>

        {/* =================================================== */}
        {/* ERROR */}
        {/* =================================================== */}

        {actionError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4">

            <div className="text-sm font-bold text-red-800">
              Action failed
            </div>

            <div className="mt-1 text-sm text-red-700">
              {actionError}
            </div>

          </div>
        )}

        {/* =================================================== */}
        {/* MAIN */}
        {/* =================================================== */}

        <div className="grid grid-cols-[minmax(0,1fr)_400px] gap-6">

          {/* ================================================= */}
          {/* LEFT */}
          {/* ================================================= */}

          <div className="space-y-6">

            {/* Procurement Summary */}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-6 py-5">

                <h2 className="text-base font-bold text-slate-950">
                  Procurement Summary
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Business context behind this requisition.
                </p>

              </div>

              <div className="grid grid-cols-2 gap-x-10 gap-y-6 px-6 py-6">

                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Project
                  </div>

                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    PE-104 — Saudi Gas Processing Expansion
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Delivery Location
                  </div>

                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    Riyadh Project Logistics Hub
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Required Date
                  </div>

                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {formatDate(pr.required_date)}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Currency
                  </div>

                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {pr.currency_code}
                  </div>
                </div>

              </div>
            </section>

            {/* Line Items */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-6 py-5">

                <h2 className="text-base font-bold text-slate-950">
                  Requisition Line Items
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Items included in the purchase requisition.
                </p>

              </div>

              <div className="overflow-x-auto">

                <table className="w-full text-left">

                  <thead>

                    <tr className="border-b border-slate-100 bg-slate-50">

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                        Material
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                        Quantity
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                        Unit Price
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                        Landed Cost
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {pr.items.map((item) => (

                      <tr
                        key={item.id}
                        className="border-b border-slate-100 last:border-0"
                      >

                        <td className="px-6 py-5">

                          <div className="font-semibold text-slate-900">
                            API 6D Class 600 Carbon Steel Valve
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            Material ID: {item.material_id}
                          </div>

                        </td>

                        <td className="px-6 py-5">

                          <div className="font-semibold text-slate-900">
                            {Number(item.quantity).toLocaleString()}
                          </div>

                          <div className="text-xs text-slate-500">
                            {item.uom}
                          </div>

                        </td>

                        <td className="px-6 py-5">

                          <div className="font-semibold text-slate-900">
                            {formatCurrency(item.unit_price)}
                          </div>

                          <div className="text-xs text-slate-500">
                            per {item.uom}
                          </div>

                        </td>

                        <td className="px-6 py-5">

                          <div className="font-semibold text-slate-900">
                            {formatCurrency(item.landed_cost)}
                          </div>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

              {pr.items[0]?.technical_specification && (

                <div className="border-t border-slate-100 bg-slate-50 px-6 py-5">

                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Technical Specification
                  </div>

                  <div className="mt-2 text-sm leading-6 text-slate-700">
                    {pr.items[0].technical_specification}
                  </div>

                </div>

              )}

            </section>

            {/* Sourcing Decision */}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-6 py-5">

                <div className="flex items-center justify-between">

                  <div>

                    <h2 className="text-base font-bold text-slate-950">
                      Sourcing Decision
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Decision context carried forward from sourcing.
                    </p>

                  </div>

                  <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    Approved Supplier
                  </div>

                </div>

              </div>

              <div className="grid grid-cols-3 gap-5 px-6 py-6">

                <div className="rounded-xl bg-slate-50 p-4">

                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Supplier
                  </div>

                  <div className="mt-2 text-sm font-bold text-slate-900">
                    Gulf Valve Industries
                  </div>

                </div>

                <div className="rounded-xl bg-slate-50 p-4">

                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Lead Time
                  </div>

                  <div className="mt-2 text-sm font-bold text-slate-900">
                    25 days
                  </div>

                </div>

                <div className="rounded-xl bg-slate-50 p-4">

                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Delivery Buffer
                  </div>

                  <div className="mt-2 text-sm font-bold text-emerald-700">
                    18 days
                  </div>

                </div>

              </div>

              <div className="mx-6 mb-6 rounded-xl border border-indigo-100 bg-indigo-50 p-5">

                <div className="text-xs font-bold uppercase tracking-wider text-indigo-500">
                  Procurement Recommendation
                </div>

                <p className="mt-2 text-sm leading-6 text-indigo-950">
                  Gulf Valve Industries was selected based on technical
                  compliance, quality qualification, landed cost and
                  delivery performance. The quoted delivery date provides
                  an 18-day buffer against the project requirement.
                </p>

              </div>

            </section>

            {/* Audit Trail */}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-6 py-5">

                <h2 className="text-base font-bold text-slate-950">
                  Procurement Audit Trail
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Traceability across the procurement workflow.
                </p>

              </div>

              <div className="px-6 py-6">

                <div className="space-y-6">

                  <div className="flex gap-4">

                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                      ✓
                    </div>

                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        Sourcing approval completed
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        Executive sourcing approval completed before PR
                        generation.
                      </div>
                    </div>

                  </div>

                  <div className="flex gap-4">

                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                      ✓
                    </div>

                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        Action authorization consumed
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        Authorized action was used to create the PR.
                      </div>
                    </div>

                  </div>

                  <div className="flex gap-4">

                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                      ✓
                    </div>

                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        Purchase requisition submitted
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        PR is now awaiting approval.
                      </div>
                    </div>

                  </div>

                  <div className="flex gap-4">

                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                      ●
                    </div>

                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        PR approval
                      </div>

                      <div className="mt-1 text-xs text-indigo-600">
                        Current stage
                      </div>
                    </div>

                  </div>

                </div>

              </div>

            </section>

          </div>

          {/* ================================================= */}
          {/* RIGHT APPROVAL PANEL */}
          {/* ================================================= */}

          <div className="space-y-6">

            {/* Approval Decision */}

            <section className="sticky top-6 rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-6 py-5">

                <div className="text-xs font-bold uppercase tracking-wider text-indigo-500">
                  Approval Decision
                </div>

                <h2 className="mt-2 text-xl font-bold text-slate-950">
                  {isPending
                    ? "Review & Decide"
                    : isApproved
                    ? "PR Approved"
                    : "PR Rejected"}
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {isPending
                    ? "Review the procurement context and approve or reject this purchase requisition."
                    : isApproved
                    ? "This requisition has been approved for purchase order processing."
                    : "This requisition has been rejected."}
                </p>

              </div>

              <div className="px-6 py-6">

                {/* Approver */}

                <div className="mb-5 rounded-xl bg-slate-50 p-4">

                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Approver
                  </div>

                  <div className="mt-2 text-sm font-bold text-slate-900">
                    Procurement Head
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    {APPROVER}
                  </div>

                </div>

                {/* AI assessment */}

                <div className="mb-5 rounded-xl border border-violet-200 bg-violet-50 p-4">

                  <div className="flex items-center gap-2">

                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                      ✦
                    </div>

                    <div className="text-sm font-bold text-violet-950">
                      AI Assessment
                    </div>

                  </div>

                  <div className="mt-3 space-y-2 text-sm text-violet-900">

                    <div className="flex justify-between gap-4">
                      <span>Technical compliance</span>
                      <span className="font-bold">
                        ✓ Passed
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span>Quality qualification</span>
                      <span className="font-bold">
                        ✓ Passed
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span>Delivery buffer</span>
                      <span className="font-bold">
                        18 days
                      </span>
                    </div>

                  </div>

                </div>

                {/* Comments */}

                {isPending && (

                  <div>

                    <label className="text-sm font-bold text-slate-800">
                      Decision Comments
                    </label>

                    <textarea
                      value={comments}
                      onChange={(e) =>
                        setComments(e.target.value)
                      }
                      placeholder="Add comments for the procurement audit trail..."
                      rows={5}
                      className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />

                  </div>

                )}

                {/* Actions */}

                {isPending && (

                  <div className="mt-5 space-y-3">

                    <button
                      onClick={handleApprove}
                      disabled={processing}
                      className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {processing
                        ? "Processing..."
                        : "Approve Purchase Requisition"}
                    </button>

                    <button
                      onClick={handleReject}
                      disabled={processing}
                      className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Reject Purchase Requisition
                    </button>

                  </div>

                )}

                {isApproved && (

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">

                    <div className="flex items-center gap-3">

                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        ✓
                      </div>

                      <div>
                        <div className="text-sm font-bold text-emerald-900">
                          Approval completed
                        </div>

                        <div className="text-xs text-emerald-700">
                          Ready for PO processing.
                        </div>
                      </div>

                    </div>

                    <button
                      onClick={() =>
                        router.push(
                          `/procurement/${requestNumber}/po`
                        )
                      }
                      className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700"
                    >
                      Continue to PO Workspace
                    </button>

                  </div>

                )}

                {isRejected && (

                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">

                    <div className="flex items-center gap-3">

                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-700">
                        !
                      </div>

                      <div>
                        <div className="text-sm font-bold text-red-900">
                          PR Rejected
                        </div>

                        <div className="text-xs text-red-700">
                          Procurement processing has been stopped.
                        </div>
                      </div>

                    </div>

                  </div>

                )}

              </div>

            </section>

          </div>

        </div>

      </div>

    </main>
  );
}