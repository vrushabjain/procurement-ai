

"use client";

import { useRouter } from "next/navigation";

import { useEffect, useMemo, useState } from "react";

import {

  ArrowDownRight,

  ArrowRight,

  ArrowUpRight,

  Bot,

  CalendarDays,

  Check,

  ChevronDown,

  ChevronRight,

  CircleAlert,

  ClipboardList,

  Clock3,

  FileText,

  Filter,

  MapPin,

  Package,

  Plus,

  Search,

  Send,

  ShieldCheck,

  Sparkles,

  Trash2,

  X,

} from "lucide-react";

import ProcurementSidebar from "../components/ProcurementSidebar";
import {
  createProcurementRequest,
  getMaterials,
  getProjects,
  getProcurementRequests,
  type MaterialRecord,
  type ProjectRecord,
  type ProcurementRequestRecord,
} from "@/lib/api";

type RequestStatus =

  | "DRAFT"

  | "SUBMITTED"

  | "UNDER REVIEW"

  | "APPROVED"

  | "REJECTED"

  | "FULFILLED";

type RequestItem = {

  id: string;

  materialId: string;

  material: string;

  code: string;

  quantity: number;

  unit: string;

  estimatedPrice: number;

};

type ProcurementRequest = {

  id: string;

  title: string;

  project: string;

  projectCode: string;

  country: string;

  location: string;

  requester: string;

  department: string;

  requiredDate: string;

  priority: "Critical" | "High" | "Normal";

  status: RequestStatus;

  createdAt: string;

  notes: string;

  items: RequestItem[];

};

const statusStyles: Record<RequestStatus, string> = {

  DRAFT: "bg-slate-100 text-slate-600",

  SUBMITTED: "bg-blue-50 text-blue-700",

  "UNDER REVIEW": "bg-amber-50 text-amber-700",

  APPROVED: "bg-emerald-50 text-emerald-700",

  REJECTED: "bg-red-50 text-red-700",

  FULFILLED: "bg-violet-50 text-violet-700",

};

const priorityStyles = {

  Critical: "bg-red-50 text-red-700",

  High: "bg-orange-50 text-orange-700",

  Normal: "bg-slate-100 text-slate-600",

};

const currency = (value: number) =>

  new Intl.NumberFormat("en-US", {

    style: "currency",

    currency: "USD",

    maximumFractionDigits: 2,

  }).format(value);

const requestValue = (request: ProcurementRequest) =>

  request.items.reduce(

    (total, item) => total + item.quantity * item.estimatedPrice,

    0

  );

const inputClass =

  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function PurchaseRequestsPage() {

  const [requests, setRequests] = useState<ProcurementRequest[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [materials, setMaterials] = useState<MaterialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  const router = useRouter();

  const openRequest360 = (requestNumber: string) => {

    router.push(`/procurement/${encodeURIComponent(requestNumber)}`);

  };

  const asArray = <T,>(value: unknown): T[] => {
    if (Array.isArray(value)) return value as T[];
    if (value && typeof value === "object") {
      const obj = value as { items?: unknown; data?: unknown; results?: unknown };
      if (Array.isArray(obj.items)) return obj.items as T[];
      if (Array.isArray(obj.data)) return obj.data as T[];
      if (Array.isArray(obj.results)) return obj.results as T[];
    }
    return [];
  };

  const refreshRequests = async (projectList = projects, materialList = materials) => {
    const response = await getProcurementRequests();
    const records = asArray<ProcurementRequestRecord>(response);
    const mapped: ProcurementRequest[] = records.map((record) => {
      const project = projectList.find((p) => p.id === record.project_id);
      const mappedItems: RequestItem[] = (record.items ?? []).map((item) => {
        const material = materialList.find((m) => m.id === item.material_id);
        return { id: item.id, materialId: item.material_id, material: material?.material_name ?? "Unknown material", code: material?.material_code ?? item.material_id, quantity: Number(item.quantity), unit: item.uom || material?.base_uom || "Each", estimatedPrice: 0 };
      });
      const rawStatus = String(record.status).toUpperCase().replaceAll("_", " ");
      return { id: record.request_number, title: record.justification?.trim() || mappedItems[0]?.material || "Procurement request", project: project?.project_name ?? record.project_id, projectCode: project?.project_code ?? "—", country: "—", location: "—", requester: record.requested_by, department: "—", requiredDate: record.required_date, priority: (String(record.priority).toUpperCase() === "CRITICAL" ? "Critical" : String(record.priority).toUpperCase() === "HIGH" ? "High" : "Normal"), status: (rawStatus === "UNDER REVIEW" ? "UNDER REVIEW" : rawStatus) as RequestStatus, createdAt: record.request_date, notes: record.justification ?? "", items: mappedItems };
    });
    setRequests(mapped);
    setSelectedId((current) => mapped.some((r) => r.id === current) ? current : (mapped[0]?.id ?? ""));
  };

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const [projectResponse, materialResponse, requestResponse] = await Promise.all([getProjects(), getMaterials(), getProcurementRequests()]);
        if (!active) return;
        const projectList = asArray<ProjectRecord>(projectResponse);
        const materialList = asArray<MaterialRecord>(materialResponse).filter((m) => m.is_active !== false);
        setProjects(projectList);
        setMaterials(materialList);
        // Map with the newly fetched master records, not stale React state.
        const records = asArray<ProcurementRequestRecord>(requestResponse);
        const mapped: ProcurementRequest[] = records.map((record) => {
          const project = projectList.find((p) => p.id === record.project_id);
          const mappedItems: RequestItem[] = (record.items ?? []).map((item) => {
            const material = materialList.find((m) => m.id === item.material_id);
            return { id: item.id, materialId: item.material_id, material: material?.material_name ?? "Unknown material", code: material?.material_code ?? item.material_id, quantity: Number(item.quantity), unit: item.uom || material?.base_uom || "Each", estimatedPrice: 0 };
          });
          const rawStatus = String(record.status).toUpperCase().replaceAll("_", " ");
          return { id: record.request_number, title: record.justification?.trim() || mappedItems[0]?.material || "Procurement request", project: project?.project_name ?? record.project_id, projectCode: project?.project_code ?? "—", country: "—", location: "—", requester: record.requested_by, department: "—", requiredDate: record.required_date, priority: (String(record.priority).toUpperCase() === "CRITICAL" ? "Critical" : String(record.priority).toUpperCase() === "HIGH" ? "High" : "Normal"), status: (rawStatus === "UNDER REVIEW" ? "UNDER REVIEW" : rawStatus) as RequestStatus, createdAt: record.request_date, notes: record.justification ?? "", items: mappedItems };
        });
        setRequests(mapped);
        setSelectedId(mapped[0]?.id ?? "");
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : "Could not load procurement data.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");

  const [priorityFilter, setPriorityFilter] = useState("ALL");

  const [selectedId, setSelectedId] = useState("");

  const [showCreate, setShowCreate] = useState(false);

  const [showDetails, setShowDetails] = useState(true);

  const [notice, setNotice] = useState("");

  const [form, setForm] = useState({

    title: "",

    project: "",

    projectCode: "",

    country: "Saudi Arabia",

    location: "",

    requester: "",

    department: "Project Delivery",

    requiredDate: "",

    priority: "Normal" as ProcurementRequest["priority"],

    notes: "",

  });

  const [items, setItems] = useState<RequestItem[]>([

    {

      id: "new-item-1",

      materialId: "",

      material: "",

      code: "",

      quantity: 1,

      unit: "Each",

      estimatedPrice: 0,

    },

  ]);

  const filteredRequests = useMemo(() => {

    const query = search.toLowerCase().trim();

    return requests.filter((request) => {

      const matchesSearch =

        !query ||

        [

          request.id,

          request.title,

          request.project,

          request.projectCode,

          request.country,

          request.requester,

          ...request.items.map((item) => item.code),

        ]

          .join(" ")

          .toLowerCase()

          .includes(query);

      const matchesStatus =

        statusFilter === "ALL" || request.status === statusFilter;

      const matchesPriority =

        priorityFilter === "ALL" || request.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;

    });

  }, [requests, search, statusFilter, priorityFilter]);

  const selectedRequest =

    requests.find((request) => request.id === selectedId) ??

    filteredRequests[0] ??

    null;

  const totalValue = requests.reduce(

    (sum, request) => sum + requestValue(request),

    0

  );

  const pendingCount = requests.filter((request) =>

    ["SUBMITTED", "UNDER REVIEW"].includes(request.status)

  ).length;

  const criticalCount = requests.filter(

    (request) =>

      request.priority === "Critical" &&

      !["FULFILLED", "REJECTED"].includes(request.status)

  ).length;

  const updateForm = (

    field: keyof typeof form,

    value: string

  ) => {

    setForm((current) => ({ ...current, [field]: value }));

  };

  const updateItem = (

    id: string,

    field: keyof RequestItem,

    value: string | number

  ) => {

    setItems((current) =>

      current.map((item) =>

        item.id === id ? { ...item, [field]: value } : item

      )

    );

  };

  const addItem = () => {

    setItems((current) => [

      ...current,

      {

        id: `new-item-${Date.now()}`,

        materialId: "",

      material: "",

        code: "",

        quantity: 1,

        unit: "Each",

        estimatedPrice: 0,

      },

    ]);

  };

  const removeItem = (id: string) => {

    setItems((current) =>

      current.length > 1

        ? current.filter((item) => item.id !== id)

        : current

    );

  };

  const resetForm = () => {

    setForm({

      title: "",

      project: "",

      projectCode: "",

      country: "Saudi Arabia",

      location: "",

      requester: "",

      department: "Project Delivery",

      requiredDate: "",

      priority: "Normal",

      notes: "",

    });

    setItems([

      {

        id: `new-item-${Date.now()}`,

        materialId: "",

      material: "",

        code: "",

        quantity: 1,

        unit: "Each",

        estimatedPrice: 0,

      },

    ]);

  };

  const saveRequest = async (_submit: boolean) => {
    if (!form.title.trim() || !form.project.trim() || !form.requester.trim() || !form.requiredDate || items.some((item) => !item.materialId || item.quantity <= 0)) {
      setNotice("Complete the required fields and choose a valid project and material for every line item.");
      return;
    }
    if (saving) return;
    setSaving(true);
    setNotice("");
    try {
      const today = new Date().toISOString().slice(0, 10);
      const created = await createProcurementRequest({
        project_id: form.project,
        requested_by: form.requester.trim(),
        request_date: today,
        required_date: form.requiredDate,
        priority: form.priority.toUpperCase(),
        justification: [form.title.trim(), form.notes.trim()].filter(Boolean).join(" — ") || null,
        items: items.map((item) => ({
          material_id: item.materialId,
          quantity: item.quantity,
          uom: item.unit || materials.find((m) => m.id === item.materialId)?.base_uom || "Each",
          technical_specification: null,
          delivery_location_id: null,
        })),
      });
      const requestNumber = created?.request_number;
      if (!requestNumber) throw new Error("The backend saved the request but did not return a request_number.");
      await refreshRequests();
      setSelectedId(requestNumber);
      setStatusFilter("ALL");
      setPriorityFilter("ALL");
      setSearch("");
      setShowCreate(false);
      setShowDetails(true);
      setNotice(`${requestNumber} saved as DRAFT. Submission and approval workflow are not connected yet.`);
      resetForm();
      openRequest360(requestNumber);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save the request. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = (request: ProcurementRequest, status: RequestStatus) => {
    setNotice(`Status changes are not connected to the backend. ${request.id} remains ${request.status}.`);
  };

  const exportCsv = () => {

    const rows = [

      [

        "Request ID",

        "Title",

        "Project",

        "Project Code",

        "Country",

        "Requester",

        "Priority",

        "Status",

        "Required Date",

        "Estimated Value USD",

      ],

      ...filteredRequests.map((request) => [

        request.id,

        request.title,

        request.project,

        request.projectCode,

        request.country,

        request.requester,

        request.priority,

        request.status,

        request.requiredDate,

        requestValue(request).toFixed(2),

      ]),

    ];

    const csv = rows

        .map((row) =>

            row

                .map(

                    (value: string | number) =>

                        `"${String(value).replace(/"/g, '""')}"`

                    )

                .join(",")

            )

        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = "purchase-requests.csv";

    link.click();

    URL.revokeObjectURL(url);

  };

  return (

    <div className="app-shell">

      <ProcurementSidebar />

      <main className="control-tower-shell min-w-0 flex-1 bg-[#f6f8fb] text-slate-800">

        <div className="mx-auto max-w-[1600px] p-5 md:p-7">

          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">

            <div>

              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500">

                <span>Procurement</span>

                <ChevronRight size={13} />

                <span className="text-slate-800">Purchase Requests</span>

              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">

                Purchase Requests

              </h1>

              <p className="mt-1 text-sm text-slate-500">

                Create, track and manage project procurement requirements.

              </p>

            </div>

            <div className="flex flex-wrap items-center gap-2">

              <button

                onClick={exportCsv}

                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"

              >

                <FileText size={16} />

                Export

              </button>

              <button

                onClick={() => {

                  setNotice("");

                  setShowCreate(true);

                }}

                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"

              >

                <Plus size={17} />

                Create Request

              </button>

            </div>

          </div>

          {notice && (

            <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">

              <div className="flex items-start gap-2">

                <Check size={17} className="mt-0.5 shrink-0" />

                <span>{notice}</span>

              </div>

              <button onClick={() => setNotice("")} aria-label="Dismiss notice">

                <X size={16} />

              </button>

            </div>

          )}

          {loadError && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</div>}
          {loading && <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-500">Loading projects, materials and procurement requests…</div>}

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <Kpi

              label="Total Requests"

              value={String(requests.length)}

              detail="Loaded from procurement API"

              icon={<ClipboardList size={19} />}

              color="blue"

            />

            <Kpi

              label="Awaiting Review"

              value={String(pendingCount)}

              detail="Submitted or under review"

              icon={<Clock3 size={19} />}

              color="amber"

            />

            <Kpi

              label="Critical Requests"

              value={String(criticalCount)}

              detail="Require priority attention"

              icon={<CircleAlert size={19} />}

              color="red"

            />

            <Kpi

              label="Estimated Request Value"

              value={currency(totalValue)}

              detail="Pricing is not stored by the current request API"

              icon={<Package size={19} />}

              color="violet"

            />

          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">

            <div className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-2">

              <div className="mb-4 flex items-center justify-between gap-3">

                <div>

                  <h2 className="font-semibold text-slate-900">

                    Request register

                  </h2>

                  <p className="mt-1 text-xs text-slate-500">

                    Select a request to inspect its details and next steps.

                  </p>

                </div>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">

                  {filteredRequests.length} records

                </span>

              </div>

              <div className="mb-4 flex flex-col gap-3 lg:flex-row">

                <div className="relative min-w-0 flex-1">

                  <Search

                    size={16}

                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"

                  />

                  <input

                    value={search}

                    onChange={(e) => setSearch(e.target.value)}

                    placeholder="Search request, project, material..."

                    className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500"

                  />

                </div>

                <div className="flex flex-wrap gap-2">

                  <div className="relative">

                    <Filter

                      size={14}

                      className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"

                    />

                    <select

                      value={statusFilter}

                      onChange={(e) => setStatusFilter(e.target.value)}

                      className="appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-8 pr-8 text-xs outline-none focus:border-blue-500"

                    >

                      <option value="ALL">All statuses</option>

                      {(

                        [

                          "DRAFT",

                          "SUBMITTED",

                          "UNDER REVIEW",

                          "APPROVED",

                          "REJECTED",

                          "FULFILLED",

                        ] as RequestStatus[]

                      ).map((status) => (

                        <option key={status} value={status}>

                          {status}

                        </option>

                      ))}

                    </select>

                    <ChevronDown

                      size={13}

                      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"

                    />

                  </div>

                  <select

                    value={priorityFilter}

                    onChange={(e) => setPriorityFilter(e.target.value)}

                    className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-blue-500"

                  >

                    <option value="ALL">All priorities</option>

                    <option value="Critical">Critical</option>

                    <option value="High">High</option>

                    <option value="Normal">Normal</option>

                  </select>

                </div>

              </div>

              <div className="overflow-x-auto">

                <table className="w-full min-w-[740px] text-left">

                  <thead>

                    <tr className="border-y border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">

                      <th className="py-3 pr-3 font-semibold">Request</th>

                      <th className="px-3 py-3 font-semibold">Project</th>

                      <th className="px-3 py-3 font-semibold">Value</th>

                      <th className="px-3 py-3 font-semibold">Priority</th>

                      <th className="px-3 py-3 font-semibold">Status</th>

                      <th className="py-3 pl-3"></th>

                    </tr>

                  </thead>

                  <tbody>

                    {filteredRequests.map((request) => {

                      const selected = selectedRequest?.id === request.id;

                      return (

                        <tr

                          key={request.id}

                          onClick={() => {

                            setSelectedId(request.id);

                            setShowDetails(true);

                          }}

                          className={`cursor-pointer border-b border-slate-100 transition hover:bg-slate-50 ${

                            selected ? "bg-blue-50/60" : ""

                          }`}

                        >

                          <td className="py-4 pr-3">

                            <button

                                type="button"

                                onClick={(event) => {

                                  event.stopPropagation();

                                  openRequest360(request.id);

                                }}

                                className="text-left text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline"

                                title="Open Request 360"

                              >

                                {request.id}

                              </button>

                            <p className="mt-1 max-w-[190px] truncate text-sm font-medium text-slate-800">

                              {request.title}

                            </p>

                            <p className="mt-1 text-xs text-slate-400">

                              {request.items.length} line item

                              {request.items.length === 1 ? "" : "s"}

                            </p>

                          </td>

                          <td className="px-3 py-4">

                            <p className="max-w-[180px] truncate text-sm text-slate-700">

                              {request.project}

                            </p>

                            <p className="mt-1 text-xs text-slate-400">

                              {request.projectCode}

                            </p>

                          </td>

                          <td className="px-3 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">

                            {currency(requestValue(request))}

                          </td>

                          <td className="px-3 py-4">

                            <span

                              className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold ${priorityStyles[request.priority]}`}

                            >

                              {request.priority}

                            </span>

                          </td>

                          <td className="px-3 py-4">

                            <span

                              className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold ${statusStyles[request.status]}`}

                            >

                              {request.status}

                            </span>

                          </td>

                          <td className="py-4 pl-3 text-slate-400">

                            <button

                              type="button"

                              onClick={(event) => {

                                event.stopPropagation();

                                openRequest360(request.id);

                              }}

                              className="rounded-md p-1 hover:bg-blue-100 hover:text-blue-700"

                              aria-label={`Open Request 360 for ${request.id}`}

                              title="Open Request 360"

                            >

                              <ArrowRight size={16} />

                            </button>

                          </td>

                        </tr>

                      );

                    })}

                  </tbody>

                </table>

                {filteredRequests.length === 0 && (

                  <div className="py-12 text-center">

                    <Search

                      size={25}

                      className="mx-auto mb-3 text-slate-300"

                    />

                    <p className="text-sm font-medium text-slate-700">

                      No matching requests

                    </p>

                    <p className="mt-1 text-xs text-slate-500">

                      Try changing the search or filters.

                    </p>

                  </div>

                )}

              </div>

            </div>

            <div className="space-y-4">

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">

                <div className="border-b border-slate-100 p-4">

                  <div className="flex items-center gap-2">

                    <div className="rounded-lg bg-violet-50 p-2 text-violet-700">

                      <Bot size={19} />

                    </div>

                    <div>

                      <h2 className="text-sm font-semibold text-slate-900">

                        AI Procurement Assistant

                      </h2>

                      <p className="text-xs text-slate-500">

                        Supply decision preview

                      </p>

                    </div>

                    <span className="ml-auto rounded-full bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700">

                      PREVIEW

                    </span>

                  </div>

                </div>

                <div className="space-y-4 p-4">

                  <div className="rounded-lg border border-violet-100 bg-violet-50/60 p-3">

                    <div className="mb-2 flex items-center gap-2 text-violet-800">

                      <Sparkles size={15} />

                      <span className="text-xs font-semibold">

                        Recommended next step

                      </span>

                    </div>

                    <p className="text-sm font-semibold text-slate-800">

                      Evaluate internal supply first

                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-600">

                      Check available stock, existing commitments and feasible

                      warehouse transfers before initiating external sourcing.

                    </p>

                  </div>

                  <div className="space-y-3">

                    <DecisionRow

                      number="01"

                      title="Inventory availability"

                      detail="Check uncommitted stock"

                    />

                    <DecisionRow

                      number="02"

                      title="Internal transfer"

                      detail="Compare location, lead time and cost"

                    />

                    <DecisionRow

                      number="03"

                      title="External sourcing"

                      detail="Evaluate supplier quotes if needed"

                    />

                  </div>

                  <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">

                    <ShieldCheck size={16} className="mt-0.5 shrink-0" />

                    AI recommendations must follow configured approval limits.

                    No order is issued automatically by this preview.

                  </div>

                </div>

              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">

                <h3 className="text-sm font-semibold text-slate-900">

                  Request lifecycle

                </h3>

                <p className="mt-1 text-xs text-slate-500">

                  From requirement to fulfilment

                </p>

                <div className="mt-4 space-y-3">

                  {[

                    ["01", "Create request", "Project requirement captured"],

                    ["02", "Supply analysis", "Inventory and transfer checks"],

                    ["03", "Review & approval", "Policy-based authorization"],

                    ["04", "Sourcing & fulfilment", "Transfer, RFQ or purchase order"],

                  ].map(([number, title, detail]) => (

                    <div key={number} className="flex gap-3">

                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">

                        {number}

                      </div>

                      <div>

                        <p className="text-xs font-semibold text-slate-800">

                          {title}

                        </p>

                        <p className="mt-1 text-[11px] text-slate-500">

                          {detail}

                        </p>

                      </div>

                    </div>

                  ))}

                </div>

              </div>

            </div>

          </div>

          {selectedRequest && showDetails && (

            <div className="rounded-xl border border-slate-200 bg-white">

              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-5">

                <div>

                  <div className="mb-2 flex flex-wrap items-center gap-2">

                    <span className="text-xs font-semibold text-blue-700">

                      {selectedRequest.id}

                    </span>

                    <span

                      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusStyles[selectedRequest.status]}`}

                    >

                      {selectedRequest.status}

                    </span>

                  </div>

                  <h2 className="text-lg font-bold text-slate-900">

                    {selectedRequest.title}

                  </h2>

                  <p className="mt-1 text-sm text-slate-500">

                    {selectedRequest.project} · {selectedRequest.projectCode}

                  </p>

                </div>

                <div className="flex flex-wrap items-center gap-2">

                  <button

                    type="button"

                    onClick={() => openRequest360(selectedRequest.id)}

                    className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"

                  >

                    Open Request 360

                    <ArrowUpRight size={14} />

                  </button>

                  {selectedRequest.status === "DRAFT" && (

                    <button

                      onClick={() =>

                        updateStatus(selectedRequest, "SUBMITTED")

                      }

                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700"

                    >

                      <Send size={14} />

                      Submission unavailable

                    </button>

                  )}

                  {selectedRequest.status === "SUBMITTED" && (

                    <button

                      onClick={() =>

                        updateStatus(selectedRequest, "UNDER REVIEW")

                      }

                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"

                    >

                      <Clock3 size={14} />

                      Start review

                    </button>

                  )}

                  {selectedRequest.status === "UNDER REVIEW" && (

                    <button

                      onClick={() =>

                        updateStatus(selectedRequest, "APPROVED")

                      }

                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"

                    >

                      <Check size={14} />

                      Approval not connected

                    </button>

                  )}

                  <button

                    onClick={() => setShowDetails(false)}

                    className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"

                    aria-label="Close request details"

                  >

                    <X size={16} />

                  </button>

                </div>

              </div>

              <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-3">

                <div className="space-y-4 lg:col-span-2">

                  <h3 className="text-sm font-semibold text-slate-900">

                    Requested materials

                  </h3>

                  <div className="overflow-x-auto">

                    <table className="w-full min-w-[500px] text-left">

                      <thead>

                        <tr className="border-y border-slate-100 text-[10px] uppercase tracking-wide text-slate-400">

                          <th className="py-3 pr-3">Material</th>

                          <th className="px-3 py-3">Quantity</th>

                          <th className="px-3 py-3">Unit price</th>

                          <th className="py-3 pl-3 text-right">Line total</th>

                        </tr>

                      </thead>

                      <tbody>

                        {selectedRequest.items.map((item) => (

                          <tr

                            key={item.id}

                            className="border-b border-slate-100"

                          >

                            <td className="py-3 pr-3">

                              <p className="text-sm font-medium text-slate-800">

                                {item.material}

                              </p>

                              <p className="mt-1 text-xs text-slate-400">

                                {item.code}

                              </p>

                            </td>

                            <td className="px-3 py-3 text-sm text-slate-600">

                              {item.quantity.toLocaleString()} {item.unit}

                            </td>

                            <td className="px-3 py-3 text-sm text-slate-600">

                              {currency(item.estimatedPrice)}

                            </td>

                            <td className="py-3 pl-3 text-right text-sm font-semibold text-slate-800">

                              {currency(item.quantity * item.estimatedPrice)}

                            </td>

                          </tr>

                        ))}

                      </tbody>

                      <tfoot>

                        <tr>

                          <td

                            colSpan={3}

                            className="py-4 text-right text-sm font-semibold text-slate-600"

                          >

                            Estimated total

                          </td>

                          <td className="py-4 pl-3 text-right text-base font-bold text-slate-900">

                            {currency(requestValue(selectedRequest))}

                          </td>

                        </tr>

                      </tfoot>

                    </table>

                  </div>

                  {selectedRequest.notes && (

                    <div className="rounded-lg bg-slate-50 p-3">

                      <p className="text-xs font-semibold text-slate-700">

                        Request notes

                      </p>

                      <p className="mt-1 text-sm leading-5 text-slate-600">

                        {selectedRequest.notes}

                      </p>

                    </div>

                  )}

                </div>

                <div>

                  <h3 className="mb-4 text-sm font-semibold text-slate-900">

                    Request information

                  </h3>

                  <div className="space-y-4">

                    <Info

                      label="Requested by"

                      value={selectedRequest.requester}

                    />

                    <Info

                      label="Department"

                      value={selectedRequest.department}

                    />

                    <Info

                      label="Project"

                      value={selectedRequest.project}

                    />

                    <Info label="Country" value={selectedRequest.country} />

                    <Info

                      label="Delivery location"

                      value={selectedRequest.location}

                      icon={<MapPin size={14} />}

                    />

                    <Info

                      label="Required by"

                      value={selectedRequest.requiredDate}

                      icon={<CalendarDays size={14} />}

                    />

                    <Info

                      label="Created on"

                      value={selectedRequest.createdAt}

                    />

                  </div>

                  <div className="mt-5 rounded-lg border border-slate-200 p-3">

                    <div className="flex items-center justify-between gap-3">

                      <span className="text-xs text-slate-500">Priority</span>

                      <span

                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${priorityStyles[selectedRequest.priority]}`}

                      >

                        {selectedRequest.priority}

                      </span>

                    </div>

                  </div>

                </div>

              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-3">

                <p className="text-xs text-slate-500">

                  <ShieldCheck

                    size={14}

                    className="mr-1 inline-block align-[-2px]"

                  />

                  Status actions are demo-only and do not authorize real spend.

                </p>

                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">

                  Next stage <ArrowRight size={13} />

                </span>

              </div>

            </div>

          )}

          {!showDetails && selectedRequest && (

            <button

              onClick={() => setShowDetails(true)}

              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"

            >

              Show selected request details

            </button>

          )}

        </div>

      </main>

      {showCreate && (

        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 p-3 backdrop-blur-[2px] sm:p-6">

          <div className="my-auto w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-7">

              <div>

                <div className="mb-1 flex items-center gap-2 text-blue-700">

                  <ClipboardList size={18} />

                  <span className="text-xs font-semibold uppercase tracking-wide">

                    New procurement request

                  </span>

                </div>

                <h2 className="text-xl font-bold text-slate-900">

                  Create Purchase Request

                </h2>

                <p className="mt-1 text-sm text-slate-500">

                  Capture the project requirement before sourcing begins.

                </p>

              </div>

              <button

                onClick={() => setShowCreate(false)}

                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"

                aria-label="Close form"

              >

                <X size={19} />

              </button>

            </div>

            <div className="max-h-[68vh] space-y-6 overflow-y-auto px-5 py-5 sm:px-7">

              <section>

                <SectionHeading number="01" title="Request details" />

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">

                  <Field label="Request title *">

                    <input

                      className={inputClass}

                      value={form.title}

                      onChange={(e) => updateForm("title", e.target.value)}

                      placeholder="e.g. High-pressure steel valves"

                    />

                  </Field>

                  <Field label="Project *">
                    <select className={inputClass} value={form.project} onChange={(e) => {
                      const project = projects.find((p) => p.id === e.target.value);
                      setForm((current) => ({ ...current, project: e.target.value, projectCode: project?.project_code ?? "" }));
                    }} required>
                      <option value="">Select a project</option>
                      {projects.map((project) => <option key={project.id} value={project.id}>{project.project_code} — {project.project_name}</option>)}
                    </select>
                  </Field>
                  <Field label="Project code">
                    <input className={inputClass} value={projects.find((p) => p.id === form.project)?.project_code ?? ""} readOnly placeholder="Selected from project master" />
                  </Field>

                  <Field label="Requested by *">

                    <input

                      className={inputClass}

                      value={form.requester}

                      onChange={(e) => updateForm("requester", e.target.value)}

                      placeholder="Name or team"

                    />

                  </Field>

                  <Field label="Department">

                    <select

                      className={inputClass}

                      value={form.department}

                      onChange={(e) =>

                        updateForm("department", e.target.value)

                      }

                    >

                      <option>Project Delivery</option>

                      <option>Construction</option>

                      <option>Engineering</option>

                      <option>Maintenance</option>

                      <option>Operations</option>

                      <option>Procurement</option>

                    </select>

                  </Field>

                  <Field label="Priority">

                    <select

                      className={inputClass}

                      value={form.priority}

                      onChange={(e) => updateForm("priority", e.target.value)}

                    >

                      <option value="Normal">Normal</option>

                      <option value="High">High</option>

                      <option value="Critical">Critical</option>

                    </select>

                  </Field>

                </div>

              </section>

              <section>

                <SectionHeading number="02" title="Delivery requirements" />

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">

                  <Field label="Project country">

                    <select

                      className={inputClass}

                      value={form.country}

                      onChange={(e) => updateForm("country", e.target.value)}

                    >

                      <option>Saudi Arabia</option>

                      <option>United Arab Emirates</option>

                      <option>India</option>

                      <option>Qatar</option>

                      <option>United States</option>

                      <option>United Kingdom</option>

                      <option>Germany</option>

                      <option>Other</option>

                    </select>

                  </Field>

                  <Field label="Delivery location / warehouse *">

                    <input

                      className={inputClass}

                      value={form.location}

                      onChange={(e) => updateForm("location", e.target.value)}

                      placeholder="Site, city or warehouse"

                    />

                  </Field>

                  <Field label="Required-by date *">

                    <input

                      className={inputClass}

                      type="date"

                      min={new Date().toISOString().slice(0, 10)}

                      value={form.requiredDate}

                      onChange={(e) =>

                        updateForm("requiredDate", e.target.value)

                      }

                    />

                  </Field>

                  <Field label="Business justification / notes">

                    <input

                      className={inputClass}

                      value={form.notes}

                      onChange={(e) => updateForm("notes", e.target.value)}

                      placeholder="Why are these materials required?"

                    />

                  </Field>

                </div>

              </section>

              <section>

                <div className="flex flex-wrap items-center justify-between gap-3">

                  <SectionHeading number="03" title="Materials and quantities" />

                  <button

                    onClick={addItem}

                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"

                  >

                    <Plus size={14} />

                    Add material

                  </button>

                </div>

                <div className="mt-4 space-y-4">

                  {items.map((item, index) => (

                    <div

                      key={item.id}

                      className="rounded-xl border border-slate-200 p-4"

                    >

                      <div className="mb-3 flex items-center justify-between">

                        <p className="text-xs font-semibold text-slate-700">

                          Material {index + 1}

                        </p>

                        <button

                          onClick={() => removeItem(item.id)}

                          disabled={items.length === 1}

                          className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"

                          aria-label={`Remove material ${index + 1}`}

                        >

                          <Trash2 size={15} />

                        </button>

                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

                        <Field label="Material *">
                          <select className={inputClass} value={item.materialId} onChange={(e) => {
                            const material = materials.find((m) => m.id === e.target.value);
                            setItems((current) => current.map((row) => row.id === item.id ? { ...row, materialId: e.target.value, material: material?.material_name ?? "", code: material?.material_code ?? "", unit: material?.base_uom ?? "Each" } : row));
                          }} required>
                            <option value="">Select a material</option>
                            {materials.map((material) => <option key={material.id} value={material.id}>{material.material_code} — {material.material_name}</option>)}
                          </select>
                        </Field>
                        <Field label="Material code / SKU">
                          <input className={inputClass} value={item.code} readOnly placeholder="Selected from material master" />
                        </Field>

                        <div className="grid grid-cols-2 gap-3">

                          <Field label="Quantity *">

                            <input

                              className={inputClass}

                              type="number"

                              min="1"

                              value={item.quantity}

                              onChange={(e) =>

                                updateItem(

                                  item.id,

                                  "quantity",

                                  Number(e.target.value)

                                )

                              }

                            />

                          </Field>

                          <Field label="Unit">

                            <select

                              className={inputClass}

                              value={item.unit}

                              onChange={(e) =>

                                updateItem(item.id, "unit", e.target.value)

                              }

                            >

                              <option>Each</option>

                              <option>Set</option>

                              <option>Kg</option>

                              <option>Ton</option>

                              <option>Meter</option>

                              <option>Liter</option>

                              <option>Box</option>

                            </select>

                          </Field>

                        </div>

                        <Field label="Estimated unit price (USD)">

                          <input

                            className={inputClass}

                            type="number"

                            min="0"

                            step="0.01"

                            value={item.estimatedPrice}

                            onChange={(e) =>

                              updateItem(

                                item.id,

                                "estimatedPrice",

                                Number(e.target.value)

                              )

                            }

                          />

                        </Field>

                      </div>

                      <div className="mt-3 flex justify-end border-t border-slate-100 pt-3">

                        <p className="text-sm text-slate-500">

                          Estimated line total:{" "}

                          <span className="font-bold text-slate-900">

                            {currency(item.quantity * item.estimatedPrice)}

                          </span>

                        </p>

                      </div>

                    </div>

                  ))}

                </div>

                <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-4">

                  <div>

                    <p className="text-xs text-slate-500">

                      Total estimated request value

                    </p>

                    <p className="mt-1 text-xl font-bold text-slate-900">

                      {currency(

                        items.reduce(

                          (sum, item) =>

                            sum + item.quantity * item.estimatedPrice,

                          0

                        )

                      )}

                    </p>

                  </div>

                  <span className="text-xs text-slate-400">

                    USD · Estimate only

                  </span>

                </div>

              </section>

              <div className="flex items-start gap-2 rounded-xl border border-violet-100 bg-violet-50 p-4 text-xs leading-5 text-violet-800">

                <Sparkles size={16} className="mt-0.5 shrink-0" />

                After submission, the intended next step is to run the supply

                decision engine: inventory first, then feasible internal

                transfers, then external sourcing. This prototype does not run

                that engine or create an approval.

              </div>

            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-7">

              <button

                onClick={() => setShowCreate(false)}

                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"

              >

                Cancel

              </button>

              <div className="flex flex-wrap gap-2">

                <button

                  onClick={() => void saveRequest(false)}
                  disabled={saving}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"

                >

                  {saving ? "Saving…" : "Save draft"}

                </button>

                <button

                  onClick={() => void saveRequest(true)}
                  disabled={saving}
                  title="This currently saves a draft; submission workflow is not connected."
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"

                >

                  <Send size={15} />

                  {saving ? "Saving…" : "Save and open request"}

                </button>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}

function Kpi({

  label,

  value,

  detail,

  icon,

  color,

}: {

  label: string;

  value: string;

  detail: string;

  icon: React.ReactNode;

  color: "blue" | "amber" | "red" | "violet";

}) {

  const colors = {

    blue: "bg-blue-50 text-blue-700",

    amber: "bg-amber-50 text-amber-700",

    red: "bg-red-50 text-red-700",

    violet: "bg-violet-50 text-violet-700",

  };

  return (

    <div className="rounded-xl border border-slate-200 bg-white p-4">

      <div className="flex items-start justify-between gap-3">

        <div>

          <p className="text-xs font-medium text-slate-500">{label}</p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">

            {value}

          </p>

        </div>

        <div className={`rounded-lg p-2.5 ${colors[color]}`}>{icon}</div>

      </div>

      <p className="mt-3 text-xs text-slate-400">{detail}</p>

    </div>

  );

}

function SectionHeading({

  number,

  title,

}: {

  number: string;

  title: string;

}) {

  return (

    <div className="flex items-center gap-2.5">

      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">

        {number}

      </span>

      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>

    </div>

  );

}

function Field({

  label,

  children,

}: {

  label: string;

  children: React.ReactNode;

}) {

  return (

    <label className="block min-w-0 text-xs font-medium text-slate-600">

      {label}

      {children}

    </label>

  );

}

function Info({

  label,

  value,

  icon,

}: {

  label: string;

  value: string;

  icon?: React.ReactNode;

}) {

  return (

    <div>

      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">

        {label}

      </p>

      <p className="mt-1 flex items-start gap-1.5 text-sm font-medium text-slate-700">

        {icon && <span className="mt-0.5 text-slate-400">{icon}</span>}

        <span>{value}</span>

      </p>

    </div>

  );

}

function DecisionRow({

  number,

  title,

  detail,

}: {

  number: string;

  title: string;

  detail: string;

}) {

  return (

    <div className="flex items-start gap-3">

      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-600">

        {number}

      </span>

      <div>

        <p className="text-xs font-semibold text-slate-800">{title}</p>

        <p className="mt-1 text-[11px] leading-4 text-slate-500">{detail}</p>

      </div>

    </div>

  );

}
