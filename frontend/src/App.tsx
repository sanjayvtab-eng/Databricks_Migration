import { useEffect, useMemo, useState } from "react";
import { api, downloadApi } from "./api";
import {
  Activity,
  Boxes,
  Database,
  GitBranch,
  Layers3,
  ClipboardCheck,
  ShieldCheck,
  Settings,
  FileCode2,
  RefreshCw,
  LogOut,
  Play,
  Plus,
  Search,
  CheckCircle2,
  PlugZap,
  Stethoscope,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
  Command,
  ChevronRight,
  Sparkles,
  Workflow,
  ServerCog,
  ShieldAlert,
  FileCheck2,
  Gauge,
  ArrowUpRight,
  Clock3,
  Download,
  ScrollText,
  BookOpen,
  UserCog,
  Route,
} from "lucide-react";

type Project = { id: string; name: string; status: string };
type Source = {
  id: string;
  profile_name: string;
  server_name: string;
  database_name: string;
};
type Inv = {
  id: string;
  database: string;
  schema: string;
  name: string;
  type: string;
};
type ClassRow = {
  object_id: string;
  name: string;
  type: string;
  recommended_layer: string;
  selected_layer: string;
  reason: string;
  confidence: number;
};
type Mapping = {
  id: string;
  object_id: string;
  name: string;
  type: string;
  source_fqn: string;
  target_fqn: string;
  target_layer: string;
  environment: string;
};
type Artifact = {
  artifact_id: string;
  object_id: string;
  schema?: string;
  name: string;
  type: string;
  current_version: number;
  artifact_version_id?: string;
  content?: string;
  executable?: boolean;
  validation_status?: string;
  review_status?: string;
  approval_allowed?: boolean;
  approval_blockers?: string[];
  ai_provider?: string;
  ai_model?: string;
};
type Life = {
  environment: string;
  status: string;
  pass_count: number;
  fail_count: number;
  review_blockers: number;
};
type ModRecord = {
  id: string;
  record_type: string;
  object_id?: string;
  environment?: string;
  created_at: string;
  payload: { title?: string; status?: string; details?: any };
};

const nav = [
  "Dashboard",
  "Runbook",
  "Projects",
  "Sources",
  "Discovery",
  "Inventory",
  "Dependencies",
  "Assessment",
  "Mappings",
  "Compatibility",
  "Layer Classification",
  "Medallion Design",
  "Conversion Plans",
  "Artifacts",
  "AI Remediation",
  "Reviews",
  "Issues",
  "Data Quality",
  "Reconciliation",
  "Lifecycle",
  "Deployments",
  "Waves",
  "Cutover",
  "Decommission",
  "Governance",
  "Audit",
  "Users",
  "Administration",
];
const icons: any = {
  Dashboard: Activity,
  Runbook: BookOpen,
  Projects: Boxes,
  Sources: Database,
  Dependencies: GitBranch,
  "Medallion Design": Layers3,
  "AI Remediation": Sparkles,
  Reviews: ClipboardCheck,
  Governance: ShieldCheck,
  Administration: Settings,
  Discovery: PlugZap,
};
const moduleMap: any = {
  Assessment: "assessment",
  "Conversion Plans": "conversion-plans",
  "Data Quality": "data-quality",
  Deployments: "deployments",
  Waves: "waves",
  Cutover: "cutover",
  Decommission: "decommission",
  Governance: "governance",
  Audit: "audit",
  Administration: "administration",
};

const BUILD_VERSION = "2.3.0 SEMANTIC_MEDALLION_FACTORY";

function Login({ done }: { done: () => void }) {
  const [u, setU] = useState("admin"),
    [p, setP] = useState(""),
    [err, setErr] = useState("");
  async function go() {
    setErr("");
    try {
      const r: any = await api("/login", {
        method: "POST",
        body: JSON.stringify({ username: u, password: p }),
      });
      localStorage.setItem("mf_token", r.access_token);
      done();
    } catch (e: any) {
      setErr(e.message);
    }
  }
  return (
    <div className="login">
      <div className="login-card">
        <div className="brandmark">MF</div>
        <h1>Migration Factory</h1>
        <p>Enterprise SQL Server → Databricks Control Plane</p>
        <input
          value={u}
          onChange={(e) => setU(e.target.value)}
          placeholder="Username"
        />
        <input
          value={p}
          type="password"
          onChange={(e) => setP(e.target.value)}
          placeholder="Password"
          onKeyDown={(e) => e.key === "Enter" && go()}
        />
        <button onClick={go}>Sign in</button>
        {err && <div className="error">{err}</div>}
        <small>
          Use the administrator created by scripts/bootstrap_admin.py. · Build{" "}
          {BUILD_VERSION}
        </small>
      </div>
    </div>
  );
}
function Badge({ s }: { s: string }) {
  return (
    <span className={`badge ${String(s || "").toLowerCase()}`}>{s || "-"}</span>
  );
}
function Panel({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: any;
  children: any;
}) {
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>{title}</h3>
        <div>{actions}</div>
      </div>
      {children}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <FileCode2 size={36} />
      <p>{text}</p>
    </div>
  );
}

export default function App() {
  const [ready, setReady] = useState(!!localStorage.getItem("mf_token"));
  const [page, setPage] = useState("Dashboard");
  const [projects, setProjects] = useState<Project[]>([]),
    [pid, setPid] = useState("");
  const [dash, setDash] = useState<any>({}),
    [life, setLife] = useState<Life[]>([]),
    [classes, setClasses] = useState<ClassRow[]>([]),
    [sources, setSources] = useState<Source[]>([]),
    [inventory, setInventory] = useState<Inv[]>([]),
    [mappings, setMappings] = useState<Mapping[]>([]),
    [artifacts, setArtifacts] = useState<Artifact[]>([]),
    [issues, setIssues] = useState<any[]>([]),
    [deps, setDeps] = useState<any[]>([]),
    [reviews, setReviews] = useState<any[]>([]);
  const [records, setRecords] = useState<ModRecord[]>([]),
    [users, setUsers] = useState<any[]>([]),
    [diag, setDiag] = useState<any>(null),
    [discoveryResult, setDiscoveryResult] = useState<any>(null);
  const [deployment, setDeployment] = useState<any>({
      environment: "DEV",
      status: "NOT_STARTED",
      logs: [],
    }),
    [precheck, setPrecheck] = useState<any>(null),
    [reconResult, setReconResult] = useState<any>(null),
    [gateResult, setGateResult] = useState<any>(null);
  const [testPromotion, setTestPromotion] = useState<any>({ status: "NOT_STARTED", logs: [] }),
    [testPrecheck, setTestPrecheck] = useState<any>(null),
    [testRecon, setTestRecon] = useState<any>(null),
    [testGate, setTestGate] = useState<any>(null);
  const [logView, setLogView] = useState<any[]>([]),
    [showLogs, setShowLogs] = useState(false);
  const [compat, setCompat] = useState<any>(null);
  const [medallion, setMedallion] = useState<any>(null),
    [semantics, setSemantics] = useState<any[]>([]),
    [consumers, setConsumers] = useState<any[]>([]),
    [medArts, setMedArts] = useState<any[]>([]),
    [semanticRun, setSemanticRun] = useState<any>(null);
  const [medDeployment, setMedDeployment] = useState<any>(null),
    [medLogs, setMedLogs] = useState<any[]>([]),
    [medLogFilter, setMedLogFilter] = useState("ALL");
  const [aiCandidate, setAiCandidate] = useState<any>(null),
    [aiObject, setAiObject] = useState<Artifact | null>(null),
    [aiPlan, setAiPlan] = useState<any>(null),
    [aiBatch, setAiBatch] = useState<any>(null);
  const [aiProvider, setAiProvider] = useState<any>(null),
    [aiModels, setAiModels] = useState<string[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<any>(null),
    [issueLogs, setIssueLogs] = useState<any[]>([]),
    [showIssueLogs, setShowIssueLogs] = useState(false);
  const [deployBatch, setDeployBatch] = useState(10000),
    [deployMaxRows, setDeployMaxRows] = useState(""),
    [deployMode, setDeployMode] = useState("FULL_LOAD");
  const [busy, setBusy] = useState(false),
    [msg, setMsg] = useState(""),
    [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  async function loadProjects() {
    const ps = await api<Project[]>("/projects");
    setProjects(ps);
    if (!pid && ps[0]) setPid(ps[0].id);
    return ps;
  }
  async function refresh() {
    if (!ready) return;
    setMsg("");
    try {
      const ps = await loadProjects();
      const id = pid || ps[0]?.id;
      if (id) {
        const [d, l, c, s, i, m, a, is, dp, rv] = await Promise.all([
          api(`/projects/${id}/dashboard`),
          api(`/projects/${id}/lifecycle`),
          api(`/projects/${id}/classification`),
          api(`/projects/${id}/sources`),
          api(`/projects/${id}/inventory?limit=500`),
          api(`/projects/${id}/mappings`),
          api(`/projects/${id}/artifacts`),
          api(`/projects/${id}/issues`),
          api(`/projects/${id}/dependencies`),
          api(`/projects/${id}/reviews`),
        ]);
        setDash(d);
        setLife(l as Life[]);
        setClasses(c as ClassRow[]);
        setSources(s as Source[]);
        setInventory(i as Inv[]);
        setMappings(m as Mapping[]);
        setArtifacts(a as Artifact[]);
        setIssues(is as any[]);
        setDeps(dp as any[]);
        setReviews(rv as any[]);
      }
      if (moduleMap[page] && id)
        setRecords(await api(`/projects/${id}/module/${moduleMap[page]}`));
      if (page === "Compatibility" && id)
        setCompat(await api(`/projects/${id}/compatibility/summary`));
      if (page === "Medallion Design" && id) {
        const [mp, sm, cs, ma]: any = await Promise.all([
          api(`/projects/${id}/medallion/plan?environment=DEV`),
          api(`/projects/${id}/semantics`),
          api(`/projects/${id}/consumers`),
          api(`/projects/${id}/medallion/artifacts?environment=DEV`),
        ]);
        setMedallion(mp);
        setSemantics(sm);
        setConsumers(cs);
        setMedArts(ma);
      }
      if (page === "AI Remediation" && id) {
        const [plan, provider]: any = await Promise.all([
          api(`/projects/${id}/remediation/plan?environment=DEV`),
          api("/ai/provider-status"),
        ]);
        setAiPlan(plan);
        setAiProvider(provider);
      }
      if (page === "Reconciliation" && id)
        setReconResult(
          await api(`/projects/${id}/deployments/dev/reconciliation/latest`),
        );
      if (page === "Deployments" && id)
        setDeployment(await api(`/projects/${id}/deployments/dev/status`));
      if (page === "Waves" && id) {
        const [status, recon]: any = await Promise.all([
          api(`/projects/${id}/promotions/test/status`),
          api(`/projects/${id}/promotions/test/reconciliation/latest`),
        ]);
        setTestPromotion(status);
        setTestRecon(recon);
      }
      if (page === "Users") setUsers(await api("/users"));
      if (page === "Administration") setDiag(await api("/system/diagnostics"));
    } catch (e: any) {
      if (String(e.message).includes("Invalid or expired token")) {
        localStorage.removeItem("mf_token");
        setReady(false);
      } else setMsg(e.message);
    }
  }
  useEffect(() => {
    refresh();
  }, [ready, pid, page]);
  async function action(fn: () => Promise<any>) {
    setBusy(true);
    setMsg("");
    try {
      const r = await fn();
      setMsg("Completed successfully");
      await refresh();
      return r;
    } catch (e: any) {
      setMsg(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function viewDevLogs() {
    if (!pid) return;
    await action(async () => {
      const r: any = await api(
        `/projects/${pid}/deployments/dev/logs?limit=1000`,
      );
      setLogView(r.logs || []);
      setShowLogs(true);
      return r;
    });
  }
  async function downloadDevLogs() {
    if (!pid) return;
    setBusy(true);
    setMsg("");
    try {
      await downloadApi(
        `/projects/${pid}/deployments/dev/logs/download?format=csv`,
        "migration_dev_logs.csv",
      );
      setMsg("Log downloaded successfully");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function runDevReconciliation() {
    if (!pid) return;
    await action(async () => {
      const result: any = await api(
        `/projects/${pid}/deployments/dev/reconcile`,
        { method: "POST" },
      );
      setReconResult(result);
      return result;
    });
  }
  async function downloadReconciliation() {
    if (!pid || !reconResult?.run_id) return;
    setBusy(true);
    setMsg("");
    try {
      await downloadApi(
        `/projects/${pid}/deployments/dev/reconciliation/latest/download`,
        `medallion_reconciliation_${reconResult.run_id}.csv`,
      );
      setMsg("Reconciliation log downloaded");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function analyzeWithAi(a: Artifact) {
    if (!pid) return;
    setAiObject(a);
    setAiCandidate(null);
    await action(async () => {
      const r: any = await api(
        `/projects/${pid}/artifacts/${a.object_id}/remediation/analyze`,
        {
          method: "POST",
          body: JSON.stringify({ environment: "DEV", use_ai: true }),
        },
      );
      setAiCandidate(r);
      return r;
    });
  }
  async function acceptAiCandidate() {
    if (!pid || !aiObject || !aiCandidate?.ai_run_id) return;
    await action(async () => {
      const r: any = await api(
        `/projects/${pid}/artifacts/${aiObject.object_id}/remediation/accept`,
        {
          method: "POST",
          body: JSON.stringify({
            ai_run_id: aiCandidate.ai_run_id,
            reviewer: "admin",
          }),
        },
      );
      setAiCandidate(null);
      setAiObject(null);
      setPage("Reviews");
      return r;
    });
  }
  async function scanAiRemediation() {
    if (!pid) return;
    await action(async () => {
      const r: any = await api(
        `/projects/${pid}/remediation/plan?environment=DEV`,
      );
      setAiPlan(r);
      return r;
    });
  }
  async function runAiRemediation() {
    if (!pid) return;
    const count = aiPlan?.eligible || 0;
    if (!count) {
      setMsg("No eligible remediation items were found");
      return;
    }
    if (
      !confirm(
        `Create and statically validate new candidate versions for ${count} eligible object(s)? AI will not approve or deploy them.`,
      )
    )
      return;
    await action(async () => {
      const r: any = await api(`/projects/${pid}/remediation/run`, {
        method: "POST",
        body: JSON.stringify({
          environment: "DEV",
          use_ai: !!aiPlan?.provider?.enabled,
          apply_valid_candidates: true,
          reviewer: "admin",
          max_objects: 100,
        }),
      });
      setAiBatch(r);
      setAiPlan(await api(`/projects/${pid}/remediation/plan?environment=DEV`));
      return r;
    });
  }
  async function testAiProvider() {
    setBusy(true);
    setMsg("");
    try {
      const r: any = await api("/ai/provider-test", { method: "POST" });
      setAiProvider(r);
      setAiModels(r.models || []);
      setMsg(
        r.ready
          ? `${r.provider} connection test passed`
          : r.error || `${r.provider || "AI"} connection test completed`,
      );
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function analyzeConsumers() {
    if (!pid) return;
    await action(async () => {
      const r: any = await api(`/projects/${pid}/consumers/analyze`, {
        method: "POST",
      });
      setConsumers(await api(`/projects/${pid}/consumers`));
      return r;
    });
  }
  async function registerExternalConsumer() {
    if (!pid || !inventory.length) return;
    const producerName = prompt(
      "Producer source object name (exact inventory name)",
      inventory.find((x) => x.type === "TABLE")?.name ||
        inventory[0]?.name ||
        "",
    );
    if (!producerName) return;
    const obj = inventory.find(
      (x) => x.name.toLowerCase() === producerName.toLowerCase(),
    );
    if (!obj) {
      setMsg("Producer object not found in current inventory");
      return;
    }
    const name = prompt(
      "External consumer name, e.g. Power BI - Sales Dashboard",
      "",
    );
    if (!name) return;
    const consumer_type = prompt("Consumer type", "BI_REPORT") || "BI_REPORT";
    const usage_type =
      prompt("Usage type", "REPORTING_READ") || "REPORTING_READ";
    await action(async () => {
      const r = await api(`/projects/${pid}/consumers`, {
        method: "POST",
        body: JSON.stringify({
          object_id: obj.id,
          name,
          consumer_type,
          usage_type,
          evidence: { registered_from: "Medallion Design" },
        }),
      });
      setConsumers(await api(`/projects/${pid}/consumers`));
      return r;
    });
  }
  async function inferBusinessSemantics() {
    if (!pid) return;
    await action(async () => {
      const r: any = await api(`/projects/${pid}/semantics/infer`, {
        method: "POST",
      });
      setSemanticRun(r);
      setSemantics(await api(`/projects/${pid}/semantics`));
      return r;
    });
  }
  async function buildMedallion() {
    if (!pid) return;
    const defaultCatalog = (mappings[0]?.target_fqn || "migration_dev")
      .split(".")[0]
      .replaceAll("`", "");
    const catalog = prompt(
      "Databricks catalog for DEV Medallion targets",
      defaultCatalog,
    );
    if (!catalog) return;
    await action(async () => {
      const r: any = await api(`/projects/${pid}/medallion/plan`, {
        method: "POST",
        body: JSON.stringify({ environment: "DEV", catalog }),
      });
      setMedallion(r);
      setSemantics(await api(`/projects/${pid}/semantics`));
      setConsumers(await api(`/projects/${pid}/consumers`));
      return r;
    });
  }
  async function approveSemantic(id: string) {
    if (!pid) return;
    if (
      !confirm(
        "Approve this semantic definition for Gold generation? This explicitly accepts the inferred/business semantics.",
      )
    )
      return;
    await action(async () => {
      const r = await api(`/projects/${pid}/semantics/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ actor: "admin" }),
      });
      setSemantics(await api(`/projects/${pid}/semantics`));
      return r;
    });
  }
  async function defineSemantic(objectId: string) {
    if (!pid) return;
    const obj = inventory.find((x) => x.id === objectId);
    const role = (
      prompt(
        "Semantic role: FACT, DIMENSION, AGGREGATE, KPI or REPORTING",
        "FACT",
      ) || ""
    ).toUpperCase();
    if (!role) return;
    const target =
      prompt(
        "Gold target name",
        `${role === "FACT" ? "fact" : role === "DIMENSION" ? "dim" : "gold"}_${(obj?.name || "model").toLowerCase()}`,
      ) || "";
    if (!target) return;
    const split = (v: string | null) =>
      (v || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    const grain = split(
      prompt("Grain columns (comma separated). Required for FACT.", ""),
    );
    const business_keys = split(
      prompt(
        "Business key columns (comma separated). Required for DIMENSION.",
        "",
      ),
    );
    const dimension_keys = split(
      prompt("Dimension key columns (comma separated).", ""),
    );
    const attributes = split(
      prompt("Dimension attribute columns (comma separated).", ""),
    );
    const measureText =
      prompt(
        "Measures as Name:SourceColumn:Aggregation, e.g. SalesAmount:Amount:SUM. Use NONE for non-aggregated fact measures.",
        "",
      ) || "";
    const measures = measureText
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => {
        const [name, source_column, aggregation = "NONE"] = x
          .split(":")
          .map((y) => y.trim());
        return { name, source_column, aggregation: aggregation.toUpperCase() };
      });
    await action(async () => {
      const r: any = await api(`/projects/${pid}/semantics`, {
        method: "POST",
        body: JSON.stringify({
          object_id: objectId,
          semantic_role: role,
          target_name: target,
          grain,
          business_keys,
          dimension_keys,
          attributes,
          measures,
          scd_type: role === "DIMENSION" ? "1" : null,
          notes: "Explicitly defined in Medallion Design",
        }),
      });
      setSemantics(await api(`/projects/${pid}/semantics`));
      return r;
    });
  }
  async function generateMedallion() {
    if (!pid) return;
    await action(async () => {
      const r: any = await api(
        `/projects/${pid}/medallion/generate?environment=DEV`,
        { method: "POST" },
      );
      setMedArts(
        await api(`/projects/${pid}/medallion/artifacts?environment=DEV`),
      );
      setMedallion(
        await api(`/projects/${pid}/medallion/plan?environment=DEV`),
      );
      return r;
    });
  }
  async function reviewMedArtifact(versionId: string, status = "APPROVED") {
    if (!pid) return;
    await action(async () => {
      const r = await api(
        `/projects/${pid}/medallion/artifacts/${versionId}/review`,
        { method: "POST", body: JSON.stringify({ status, reviewer: "admin" }) },
      );
      setMedArts(
        await api(`/projects/${pid}/medallion/artifacts?environment=DEV`),
      );
      return r;
    });
  }
  async function deployMedallion() {
    if (!pid) return;
    if (
      !confirm(
        "Deploy APPROVED and validated Medallion artifacts to DEV in Bronze → Silver → Gold order?",
      )
    )
      return;
    const allowDestructive = confirm(
      "Existing DEV Bronze data may need replacement. Approve destructive DEV replacement for this run only? Select Cancel to keep replacement blocked.",
    );
    await action(async () => {
      const result: any = await api(`/projects/${pid}/medallion/deploy-dev`, {
        method: "POST",
        body: JSON.stringify({
          allow_destructive: allowDestructive,
          batch_size: deployBatch,
          max_rows: deployMaxRows ? Number(deployMaxRows) : null,
        }),
      });
      setMedDeployment(result);
      if (result?.run_id) {
        const logResult: any = await api(
          `/projects/${pid}/medallion/deployments/${result.run_id}/logs`,
        );
        setMedLogs(logResult.logs || []);
      }
      return result;
    });
  }
  async function copyMedallionLogs() {
    if (!medLogs.length) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(medLogs, null, 2));
      setMsg("Medallion deployment logs copied");
    } catch {
      setMsg("Unable to copy logs. Use Download CSV instead.");
    }
  }
  async function downloadMedallionLogs() {
    if (!pid || !medDeployment?.run_id) return;
    setBusy(true);
    setMsg("");
    try {
      await downloadApi(
        `/projects/${pid}/medallion/deployments/${medDeployment.run_id}/logs/download`,
        `medallion_${medDeployment.run_id}_logs.csv`,
      );
      setMsg("Medallion deployment log downloaded");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function refreshAiModels() {
    await action(async () => {
      const r: any = await api("/ai/models");
      setAiModels(r.models || []);
      setAiProvider((x: any) => ({ ...x, ...r }));
      return r;
    });
  }
  async function openIssue(i: any) {
    if (!pid) return;
    setShowIssueLogs(false);
    setIssueLogs([]);
    await action(async () => {
      const r: any = await api(`/projects/${pid}/issues/${i.id}`);
      setSelectedIssue(r);
      return r;
    });
  }
  async function issueAction(kind: "RESOLVE" | "CLOSE" | "REOPEN") {
    if (!pid || !selectedIssue) return;
    const comments = prompt(
      `${kind} issue ${selectedIssue.id} - comments are mandatory`,
    );
    if (!comments?.trim()) return;
    await action(async () => {
      const r: any = await api(
        `/projects/${pid}/issues/${selectedIssue.id}/action`,
        {
          method: "POST",
          body: JSON.stringify({ action: kind, comments: comments.trim() }),
        },
      );
      setSelectedIssue(r);
      return r;
    });
  }
  async function recheckIssue() {
    if (!pid || !selectedIssue) return;
    await action(async () => {
      const r: any = await api(
        `/projects/${pid}/issues/${selectedIssue.id}/recheck`,
        { method: "POST" },
      );
      setSelectedIssue(r.issue);
      setMsg(r.reason || "Re-check completed");
      return r;
    });
  }
  async function viewIssueLogs() {
    if (!pid || !selectedIssue) return;
    await action(async () => {
      const r: any = await api(
        `/projects/${pid}/deployments/dev/logs?limit=1000`,
      );
      const logs = (r.logs || []).filter(
        (x: any) =>
          !selectedIssue.run_id ||
          x.run_id === selectedIssue.run_id ||
          x.object_id === selectedIssue.object_id,
      );
      setIssueLogs(logs);
      setShowIssueLogs(true);
      return r;
    });
  }
  if (!ready) return <Login done={() => setReady(true)} />;
  const current = projects.find((x) => x.id === pid);
  const layers = dash.layers || {},
    types = dash.types || {};
  const filtered = useMemo(
    () =>
      inventory.filter((x) =>
        (x.schema + "." + x.name + " " + x.type)
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [inventory, search],
  );
  const genericModule = moduleMap[page];
  function addRecord() {
    if (!pid) return;
    const title = prompt(`${page} title`);
    if (!title) return;
    const status = prompt("Status", "OPEN") || "OPEN";
    const environment = prompt("Environment (optional)", "DEV") || undefined;
    action(() =>
      api(`/projects/${pid}/module/${genericModule}`, {
        method: "POST",
        body: JSON.stringify({
          title,
          status,
          environment,
          details: { created_from_ui: true },
        }),
      }),
    );
  }
  const navGroups = [
    {
      label: "OVERVIEW",
      items: ["Dashboard", "Runbook", "Projects", "Sources"],
    },
    {
      label: "DISCOVER & PLAN",
      items: [
        "Discovery",
        "Inventory",
        "Dependencies",
        "Assessment",
        "Mappings",
        "Compatibility",
        "Layer Classification",
        "Medallion Design",
        "Conversion Plans",
      ],
    },
    {
      label: "BUILD & VALIDATE",
      items: [
        "Artifacts",
        "AI Remediation",
        "Reviews",
        "Issues",
        "Data Quality",
        "Reconciliation",
      ],
    },
    {
      label: "PROMOTE & OPERATE",
      items: ["Lifecycle", "Deployments", "Waves", "Cutover", "Decommission"],
    },
    {
      label: "CONTROL",
      items: ["Governance", "Audit", "Users", "Administration"],
    },
  ];
  return (
    <div className={`shell ${collapsed ? "collapsed" : ""}`}>
      <aside>
        <div className="brand">
          <div className="brandmark">MF</div>
          <div className="brandcopy">
            <b>Migration Factory</b>
            <small>Databricks Control Plane</small>
          </div>
          <button
            className="collapse-btn"
            title={collapsed ? "Expand navigation" : "Collapse navigation"}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <PanelLeftOpen size={17} />
            ) : (
              <PanelLeftClose size={17} />
            )}
          </button>
        </div>
        <div className="workspace-chip">
          <span className="live-dot" />
          <div>
            <b>Enterprise workspace</b>
            <small>{current?.name || "No project selected"}</small>
          </div>
        </div>
        <div className="navscroll">
          {navGroups.map((g) => (
            <div className="nav-group" key={g.label}>
              <div className="nav-label">{g.label}</div>
              {g.items.map((n) => {
                const I = icons[n] || FileCode2;
                return (
                  <button
                    title={collapsed ? n : undefined}
                    className={page === n ? "active" : ""}
                    onClick={() => setPage(n)}
                    key={n}
                  >
                    <I size={17} />
                    <span>{n}</span>
                    {page === n && (
                      <ChevronRight className="nav-arrow" size={14} />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="aside-footer">
          <div className="build-chip">
            <Sparkles size={14} />
            <span>Build {BUILD_VERSION}</span>
          </div>
          <button
            className="logout"
            onClick={() => {
              localStorage.removeItem("mf_token");
              setReady(false);
            }}
          >
            <LogOut size={17} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
      <main>
        <header>
          <div className="header-title">
            <div className="eyebrow">SQL SERVER → DATABRICKS</div>
            <h2>{page}</h2>
            <p>
              Metadata-first migration orchestration with governed promotion and
              deterministic validation
            </p>
          </div>
          <div className="header-actions">
            <div className="command-pill">
              <Command size={15} />
              <span>Control plane</span>
            </div>
            <button className="icon-btn" title="Notifications">
              <Bell size={17} />
            </button>
            <select value={pid} onChange={(e) => setPid(e.target.value)}>
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button className="primary-soft" onClick={refresh}>
              <RefreshCw className={busy ? "spin" : ""} size={16} />
              Refresh
            </button>
          </div>
        </header>
        <section className="content">
          {msg && (
            <div className={msg.includes("success") ? "notice ok" : "notice"}>
              {msg}
            </div>
          )}
          {page === "Dashboard" && (
            <>
              <div className="dashboard-hero">
                <div>
                  <div className="hero-kicker">
                    <Sparkles size={15} /> Enterprise migration command center
                  </div>
                  <h1>{current?.name || "Select a migration project"}</h1>
                  <p>
                    Discover, assess, transform, validate and promote SQL Server
                    workloads into governed Databricks medallion architecture.
                  </p>
                  <div className="hero-actions">
                    <button
                      className="hero-primary"
                      onClick={() => setPage("Discovery")}
                    >
                      <Play size={15} />
                      Open discovery
                    </button>
                    <button onClick={() => setPage("Lifecycle")}>
                      <Workflow size={15} />
                      View lifecycle
                    </button>
                  </div>
                </div>
                <div className="readiness-orb">
                  <div className="orb-ring">
                    <span>
                      {life.filter((x) => x.status === "PASSED").length}
                    </span>
                    <small>/ {life.length || 4}</small>
                  </div>
                  <b>Environments ready</b>
                  <small>Project-scoped gate evidence</small>
                </div>
              </div>
              <div className="cards">
                <Card
                  n={dash.objects_discovered || 0}
                  t="Objects discovered"
                  icon="objects"
                />
                <Card n={types.TABLE || 0} t="Tables" icon="tables" />
                <Card n={types.VIEW || 0} t="Views" icon="views" />
                <Card
                  n={types.PROCEDURE || 0}
                  t="Procedures"
                  icon="procedures"
                />
                <Card
                  n={dash.blocked_objects || 0}
                  t="Blocked"
                  icon="blocked"
                />
              </div>
              <div className="grid2">
                <Panel title="Medallion architecture">
                  <div className="section-caption">
                    Recommended and selected target-layer distribution
                  </div>
                  <div className="layerflow">
                    <Layer t="SOURCE" n={dash.objects_discovered || 0} />
                    <ChevronRight />
                    <Layer t="BRONZE" n={layers.BRONZE || 0} />
                    <ChevronRight />
                    <Layer t="SILVER" n={layers.SILVER || 0} />
                    <ChevronRight />
                    <Layer t="GOLD" n={layers.GOLD || 0} />
                  </div>
                </Panel>
                <Panel title="Environment readiness">
                  <div className="section-caption">
                    Independent quality-gate status by environment
                  </div>
                  <div className="life">
                    {life.map((x) => (
                      <div key={x.environment}>
                        <div className="env-name">
                          <span
                            className={`env-dot ${String(x.status).toLowerCase()}`}
                          />
                          <b>{x.environment}</b>
                        </div>
                        <Badge s={x.status} />
                        <span>
                          {x.pass_count} pass / {x.fail_count} fail
                        </span>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
              <div className="grid3 dashboard-bottom">
                <div className="insight-card">
                  <ServerCog />
                  <div>
                    <span>Source estate</span>
                    <b>
                      {sources.length} connection profile
                      {sources.length === 1 ? "" : "s"}
                    </b>
                    <small>{inventory.length} inventory objects captured</small>
                  </div>
                  <ArrowUpRight size={17} />
                </div>
                <div className="insight-card">
                  <FileCheck2 />
                  <div>
                    <span>Generated estate</span>
                    <b>{artifacts.length} versioned artifacts</b>
                    <small>{reviews.length} review records</small>
                  </div>
                  <ArrowUpRight size={17} />
                </div>
                <div className="insight-card">
                  <Gauge />
                  <div>
                    <span>Quality posture</span>
                    <b>
                      {issues.length
                        ? `${issues.length} open issue${issues.length === 1 ? "" : "s"}`
                        : "No recorded issues"}
                    </b>
                    <small>{dash.blocked_objects || 0} blocking objects</small>
                  </div>
                  <ArrowUpRight size={17} />
                </div>
              </div>
            </>
          )}
          {page === "Runbook" && (
            <>
              <Panel title="User runbook · end-to-end operating model">
                <div className="runbook-grid">
                  <div className="runbook-role">
                    <UserCog size={18} />
                    <b>1. Administrator</b>
                    <span>
                      Configure .env, create admin, start backend/frontend, and
                      verify SQL Server plus Databricks connectivity.
                    </span>
                  </div>
                  <div className="runbook-arrow">→</div>
                  <div className="runbook-role">
                    <Database size={18} />
                    <b>2. Migration Engineer</b>
                    <span>
                      Create project/source, run Discovery, then inspect
                      Inventory and Dependencies.
                    </span>
                  </div>
                  <div className="runbook-arrow">→</div>
                  <div className="runbook-role">
                    <Route size={18} />
                    <b>3. Architect / Data Engineer</b>
                    <span>
                      Run Assessment, Layer Classification, Mappings, Conversion
                      Plans, and executable artifact generation.
                    </span>
                  </div>
                  <div className="runbook-arrow">→</div>
                  <div className="runbook-role">
                    <ClipboardCheck size={18} />
                    <b>4. Reviewer / Approver</b>
                    <span>
                      Static validate the latest version and approve only the
                      version intended for deployment.
                    </span>
                  </div>
                  <div className="runbook-arrow">→</div>
                  <div className="runbook-role">
                    <ServerCog size={18} />
                    <b>5. DEV Operator</b>
                    <span>
                      Test Databricks → DEV Precheck → Deploy Approved to DEV →
                      Resume Failed Run when required.
                    </span>
                  </div>
                  <div className="runbook-arrow">→</div>
                  <div className="runbook-role">
                    <Gauge size={18} />
                    <b>6. Validator</b>
                    <span>
                      Run Reconciliation and Data Quality checks. Resolve
                      blocking issues with evidence.
                    </span>
                  </div>
                  <div className="runbook-arrow">→</div>
                  <div className="runbook-role">
                    <ShieldCheck size={18} />
                    <b>7. Release Approver</b>
                    <span>
                      Evaluate DEV Gate, confirm Lifecycle evidence, then
                      independently promote to TEST/UAT/PROD.
                    </span>
                  </div>
                </div>
              </Panel>
              <Panel title="Quick-start block diagram">
                <pre className="runbook-block">{`[VS Code]
    │
    ├─ Terminal 1 → backend/.venv → Uvicorn :8010
    └─ Terminal 2 → frontend → npm run dev :5173/5174
                  │
                  ▼
[Login / Select Project]
                  │
                  ▼
[SQL Server Source] → [Test Connection] → [Discovery]
                  │                         │
                  │                         ▼
                  └──────────────────→ [Inventory + Dependencies]
                                            │
                                            ▼
[Assessment] → [Layer Classification] → [Mappings]
                                            │
                                            ▼
[Conversion Plans] → [Artifacts] → [Static Validation]
                                            │
                                            ▼
                                  [Review / Approval]
                                            │
                                            ▼
[Test Databricks] → [DEV Precheck] → [Deploy Approved]
                                            │
                                  ┌─────────┴─────────┐
                                  ▼                   ▼
                           [Execution Logs]      [Resume Failed]
                                  │
                                  ▼
                         [Reconciliation / DQ]
                                  │
                                  ▼
                          [Evaluate DEV Gate]
                                  │
                                  ▼
                    [Lifecycle → TEST → UAT → PROD]`}</pre>
              </Panel>
            </>
          )}
          {page === "Projects" && (
            <Panel
              title="Migration projects"
              actions={
                <button
                  onClick={() => {
                    const name = prompt("Project name");
                    if (name)
                      action(() =>
                        api("/projects", {
                          method: "POST",
                          body: JSON.stringify({ name }),
                        }),
                      );
                  }}
                >
                  <Plus size={15} />
                  New project
                </button>
              }
            >
              {projects.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Status</th>
                      <th>ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr
                        key={p.id}
                        className={p.id === pid ? "selected-row" : ""}
                        onClick={() => setPid(p.id)}
                      >
                        <td>{p.name}</td>
                        <td>
                          <Badge s={p.status} />
                        </td>
                        <td>{p.id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <Empty text="No migration project exists yet. Click New project." />
              )}
            </Panel>
          )}
          {page === "Sources" && (
            <Panel
              title={`Sources${current ? " · " + current.name : ""}`}
              actions={
                <button
                  disabled={!pid}
                  onClick={() => {
                    const profile = prompt("Profile name", "SQLServer1");
                    const server =
                      profile && prompt("SQL Server / instance", "localhost");
                    const db = server && prompt("Database name");
                    if (profile && server && db)
                      action(() =>
                        api(`/projects/${pid}/sources`, {
                          method: "POST",
                          body: JSON.stringify({
                            profile_name: profile,
                            server_name: server,
                            database_name: db,
                          }),
                        }),
                      );
                  }}
                >
                  <Plus size={15} />
                  Add source
                </button>
              }
            >
              {sources.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>Profile</th>
                      <th>Server</th>
                      <th>Database</th>
                      <th>Connection</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sources.map((s) => (
                      <tr key={s.id}>
                        <td>{s.profile_name}</td>
                        <td>{s.server_name}</td>
                        <td>{s.database_name}</td>
                        <td>
                          <button
                            onClick={() =>
                              action(async () => {
                                const r: any = await api(
                                  `/projects/${pid}/sources/${s.id}/test`,
                                  { method: "POST" },
                                );
                                setDiscoveryResult(r);
                                return r;
                              })
                            }
                          >
                            <PlugZap size={14} />
                            Test
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <Empty text="Add a SQL Server source connection profile to this project." />
              )}
              {discoveryResult && (
                <pre>{JSON.stringify(discoveryResult, null, 2)}</pre>
              )}
            </Panel>
          )}
          {page === "Discovery" && (
            <Panel title="SQL Server discovery">
              {sources.length ? (
                <div className="action-list">
                  {sources.map((s) => (
                    <div className="action-card" key={s.id}>
                      <div>
                        <b>{s.profile_name}</b>
                        <span>
                          {s.server_name} / {s.database_name}
                        </span>
                      </div>
                      <div>
                        <button
                          disabled={busy}
                          onClick={() =>
                            action(async () => {
                              const r: any = await api(
                                `/projects/${pid}/sources/${s.id}/test`,
                                { method: "POST" },
                              );
                              setDiscoveryResult(r);
                              return r;
                            })
                          }
                        >
                          <PlugZap size={15} />
                          Test connection
                        </button>
                        <button
                          disabled={busy}
                          onClick={() =>
                            action(async () => {
                              const r: any = await api(
                                `/projects/${pid}/discovery/live/${s.id}`,
                                { method: "POST" },
                              );
                              setDiscoveryResult(r);
                              return r;
                            })
                          }
                        >
                          <Play size={15} />
                          Run discovery
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty text="Create a source first. SQL authentication values come from the root .env; if username is blank, Windows Trusted Connection is used." />
              )}
              {discoveryResult && (
                <div className="subsection">
                  <h4>Last result</h4>
                  <pre>{JSON.stringify(discoveryResult, null, 2)}</pre>
                </div>
              )}
            </Panel>
          )}
          {page === "Inventory" && (
            <Panel
              title={`Inventory · ${inventory.length} objects`}
              actions={
                <div className="search">
                  <Search size={15} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search schema/object/type"
                  />
                </div>
              }
            >
              {filtered.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>Database</th>
                      <th>Schema</th>
                      <th>Object</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((x) => (
                      <tr key={x.id}>
                        <td>{x.database}</td>
                        <td>{x.schema}</td>
                        <td>{x.name}</td>
                        <td>
                          <Badge s={x.type} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <Empty text="No discovered objects. Run Discovery first." />
              )}
            </Panel>
          )}
          {page === "Dependencies" && (
            <Panel title="Dependencies">
              {deps.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>Object</th>
                      <th>Referenced object</th>
                      <th>Column</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deps.map((d) => (
                      <tr key={d.id}>
                        <td>{d.object_name}</td>
                        <td>
                          {[
                            d.referenced_database,
                            d.referenced_schema,
                            d.referenced_object,
                          ]
                            .filter(Boolean)
                            .join(".")}
                        </td>
                        <td>{d.referenced_column || "-"}</td>
                        <td>{d.dependency_type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <Empty text="No dependency records captured yet." />
              )}
            </Panel>
          )}
          {page === "Assessment" && (
            <Panel
              title="Deterministic assessment"
              actions={
                <button
                  disabled={!pid || busy}
                  onClick={() =>
                    action(() =>
                      api(`/projects/${pid}/assessment/run`, {
                        method: "POST",
                      }),
                    )
                  }
                >
                  <Play size={15} />
                  Run assessment
                </button>
              }
            >
              <RecordTable rows={records} />
            </Panel>
          )}
          {page === "Layer Classification" && (
            <Panel
              title="Metadata-driven layer classification"
              actions={
                <button
                  disabled={!pid || busy}
                  onClick={() =>
                    action(() =>
                      api(`/projects/${pid}/classification`, {
                        method: "POST",
                      }),
                    )
                  }
                >
                  <Play size={15} />
                  Classify objects
                </button>
              }
            >
              {classes.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>Object</th>
                      <th>Type</th>
                      <th>Recommended</th>
                      <th>Selected</th>
                      <th>Confidence</th>
                      <th>Override</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((x) => (
                      <tr key={x.object_id}>
                        <td>{x.name}</td>
                        <td>{x.type}</td>
                        <td>
                          <Badge s={x.recommended_layer} />
                        </td>
                        <td>
                          <Badge s={x.selected_layer} />
                        </td>
                        <td>{Math.round(x.confidence * 100)}%</td>
                        <td>
                          <button
                            onClick={() => {
                              const layer = prompt(
                                "Layer: BRONZE, SILVER or GOLD",
                                x.selected_layer,
                              );
                              const reason = layer && prompt("Override reason");
                              if (layer && reason)
                                action(() =>
                                  api(
                                    `/projects/${pid}/classification/${x.object_id}`,
                                    {
                                      method: "PUT",
                                      body: JSON.stringify({
                                        selected_layer: layer,
                                        user: "admin",
                                        reason,
                                      }),
                                    },
                                  ),
                                );
                            }}
                          >
                            Override
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <Empty text="Run classification after discovery." />
              )}
            </Panel>
          )}
          {page === "Medallion Design" && (
            <>
              <Panel
                title="Semantic Medallion Factory"
                actions={
                  <div className="deploy-actions">
                    <button disabled={!pid || busy} onClick={analyzeConsumers}>
                      <GitBranch size={15} />
                      Analyze consumers
                    </button>
                    <button
                      disabled={!pid || busy}
                      onClick={inferBusinessSemantics}
                    >
                      <Sparkles size={15} />
                      Infer fact/dimension
                    </button>
                    <button disabled={!pid || busy} onClick={buildMedallion}>
                      <Route size={15} />
                      Build multi-stage plan
                    </button>
                    <button disabled={!pid || busy} onClick={generateMedallion}>
                      <FileCode2 size={15} />
                      Generate stage artifacts
                    </button>
                    <button
                      className="primary-action"
                      disabled={!pid || busy}
                      onClick={deployMedallion}
                    >
                      <Play size={15} />
                      Deploy Medallion DEV
                    </button>
                  </div>
                }
              >
                <div className="medallion-summary">
                  <div>
                    <span>SOURCE</span>
                    <b>{medallion?.counts?.SOURCE || 0}</b>
                  </div>
                  <ChevronRight />
                  <div>
                    <span>BRONZE</span>
                    <b>{medallion?.counts?.BRONZE || 0}</b>
                  </div>
                  <ChevronRight />
                  <div>
                    <span>SILVER</span>
                    <b>{medallion?.counts?.SILVER || 0}</b>
                  </div>
                  <ChevronRight />
                  <div>
                    <span>GOLD</span>
                    <b>{medallion?.counts?.GOLD || 0}</b>
                  </div>
                </div>
                <div className="notice">
                  Every source table receives explicit Source → Bronze → Silver
                  lineage. Gold nodes are created only from approved business
                  semantics; inferred semantics never fabricate KPIs
                  automatically.
                </div>
              </Panel>
              <Panel title="Multi-stage lineage plan">
                {medallion?.nodes?.length ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Layer</th>
                        <th>Target / Source</th>
                        <th>Node type</th>
                        <th>Role</th>
                        <th>Strategy</th>
                        <th>Status</th>
                        <th>Review</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medallion.nodes.map((n: any) => (
                        <tr key={n.id}>
                          <td>
                            <Badge s={n.layer} />
                          </td>
                          <td>
                            <code>{n.target_fqn}</code>
                          </td>
                          <td>{n.node_type}</td>
                          <td>{n.model_role}</td>
                          <td>{n.generation_strategy}</td>
                          <td>
                            <Badge s={n.status} />
                          </td>
                          <td>{n.review_required ? "Required" : "No"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <Empty text="Build the Medallion plan after discovery and mappings." />
                )}
              </Panel>
              {semanticRun && (
                <Panel title="Latest semantic inference run">
                  <div className="deployment-summary">
                    <div className="summary-stat">
                      <span>Engine</span>
                      <b>{semanticRun.engine || "DETERMINISTIC_V1"}</b>
                    </div>
                    <div className="summary-stat">
                      <span>Provider</span>
                      <b>{semanticRun.ai_provider || "-"}</b>
                    </div>
                    <div className="summary-stat">
                      <span>AI attempted</span>
                      <b>{semanticRun.ai_attempted ?? 0}</b>
                    </div>
                    <div className="summary-stat">
                      <span>Auto-corrected</span>
                      <b>{semanticRun.ai_corrected ?? 0}</b>
                    </div>
                    <div className="summary-stat">
                      <span>Correction calls</span>
                      <b>{semanticRun.ai_retry_attempts ?? 0}</b>
                    </div>
                    <div className="summary-stat">
                      <span>AI recommended</span>
                      <b>{semanticRun.ai_recommended ?? 0}</b>
                    </div>
                    <div className="summary-stat">
                      <span>Review required</span>
                      <b>{semanticRun.review_required ?? 0}</b>
                    </div>
                    <div className="summary-stat">
                      <span>AI errors</span>
                      <b>{semanticRun.ai_errors?.length || 0}</b>
                    </div>
                  </div>
                  {semanticRun.ai_attempted === 0 && (
                    <div className="notice">
                      No AI call was attempted. Verify that AI is enabled and
                      that at least one semantic row is REVIEW_REQUIRED.
                    </div>
                  )}
                  {semanticRun.ai_errors?.length > 0 && (
                    <details>
                      <summary>View sanitized AI errors</summary>
                      <pre>
                        {JSON.stringify(semanticRun.ai_errors, null, 2)}
                      </pre>
                    </details>
                  )}
                </Panel>
              )}
              <Panel
                title="Fact / dimension semantics"
                actions={
                  <button
                    disabled={!pid || busy}
                    onClick={inferBusinessSemantics}
                  >
                    <RefreshCw size={15} />
                    Re-infer
                  </button>
                }
              >
                {semantics.length ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Object</th>
                        <th>Inference source</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Confidence</th>
                        <th>Keys / Grain</th>
                        <th>Measures</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {semantics.map((x: any) => {
                        const ev = x.evidence || {};
                        const src = x.definition_source || "INFERRED";
                        const srcLabel =
                          src === "AI_ASSISTED_HYBRID_V2_2"
                            ? "AI Hybrid V2.2"
                            : src === "AI_ASSISTED_HYBRID_V2_1"
                              ? "AI Hybrid V2.1"
                              : src === "AI_ASSISTED_HYBRID_V2"
                                ? "AI Hybrid V2"
                                : src === "EXPLICIT"
                                  ? "Explicit"
                                  : src === "INFERRED"
                                    ? "Deterministic V1"
                                    : src;
                        const aiProvider =
                          ev.provider && ev.model
                            ? `${ev.provider} · ${ev.model}`
                            : null;
                        const canApprove =
                          x.status !== "APPROVED" &&
                          [
                            "FACT",
                            "DIMENSION",
                            "AGGREGATE",
                            "KPI",
                            "REPORTING",
                          ].includes(x.semantic_role);
                        const structurallyValid =
                          !(
                            x.semantic_role === "FACT" &&
                            (!x.grain?.length || !x.measures?.length)
                          ) &&
                          !(
                            x.semantic_role === "DIMENSION" &&
                            !x.business_keys?.length
                          ) &&
                          !(
                            ["AGGREGATE", "KPI"].includes(x.semantic_role) &&
                            !x.measures?.length
                          );
                        return (
                          <tr key={x.id}>
                            <td>{x.object_name || "-"}</td>
                            <td>
                              <small title={aiProvider || undefined}>
                                {srcLabel}
                              </small>
                            </td>
                            <td>
                              <Badge s={x.semantic_role} />
                            </td>
                            <td>
                              <Badge s={x.status} />
                            </td>
                            <td>{Math.round((x.confidence || 0) * 100)}%</td>
                            <td>
                              <small>
                                BK: {(x.business_keys || []).join(", ") || "-"}
                                <br />
                                Grain: {(x.grain || []).join(", ") || "-"}
                              </small>
                            </td>
                            <td>
                              {(x.measures || [])
                                .map((m: any) => m.name || m.source_column)
                                .join(", ") || "-"}
                            </td>
                            <td>
                              <div className="table-actions">
                                {canApprove && (
                                  <button
                                    title={
                                      !structurallyValid
                                        ? "Structural validation failed; define explicit semantics before approving"
                                        : undefined
                                    }
                                    disabled={!structurallyValid}
                                    onClick={() => approveSemantic(x.id)}
                                  >
                                    Approve
                                  </button>
                                )}
                                {x.object_id && (
                                  <button
                                    onClick={() => defineSemantic(x.object_id)}
                                  >
                                    Define explicit
                                  </button>
                                )}
                                {(ev.reasoning_summary ||
                                  evidenceList(ev.conflicts).length ||
                                  evidenceList(ev.missing_evidence).length ||
                                  repairList(ev.safe_repairs).length ||
                                  ev.correction_history?.length) && (
                                  <details>
                                    <summary>View evidence</summary>
                                    <div className="subsection">
                                      <b>Source:</b> {srcLabel}
                                      {aiProvider && (
                                        <span> · {aiProvider}</span>
                                      )}
                                      <br />
                                      {ev.reasoning_summary && (
                                        <>
                                          <b>Reasoning:</b>{" "}
                                          {ev.reasoning_summary}
                                          <br />
                                        </>
                                      )}
                                      {evidenceList(ev.conflicts).length ? (
                                        <>
                                          <b>Conflicts:</b>{" "}
                                          {evidenceList(ev.conflicts).join(
                                            "; ",
                                          )}
                                          <br />
                                        </>
                                      ) : null}
                                      {evidenceList(ev.missing_evidence)
                                        .length ? (
                                        <>
                                          <b>Missing evidence:</b>{" "}
                                          {evidenceList(
                                            ev.missing_evidence,
                                          ).join("; ")}
                                          <br />
                                        </>
                                      ) : null}
                                      {repairList(ev.safe_repairs).length ? (
                                        <>
                                          <b>Automatic repairs:</b>{" "}
                                          {repairList(ev.safe_repairs).join(
                                            "; ",
                                          )}
                                          <br />
                                        </>
                                      ) : null}
                                    </div>
                                  </details>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <Empty text="Run Fact/Dimension inference. Explicit semantics can then be approved or overridden." />
                )}
              </Panel>
              <Panel
                title="Downstream consumer analysis"
                actions={
                  <button
                    disabled={!pid || busy}
                    onClick={registerExternalConsumer}
                  >
                    <Plus size={15} />
                    Register external consumer
                  </button>
                }
              >
                {consumers.length ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Producer</th>
                        <th>Consumer</th>
                        <th>Type</th>
                        <th>Usage</th>
                        <th>Depth</th>
                        <th>Evidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consumers.slice(0, 250).map((x: any) => (
                        <tr key={x.id}>
                          <td>
                            <code>{x.producer_object_id}</code>
                          </td>
                          <td>{x.consumer_name}</td>
                          <td>{x.consumer_type}</td>
                          <td>{x.usage_type}</td>
                          <td>{x.dependency_depth}</td>
                          <td>{x.evidence_type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <Empty text="Analyze consumers to build direct and transitive downstream usage evidence." />
                )}
              </Panel>
              <Panel title="Generated Medallion artifacts">
                {medArts.length ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Layer</th>
                        <th>Target</th>
                        <th>Role</th>
                        <th>Validation</th>
                        <th>Review</th>
                        <th>Version</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medArts.map((x: any) => (
                        <tr key={x.artifact_version_id}>
                          <td>
                            <Badge s={x.layer} />
                          </td>
                          <td>
                            <code>{x.target_fqn}</code>
                          </td>
                          <td>{x.model_role}</td>
                          <td>
                            <Badge s={x.validation_status} />
                          </td>
                          <td>
                            <Badge s={x.review_status} />
                          </td>
                          <td>v{x.version}</td>
                          <td>
                            <div className="table-actions">
                              {x.review_status !== "APPROVED" &&
                                x.executable &&
                                x.validation_status === "PASSED" && (
                                  <button
                                    onClick={() =>
                                      reviewMedArtifact(x.artifact_version_id)
                                    }
                                  >
                                    Approve
                                  </button>
                                )}
                              <details>
                                <summary>SQL</summary>
                                <pre>{x.content}</pre>
                              </details>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <Empty text="Generate stage artifacts after the plan is built. All artifacts require review before DEV deployment." />
                )}
              </Panel>
              {medDeployment && (
                <Panel
                  title={`Medallion deployment logs · ${medDeployment.run_id || "latest run"}`}
                  actions={
                    <div className="deploy-actions">
                      <select
                        value={medLogFilter}
                        onChange={(e) => setMedLogFilter(e.target.value)}
                      >
                        <option value="ALL">All statuses</option>
                        <option value="PASSED">Passed</option>
                        <option value="FAILED">Failed</option>
                      </select>
                      <button
                        disabled={!medLogs.length}
                        onClick={copyMedallionLogs}
                      >
                        <ScrollText size={14} />
                        Copy Logs
                      </button>
                      <button
                        disabled={!medLogs.length || busy}
                        onClick={downloadMedallionLogs}
                      >
                        <Download size={14} />
                        Download CSV
                      </button>
                    </div>
                  }
                >
                  <div className="deployment-summary">
                    <div className="summary-stat">
                      <span>Status</span>
                      <Badge s={medDeployment.status || "UNKNOWN"} />
                    </div>
                    <div className="summary-stat">
                      <span>Run ID</span>
                      <b>{medDeployment.run_id || "-"}</b>
                    </div>
                    <div className="summary-stat">
                      <span>Deployed</span>
                      <b>
                        {medLogs.filter((x) => x.status === "PASSED").length}
                      </b>
                    </div>
                    <div className="summary-stat">
                      <span>Failed</span>
                      <b>
                        {medLogs.filter((x) => x.status === "FAILED").length}
                      </b>
                    </div>
                  </div>
                  {medLogs.length ? (
                    <table>
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Layer</th>
                          <th>Target</th>
                          <th>Version ID</th>
                          <th>Status</th>
                          <th>Rows / action</th>
                          <th>Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {medLogs
                          .filter(
                            (x) =>
                              medLogFilter === "ALL" ||
                              x.status === medLogFilter,
                          )
                          .map((x: any, i: number) => {
                            const d = x.details || {};
                            return (
                              <tr key={`${x.run_id}-${i}`}>
                                <td>
                                  {x.timestamp
                                    ? new Date(x.timestamp).toLocaleString()
                                    : "-"}
                                </td>
                                <td>
                                  <Badge s={d.layer || "-"} />
                                </td>
                                <td>
                                  <code>{x.target_fqn || "-"}</code>
                                </td>
                                <td>
                                  <code>{d.artifact_version_id || "-"}</code>
                                </td>
                                <td>
                                  <Badge s={x.status || "-"} />
                                </td>
                                <td>{d.load?.rows ?? d.action ?? "-"}</td>
                                <td>{d.error || x.message || "-"}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  ) : (
                    <Empty text="No object-level evidence was recorded for this deployment run." />
                  )}
                </Panel>
              )}
            </>
          )}

          {page === "Mappings" && (
            <Panel
              title="Target mappings"
              actions={
                <button
                  disabled={!pid || !classes.length}
                  onClick={() => {
                    const catalog = prompt(
                      "DEV target catalog",
                      "migration_dev",
                    );
                    if (catalog)
                      action(() =>
                        api(`/projects/${pid}/mappings`, {
                          method: "POST",
                          body: JSON.stringify({ environment: "DEV", catalog }),
                        }),
                      );
                  }}
                >
                  <Play size={15} />
                  Generate DEV mappings
                </button>
              }
            >
              {mappings.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>Object</th>
                      <th>Source</th>
                      <th>Target</th>
                      <th>Layer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map((m) => (
                      <tr key={m.id}>
                        <td>{m.name}</td>
                        <td>{m.source_fqn}</td>
                        <td>{m.target_fqn}</td>
                        <td>
                          <Badge s={m.target_layer} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <Empty text="Run classification, then generate mappings." />
              )}
            </Panel>
          )}
          {page === "Compatibility" && (
            <>
              <Panel
                title="Dynamic runtime compatibility framework"
                actions={
                  <button
                    disabled={!pid || busy}
                    onClick={() =>
                      action(async () => {
                        const r: any = await api(
                          `/projects/${pid}/compatibility/summary`,
                        );
                        setCompat(r);
                        return r;
                      })
                    }
                  >
                    <RefreshCw size={15} />
                    Analyze compatibility
                  </button>
                }
              >
                <div className="ai-guardrail">
                  <ShieldCheck size={22} />
                  <div>
                    <b>Metadata-driven adapters before AI</b>
                    <span>
                      Every discovered column is assigned a reusable source
                      projection, canonical transport strategy, target bind
                      expression and validation policy. Unknown or ambiguous
                      types are preserved safely and flagged for review instead
                      of being guessed.
                    </span>
                  </div>
                </div>
                {compat ? (
                  <>
                    <div className="deployment-summary">
                      <div className="summary-stat">
                        <span>Framework</span>
                        <b>{compat.framework_version || "2.2.0"}</b>
                      </div>
                      <div className="summary-stat">
                        <span>Total columns</span>
                        <b>{compat.total_columns || 0}</b>
                      </div>
                      <div className="summary-stat">
                        <span>Deterministic</span>
                        <b>{compat.deterministic_columns || 0}</b>
                      </div>
                      <div className="summary-stat">
                        <span>Coverage</span>
                        <b>{compat.deterministic_coverage_pct ?? 100}%</b>
                      </div>
                      <div className="summary-stat">
                        <span>Review required</span>
                        <b>{compat.review_required_count || 0}</b>
                      </div>
                      <div className="summary-stat">
                        <span>Unknown types</span>
                        <b>{compat.unknown_type_count || 0}</b>
                      </div>
                    </div>
                    <div className="subsection">
                      <h4>Adapter families</h4>
                      <pre>
                        {JSON.stringify(
                          {
                            families: compat.family_counts,
                            strategies: compat.strategy_counts,
                            policy: compat.policy,
                          },
                          null,
                          2,
                        )}
                      </pre>
                    </div>
                    {compat.objects?.length ? (
                      <table>
                        <thead>
                          <tr>
                            <th>Object</th>
                            <th>Columns</th>
                            <th>Deterministic coverage</th>
                            <th>Binary-safe</th>
                            <th>Review required</th>
                            <th>Unknown</th>
                          </tr>
                        </thead>
                        <tbody>
                          {compat.objects.map((x: any) => (
                            <tr key={x.object_id}>
                              <td>{x.name}</td>
                              <td>{x.summary?.total_columns || 0}</td>
                              <td>
                                {x.summary?.deterministic_coverage_pct ?? 100}%
                              </td>
                              <td>
                                {(x.summary?.binary_safe_columns || []).join(
                                  ", ",
                                ) || "-"}
                              </td>
                              <td>
                                {(
                                  x.summary?.review_required_columns || []
                                ).join(", ") || "-"}
                              </td>
                              <td>
                                {(x.summary?.unknown_type_columns || []).join(
                                  ", ",
                                ) || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <Empty text="Run Discovery first. Compatibility analysis is generated from discovered column metadata." />
                    )}
                  </>
                ) : (
                  <Empty text="Select a project and analyze its discovered runtime compatibility contracts." />
                )}
              </Panel>
            </>
          )}
          {page === "Conversion Plans" && (
            <Panel
              title="Conversion plans"
              actions={
                <button
                  disabled={!pid || busy}
                  onClick={() =>
                    action(() =>
                      api(`/projects/${pid}/conversion-plans/generate`, {
                        method: "POST",
                      }),
                    )
                  }
                >
                  <Play size={15} />
                  Generate plans
                </button>
              }
            >
              <RecordTable rows={records} />
            </Panel>
          )}
          {page === "Artifacts" && (
            <>
              <Panel
                title="Generated artifacts"
                actions={
                  <button
                    disabled={!pid || !mappings.length}
                    onClick={async () => {
                      setBusy(true);
                      setMsg("");
                      let ok = 0,
                        fail = 0;
                      for (const m of Array.from(
                        new Map(mappings.map((x) => [x.object_id, x])).values(),
                      )) {
                        try {
                          await api(`/projects/${pid}/artifacts`, {
                            method: "POST",
                            body: JSON.stringify({
                              object_id: m.object_id,
                              environment: "DEV",
                            }),
                          });
                          ok++;
                        } catch {
                          fail++;
                        }
                      }
                      setBusy(false);
                      setMsg(`Generated ${ok}; failed ${fail}`);
                      await refresh();
                    }}
                  >
                    <Play size={15} />
                    Generate all DEV artifacts
                  </button>
                }
              >
                {artifacts.length ? (
                  <div className="artifact-list">
                    {artifacts.map((a) => (
                      <details key={a.artifact_id}>
                        <summary>
                          <b>
                            {a.schema ? `${a.schema}.` : ""}
                            {a.name}
                          </b>{" "}
                          · {a.type} · v{a.current_version} ·{" "}
                          <Badge
                            s={
                              a.executable
                                ? "EXECUTABLE"
                                : "REMEDIATION_REQUIRED"
                            }
                          />
                        </summary>
                        <pre>{a.content}</pre>
                        <div className="artifact-actions">
                          <button
                            disabled={!pid || busy}
                            onClick={() =>
                              action(() =>
                                api(`/projects/${pid}/artifacts`, {
                                  method: "POST",
                                  body: JSON.stringify({
                                    object_id: a.object_id,
                                    environment: "DEV",
                                  }),
                                }),
                              )
                            }
                          >
                            <RefreshCw size={14} />
                            Regenerate this artifact
                          </button>
                          <button
                            onClick={() =>
                              action(() =>
                                api(
                                  `/projects/${pid}/validate/${a.object_id}?environment=DEV`,
                                  { method: "POST" },
                                ),
                              )
                            }
                          >
                            Static validate
                          </button>
                          {!a.executable && (
                            <button
                              className="primary-action"
                              onClick={() => analyzeWithAi(a)}
                            >
                              <Sparkles size={14} />
                              AI-assisted remediation
                            </button>
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                ) : (
                  <Empty text="Generate mappings first, then generate artifacts." />
                )}
              </Panel>
              {aiCandidate && aiObject && (
                <Panel
                  title={`AI-assisted remediation · ${aiObject.schema ? aiObject.schema + "." : ""}${aiObject.name}`}
                  actions={
                    <>
                      <button
                        onClick={() => {
                          setAiCandidate(null);
                          setAiObject(null);
                        }}
                      >
                        Reject candidate
                      </button>
                      <button
                        className="primary-action"
                        disabled={!aiCandidate?.deterministic_validation?.valid}
                        onClick={acceptAiCandidate}
                      >
                        <CheckCircle2 size={14} />
                        Accept as new version
                      </button>
                    </>
                  }
                >
                  <div className="ai-remediation-grid">
                    <div>
                      <b>Strategy</b>
                      <p>{aiCandidate.conversion_strategy}</p>
                    </div>
                    <div>
                      <b>Confidence</b>
                      <p>{Math.round((aiCandidate.confidence || 0) * 100)}%</p>
                    </div>
                    <div>
                      <b>Provider</b>
                      <p>
                        {aiCandidate.provider}
                        {aiCandidate.model ? ` · ${aiCandidate.model}` : ""}
                      </p>
                    </div>
                    <div>
                      <b>Validation</b>
                      <p>
                        <Badge
                          s={
                            aiCandidate.deterministic_validation?.valid
                              ? "PASSED"
                              : "FAILED"
                          }
                        />
                      </p>
                    </div>
                  </div>
                  <div className="subsection">
                    <h4>Proposed executable candidate</h4>
                    <pre>{aiCandidate.generated_candidate}</pre>
                  </div>
                  <div className="ai-columns">
                    <div>
                      <h4>Assumptions</h4>
                      <ul>
                        {(aiCandidate.assumptions || []).map(
                          (x: string, i: number) => (
                            <li key={i}>{x}</li>
                          ),
                        )}
                      </ul>
                    </div>
                    <div>
                      <h4>Risks</h4>
                      <ul>
                        {(aiCandidate.risks || []).map(
                          (x: string, i: number) => (
                            <li key={i}>{x}</li>
                          ),
                        )}
                      </ul>
                    </div>
                    <div>
                      <h4>Validation plan</h4>
                      <ul>
                        {(aiCandidate.validation_plan || []).map(
                          (x: string, i: number) => (
                            <li key={i}>{x}</li>
                          ),
                        )}
                      </ul>
                    </div>
                  </div>
                  <div className="notice">
                    AI output is a candidate only. Accepting it creates a new
                    artifact version that still requires human review/approval
                    before DEV deployment.
                  </div>
                </Panel>
              )}
            </>
          )}
          {page === "AI Remediation" && (
            <>
              <Panel
                title="Local AI provider · Ollama first"
                actions={
                  <div className="deploy-actions">
                    <button disabled={busy} onClick={testAiProvider}>
                      <PlugZap size={15} />
                      Test Ollama
                    </button>
                    <button disabled={busy} onClick={refreshAiModels}>
                      <RefreshCw size={15} />
                      Refresh models
                    </button>
                  </div>
                }
              >
                <div className="ai-guardrail">
                  <ServerCog size={22} />
                  <div>
                    <b>Local-first AI with governed execution</b>
                    <span>
                      Ollama runs on your machine and requires no API key. SQL
                      and metadata stay local to the configured provider.
                      Deterministic conversion runs first; AI only proposes
                      candidates when semantic remediation is needed.
                    </span>
                  </div>
                </div>
                <div className="deployment-summary">
                  <div className="summary-stat">
                    <span>Provider</span>
                    <b>
                      {aiProvider?.provider ||
                        aiPlan?.provider?.provider ||
                        "-"}
                    </b>
                  </div>
                  <div className="summary-stat">
                    <span>Endpoint</span>
                    <b>
                      {aiProvider?.base_url ||
                        aiPlan?.provider?.base_url ||
                        "-"}
                    </b>
                  </div>
                  <div className="summary-stat">
                    <span>Model</span>
                    <b>{aiProvider?.model || aiPlan?.provider?.model || "-"}</b>
                  </div>
                  <div className="summary-stat">
                    <span>Configured</span>
                    <Badge
                      s={
                        (aiProvider?.configured ?? aiPlan?.provider?.configured)
                          ? "YES"
                          : "NO"
                      }
                    />
                  </div>
                  <div className="summary-stat">
                    <span>Reachable</span>
                    <Badge
                      s={
                        aiProvider?.reachable === true
                          ? "READY"
                          : aiProvider?.reachable === false
                            ? "UNAVAILABLE"
                            : "NOT_TESTED"
                      }
                    />
                  </div>
                  <div className="summary-stat">
                    <span>Model installed</span>
                    <Badge
                      s={
                        aiProvider?.model_available === true
                          ? "YES"
                          : aiProvider?.model_available === false
                            ? "NO"
                            : "NOT_TESTED"
                      }
                    />
                  </div>
                </div>
                {aiProvider?.version && (
                  <div className="notice ok">
                    Ollama version {aiProvider.version} responded in{" "}
                    {aiProvider.latency_ms} ms.
                  </div>
                )}
                {aiProvider?.error && (
                  <div className="notice">{aiProvider.error}</div>
                )}
                {aiModels.length > 0 && (
                  <div className="subsection">
                    <h4>Installed local models</h4>
                    <div className="chip-row">
                      {aiModels.map((m) => (
                        <span className="chip" key={m}>
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="subsection">
                  <h4>Windows quick setup</h4>
                  <pre>{`scripts\\setup_ollama_windows.bat qwen2.5-coder:3b\n\n# Or configure an already-installed model without pulling:\npython scripts\\configure_ollama.py --model qwen2.5-coder:3b`}</pre>
                  <small>
                    Restart the backend after changing .env. The application
                    never stores an Ollama API key because local Ollama does not
                    require one.
                  </small>
                </div>
              </Panel>
              <Panel
                title="Governed AI remediation center"
                actions={
                  <div className="deploy-actions">
                    <button disabled={!pid || busy} onClick={scanAiRemediation}>
                      <Search size={15} />
                      Scan review blockers
                    </button>
                    <button
                      className="primary-action"
                      disabled={!pid || busy || !aiPlan?.eligible}
                      onClick={runAiRemediation}
                    >
                      <Sparkles size={15} />
                      Run safe repair loop
                    </button>
                  </div>
                }
              >
                <div className="ai-guardrail">
                  <ShieldCheck size={22} />
                  <div>
                    <b>
                      AI accelerates remediation; deterministic controls decide
                      eligibility.
                    </b>
                    <span>
                      Every safe fix becomes a new, statically validated DEV
                      artifact version. AI cannot approve, deploy, bypass
                      reconciliation, invent business rules, or modify PROD.
                    </span>
                  </div>
                </div>
                {aiPlan ? (
                  <>
                    <div className="deployment-summary">
                      <div className="summary-stat">
                        <span>Repair candidates</span>
                        <b>{aiPlan.total || 0}</b>
                      </div>
                      <div className="summary-stat">
                        <span>Eligible</span>
                        <b>{aiPlan.eligible || 0}</b>
                      </div>
                      <div className="summary-stat">
                        <span>Architecture review</span>
                        <b>{aiPlan.manual_architecture_review || 0}</b>
                      </div>
                      <div className="summary-stat">
                        <span>Provider</span>
                        <b>{aiPlan.provider?.provider || "-"}</b>
                      </div>
                      <div className="summary-stat">
                        <span>AI fallback</span>
                        <Badge
                          s={
                            aiPlan.provider?.enabled &&
                            aiPlan.provider?.configured
                              ? "READY"
                              : "DISABLED"
                          }
                        />
                      </div>
                      <div className="summary-stat">
                        <span>Repair attempts</span>
                        <b>{aiPlan.provider?.max_attempts || "-"}</b>
                      </div>
                    </div>
                    {!aiPlan.provider?.enabled && (
                      <div className="notice">
                        AI fallback is disabled. Deterministic remediation
                        remains active. Run scripts\setup_ollama_windows.bat,
                        restart the backend, then Test Ollama to enable local
                        semantic remediation.
                      </div>
                    )}
                    {aiPlan.provider?.enabled &&
                      !aiPlan.provider?.configured && (
                        <div className="notice">
                          AI is enabled but the provider configuration is
                          incomplete. Set LLM_PROVIDER=OLLAMA and LLM_MODEL to
                          an installed local model.
                        </div>
                      )}
                    {aiPlan.items?.length ? (
                      <table>
                        <thead>
                          <tr>
                            <th>Object</th>
                            <th>Type</th>
                            <th>Current version</th>
                            <th>Detected reason</th>
                            <th>Route</th>
                            <th>Eligible</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aiPlan.items.map((x: any) => (
                            <tr key={x.object_id}>
                              <td>{x.object_name}</td>
                              <td>{x.object_type}</td>
                              <td>
                                {x.artifact_version
                                  ? `v${x.artifact_version}`
                                  : "-"}
                              </td>
                              <td>{(x.reasons || []).join(", ")}</td>
                              <td>{x.route}</td>
                              <td>
                                <Badge
                                  s={x.eligible ? "YES" : "ARCHITECT_REVIEW"}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <Empty text="No artifact, validation, issue, or review item currently needs remediation." />
                    )}
                  </>
                ) : (
                  <Empty text="Scan the current project to build a project-scoped remediation plan." />
                )}
              </Panel>
              {aiBatch && (
                <Panel title={`Repair run ${aiBatch.run_id}`}>
                  <div className="deployment-summary">
                    <div className="summary-stat">
                      <span>Status</span>
                      <Badge s={aiBatch.status} />
                    </div>
                    <div className="summary-stat">
                      <span>Planned</span>
                      <b>{aiBatch.planned}</b>
                    </div>
                    <div className="summary-stat">
                      <span>Ready for review</span>
                      <b>{aiBatch.ready_for_review}</b>
                    </div>
                    <div className="summary-stat">
                      <span>Candidate only</span>
                      <b>{aiBatch.candidate_only}</b>
                    </div>
                    <div className="summary-stat">
                      <span>Retry ready</span>
                      <b>{aiBatch.retry_ready || 0}</b>
                    </div>
                    <div className="summary-stat">
                      <span>Blocked</span>
                      <b>{aiBatch.blocked}</b>
                    </div>
                    <div className="summary-stat">
                      <span>Auto-deployed</span>
                      <b>No</b>
                    </div>
                  </div>
                  {aiBatch.results?.length ? (
                    <table>
                      <thead>
                        <tr>
                          <th>Object</th>
                          <th>Status</th>
                          <th>Provider</th>
                          <th>Confidence</th>
                          <th>New version</th>
                          <th>Evidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aiBatch.results.map((x: any) => (
                          <tr key={x.object_id}>
                            <td>{x.object_name}</td>
                            <td>
                              <Badge s={x.status} />
                            </td>
                            <td>{x.provider || "-"}</td>
                            <td>
                              {x.confidence == null
                                ? "-"
                                : `${Math.round(x.confidence * 100)}%`}
                            </td>
                            <td>
                              {x.artifact_version
                                ? `v${x.artifact_version}`
                                : "-"}
                            </td>
                            <td>
                              {x.error ||
                                x.evidence ||
                                x.static_validation?.status ||
                                "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <Empty text="No objects were processed." />
                  )}
                  <div className="notice ok">
                    Safe SQL candidates are ready in Reviews. Runtime
                    compatibility repairs are marked RETRY_READY and require
                    Resume Failed Run; they do not rewrite business SQL with AI.
                  </div>
                </Panel>
              )}
            </>
          )}
          {page === "Reviews" && (
            <Panel title="Artifact reviews">
              {artifacts.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>Artifact</th>
                      <th>Version</th>
                      <th>Executable</th>
                      <th>Validation</th>
                      <th>Review status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {artifacts.map((a) => {
                      const reviewStatus = a.review_status || "PENDING";
                      const blockReason = (a.approval_blockers || []).join(
                        "; ",
                      );
                      return (
                        <tr key={a.artifact_id}>
                          <td>
                            {a.schema ? `${a.schema}.` : ""}
                            {a.name}
                          </td>
                          <td>v{a.current_version}</td>
                          <td>
                            <Badge s={a.executable ? "YES" : "NO"} />
                          </td>
                          <td>
                            <Badge s={a.validation_status || "NOT_RUN"} />
                          </td>
                          <td>
                            <Badge s={reviewStatus} />
                          </td>
                          <td>
                            <div className="review-actions">
                              <button
                                disabled={!a.artifact_version_id || busy}
                                onClick={() =>
                                  action(() =>
                                    api(
                                      `/projects/${pid}/validate/${a.object_id}?environment=DEV`,
                                      { method: "POST" },
                                    ),
                                  )
                                }
                              >
                                <FileCheck2 size={14} />
                                Validate
                              </button>
                              <button
                                title={
                                  blockReason ||
                                  "Approve current validated executable version"
                                }
                                disabled={
                                  !a.artifact_version_id ||
                                  !a.approval_allowed ||
                                  reviewStatus === "APPROVED" ||
                                  busy
                                }
                                onClick={() =>
                                  action(() =>
                                    api(`/projects/${pid}/reviews`, {
                                      method: "POST",
                                      body: JSON.stringify({
                                        artifact_version_id:
                                          a.artifact_version_id,
                                        review_type: "ARCHITECT_REVIEW",
                                        status: "APPROVED",
                                        reviewer: "admin",
                                        comments:
                                          "Approved from UI after executable/static-validation checks",
                                      }),
                                    }),
                                  )
                                }
                              >
                                <CheckCircle2 size={14} />
                                Approve
                              </button>
                              <button
                                disabled={
                                  !a.artifact_version_id ||
                                  reviewStatus === "APPROVED" ||
                                  busy
                                }
                                onClick={() => {
                                  const reason = prompt(
                                    `Reject ${a.schema ? `${a.schema}.` : ""}${a.name} v${a.current_version} - reason`,
                                  );
                                  if (reason)
                                    action(() =>
                                      api(`/projects/${pid}/reviews`, {
                                        method: "POST",
                                        body: JSON.stringify({
                                          artifact_version_id:
                                            a.artifact_version_id,
                                          review_type: "ARCHITECT_REVIEW",
                                          status: "REJECTED",
                                          reviewer: "admin",
                                          comments: reason,
                                        }),
                                      }),
                                    );
                                }}
                              >
                                Reject
                              </button>
                              <button
                                disabled={!a.artifact_version_id || busy}
                                onClick={() => {
                                  const reason = prompt(
                                    `Request changes for ${a.schema ? `${a.schema}.` : ""}${a.name} v${a.current_version}`,
                                  );
                                  if (reason)
                                    action(() =>
                                      api(`/projects/${pid}/reviews`, {
                                        method: "POST",
                                        body: JSON.stringify({
                                          artifact_version_id:
                                            a.artifact_version_id,
                                          review_type: "ARCHITECT_REVIEW",
                                          status: "CHANGES_REQUESTED",
                                          reviewer: "admin",
                                          comments: reason,
                                        }),
                                      }),
                                    );
                                }}
                              >
                                Request Changes
                              </button>
                              {reviewStatus === "APPROVED" && (
                                <button
                                  className="danger-action"
                                  disabled={busy}
                                  onClick={() => {
                                    const reason = prompt(
                                      `Revoke approval for ${a.schema ? `${a.schema}.` : ""}${a.name} v${a.current_version} - mandatory reason`,
                                    );
                                    if (reason)
                                      action(() =>
                                        api(`/projects/${pid}/reviews`, {
                                          method: "POST",
                                          body: JSON.stringify({
                                            artifact_version_id:
                                              a.artifact_version_id,
                                            review_type: "ARCHITECT_REVIEW",
                                            status: "REVOKED",
                                            reviewer: "admin",
                                            comments: reason,
                                          }),
                                        }),
                                      );
                                  }}
                                >
                                  Revoke Approval
                                </button>
                              )}
                            </div>
                            {!a.approval_allowed && (
                              <small className="review-block-reason">
                                Approval blocked:{" "}
                                {blockReason ||
                                  "current version is not eligible"}
                              </small>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <Empty text="Generate artifacts before review." />
              )}
              {reviews.length > 0 && (
                <div className="subsection">
                  <h4>Review history</h4>
                  <table>
                    <thead>
                      <tr>
                        <th>Object</th>
                        <th>Version</th>
                        <th>Review</th>
                        <th>Status</th>
                        <th>Reviewer</th>
                        <th>Reason / comments</th>
                        <th>Date / time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviews.map((r) => (
                        <tr key={r.id}>
                          <td>
                            {r.schema ? `${r.schema}.` : ""}
                            {r.object_name || "-"}
                          </td>
                          <td>v{r.version || "-"}</td>
                          <td>{r.review_type}</td>
                          <td>
                            <Badge s={r.status} />
                          </td>
                          <td>{r.reviewer}</td>
                          <td>{r.comments || "-"}</td>
                          <td>
                            {r.reviewed_at
                              ? new Date(r.reviewed_at).toLocaleString()
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          )}
          {page === "Issues" && (
            <>
              <Panel title="Migration issues">
                <div className="section-caption">
                  Click an issue to inspect evidence, remediation and lifecycle
                  actions.
                </div>
                {issues.length ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Severity</th>
                        <th>Type</th>
                        <th>Object</th>
                        <th>Message</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issues.map((i) => (
                        <tr
                          key={i.id}
                          className="issue-row"
                          onClick={() => openIssue(i)}
                        >
                          <td>
                            <Badge s={i.severity} />
                          </td>
                          <td>{i.issue_type}</td>
                          <td>{i.object_name || i.failed_object || "-"}</td>
                          <td>{i.message}</td>
                          <td>
                            <Badge s={i.status} />
                          </td>
                          <td>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openIssue(i);
                              }}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <Empty text="No migration issues recorded." />
                )}
              </Panel>
              {selectedIssue && (
                <div
                  className="issue-modal-backdrop"
                  onClick={() => setSelectedIssue(null)}
                >
                  <div
                    className="issue-modal"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="issue-modal-head">
                      <div>
                        <span className="eyebrow">ISSUE DETAILS</span>
                        <h3>{selectedIssue.message}</h3>
                      </div>
                      <button onClick={() => setSelectedIssue(null)}>
                        Close
                      </button>
                    </div>
                    <div className="issue-detail-grid">
                      <div>
                        <span>Severity</span>
                        <Badge s={selectedIssue.severity} />
                      </div>
                      <div>
                        <span>Status</span>
                        <Badge s={selectedIssue.status} />
                      </div>
                      <div>
                        <span>Type</span>
                        <b>{selectedIssue.issue_type}</b>
                      </div>
                      <div>
                        <span>Object</span>
                        <b>
                          {selectedIssue.object_name ||
                            selectedIssue.failed_object ||
                            "-"}
                        </b>
                      </div>
                      <div>
                        <span>Run ID</span>
                        <code>{selectedIssue.run_id || "-"}</code>
                      </div>
                      <div>
                        <span>Issue ID</span>
                        <code>{selectedIssue.id}</code>
                      </div>
                    </div>
                    <div className="issue-section">
                      <h4>Recommended remediation</h4>
                      <p>
                        {selectedIssue.recommended_action ||
                          "Review the deployment evidence and remediate the failed object before continuing."}
                      </p>
                    </div>
                    <div className="issue-section">
                      <h4>Technical details</h4>
                      <pre>
                        {JSON.stringify(
                          selectedIssue.technical_details || {},
                          null,
                          2,
                        )}
                      </pre>
                    </div>
                    <div className="issue-modal-actions">
                      <button onClick={recheckIssue}>Re-check Evidence</button>
                      <button onClick={viewIssueLogs}>View Logs</button>
                      {selectedIssue.status === "OPEN" ? (
                        <>
                          <button onClick={() => issueAction("RESOLVE")}>
                            Resolve
                          </button>
                          <button onClick={() => issueAction("CLOSE")}>
                            Close Issue
                          </button>
                        </>
                      ) : (
                        <button onClick={() => issueAction("REOPEN")}>
                          Reopen
                        </button>
                      )}
                    </div>
                    {showIssueLogs && (
                      <div className="issue-section">
                        <h4>Linked deployment logs</h4>
                        {issueLogs.length ? (
                          <table>
                            <thead>
                              <tr>
                                <th>Time</th>
                                <th>Status</th>
                                <th>Run</th>
                                <th>Step</th>
                                <th>Target</th>
                                <th>Message</th>
                              </tr>
                            </thead>
                            <tbody>
                              {issueLogs.map((x: any, i: number) => (
                                <tr key={i}>
                                  <td>
                                    {x.timestamp
                                      ? new Date(x.timestamp).toLocaleString()
                                      : "-"}
                                  </td>
                                  <td>
                                    <Badge s={x.status || "-"} />
                                  </td>
                                  <td>
                                    <code>{x.run_id || "-"}</code>
                                  </td>
                                  <td>{x.step || "-"}</td>
                                  <td>{x.target_fqn || "-"}</td>
                                  <td>{x.message || "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <Empty text="No linked logs found for this issue yet." />
                        )}
                      </div>
                    )}
                    {selectedIssue.actions?.length > 0 && (
                      <div className="issue-section">
                        <h4>Issue history</h4>
                        <table>
                          <thead>
                            <tr>
                              <th>Time</th>
                              <th>Action</th>
                              <th>From</th>
                              <th>To</th>
                              <th>Actor</th>
                              <th>Comments</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedIssue.actions.map((a: any) => (
                              <tr key={a.id}>
                                <td>
                                  {a.created_at
                                    ? new Date(a.created_at).toLocaleString()
                                    : "-"}
                                </td>
                                <td>{a.action}</td>
                                <td>{a.from_status || "-"}</td>
                                <td>{a.to_status || "-"}</td>
                                <td>{a.actor || "-"}</td>
                                <td>{a.comments || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
          {page === "Deployments" && (
            <>
              <Panel
                title="DEV deployment execution"
                actions={
                  <div className="deploy-actions">
                    <button
                      disabled={!pid || busy}
                      onClick={() =>
                        action(async () => {
                          const r: any = await api(
                            `/projects/${pid}/deployments/dev/test-databricks`,
                            { method: "POST" },
                          );
                          setPrecheck(r);
                          return r;
                        })
                      }
                    >
                      <PlugZap size={15} />
                      Test Databricks
                    </button>
                    <button
                      disabled={!pid || busy}
                      onClick={() =>
                        action(async () => {
                          const r: any = await api(
                            `/projects/${pid}/deployments/dev/precheck`,
                            { method: "POST" },
                          );
                          setPrecheck(r);
                          return r;
                        })
                      }
                    >
                      <FileCheck2 size={15} />
                      DEV Precheck
                    </button>
                    <button
                      className="primary-action"
                      disabled={!pid || busy}
                      onClick={() => {
                        const allow = confirm(
                          "Allow destructive DEV replacement only when policy permits and schema drift requires it?",
                        );
                        action(() =>
                          api(`/projects/${pid}/deployments/dev/deploy`, {
                            method: "POST",
                            body: JSON.stringify({
                              allow_destructive: allow,
                              batch_size: deployBatch,
                              max_rows: deployMaxRows
                                ? Number(deployMaxRows)
                                : null,
                              load_mode: deployMode,
                              replace_existing_data: allow,
                            }),
                          }),
                        );
                      }}
                    >
                      <Play size={15} />
                      Deploy Approved to DEV
                    </button>
                    <button
                      disabled={!pid || busy}
                      onClick={() => {
                        const allow = confirm(
                          "Does the failed DEV artifact contain an intentional destructive operation that you reviewed and explicitly approve? Select Cancel to resume without destructive approval.",
                        );
                        action(() =>
                          api(`/projects/${pid}/deployments/dev/resume`, {
                            method: "POST",
                            body: JSON.stringify({
                              allow_destructive: allow,
                              load_mode: "FULL_LOAD",
                              replace_existing_data: allow,
                            }),
                          }),
                        );
                      }}
                    >
                      <RefreshCw size={15} />
                      Resume Failed Run
                    </button>
                    <button
                      disabled={!pid || busy}
                      onClick={() =>
                        action(async () => {
                          const r: any = await api(
                            `/projects/${pid}/deployments/dev/reconcile`,
                            { method: "POST" },
                          );
                          setReconResult(r);
                          return r;
                        })
                      }
                    >
                      <Gauge size={15} />
                      Run Reconciliation
                    </button>
                    <button
                      disabled={!pid || busy}
                      onClick={() =>
                        action(async () => {
                          const r: any = await api(
                            `/projects/${pid}/deployments/dev/evaluate-gate`,
                            { method: "POST" },
                          );
                          setGateResult(r);
                          return r;
                        })
                      }
                    >
                      <ShieldCheck size={15} />
                      Evaluate DEV Gate
                    </button>
                    <button disabled={!pid || busy} onClick={viewDevLogs}>
                      <ScrollText size={15} />
                      View Logs
                    </button>
                    <button disabled={!pid || busy} onClick={downloadDevLogs}>
                      <Download size={15} />
                      Download Log
                    </button>
                  </div>
                }
              >
                <div className="deploy-config">
                  <label>
                    Load mode
                    <select
                      value={deployMode}
                      onChange={(e) => setDeployMode(e.target.value)}
                    >
                      <option>FULL_LOAD</option>
                      <option>APPEND</option>
                    </select>
                  </label>
                  <label>
                    Batch size
                    <input
                      type="number"
                      min="1"
                      value={deployBatch}
                      onChange={(e) =>
                        setDeployBatch(Math.max(1, Number(e.target.value) || 1))
                      }
                    />
                  </label>
                  <label>
                    Max rows (optional)
                    <input
                      type="number"
                      min="1"
                      value={deployMaxRows}
                      onChange={(e) => setDeployMaxRows(e.target.value)}
                      placeholder="Unlimited"
                    />
                  </label>
                  <small>
                    FULL_LOAD will not clear existing target data unless you
                    explicitly approve replacement.
                  </small>
                </div>
                <div className="deployment-summary">
                  <div className="summary-stat">
                    <span>Status</span>
                    <Badge s={deployment.status || "NOT_STARTED"} />
                  </div>
                  <div className="summary-stat">
                    <span>Run ID</span>
                    <b>{deployment.run_id || "-"}</b>
                  </div>
                  <div className="summary-stat">
                    <span>Objects</span>
                    <b>{deployment.total || 0}</b>
                  </div>
                  <div className="summary-stat">
                    <span>Passed</span>
                    <b>{deployment.passed || 0}</b>
                  </div>
                  <div className="summary-stat">
                    <span>Failed</span>
                    <b>{deployment.failed || 0}</b>
                  </div>
                  <div className="summary-stat">
                    <span>Checkpoint</span>
                    <b>{deployment.checkpoint || "-"}</b>
                  </div>
                </div>
                {deployment.failed_object && (
                  <div className="notice">
                    Failed object: {deployment.failed_object}. Fix the issue,
                    then use Resume Failed Run.
                  </div>
                )}
                {precheck && (
                  <div className="subsection">
                    <h4>Latest precheck / connection result</h4>
                    <pre>{JSON.stringify(precheck, null, 2)}</pre>
                  </div>
                )}
              </Panel>
              <Panel title="Execution evidence">
                {deployment.logs?.length ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Status</th>
                        <th>Object</th>
                        <th>Target / action</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deployment.logs
                        .slice()
                        .reverse()
                        .map((x: any, i: number) => (
                          <tr key={i}>
                            <td>
                              {x.created_at
                                ? new Date(x.created_at).toLocaleString()
                                : "-"}
                            </td>
                            <td>
                              <Badge s={x.status} />
                            </td>
                            <td>{x.object_id || "-"}</td>
                            <td>{x.target_fqn || x.action || "-"}</td>
                            <td>
                              <code>
                                {JSON.stringify({
                                  artifact_version: x.artifact_version,
                                  layer: x.layer,
                                  schema_action: x.schema_action,
                                  load: x.load,
                                  error: x.error,
                                })}
                              </code>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <Empty text="No DEV deployment evidence yet. Run DEV Precheck first." />
                )}
                {showLogs && (
                  <div className="subsection">
                    <div className="log-head">
                      <h4>Full project-scoped DEV log</h4>
                      <button onClick={() => setShowLogs(false)}>Hide</button>
                    </div>
                    {logView.length ? (
                      <table>
                        <thead>
                          <tr>
                            <th>Time</th>
                            <th>Category</th>
                            <th>Status</th>
                            <th>Run</th>
                            <th>Step</th>
                            <th>Target</th>
                            <th>Message</th>
                          </tr>
                        </thead>
                        <tbody>
                          {logView.map((x: any, i: number) => (
                            <tr key={i}>
                              <td>
                                {x.timestamp
                                  ? new Date(x.timestamp).toLocaleString()
                                  : "-"}
                              </td>
                              <td>{x.category}</td>
                              <td>
                                <Badge s={x.status || "-"} />
                              </td>
                              <td>
                                <code>{x.run_id || "-"}</code>
                              </td>
                              <td>{x.step || "-"}</td>
                              <td>{x.target_fqn || "-"}</td>
                              <td>{x.message || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <Empty text="No project-scoped DEV logs recorded yet." />
                    )}
                  </div>
                )}
                {reconResult && (
                  <div className="subsection">
                    <h4>Reconciliation</h4>
                    <pre>{JSON.stringify(reconResult, null, 2)}</pre>
                  </div>
                )}
                {gateResult && (
                  <div className="subsection">
                    <h4>DEV quality gate</h4>
                    <pre>{JSON.stringify(gateResult, null, 2)}</pre>
                  </div>
                )}
              </Panel>
            </>
          )}
          {page === "Reconciliation" && (
            <Panel
              title="DEV Medallion reconciliation"
              actions={
                <div className="deploy-actions">
                  <button
                    className="primary-action"
                    disabled={!pid || busy}
                    onClick={runDevReconciliation}
                  >
                    <Gauge size={15} />
                    Run DEV Reconciliation
                  </button>
                  <button
                    disabled={!pid || busy || !reconResult?.run_id}
                    onClick={downloadReconciliation}
                  >
                    <Download size={15} />
                    Download CSV
                  </button>
                </div>
              }
            >
              <div className="notice ok">
                Reconciliation uses the exact artifact versions from the latest
                successful Medallion MDR run. Tables and views use count checks;
                functions and procedures use safe metadata checks and are never
                executed.
              </div>
              <div className="deployment-summary">
                <div className="summary-stat">
                  <span>Status</span>
                  <Badge s={reconResult?.status || "NOT_STARTED"} />
                </div>
                <div className="summary-stat">
                  <span>Workflow</span>
                  <b>{reconResult?.workflow || "MEDALLION"}</b>
                </div>
                <div className="summary-stat">
                  <span>Deployment run</span>
                  <b>{reconResult?.run_id || "-"}</b>
                </div>
                <div className="summary-stat">
                  <span>Objects checked</span>
                  <b>{reconResult?.details_count || 0}</b>
                </div>
                <div className="summary-stat">
                  <span>Passed</span>
                  <b>{reconResult?.passed || 0}</b>
                </div>
                <div className="summary-stat">
                  <span>Failed</span>
                  <b>{reconResult?.failed || 0}</b>
                </div>
              </div>
              {reconResult?.details?.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>Layer</th>
                      <th>Object</th>
                      <th>Type</th>
                      <th>Check</th>
                      <th>Source</th>
                      <th>Target</th>
                      <th>Version</th>
                      <th>Status</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconResult.details.map((x: any) => (
                      <tr
                        key={`${x.medallion_node_id}-${x.artifact_version_id}`}
                      >
                        <td>
                          <Badge s={x.layer} />
                        </td>
                        <td>
                          <code>{x.target_fqn || x.object}</code>
                        </td>
                        <td>{x.object_type || "-"}</td>
                        <td>{x.reconciliation_type}</td>
                        <td>{x.source_count ?? "-"}</td>
                        <td>{x.target_count ?? "-"}</td>
                        <td>{x.artifact_version ? `v${x.artifact_version}` : "-"}</td>
                        <td>
                          <Badge s={x.status} />
                        </td>
                        <td>{x.error || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <Empty text="No Medallion reconciliation has been run yet. Deploy Medallion DEV successfully, then run reconciliation." />
              )}
            </Panel>
          )}
          {page === "Lifecycle" && (
            <Panel title="Project-specific lifecycle">
              <div className="lifecycle-big">
                {life.map((x, i) => (
                  <div className="stage" key={x.environment}>
                    <div className="circle">{i + 1}</div>
                    <h3>{x.environment}</h3>
                    <Badge s={x.status} />
                    <p>
                      {x.pass_count} passed · {x.fail_count} failed ·{" "}
                      {x.review_blockers} blockers
                    </p>
                  </div>
                ))}
              </div>
            </Panel>
          )}
          {page === "Waves" && (
            <>
              <Panel
                title="DEV → TEST promotion"
                actions={
                  <div className="deploy-actions">
                    <button
                      disabled={!pid || busy}
                      onClick={() => action(async () => {
                        const result: any = await api(`/projects/${pid}/promotions/test/precheck`, { method: "POST" });
                        setTestPrecheck(result);
                        return result;
                      })}
                    >
                      <FileCheck2 size={15} /> TEST Precheck
                    </button>
                    <button
                      className="primary-action"
                      disabled={!pid || busy || testPrecheck?.eligible !== true}
                      onClick={() => action(async () => {
                        const result: any = await api(`/projects/${pid}/promotions/test/deploy`, { method: "POST" });
                        setTestPromotion(result);
                        return result;
                      })}
                    >
                      <Play size={15} /> Promote and Deploy to TEST
                    </button>
                    <button
                      disabled={!pid || busy || testPromotion?.status !== "PASSED"}
                      onClick={() => action(async () => {
                        const result: any = await api(`/projects/${pid}/promotions/test/reconcile`, { method: "POST" });
                        setTestRecon(result);
                        return result;
                      })}
                    >
                      <Gauge size={15} /> Run TEST Reconciliation
                    </button>
                    <button
                      disabled={!pid || busy || testRecon?.status !== "PASSED"}
                      onClick={() => action(async () => {
                        const result: any = await api(`/projects/${pid}/promotions/test/evaluate-gate`, { method: "POST" });
                        setTestGate(result);
                        return result;
                      })}
                    >
                      <ShieldCheck size={15} /> Evaluate TEST Gate
                    </button>
                  </div>
                }
              >
                <div className="notice ok">
                  TEST promotion uses the exact artifact-version manifest that passed the DEV quality gate. Bronze data is deep-cloned from DEV; Silver and Gold artifacts are deployed with TEST catalog references.
                </div>
                <div className="deployment-summary">
                  <div className="summary-stat"><span>TEST status</span><Badge s={testPromotion?.status || "NOT_STARTED"} /></div>
                  <div className="summary-stat"><span>Run ID</span><b>{testPromotion?.run_id || "-"}</b></div>
                  <div className="summary-stat"><span>Objects</span><b>{testPromotion?.total ?? testPromotion?.count ?? 0}</b></div>
                  <div className="summary-stat"><span>Passed</span><b>{testPromotion?.passed ?? 0}</b></div>
                  <div className="summary-stat"><span>Failed</span><b>{testPromotion?.failed ?? 0}</b></div>
                  <div className="summary-stat"><span>TEST gate</span><Badge s={testGate?.status || "NOT_STARTED"} /></div>
                </div>
                {testPrecheck && (
                  <div className="subsection">
                    <h4>TEST promotion precheck</h4>
                    <pre>{JSON.stringify(testPrecheck, null, 2)}</pre>
                  </div>
                )}
                {testRecon?.run_id && (
                  <div className="subsection">
                    <h4>TEST reconciliation</h4>
                    <div className="deployment-summary">
                      <div className="summary-stat"><span>Status</span><Badge s={testRecon.status} /></div>
                      <div className="summary-stat"><span>Checked</span><b>{testRecon.details_count || 0}</b></div>
                      <div className="summary-stat"><span>Passed</span><b>{testRecon.passed || 0}</b></div>
                      <div className="summary-stat"><span>Failed</span><b>{testRecon.failed || 0}</b></div>
                    </div>
                  </div>
                )}
                {testGate && (
                  <div className="subsection">
                    <h4>TEST quality gate</h4>
                    <pre>{JSON.stringify(testGate, null, 2)}</pre>
                  </div>
                )}
              </Panel>
              <Panel title="TEST execution evidence">
                {testPromotion?.logs?.length ? (
                  <table>
                    <thead><tr><th>Time</th><th>Status</th><th>Target / action</th><th>Artifact version</th></tr></thead>
                    <tbody>{testPromotion.logs.slice().reverse().map((x: any, i: number) => (
                      <tr key={i}>
                        <td>{x.created_at ? new Date(x.created_at).toLocaleString() : "-"}</td>
                        <td><Badge s={x.status} /></td>
                        <td><code>{x.target_fqn || x.action || "-"}</code></td>
                        <td>{x.artifact_version ? `v${x.artifact_version}` : "-"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                ) : <Empty text="Run TEST Precheck, then promote the approved DEV manifest to TEST." />}
              </Panel>
            </>
          )}
          {genericModule &&
            ![
              "Assessment",
              "Conversion Plans",
              "Administration",
              "Deployments",
              "Waves",
            ].includes(page) && (
              <Panel
                title={page}
                actions={
                  <button disabled={!pid} onClick={addRecord}>
                    <Plus size={15} />
                    Add record
                  </button>
                }
              >
                <RecordTable rows={records} />
              </Panel>
            )}
          {page === "Users" && (
            <Panel title="Users">
              {users.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Locked</th>
                      <th>Attempts</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.username}</td>
                        <td>{u.role}</td>
                        <td>{String(u.locked)}</td>
                        <td>{u.failed_attempts}</td>
                        <td>
                          {u.locked && (
                            <button
                              onClick={() =>
                                action(() =>
                                  api(`/users/${u.id}/unlock`, {
                                    method: "POST",
                                  }),
                                )
                              }
                            >
                              Unlock
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <Empty text="No users." />
              )}
            </Panel>
          )}
          {page === "Administration" && (
            <Panel
              title="System diagnostics"
              actions={
                <>
                  <button
                    onClick={() =>
                      action(async () => {
                        const d = await api("/system/diagnostics");
                        setDiag(d);
                        return d;
                      })
                    }
                  >
                    <Stethoscope size={15} />
                    Run diagnostics
                  </button>
                  <button
                    onClick={() =>
                      action(async () => {
                        const d = await api("/system/databricks-test", {
                          method: "POST",
                        });
                        setDiag(d);
                        return d;
                      })
                    }
                  >
                    <PlugZap size={15} />
                    Test Databricks
                  </button>
                  <button
                    onClick={() =>
                      action(async () => {
                        const d: any = await api("/ai/provider-test", {
                          method: "POST",
                        });
                        setDiag(d);
                        setAiProvider(d);
                        return d;
                      })
                    }
                  >
                    <Sparkles size={15} />
                    Test AI Provider
                  </button>
                </>
              }
            >
              {diag ? (
                <pre>{JSON.stringify(diag, null, 2)}</pre>
              ) : (
                <Empty text="Run diagnostics to verify ODBC driver, auth mode, Databricks configuration and environment." />
              )}
            </Panel>
          )}
        </section>
      </main>
    </div>
  );
}
function evidenceList(value: any): string[] {
  if (value == null || value === "") return [];
  if (Array.isArray(value))
    return value.map((x) => (typeof x === "string" ? x : JSON.stringify(x)));
  return [typeof value === "string" ? value : JSON.stringify(value)];
}
function repairList(value: any): string[] {
  return evidenceList(value).map((x) => {
    try {
      const r = JSON.parse(x);
      return r?.action && r?.value ? `${r.action}: ${r.value}` : x;
    } catch {
      return x;
    }
  });
}
function Card({ n, t, icon }: { n: number; t: string; icon?: string }) {
  const I =
    icon === "tables"
      ? Database
      : icon === "views"
        ? Layers3
        : icon === "procedures"
          ? FileCode2
          : icon === "blocked"
            ? ShieldAlert
            : Boxes;
  return (
    <div className={`card ${icon || ""}`}>
      <div className="card-top">
        <div className="metric-icon">
          <I size={18} />
        </div>
        <span className="metric-trend">
          <ArrowUpRight size={13} />
          Live
        </span>
      </div>
      <strong>{n}</strong>
      <span>{t}</span>
      <small>Current project</small>
    </div>
  );
}
function Layer({ t, n }: { t: string; n: number }) {
  return (
    <div className={`layer ${t.toLowerCase()}`}>
      <div className="layer-icon">
        <Layers3 size={17} />
      </div>
      <b>{t}</b>
      <span>{n} objects</span>
      <div className="layer-bar">
        <i style={{ width: `${Math.min(100, Math.max(12, n * 8))}%` }} />
      </div>
    </div>
  );
}
function RecordTable({ rows }: { rows: ModRecord[] }) {
  return rows.length ? (
    <table>
      <thead>
        <tr>
          <th>Title</th>
          <th>Status</th>
          <th>Environment</th>
          <th>Details</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{r.payload?.title || r.record_type}</td>
            <td>
              <Badge s={r.payload?.status || "-"} />
            </td>
            <td>{r.environment || "-"}</td>
            <td>
              <code>{JSON.stringify(r.payload?.details || {})}</code>
            </td>
            <td>
              {r.created_at ? new Date(r.created_at).toLocaleString() : "-"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  ) : (
    <Empty text="No records yet." />
  );
}
