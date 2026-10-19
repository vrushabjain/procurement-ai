
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiFetch(
  path: string,
  options: RequestInit = {}
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        data?.message ||
        `API request failed: ${response.status}`
    );
  }

  return data;
}

// ============================================================
// APPROVAL APIs
// ============================================================

export async function getApproval(approvalId: string) {
  return apiFetch(`/api/v1/approvals/${encodeURIComponent(approvalId)}`);
}

export async function approveApproval(
  approvalId: string,
  approver: string,
  comments?: string
) {
  return apiFetch(
    `/api/v1/approvals/${encodeURIComponent(approvalId)}/approve`,
    {
      method: "POST",
      body: JSON.stringify({
        approver,
        comments: comments || "Approved based on the sourcing recommendation.",
      }),
    }
  );
}

export async function rejectApproval(
  approvalId: string,
  approver: string,
  comments: string
) {
  return apiFetch(
    `/api/v1/approvals/${encodeURIComponent(approvalId)}/reject`,
    {
      method: "POST",
      body: JSON.stringify({ approver, comments }),
    }
  );
}

export async function sendBackApproval(
  approvalId: string,
  approver: string,
  comments: string
) {
  return apiFetch(
    `/api/v1/approvals/${encodeURIComponent(approvalId)}/send-back`,
    {
      method: "POST",
      body: JSON.stringify({ approver, comments }),
    }
  );
}

// ============================================================
// PURCHASE REQUISITION APIs
// ============================================================

export async function getPurchaseRequisition(
  purchaseRequisitionId: string
) {
  return apiFetch(
    `/api/v1/purchase-requisitions/${encodeURIComponent(purchaseRequisitionId)}`
  );
}

export async function submitPurchaseRequisition(
  purchaseRequisitionId: string
) {
  return apiFetch(
    `/api/v1/purchase-requisitions/${encodeURIComponent(purchaseRequisitionId)}/submit`,
    { method: "POST" }
  );
}

export async function approvePurchaseRequisition(
  purchaseRequisitionId: string,
  approver: string,
  comments?: string
) {
  return apiFetch(
    `/api/v1/purchase-requisitions/${encodeURIComponent(purchaseRequisitionId)}/approve`,
    {
      method: "POST",
      body: JSON.stringify({
        approver,
        comments: comments || "Approved.",
      }),
    }
  );
}

export async function rejectPurchaseRequisition(
  purchaseRequisitionId: string,
  approver: string,
  comments?: string
) {
  return apiFetch(
    `/api/v1/purchase-requisitions/${encodeURIComponent(purchaseRequisitionId)}/reject`,
    {
      method: "POST",
      body: JSON.stringify({
        approver,
        comments: comments || "Rejected.",
      }),
    }
  );
}

// ============================================================
// CONTROL TOWER
// ============================================================

export async function getControlTowerSummary() {
  return apiFetch("/api/v1/control-tower/summary");
}

// ============================================================
// PROCUREMENT REQUEST APIs
// ============================================================

export type ProcurementRequestItemCreate = {
  material_id: string;
  quantity: number;
  uom: string;
  technical_specification?: string | null;
  delivery_location_id?: string | null;
};

export type ProcurementRequestCreate = {
  project_id: string;
  requested_by: string;
  request_date: string;
  required_date: string;
  priority?: string;
  justification?: string | null;
  items: ProcurementRequestItemCreate[];
};

export async function createProcurementRequest(
  request: ProcurementRequestCreate
) {
  return apiFetch("/api/v1/procurement-requests", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function getProcurementRequestByNumber(
  requestNumber: string
) {
  return apiFetch(
    `/api/v1/procurement-requests/by-number/${encodeURIComponent(requestNumber)}`
  );
}

export async function getSupplyAnalysis(
  requestId: string,
  itemId: string
) {
  return apiFetch(
    `/api/v1/procurement-requests/${encodeURIComponent(requestId)}/items/${encodeURIComponent(itemId)}/supply-analysis`
  );
}

export async function getSupplyDecision(
  requestId: string,
  itemId: string
) {
  return apiFetch(
    `/api/v1/procurement-requests/${encodeURIComponent(requestId)}/items/${encodeURIComponent(itemId)}/supply-decision`
  );
}

export async function getSupplierEligibility(
  requestId: string,
  itemId: string
) {
  return apiFetch(
    `/api/v1/procurement-requests/${encodeURIComponent(requestId)}/items/${encodeURIComponent(itemId)}/supplier-eligibility`
  );
}

// ============================================================
// RFQ APIs
// ============================================================

export async function createRFQ(
  requestId: string,
  itemId: string,
  responseDueDays = 7
) {
  const params = new URLSearchParams({
    response_due_days: String(responseDueDays),
  });

  return apiFetch(
    `/api/v1/procurement-requests/${encodeURIComponent(requestId)}/items/${encodeURIComponent(itemId)}/rfq?${params}`,
    { method: "POST" }
  );
}

export async function getRFQForProcurementItem(
  requestId: string,
  itemId: string
) {
  return apiFetch(
    `/api/v1/procurement-requests/${encodeURIComponent(requestId)}/items/${encodeURIComponent(itemId)}/rfq`
  );
}

export async function getRFQQuotations(rfqId: string) {
  return apiFetch(
    `/api/v1/rfqs/${encodeURIComponent(rfqId)}/quotations`
  );
}

export async function evaluateRFQQuotations(rfqId: string) {
  return apiFetch(
    `/api/v1/rfqs/${encodeURIComponent(rfqId)}/evaluate`,
    { method: "POST" }
  );
}

export async function getSourcingRecommendation(rfqId: string) {
  return apiFetch(
    `/api/v1/rfqs/${encodeURIComponent(rfqId)}/sourcing-recommendation`
  );
}


// PROJECTS, MATERIALS & PURCHASE REQUEST REGISTER

export type ProjectRecord = {
  id: string;
  project_code: string;
  project_name: string;
  country_id?: string | null;
  project_manager?: string | null;
  status?: string;
};

export type MaterialRecord = {
  id: string;
  material_code: string;
  material_name: string;
  category: string;
  description?: string | null;
  base_uom: string;
  is_active: boolean;
};

export type ProcurementRequestRecord = {
  id: string;
  request_number: string;
  project_id: string;
  requested_by: string;
  request_date: string;
  required_date: string;
  priority: string;
  status: string;
  justification?: string | null;
  items: {
    id: string;
    material_id: string;
    quantity: number;
    uom: string;
    technical_specification?: string | null;
    delivery_location_id?: string | null;
    item_status?: string | null;
  }[];
};

export async function getProjects(): Promise<ProjectRecord[]> {
  return apiFetch("/api/v1/projects");
}

export async function getMaterials(): Promise<MaterialRecord[]> {
  return apiFetch("/api/v1/materials");
}

export async function getProcurementRequests(): Promise<
  ProcurementRequestRecord[]
> {
  return apiFetch("/api/v1/procurement-requests");
}