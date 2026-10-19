"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  apiFetch,
  submitPurchaseRequisition,
} from "@/lib/api";

const PR_ID = "8f572289-ebbb-4094-9efa-52947f0c57d6";

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

export default function PurchaseRequisitionPage() {
  const params = useParams();
  const requestNumber = params.requestNumber as string;

  const [pr, setPr] = useState<PurchaseRequisition | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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

  async function handleSubmitPR() {
    if (!pr || pr.status !== "DRAFT") {
      return;
    }

    try {
      setSubmitting(true);
      setActionError(null);

      const updatedPR = await submitPurchaseRequisition(PR_ID);

      setPr(updatedPR);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to submit purchase requisition."
      );
    } finally {
      setSubmitting(false);
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
      case "DRAFT":
        return "bg-slate-100 text-slate-700 border-slate-200";

      case "SUBMITTED":
        return "bg-blue-50 text-blue-700 border-blue-200";

      case "APPROVED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";

      case "REJECTED":
        return "bg-red-50 text-red-700 border-red-200";

      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto max-w-[1500px] px-8 py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-72 rounded-lg bg-slate-200" />
            <div className="h-32 rounded-2xl bg-white shadow-sm" />
            <div className="h-72 rounded-2xl bg-white shadow-sm" />
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
            <div className="text-sm font-semibold text-red-800">
              Unable to load Purchase Requisition
            </div>

            <div className="mt-2 text-sm text-red-700">
              {error || "Purchase requisition was not found."}
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

  const isDraft = pr.status === "DRAFT";
  const isSubmitted =
    pr.status === "SUBMITTED" ||
    pr.status === "APPROVED";

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-slate-900">
      {/* ========================================================= */}
      {/* TOP HEADER */}
      {/* ========================================================= */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-8 py-5">
          <div>
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
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-800">
                Procurement Manager
              </div>

              <div className="text-xs text-slate-500">
                procurement.manager@epc-demo.com
              </div>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
              PM
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* PAGE */}
      {/* ========================================================= */}

      <div className="mx-auto max-w-[1500px] px-8 py-8">

        {/* Breadcrumb */}

        <div className="mb-5 flex items-center gap-2 text-sm text-slate-500">
          <span>Procurement</span>
          <span>›</span>
          <span>{requestNumber}</span>
          <span>›</span>
          <span className="font-medium text-slate-900">
            Purchase Requisition
          </span>
        </div>

        {/* ======================================================= */}
        {/* TITLE */}
        {/* ======================================================= */}

        <div className="mb-7 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                Purchase Requisition
              </h1>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(
                  pr.status
                )}`}
              >
                {pr.status}
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Formal internal procurement request generated from the approved
              sourcing recommendation.
            </p>
          </div>

          <div className="text-right">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
              PR Number
            </div>

            <div className="mt-1 text-lg font-bold text-slate-900">
              {pr.pr_number}
            </div>
          </div>
        </div>

        {/* ======================================================= */}
        {/* KPI CARDS */}
        {/* ======================================================= */}

        <div className="mb-7 grid grid-cols-4 gap-5">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Value
            </div>

            <div className="mt-2 text-2xl font-bold text-slate-950">
              {formatCurrency(pr.total_amount)}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Approved sourcing value
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
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
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
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
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Line Items
            </div>

            <div className="mt-2 text-2xl font-bold text-slate-950">
              {pr.items.length}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Materials in this PR
            </div>
          </div>
        </div>

        {/* ======================================================= */}
        {/* ACTION ERROR */}
        {/* ======================================================= */}

        {actionError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
            <div className="text-sm font-semibold text-red-800">
              Action failed
            </div>

            <div className="mt-1 text-sm text-red-700">
              {actionError}
            </div>
          </div>
        )}

        {/* ======================================================= */}
        {/* MAIN CONTENT */}
        {/* ======================================================= */}

        <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-6">

          {/* ===================================================== */}
          {/* LEFT */}
          {/* ===================================================== */}

          <div className="space-y-6">

            {/* Request Information */}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-6 py-5">
                <h2 className="text-base font-bold text-slate-950">
                  Request Information
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Procurement context and ownership.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-x-10 gap-y-6 px-6 py-6">

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Procurement Request
                  </div>

                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {requestNumber}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Requested By
                  </div>

                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {pr.requested_by}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Project
                  </div>

                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    PE-104 — Saudi Gas Processing Expansion
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Delivery Location
                  </div>

                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    Riyadh Project Logistics Hub
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
                  Materials and commercial details carried forward from the
                  approved sourcing decision.
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

              {/* Specification */}

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

            {/* Audit Information */}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-6 py-5">
                <h2 className="text-base font-bold text-slate-950">
                  Audit & Traceability
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-6 px-6 py-6">

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Created
                  </div>

                  <div className="mt-1 text-sm text-slate-700">
                    {formatDateTime(pr.created_at)}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Last Updated
                  </div>

                  <div className="mt-1 text-sm text-slate-700">
                    {formatDateTime(pr.updated_at)}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Approval ID
                  </div>

                  <div className="mt-1 break-all font-mono text-xs text-slate-600">
                    {pr.approval_id}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    RFQ ID
                  </div>

                  <div className="mt-1 break-all font-mono text-xs text-slate-600">
                    {pr.rfq_id}
                  </div>
                </div>

              </div>
            </section>
          </div>

          {/* ===================================================== */}
          {/* RIGHT — CONTROL PANEL */}
          {/* ===================================================== */}

          <div className="space-y-6">

            {/* Procurement Journey */}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-6 py-5">
                <h2 className="text-base font-bold text-slate-950">
                  Procurement Journey
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  End-to-end transaction state.
                </p>
              </div>

              <div className="px-6 py-6">

                <div className="space-y-0">

                  {/* Sourcing Approval */}

                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                        ✓
                      </div>

                      <div className="h-10 w-px bg-emerald-200" />
                    </div>

                    <div className="pb-5">
                      <div className="text-sm font-bold text-slate-900">
                        Sourcing Approval
                      </div>

                      <div className="mt-1 text-xs text-emerald-600">
                        Approved
                      </div>
                    </div>
                  </div>

                  {/* Authorization */}

                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                        ✓
                      </div>

                      <div className="h-10 w-px bg-emerald-200" />
                    </div>

                    <div className="pb-5">
                      <div className="text-sm font-bold text-slate-900">
                        Action Authorization
                      </div>

                      <div className="mt-1 text-xs text-emerald-600">
                        Consumed
                      </div>
                    </div>
                  </div>

                  {/* PR */}

                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                          isSubmitted
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-indigo-100 text-indigo-700"
                        }`}
                      >
                        {isSubmitted ? "✓" : "●"}
                      </div>

                      <div
                        className={`h-10 w-px ${
                          isSubmitted
                            ? "bg-emerald-200"
                            : "bg-slate-200"
                        }`}
                      />
                    </div>

                    <div className="pb-5">
                      <div className="text-sm font-bold text-slate-900">
                        Purchase Requisition
                      </div>

                      <div
                        className={`mt-1 text-xs ${
                          isSubmitted
                            ? "text-emerald-600"
                            : "text-indigo-600"
                        }`}
                      >
                        {isSubmitted ? "Submitted" : "Draft"}
                      </div>
                    </div>
                  </div>

                  {/* PO */}

                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-400">
                        ○
                      </div>

                      <div className="h-10 w-px bg-slate-200" />
                    </div>

                    <div className="pb-5">
                      <div className="text-sm font-bold text-slate-500">
                        Purchase Order
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        Not created
                      </div>
                    </div>
                  </div>

                  {/* Delivery */}

                  <div className="flex gap-4">
                    <div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-400">
                        ○
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-bold text-slate-500">
                        Delivery
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        Not started
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </section>

            {/* Next Action */}

            <section className="rounded-2xl border border-indigo-200 bg-indigo-50 shadow-sm">

              <div className="px-6 py-6">

                <div className="text-xs font-bold uppercase tracking-wider text-indigo-500">
                  Next Action
                </div>

                {isDraft ? (
                  <>
                    <h3 className="mt-2 text-lg font-bold text-indigo-950">
                      Submit Purchase Requisition
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-indigo-800">
                      Review the requisition details and submit it for the
                      next stage of the procurement workflow.
                    </p>

                    <button
                      onClick={handleSubmitPR}
                      disabled={submitting}
                      className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting
                        ? "Submitting..."
                        : "Submit Purchase Requisition"}
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="mt-2 text-lg font-bold text-indigo-950">
                      PR Submitted
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-indigo-800">
                      The purchase requisition has been submitted and is
                      ready for the next approval stage.
                    </p>

                    <div className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                        ✓
                      </div>

                      <div>
                        <div className="text-sm font-bold text-emerald-900">
                          Submission complete
                        </div>

                        <div className="text-xs text-emerald-700">
                          Awaiting PR approval
                        </div>
                      </div>
                    </div>
                  </>
                )}

              </div>
            </section>

            {/* AI Insight */}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="px-6 py-6">

                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                    ✦
                  </div>

                  <div>
                    <div className="text-sm font-bold text-slate-950">
                      AI Procurement Insight
                    </div>

                    <div className="text-xs text-slate-500">
                      Sourcing intelligence
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                  <p className="text-sm leading-6 text-slate-700">
                    The selected supplier was approved through the sourcing
                    workflow based on technical compliance, quality
                    qualification, landed cost, delivery lead time and
                    contractual delivery requirements.
                  </p>
                </div>

              </div>
            </section>

          </div>
        </div>
      </div>
    </main>
  );
}