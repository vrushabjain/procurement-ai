"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  getApproval,
  approveApproval,
  rejectApproval,
  sendBackApproval,
} from "@/lib/api";

const APPROVAL_ID =
  "7b5cc5b9-54b6-44a5-bbed-99a3684307b5";

const APPROVER =
  "procurement.head@epc-demo.com";

type Approval = {
  id: string;
  approval_number: string;
  rfq_id: string;
  quote_id: string;
  supplier_id: string;
  approval_type: string;
  approval_level: string;
  amount: string;
  currency_code: string;
  status: string;
  requested_by: string;
  approver: string | null;
  comments: string | null;
  requested_at: string;
  decided_at: string | null;
};

export default function ApprovalWorkspace() {
  const [approval, setApproval] =
    useState<Approval | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [comments, setComments] =
    useState(
      "Approved based on the sourcing recommendation."
    );

  const [showReject, setShowReject] =
    useState(false);

  async function loadApproval() {
    try {
      setLoading(true);
      setError("");

      const data = await getApproval(
        APPROVAL_ID
      );

      setApproval(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load approval."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApproval();
  }, []);

  async function handleApprove() {
    try {
      setProcessing(true);
      setError("");

      const updated =
        await approveApproval(
          APPROVAL_ID,
          APPROVER,
          comments
        );

      setApproval(updated);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Approval failed."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject() {
    if (!comments.trim()) {
      setError(
        "Please provide a reason before rejecting."
      );
      return;
    }

    try {
      setProcessing(true);
      setError("");

      const updated =
        await rejectApproval(
          APPROVAL_ID,
          APPROVER,
          comments
        );

      setApproval(updated);
      setShowReject(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Rejection failed."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleSendBack() {
    if (!comments.trim()) {
      setError(
        "Please provide comments before sending back."
      );
      return;
    }

    try {
      setProcessing(true);
      setError("");

      const updated =
        await sendBackApproval(
          APPROVAL_ID,
          APPROVER,
          comments
        );

      setApproval(updated);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Send back failed."
      );
    } finally {
      setProcessing(false);
    }
  }

  const isPending =
    approval?.status === "PENDING";

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-900">

      {/* ------------------------------------------------ */}
      {/* TOP BAR */}
      {/* ------------------------------------------------ */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-8">

          <div className="flex items-center gap-4">

            <Link
              href="/"
              className="flex items-center gap-2"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                PA
              </div>

              <div>
                <div className="text-sm font-bold">
                  Procurement AI
                </div>

                <div className="text-[11px] text-slate-500">
                  Procurement Control Tower
                </div>
              </div>
            </Link>

            <div className="mx-3 h-6 w-px bg-slate-200" />

            <div>
              <div className="text-xs text-slate-500">
                Approval Workspace
              </div>

              <div className="text-sm font-semibold">
                Sourcing Decision Review
              </div>
            </div>

          </div>

          <div className="flex items-center gap-3">

            <div className="text-right">
              <div className="text-xs font-semibold">
                Procurement Head
              </div>

              <div className="text-[11px] text-slate-500">
                procurement.head@epc-demo.com
              </div>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
              PH
            </div>

          </div>

        </div>
      </header>

      {/* ------------------------------------------------ */}
      {/* MAIN */}
      {/* ------------------------------------------------ */}

      <main className="mx-auto max-w-[1500px] px-8 py-8">

        {/* Breadcrumb */}

        <div className="mb-6 flex items-center gap-2 text-xs text-slate-500">

          <Link
            href="/"
            className="hover:text-slate-900"
          >
            Control Tower
          </Link>

          <span>/</span>

          <Link
            href="/procurement/REQ-20260929-9E7835E1"
            className="hover:text-slate-900"
          >
            REQ-20260929-9E7835E1
          </Link>

          <span>/</span>

          <span className="font-medium text-slate-900">
            Approval
          </span>

        </div>

        {/* Loading */}

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="animate-pulse space-y-4">
              <div className="h-6 w-64 rounded bg-slate-200" />
              <div className="h-4 w-96 rounded bg-slate-200" />
              <div className="h-32 rounded bg-slate-100" />
            </div>
          </div>
        )}

        {/* Error */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && approval && (

          <>

            {/* ------------------------------------------------ */}
            {/* HEADER */}
            {/* ------------------------------------------------ */}

            <div className="mb-8 flex items-start justify-between">

              <div>

                <div className="mb-2 flex items-center gap-3">

                  <h1 className="text-2xl font-bold tracking-tight">
                    Approval Review
                  </h1>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      approval.status === "PENDING"
                        ? "bg-amber-100 text-amber-700"
                        : approval.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-700"
                        : approval.status === "REJECTED"
                        ? "bg-red-100 text-red-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {approval.status}
                  </span>

                </div>

                <p className="text-sm text-slate-500">
                  Review and decide the recommended sourcing strategy
                  for {approval.approval_number}.
                </p>

              </div>

              <div className="text-right">

                <div className="text-xs text-slate-500">
                  Approval Amount
                </div>

                <div className="mt-1 text-2xl font-bold">
                  {approval.currency_code}{" "}
                  {Number(
                    approval.amount
                  ).toLocaleString()}
                </div>

              </div>

            </div>

            {/* ------------------------------------------------ */}
            {/* DECISION SUMMARY */}
            {/* ------------------------------------------------ */}

            <div className="grid grid-cols-12 gap-6">

              <section className="col-span-8 space-y-6">

                {/* AI Recommendation */}

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

                  <div className="border-b border-slate-100 px-6 py-5">

                    <div className="flex items-center justify-between">

                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                          AI Recommendation
                        </div>

                        <h2 className="mt-1 text-lg font-bold">
                          Approve recommended sourcing strategy
                        </h2>
                      </div>

                      <div className="rounded-xl bg-indigo-50 px-4 py-2 text-right">
                        <div className="text-[10px] uppercase tracking-wide text-indigo-500">
                          Recommendation
                        </div>

                        <div className="text-sm font-bold text-indigo-700">
                          Gulf Valve Industries
                        </div>
                      </div>

                    </div>

                  </div>

                  <div className="grid grid-cols-3 divide-x divide-slate-100">

                    <div className="p-6">
                      <div className="text-xs text-slate-500">
                        Supplier
                      </div>

                      <div className="mt-2 text-sm font-bold">
                        Gulf Valve Industries
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="text-xs text-slate-500">
                        Landed Cost
                      </div>

                      <div className="mt-2 text-sm font-bold">
                        USD 238,500
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="text-xs text-slate-500">
                        Delivery Buffer
                      </div>

                      <div className="mt-2 text-sm font-bold text-emerald-600">
                        18 days
                      </div>
                    </div>

                  </div>

                </div>

                {/* Approval Context */}

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

                  <div className="border-b border-slate-100 px-6 py-5">

                    <h2 className="text-lg font-bold">
                      Approval Context
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Backend-controlled approval metadata.
                    </p>

                  </div>

                  <div className="grid grid-cols-2 gap-px bg-slate-100">

                    <div className="bg-white p-5">
                      <div className="text-xs text-slate-500">
                        Approval Level
                      </div>

                      <div className="mt-2 text-sm font-semibold">
                        {approval.approval_level}
                      </div>
                    </div>

                    <div className="bg-white p-5">
                      <div className="text-xs text-slate-500">
                        Approval Type
                      </div>

                      <div className="mt-2 text-sm font-semibold">
                        {approval.approval_type}
                      </div>
                    </div>

                    <div className="bg-white p-5">
                      <div className="text-xs text-slate-500">
                        Requested By
                      </div>

                      <div className="mt-2 text-sm font-semibold">
                        {approval.requested_by}
                      </div>
                    </div>

                    <div className="bg-white p-5">
                      <div className="text-xs text-slate-500">
                        Approval Number
                      </div>

                      <div className="mt-2 text-sm font-semibold">
                        {approval.approval_number}
                      </div>
                    </div>

                  </div>

                </div>

                {/* Audit Trail */}

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

                  <div className="border-b border-slate-100 px-6 py-5">
                    <h2 className="text-lg font-bold">
                      Audit Trail
                    </h2>
                  </div>

                  <div className="space-y-5 p-6">

                    <div className="flex gap-4">

                      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-indigo-500" />

                      <div>
                        <div className="text-sm font-semibold">
                          Approval requested
                        </div>

                        <div className="text-xs text-slate-500">
                          {new Date(
                            approval.requested_at
                          ).toLocaleString()}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          Requested by {approval.requested_by}
                        </div>
                      </div>

                    </div>

                    {approval.decided_at && (

                      <div className="flex gap-4">

                        <div className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />

                        <div>

                          <div className="text-sm font-semibold">
                            Decision recorded
                          </div>

                          <div className="text-xs text-slate-500">
                            {new Date(
                              approval.decided_at
                            ).toLocaleString()}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {approval.approver}
                          </div>

                        </div>

                      </div>

                    )}

                  </div>

                </div>

              </section>

              {/* ------------------------------------------------ */}
              {/* DECISION PANEL */}
              {/* ------------------------------------------------ */}

              <aside className="col-span-4">

                <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white shadow-sm">

                  <div className="border-b border-slate-100 px-6 py-5">

                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Decision
                    </div>

                    <h2 className="mt-1 text-lg font-bold">
                      Procurement Head
                    </h2>

                  </div>

                  <div className="space-y-5 p-6">

                    <div className="rounded-xl bg-slate-50 p-4">

                      <div className="text-xs font-semibold text-slate-600">
                        Guardrail
                      </div>

                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Your decision will be recorded against the
                        sourcing recommendation. Consequential
                        execution remains subject to a separate
                        action authorization.
                      </p>

                    </div>

                    <div>

                      <label className="text-xs font-semibold text-slate-700">
                        Comments
                      </label>

                      <textarea
                        value={comments}
                        onChange={(e) =>
                          setComments(
                            e.target.value
                          )
                        }
                        disabled={!isPending || processing}
                        className="mt-2 min-h-[110px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-slate-400"
                      />

                    </div>

                    {isPending ? (

                      <div className="space-y-3">

                        <button
                          onClick={handleApprove}
                          disabled={processing}
                          className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {processing
                            ? "Processing..."
                            : "Approve Recommendation"}
                        </button>

                        <button
                          onClick={handleSendBack}
                          disabled={processing}
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          Send Back for Rework
                        </button>

                        {!showReject ? (

                          <button
                            onClick={() =>
                              setShowReject(true)
                            }
                            disabled={processing}
                            className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            Reject
                          </button>

                        ) : (

                          <div className="rounded-xl border border-red-200 bg-red-50 p-4">

                            <div className="text-xs font-semibold text-red-700">
                              Confirm rejection
                            </div>

                            <p className="mt-1 text-xs text-red-600">
                              This decision will permanently reject
                              the current approval request.
                            </p>

                            <div className="mt-3 flex gap-2">

                              <button
                                onClick={handleReject}
                                disabled={processing}
                                className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                              >
                                Confirm Reject
                              </button>

                              <button
                                onClick={() =>
                                  setShowReject(false)
                                }
                                disabled={processing}
                                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                              >
                                Cancel
                              </button>

                            </div>

                          </div>

                        )}

                      </div>

                    ) : (

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                        <div className="text-xs font-semibold text-slate-700">
                          Decision recorded
                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                          This approval is no longer pending.
                        </p>

                      </div>

                    )}

                  </div>

                </div>

              </aside>

            </div>

          </>
        )}

      </main>

    </div>
  );
}