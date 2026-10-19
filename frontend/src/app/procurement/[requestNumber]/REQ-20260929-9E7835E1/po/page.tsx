"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

const PO_ID = "3f93b7f5-6da1-4120-9d51-348d1810152a";

type POItem = {
  id: string;
  purchase_order_id: string;
  material_id: string;
  quantity: number;
  uom: string;
  unit_price: number;
  line_total: number;
};

type PurchaseOrder = {
  id: string;
  po_number: string;
  purchase_requisition_id: string;
  supplier_id: string;
  status: string;
  order_date: string;
  required_date: string;
  expected_delivery_date: string;
  created_by: string;
  currency_code: string;
  payment_terms: string;
  incoterm: string;
  freight_cost: number;
  insurance_cost: number;
  tax_cost: number;
  total_amount: number;
  supplier_confirmation_status: string;
  supplier_confirmation_reference: string | null;
  supplier_confirmed_quantity: number | null;
  supplier_confirmed_delivery_date: string | null;
  supplier_confirmation_comments: string | null;
  supplier_confirmed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: POItem[];
};

function formatCurrency(value: number | string | null | undefined) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();

  const styles: Record<string, string> = {
    ISSUED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    VALIDATED: "bg-blue-50 text-blue-700 border-blue-200",
    DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
        styles[normalized] ||
        "bg-slate-100 text-slate-700 border-slate-200"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {normalized}
    </span>
  );
}

function LifecycleStep({
  label,
  status,
  active,
}: {
  label: string;
  status: "complete" | "active" | "pending";
  active?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
            status === "complete"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : status === "active"
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : "border-slate-200 bg-white text-slate-400"
          }`}
        >
          {status === "complete" ? "✓" : status === "active" ? "●" : "○"}
        </div>

        <div className="min-w-0">
          <p
            className={`truncate text-sm font-semibold ${
              status === "pending" ? "text-slate-400" : "text-slate-800"
            }`}
          >
            {label}
          </p>

          <p className="text-xs text-slate-400">
            {status === "complete"
              ? "Completed"
              : status === "active"
              ? "Current"
              : "Pending"}
          </p>
        </div>
      </div>

      {active !== false && (
        <div
          className={`mx-4 h-px flex-1 ${
            status === "complete" ? "bg-emerald-200" : "bg-slate-200"
          }`}
        />
      )}
    </div>
  );
}

export default function PurchaseOrderWorkspace() {
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function loadPO(showRefreshState = false) {
    try {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const data = await apiFetch(`/api/v1/purchase-orders/${PO_ID}`);

      setPo(data.purchase_order || data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load purchase order."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadPO();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl animate-pulse space-y-6">
          <div className="h-6 w-64 rounded bg-slate-200" />
          <div className="h-32 rounded-2xl bg-white" />
          <div className="h-24 rounded-2xl bg-white" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="h-64 rounded-2xl bg-white lg:col-span-2" />
            <div className="h-64 rounded-2xl bg-white" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !po) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
          <div className="mb-3 text-sm font-semibold text-red-600">
            Purchase Order
          </div>

          <h1 className="text-xl font-bold text-slate-900">
            Unable to load PO
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {error || "The purchase order could not be found."}
          </p>

          <button
            onClick={() => loadPO()}
            className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const items = po.items || [];

  const materialValue = items.reduce(
    (sum, item) => sum + Number(item.line_total || 0),
    0
  );

  const isIssued = po.status === "ISSUED";

  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      <main className="mx-auto max-w-[1500px] px-6 py-7 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-5 flex items-center gap-2 text-xs text-slate-400">
          <span>Procurement</span>
          <span>/</span>
          <span>Purchase Orders</span>
          <span>/</span>
          <span className="font-medium text-slate-600">{po.po_number}</span>
        </div>

        {/* Header */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                  {po.po_number}
                </h1>

                <StatusBadge status={po.status} />

                {isIssued && (
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    Supplier confirmation pending
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-500">
                Purchase Order generated from approved sourcing recommendation
              </p>

              <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Supplier</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    Gulf Valve Industries
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Purchase Requisition</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    PR-20261003-0001
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Created By</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {po.created_by}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <button
                onClick={() => loadPO(true)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>

              <button
                disabled
                className="cursor-not-allowed rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500"
              >
                Download PDF
              </button>
            </div>
          </div>

          {/* Lifecycle */}
          <div className="border-t border-slate-100 px-6 py-5">
            <div className="flex overflow-x-auto pb-1">
              <LifecycleStep label="Sourcing" status="complete" />
              <LifecycleStep label="Approval" status="complete" />
              <LifecycleStep label="Authorization" status="complete" />
              <LifecycleStep label="PR" status="complete" />
              <LifecycleStep label="PO Created" status="complete" />
              <LifecycleStep label="Validated" status="complete" />
              <LifecycleStep
                label="Issued"
                status={isIssued ? "complete" : "active"}
                active={false}
              />
            </div>
          </div>
        </section>

        {/* KPI row */}
        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              PO Value
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {formatCurrency(po.total_amount)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Total committed value</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Required Date
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {formatDate(po.required_date)}
            </p>
            <p className="mt-1 text-xs text-emerald-600">
              Delivery buffer available
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Expected Delivery
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {formatDate(po.expected_delivery_date)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Based on supplier lead time
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Supplier Confirmation
            </p>
            <p className="mt-2 text-lg font-bold text-amber-600">
              {po.supplier_confirmation_status}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Awaiting supplier response
            </p>
          </div>
        </section>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Main content */}
          <div className="space-y-6 xl:col-span-2">
            {/* Line items */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Order Lines
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Materials included in this purchase order
                    </p>
                  </div>

                  <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                    {items.length} line
                    {items.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Material</th>
                      <th className="px-6 py-4 font-semibold">Quantity</th>
                      <th className="px-6 py-4 font-semibold">Unit Price</th>
                      <th className="px-6 py-4 font-semibold text-right">
                        Line Total
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {items.length > 0 ? (
                      items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-6 py-5">
                            <div>
                              <p className="font-semibold text-slate-800">
                                API 6D Class 600 Carbon Steel Valve
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                Material ID: {item.material_id}
                              </p>
                            </div>
                          </td>

                          <td className="px-6 py-5 text-sm font-medium text-slate-700">
                            {item.quantity.toLocaleString()} {item.uom}
                          </td>

                          <td className="px-6 py-5 text-sm text-slate-700">
                            {formatCurrency(item.unit_price)}
                          </td>

                          <td className="px-6 py-5 text-right text-sm font-bold text-slate-900">
                            {formatCurrency(item.line_total)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-10 text-center text-sm text-slate-400"
                        >
                          No PO line items available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* AI rationale */}
            <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-white shadow-sm">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-lg text-white shadow-sm">
                    ✦
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                      AI Procurement Insight
                    </p>

                    <h2 className="mt-1 text-lg font-bold text-slate-900">
                      Why this purchase order was created
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Local Riyadh inventory could not fulfill the remaining
                      requirement after existing commitments and reservations.
                      The sourcing process evaluated internal availability and
                      approved external suppliers before selecting Gulf Valve
                      Industries based on technical compliance, quality
                      approval, landed cost, delivery buffer and commercial
                      terms.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-blue-100 bg-white p-4">
                    <p className="text-xs text-slate-400">Decision</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      External sourcing
                    </p>
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-white p-4">
                    <p className="text-xs text-slate-400">Supplier</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      Gulf Valve Industries
                    </p>
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-white p-4">
                    <p className="text-xs text-slate-400">Delivery Buffer</p>
                    <p className="mt-1 text-sm font-bold text-emerald-600">
                      17 days
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Audit lineage */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <h2 className="text-base font-bold text-slate-900">
                  Procurement Lineage
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Traceability from sourcing decision to issued PO
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {[
                  [
                    "Sourcing Approval",
                    "APR-20261003-0001",
                    "Approved",
                  ],
                  [
                    "Action Authorization",
                    "AUTH-20261003-2CB03F19",
                    "Consumed",
                  ],
                  [
                    "Purchase Requisition",
                    "PR-20261003-0001",
                    "Approved",
                  ],
                  ["Purchase Order", po.po_number, po.status],
                ].map(([label, reference, status]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 px-6 py-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {label}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {reference}
                      </p>
                    </div>

                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right rail */}
          <div className="space-y-6">
            {/* Supplier confirmation */}
            <section className="rounded-2xl border border-amber-200 bg-white shadow-sm">
              <div className="border-b border-amber-100 bg-amber-50/50 px-6 py-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    ⏱
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                      Next Action
                    </p>

                    <h2 className="mt-1 text-base font-bold text-slate-900">
                      Supplier Confirmation
                    </h2>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <p className="text-sm leading-6 text-slate-600">
                  The PO has been issued. The next operational milestone is
                  confirmation from Gulf Valve Industries.
                </p>

                <div className="mt-5 space-y-3">
                  <div className="flex justify-between rounded-lg bg-slate-50 px-4 py-3">
                    <span className="text-xs text-slate-500">
                      Confirmation
                    </span>
                    <span className="text-xs font-bold text-amber-600">
                      Pending
                    </span>
                  </div>

                  <div className="flex justify-between rounded-lg bg-slate-50 px-4 py-3">
                    <span className="text-xs text-slate-500">
                      Ordered Quantity
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      200 EA
                    </span>
                  </div>

                  <div className="flex justify-between rounded-lg bg-slate-50 px-4 py-3">
                    <span className="text-xs text-slate-500">
                      Expected Delivery
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {formatDate(po.expected_delivery_date)}
                    </span>
                  </div>
                </div>

                <button
                  disabled
                  className="mt-5 w-full cursor-not-allowed rounded-xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-500"
                >
                  Supplier Response Workspace — Next
                </button>
              </div>
            </section>

            {/* Commercial summary */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <h2 className="text-base font-bold text-slate-900">
                  Commercial Summary
                </h2>
              </div>

              <div className="space-y-4 p-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Material Value</span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(materialValue)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Freight</span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(po.freight_cost)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Insurance</span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(po.insurance_cost)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Tax</span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(po.tax_cost)}
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-900">Total PO Value</span>
                    <span className="text-lg font-bold text-slate-950">
                      {formatCurrency(po.total_amount)}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Terms */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <h2 className="text-base font-bold text-slate-900">
                  Commercial Terms
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4 p-6">
                <div>
                  <p className="text-xs text-slate-400">Payment</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {po.payment_terms}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Incoterm</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {po.incoterm}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Currency</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {po.currency_code}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Order Date</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {formatDate(po.order_date)}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}