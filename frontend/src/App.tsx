Warning: truncated output (original token count: 45963)
Total output lines: 4580

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

import SourceConnectorControl from "./SourceConnectorControl";

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

const icons: any = {
  "Migration Workflow": Workflow,
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
  const [page, setPage] = useState("Migration Workflow");
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
  const [uatPromotion, setUatPromotion] = useState<any>({ status: "NOT_STARTED", logs: [] }),
    [uatPrecheck, setUatPrecheck] = useState<any>(null),
    [uatRecon, setUatRecon] = useState<any>(null),
    [uatGate, setUatGate] = useState<any>(null);
  const [prodPromotion, setProdPromotion] = useState<any>({ status: "NOT_STARTED", logs: [] }),
    [prodPrecheck, setProdPrecheck] = useState<any>(null),
    [prodRecon, setProdRecon] = useState<any>(null),
    [prodGate, setProdGate] = useState<any>(null);
  const [workflowOps, setWorkflowOps] = useState<any>({ cutover: [], decommission: [] });
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
      if (page === "Deployments" && id) {
        const [reconciliation, legacyDeployment, medallionDeployment]: any =
          await Promise.all([
            api(`/projects/${id}/deployments/dev/reconciliation/latest`),
            api(`/projects/${id}/deployments/dev/status`),
            api(`/projects/${id}/medallion/deployments/dev/status`),
          ]);
        setReconResult(reconciliation);
        setDeployment(legacyDeployment);
        setMedDeployment(medallionDeployment);
      }
      if (page === "Waves" && id) {
        const [status, recon, uatStatus, uatReconciliation, prodStatus, prodReconciliation]: any = await Promise.all([
          api(`/projects/${id}/promotions/test/status`),
          api(`/projects/${id}/promotions/test/reconciliation/latest`),
          api(`/projects/${id}/promotions/uat/status`),
          api(`/projects/${id}/promotions/uat/reconciliation/latest`),
          api(`/projects/${id}/promotions/prod/status`),
          api(`/projects/${id}/promotions/prod/reconciliation/latest`),
        ]);
        setTestPromotion(status);
        setTestRecon(recon);
        setUatPromotion(uatStatus);
        setUatRecon(uatReconciliation);
        setProdPromotion(prodStatus);
        setProdRecon(prodReconciliation);
      }
      if (page === "Migration Workflow" && id) {
        const [compatibility, mp, sm, ma, devRecon, cutover, decommission]: any = await Promise.all([
          api(`/projects/${id}/compatibility/summary`),
          api(`/projects/${id}/medallion/plan?environment=DEV`),
          api(`/projects/${id}/semantics`),
          api(`/projects/${id}/medallion/artifacts?environment=DEV`),
          api(`/projects/${id}/deployments/dev/reconciliation/latest`),
          api(`/projects/${id}/module/cutover`),
          api(`/projects/${id}/module/decommission`),
        ]);
        setCompat(compatibility);
        setMedallion(mp);
        setSemantics(sm);
        setMedArts(ma);
        setReconResult(devRecon);
        setWorkflowOps({ cutover, decommission });
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
      setGateResult(null);
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
  const environmentPassed = (environment: string) =>
    life.find((x) => x.environment === environment)?.status === "PASSED";
  const medallionNodeCount = Array.isArray(medallion?.nodes)
    ? medallion.nodes.length
    : 0;
  const approvedMedallionArtifacts = medArts.filter(
    (x: any) =>
      x.executable &&
      x.validation_status === "PASSED" &&
      x.review_status === "APPROVED",
  ).length;
  const operationalRecordComplete = (rows: any[]) =>
    rows.some((row: any) =>
      ["PASSED", "APPROVED", "COMPLETED", "CLOSED"].includes(
        String(row?.payload?.status || "").toUpperCase(),
      ),
    );
  const workflowSteps = [
    {
      phase: "SETUP",
      title: "Create or select a project",
      description: "Choose the project that will own all migration metadata and evidence.",
      page: "Projects",
      action: "Create or select the migration project",
      complete: !!current,
      evidence: current ? current.name : "No project selected",
    },
    {
      phase: "SETUP",
      title: "Configure the SQL Server source",
      description: "Add the source profile and verify the live connection before discovery.",
      page: "Sources",
      action: "Configure and verify the SQL Server source",
      complete: sources.length > 0,
      evidence: `${sources.length} source profile${sources.length === 1 ? "" : "s"}`,
    },
    {
      phase: "DISCOVER",
      title: "Run source discovery",
      description: "Capture tables, views, functions, procedures, columns and dependencies.",
      page: "Discovery",
      action: "Capture the source migration inventory",
      complete: inventory.length > 0,
      evidence: `${inventory.length} objects discovered`,
    },
    {
      phase: "DESIGN",
      title: "Review architecture readiness",
      description: "Review inventory, dependencies, compatibility and selected Medallion layers.",
      page: "Compatibility",
      action: "Review migration architecture readiness",
      complete: inventory.length > 0 && classes.length > 0 && compat !== null,
      evidence: compat
        ? `${compat.deterministic_coverage_pct ?? 0}% deterministic compatibility`
        : "Compatibility review pending",
    },
    {
      phase: "DESIGN",
      title: "Build the semantic Medallion design",
      description: "Analyze consumers, approve semantics and build the Bronze/Silver/Gold plan.",
      page: "Medallion Design",
      action: "Build the governed Medallion design",
      complete: medallionNodeCount > 0 && semantics.some((x: any) => x.status === "APPROVED"),
      evidence: `${medallionNodeCount} planned nodes · ${semantics.filter((x: any) => x.status === "APPROVED").length} approved semantics`,
    },
    {
      phase: "GOVERN",
      title: "Generate, validate and approve artifacts",
      description: "Approve only executable artifact versions that passed static validation.",
      page: "Reviews",
      action: "Validate and approve deployment artifacts",
      complete: medArts.length > 0 && approvedMedallionArtifacts === medArts.length,
      evidence: `${approvedMedallionArtifacts} of ${medArts.length} artifacts approved`,
    },
    {
      phase: "DEV",
      title: "Deploy and validate DEV",
      description: "Deploy Medallion DEV, run reconciliation and evaluate the DEV quality gate.",
      page: environmentPassed("DEV") ? "Lifecycle" : "Deployments",
      action: "Deploy and validate the DEV release",
      complete: environmentPassed("DEV"),
      evidence: environmentPassed("DEV") ? "DEV quality gate passed" : "DEV deployment or validation pending",
    },
    {
      phase: "TEST",
      title: "Promote and validate TEST",
      description: "Run TEST precheck, deployment, reconciliation and quality gate.",
      page: "Waves",
      action: "Promote the validated DEV release to TEST",
      complete: environmentPassed("TEST"),
      evidence: environmentPassed("TEST") ? "TEST quality gate passed" : "TEST promotion pending",
    },
    {
      phase: "UAT",
      title: "Promote and validate UAT",
      description: "Run UAT precheck, deployment, reconciliation and quality gate.",
      page: "Waves",
      action: "Promote the validated TEST release to UAT",
      complete: environmentPassed("UAT"),
      evidence: environmentPassed("UAT") ? "UAT quality gate passed" : "UAT promotion pending",
    },
    {
      phase: "PROD",
      title: "Promote and validate PROD",
      description: "Run PROD precheck, deployment, reconciliation and final quality gate.",
      page: "Waves",
      action: "Authorize the accepted UAT release for PROD",
      complete: environmentPassed("PROD"),
      evidence: environmentPassed("PROD") ? "PROD quality gate passed" : "PROD promotion pending",
    },
    {
      phase: "CLOSE",
      title: "Complete production cutover",
      description: "Record consumer switch-over and production acceptance.",
      page: "Cutover",
      action: "Record production cutover and consumer acceptance",
      complete: operationalRecordComplete(workflowOps.cutover || []),
      evidence: operationalRecordComplete(workflowOps.cutover || []) ? "Cutover completed" : "Cutover record pending",
    },
    {
      phase: "CLOSE",
      title: "Approve source decommission",
      description: "Retire the legacy source only after cutover approval and monitoring.",
      page: "Decommission",
      action: "Approve retirement of the legacy source",
      complete: operationalRecordComplete(workflowOps.decommission || []),
      evidence: operationalRecordComplete(workflowOps.decommission || []) ? "Migration formally closed" : "Decommission approval pending",
    },
  ];
  const nextWorkflowIndex = workflowSteps.findIndex((step) => !step.complete);
  const workflowComplete = nextWorkflowIndex === -1;
  const workflowProgress = Math.round(
    (workflowSteps.filter((step) => step.complete).length / workflowSteps.length) * 100,
  );
  const openBlockers = issues.filter(
    (x: any) => x.status === "OPEN" && x.severity === "BLOCKER",
  ).length;
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
      label: "START & SETUP",
      items: ["Migration Workflow", "Projects", "Sources"],
    },
    {
      label: "DISCOVER & DESIGN",
      items: [
        "Discovery",
        "Inventory",
        "Dependencies",
        "Compatibility",
        "Layer Classification",
        "Medallion Design",
      ],
    },
    {
      label: "VALIDATE & RESOLVE",
      items: ["Reviews", "AI Remediation", "Issues"],
    },
    {
      label: "PROMOTE",
      items: ["Deployments", "Waves", "Lifecycle"],
    },
    {
      label: "CLOSE",
      items: ["Cutover", "Decommission"],
    },
  ];
  const displayPage = (name: string) =>
    name === "Deployments" ? "DEV Deployment" : name;
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
                    title={collapsed ? displayPage(n) : undefined}
                    className={page === n ? "active" : ""}
                    onClick={() => setPage(n)}
                    key={n}
                  >
                    <I size={17} />
                    <span>{displayPage(n)}</span>
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
            <h2>{displayPage(page)}</h2>
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
          {page === "Migration Workflow" && (
            <>
              <div className="workflow-hero">
                <div>
                  <div className="hero-kicker"><Workflow size={15} /> Guided migration journey</div>
                  <h1>{current?.name || "Start your SQL Server migration"}</h1>
                  <p>
                    Follow one governed path from project setup through PROD validation, cutover and source retirement.
                    Existing migration functions remain on their original pages.
                  </p>
                  <div className="workflow-next">
                    <span>{workflowComplete ? "WORKFLOW COMPLETE" : "CURRENT REQUIRED OPERATION"}</span>
                    <b>{workflowComplete ? "Migration formally closed" : workflowSteps[nextWorkflowIndex]?.title}</b>
                    {!workflowComplete && (
                      <button onClick={() => setPage(workflowSteps[nextWorkflowIndex].page)}>
                        {workflowSteps[nextWorkflowIndex].action} <ChevronRight size={15} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="workflow-progress">
                  <strong>{workflowProgress}%</strong>
                  <span>overall progress</span>
                  <div><i style={{ width: `${workflowProgress}%` }} /></div>
                  <small>{workflowSteps.filter((step) => step.complete).length} of {workflowSteps.length} stages completed</small>
                </div>
              </div>
              {openBlockers > 0 && (
                <div className="workflow-blocker">
                  <ShieldAlert size={18} />
                  <div><b>{openBlockers} open blocker issue{openBlockers === 1 ? "" : "s"}</b><span>Resolve these before the next governed de…25963 tokens truncated…T" },
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
              </Panel>
              </details>
            </>
          )}
          {page === "Deployments" && (
            <Panel
              title="DEV validation evidence"
              actions={
                <div className="deploy-actions">
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
              <p className="section-caption">
                Reconciliation evidence and the resulting DEV quality gate are
                shown here for the current project.
              </p>
                {gateResult && (
                  <div className="subsection">
                    <h4>DEV quality gate</h4>
                    <pre>{JSON.stringify(gateResult, null, 2)}</pre>
                  </div>
                )}
              {environmentPassed("DEV") && (
                <div className="dev-next-action">
                  <button className="primary-action" onClick={() => setPage("Waves")}>
                    Promote validated DEV release to TEST <ChevronRight size={15} />
                  </button>
                </div>
              )}
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
                      disabled={!pid || busy || !environmentPassed("DEV")}
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
                  <div className="summary-stat"><span>TEST gate</span><Badge s={testGate?.status || (environmentPassed("TEST") ? "PASSED" : "NOT_STARTED")} /></div>
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
                {environmentPassed("TEST") && (
                  <div className="business-next">
                    <div>
                      <span>BUSINESS OUTCOME</span>
                      <b>TEST validation passed</b>
                      <p>The validated release is ready for business acceptance testing in UAT.</p>
                    </div>
                    <button
                      className="primary-action"
                      onClick={() => document.getElementById("uat-promotion")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    >
                      Begin UAT acceptance validation <ChevronRight size={15} />
                    </button>
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
              <div id="uat-promotion" className="promotion-anchor">
              <Panel
                title="TEST → UAT promotion"
                actions={
                  <div className="deploy-actions">
                    <button
                      disabled={!pid || busy || !environmentPassed("TEST")}
                      onClick={() => action(async () => {
                        const result: any = await api(`/projects/${pid}/promotions/uat/precheck`, { method: "POST" });
                        setUatPrecheck(result);
                        return result;
                      })}
                    >
                      <FileCheck2 size={15} /> UAT Precheck
                    </button>
                    <button
                      className="primary-action"
                      disabled={!pid || busy || uatPrecheck?.eligible !== true}
                      onClick={() => action(async () => {
                        const result: any = await api(`/projects/${pid}/promotions/uat/deploy`, { method: "POST" });
                        setUatPromotion(result);
                        return result;
                      })}
                    >
                      <Play size={15} /> Promote and Deploy to UAT
                    </button>
                    <button
                      disabled={!pid || busy || uatPromotion?.status !== "PASSED"}
                      onClick={() => action(async () => {
                        const result: any = await api(`/projects/${pid}/promotions/uat/reconcile`, { method: "POST" });
                        setUatRecon(result);
                        return result;
                      })}
                    >
                      <Gauge size={15} /> Run UAT Reconciliation
                    </button>
                    <button
                      disabled={!pid || busy || uatRecon?.status !== "PASSED"}
                      onClick={() => action(async () => {
                        const result: any = await api(`/projects/${pid}/promotions/uat/evaluate-gate`, { method: "POST" });
                        setUatGate(result);
                        return result;
                      })}
                    >
                      <ShieldCheck size={15} /> Evaluate UAT Gate
                    </button>
                  </div>
                }
              >
                <div className="notice ok">
                  UAT promotion uses the exact artifact-version manifest that passed the TEST quality gate. Bronze data is deep-cloned from TEST; Silver and Gold artifacts are deployed with UAT catalog references.
                </div>
                <div className="deployment-summary">
                  <div className="summary-stat"><span>UAT status</span><Badge s={uatPromotion?.status || "NOT_STARTED"} /></div>
                  <div className="summary-stat"><span>Run ID</span><b>{uatPromotion?.run_id || "-"}</b></div>
                  <div className="summary-stat"><span>Objects</span><b>{uatPromotion?.total ?? uatPromotion?.count ?? 0}</b></div>
                  <div className="summary-stat"><span>Passed</span><b>{uatPromotion?.passed ?? 0}</b></div>
                  <div className="summary-stat"><span>Failed</span><b>{uatPromotion?.failed ?? 0}</b></div>
                  <div className="summary-stat"><span>UAT gate</span><Badge s={uatGate?.status || (environmentPassed("UAT") ? "PASSED" : "NOT_STARTED")} /></div>
                </div>
                {uatPrecheck && (
                  <div className="subsection">
                    <h4>UAT promotion precheck</h4>
                    <pre>{JSON.stringify(uatPrecheck, null, 2)}</pre>
                  </div>
                )}
                {uatRecon?.run_id && (
                  <div className="subsection">
                    <h4>UAT reconciliation</h4>
                    <div className="deployment-summary">
                      <div className="summary-stat"><span>Status</span><Badge s={uatRecon.status} /></div>
                      <div className="summary-stat"><span>Checked</span><b>{uatRecon.details_count || 0}</b></div>
                      <div className="summary-stat"><span>Passed</span><b>{uatRecon.passed || 0}</b></div>
                      <div className="summary-stat"><span>Failed</span><b>{uatRecon.failed || 0}</b></div>
                    </div>
                  </div>
                )}
                {uatGate && (
                  <div className="subsection">
                    <h4>UAT quality gate</h4>
                    <pre>{JSON.stringify(uatGate, null, 2)}</pre>
                  </div>
                )}
                {environmentPassed("UAT") && (
                  <div className="business-next">
                    <div>
                      <span>BUSINESS OUTCOME</span>
                      <b>Business acceptance completed</b>
                      <p>The accepted release is eligible for final production readiness validation.</p>
                    </div>
                    <button
                      className="primary-action"
                      onClick={() => document.getElementById("prod-promotion")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    >
                      Validate production release readiness <ChevronRight size={15} />
                    </button>
                  </div>
                )}
              </Panel>
              </div>
              <Panel title="UAT execution evidence">
                {uatPromotion?.logs?.length ? (
                  <table>
                    <thead><tr><th>Time</th><th>Status</th><th>Target / action</th><th>Artifact version</th></tr></thead>
                    <tbody>{uatPromotion.logs.slice().reverse().map((x: any, i: number) => (
                      <tr key={i}>
                        <td>{x.created_at ? new Date(x.created_at).toLocaleString() : "-"}</td>
                        <td><Badge s={x.status} /></td>
                        <td><code>{x.target_fqn || x.action || "-"}</code></td>
                        <td>{x.artifact_version ? `v${x.artifact_version}` : "-"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                ) : <Empty text="Run UAT Precheck, then promote the approved TEST manifest to UAT." />}
              </Panel>
              <div id="prod-promotion" className="promotion-anchor">
              <Panel
                title="UAT → PROD promotion"
                actions={
                  <div className="deploy-actions">
                    <button disabled={!pid || busy || !environmentPassed("UAT")} onClick={() => action(async () => {
                      const result: any = await api(`/projects/${pid}/promotions/prod/precheck`, { method: "POST" });
                      setProdPrecheck(result); return result;
                    })}>
                      <FileCheck2 size={15} /> PROD Precheck
                    </button>
                    <button className="primary-action" disabled={!pid || busy || prodPrecheck?.eligible !== true}
                      onClick={() => action(async () => {
                        const result: any = await api(`/projects/${pid}/promotions/prod/deploy`, { method: "POST" });
                        setProdPromotion(result); return result;
                      })}>
                      <Play size={15} /> Promote and Deploy to PROD
                    </button>
                    <button disabled={!pid || busy || prodPromotion?.status !== "PASSED"}
                      onClick={() => action(async () => {
                        const result: any = await api(`/projects/${pid}/promotions/prod/reconcile`, { method: "POST" });
                        setProdRecon(result); return result;
                      })}>
                      <Gauge size={15} /> Run PROD Reconciliation
                    </button>
                    <button disabled={!pid || busy || prodRecon?.status !== "PASSED"}
                      onClick={() => action(async () => {
                        const result: any = await api(`/projects/${pid}/promotions/prod/evaluate-gate`, { method: "POST" });
                        setProdGate(result); return result;
                      })}>
                      <ShieldCheck size={15} /> Evaluate PROD Gate
                    </button>
                  </div>
                }
              >
                <div className="notice ok">
                  PROD promotion uses the exact artifact-version manifest that passed the UAT quality gate. Bronze data is deep-cloned from UAT; Silver and Gold artifacts are deployed with PROD catalog references.
                </div>
                <div className="deployment-summary">
                  <div className="summary-stat"><span>PROD status</span><Badge s={prodPromotion?.status || "NOT_STARTED"} /></div>
                  <div className="summary-stat"><span>Run ID</span><b>{prodPromotion?.run_id || "-"}</b></div>
                  <div className="summary-stat"><span>Objects</span><b>{prodPromotion?.total ?? prodPromotion?.count ?? 0}</b></div>
                  <div className="summary-stat"><span>Passed</span><b>{prodPromotion?.passed ?? 0}</b></div>
                  <div className="summary-stat"><span>Failed</span><b>{prodPromotion?.failed ?? 0}</b></div>
                  <div className="summary-stat"><span>PROD gate</span><Badge s={prodGate?.status || (environmentPassed("PROD") ? "PASSED" : "NOT_STARTED")} /></div>
                </div>
                {prodPrecheck && <div className="subsection"><h4>PROD promotion precheck</h4><pre>{JSON.stringify(prodPrecheck, null, 2)}</pre></div>}
                {prodRecon?.run_id && (
                  <div className="subsection">
                    <h4>PROD reconciliation</h4>
                    <div className="deployment-summary">
                      <div className="summary-stat"><span>Status</span><Badge s={prodRecon.status} /></div>
                      <div className="summary-stat"><span>Checked</span><b>{prodRecon.details_count || 0}</b></div>
                      <div className="summary-stat"><span>Passed</span><b>{prodRecon.passed || 0}</b></div>
                      <div className="summary-stat"><span>Failed</span><b>{prodRecon.failed || 0}</b></div>
                    </div>
                  </div>
                )}
                {prodGate && <div className="subsection"><h4>PROD quality gate</h4><pre>{JSON.stringify(prodGate, null, 2)}</pre></div>}
                {environmentPassed("PROD") && (
                  <div className="business-next">
                    <div>
                      <span>BUSINESS OUTCOME</span>
                      <b>Production release validated</b>
                      <p>The migration is technically complete and ready for consumer switch-over.</p>
                    </div>
                    <button className="primary-action" onClick={() => setPage("Cutover")}>
                      Record production cutover and acceptance <ChevronRight size={15} />
                    </button>
                  </div>
                )}
              </Panel>
              </div>
              <Panel title="PROD execution evidence">
                {prodPromotion?.logs?.length ? (
                  <table>
                    <thead><tr><th>Time</th><th>Status</th><th>Target / action</th><th>Artifact version</th></tr></thead>
                    <tbody>{prodPromotion.logs.slice().reverse().map((x: any, i: number) => (
                      <tr key={i}>
                        <td>{x.created_at ? new Date(x.created_at).toLocaleString() : "-"}</td>
                        <td><Badge s={x.status} /></td>
                        <td><code>{x.target_fqn || x.action || "-"}</code></td>
                        <td>{x.artifact_version ? `v${x.artifact_version}` : "-"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                ) : <Empty text="Run PROD Precheck, then promote the approved UAT manifest to PROD." />}
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
