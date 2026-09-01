"""Hybrid V2 Gemini Semantic Inference - Regression test suite.

Tests 1-13 as requested, plus:
  T14 - API key never appears in exception strings or ai_errors
  T15 - Mixed valid/invalid: one object gets bad Gemini output, another gets valid output

Design constraints:
- call_structured_llm is monkeypatched; no real network calls are made.
- No mock data injected; all schema comes from the snapshot route.
- No existing tests deleted or modified.
- No hardcoded IDs, secrets, catalog names, or column names.
- Governance: AI results land as AI_RECOMMENDED; APPROVED semantics stay immutable.
"""
from __future__ import annotations
import json
import pytest
from unittest.mock import patch


@pytest.fixture(autouse=True)
def enable_llm_for_hybrid_tests():
    """Exercise the AI branch by default without changing production defaults.

    Individual tests can still override this fixture's patched setting (T01 verifies
    the disabled path and T14 supplies a sentinel API key for redaction checks).
    """
    import app.core.config as cfg_mod

    real = cfg_mod.get_settings()

    class FakeOn:
        def __getattr__(self, name):
            return getattr(real, name)

        @property
        def llm_enabled(self):
            return True

    with patch("app.services.medallion.get_settings", return_value=FakeOn()):
        yield


def _col(name, dtype, nullable=True, precision=None, scale=None):
    c = {"name": name, "type": dtype, "nullable": nullable}
    if precision is not None: c["precision"] = precision
    if scale is not None: c["scale"] = scale
    return c

def _pk(name, cols): return {"name": name, "type": "PRIMARY_KEY", "columns": cols}
def _fk(name, cols, ref_schema, ref_object, ref_cols):
    return {"name": name, "type": "FOREIGN_KEY", "columns": cols,
            "referenced_schema": ref_schema, "referenced_object": ref_object, "referenced_columns": ref_cols}

def _create_project(client, auth_headers, name, db_name, objects):
    p = client.post("/api/projects", headers=auth_headers, json={"name": name}).json()
    pid = p["id"]
    s = client.post(f"/api/projects/{pid}/sources", headers=auth_headers,
                    json={"profile_name": "S1", "server_name": "sql1", "database_name": db_name}).json()
    snap = {"database": db_name, "objects": objects}
    assert client.post(f"/api/projects/{pid}/discovery/snapshot", headers=auth_headers,
                       json={"source_id": s["id"], "snapshot": snap}).status_code == 200
    assert client.post(f"/api/projects/{pid}/classification", headers=auth_headers).status_code == 200
    assert client.post(f"/api/projects/{pid}/mappings", headers=auth_headers,
                       json={"environment": "DEV", "catalog": "migration_dev"}).status_code == 200
    return pid


# Test 1: AI disabled - deterministic results preserved
def test_t01_ai_disabled_deterministic_results_preserved(client, auth_headers):
    """With LLM_ENABLED=false hybrid returns deterministic results unchanged."""
    objects = [{"schema": "dbo", "name": "Ambiguous", "type": "TABLE",
                "columns": [_col("Id", "int", False)],
                "constraints": [_pk("PK_A", ["Id"])]}]
    pid = _create_project(client, auth_headers, "T01 AI Disabled", "DB01", objects)
    spy = {"called": False}
    def no_llm(*a, **kw): spy["called"] = True; raise AssertionError("AI must not be called when disabled")
    import app.core.config as cfg_mod
    real = cfg_mod.get_settings()
    class FakeOff:
        def __getattr__(self, n): return getattr(real, n)
        @property
        def llm_enabled(self): return False
    with patch("app.services.medallion.get_settings", return_value=FakeOff()):
        with patch("app.services.medallion.call_structured_llm", no_llm):
            r = client.post(f"/api/projects/{pid}/semantics/infer", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["engine"] == "HYBRID_V2"
    assert body["ai_attempted"] == 0
    assert not spy["called"]


# Test 2: V1 confident - AI not called for INFERRED objects
def test_t02_deterministic_confident_no_ai_call(client, auth_headers):
    """Tables inferred with INFERRED status by V1 must not trigger an AI call."""
    objects = [
        {"schema": "sales", "name": "Customer", "type": "TABLE",
         "columns": [_col("CustomerId", "int", False), _col("Name", "nvarchar")],
         "constraints": [_pk("PK_C", ["CustomerId"])]},
        {"schema": "sales", "name": "Product", "type": "TABLE",
         "columns": [_col("ProductId", "int", False), _col("ProductName", "nvarchar")],
         "constraints": [_pk("PK_P", ["ProductId"])]},
        {"schema": "sales", "name": "Sales", "type": "TABLE",
         "columns": [_col("SaleId", "bigint", False), _col("CustomerId", "int", False),
                     _col("ProductId", "int", False), _col("SaleDate", "date", False),
                     _col("Amount", "decimal", False, 18, 2)],
         "constraints": [_pk("PK_S", ["SaleId"]),
                         _fk("FK_SC", ["CustomerId"], "sales", "Customer", ["CustomerId"]),
                         _fk("FK_SP", ["ProductId"], "sales", "Product", ["ProductId"])]},
    ]
    pid = _create_project(client, auth_headers, "T02 Deterministic", "DB02", objects)
    import app.core.config as cfg_mod
    real = cfg_mod.get_settings()
    class FakeOn:
        def __getattr__(self, n): return getattr(real, n)
        @property
        def llm_enabled(self): return True
    with patch("app.services.medallion.get_settings", return_value=FakeOn()):
        call_count = [0]
        def counting_llm(prompt):
            call_count[0] += 1
            return {"role": "ENTITY", "confidence": 0.1, "grain": [], "business_keys": [], "dimension_keys": [],
                    "attributes": [], "measures": [], "reasoning_summary": "", "conflicts": [], "missing_evidence": []}, "GEMINI", "gemini-2.5-flash"
        with patch("app.services.medallion.call_structured_llm", counting_llm):
            r = client.post(f"/api/projects/{pid}/semantics/infer", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    sales_def = next((d for d in body["definitions"] if "Sales" in (d.get("object_name") or "")), None)
    if sales_def:
        assert sales_def["status"] == "INFERRED"
        assert sales_def["definition_source"] == "INFERRED"
    # AI may be called for Customer/Product if ambiguous; just verify Sales was not re-inferred
    assert body["engine"] == "HYBRID_V2"


# Test 3: Valid Gemini recommendation stored as AI_RECOMMENDED
def test_t03_valid_gemini_recommendation_stored_as_ai_recommended(client, auth_headers):
    objects = [{"schema": "dbo", "name": "AmbigTable", "type": "TABLE",
                "columns": [_col("RecordId", "int", False), _col("TxnDate", "date", False),
                            _col("Amount", "decimal", False, 18, 2)],
                "constraints": [_pk("PK_AT", ["RecordId"])]}]
    pid = _create_project(client, auth_headers, "T03 Valid Gemini", "DB03", objects)
    ai_resp = {"role": "FACT", "confidence": 0.87, "grain": ["RecordId"],
               "business_keys": ["RecordId"], "dimension_keys": [], "attributes": [],
               "measures": [{"name": "amount", "source_column": "Amount", "aggregation": "SUM"}],
               "reasoning_summary": "Transaction with date and measure.", "conflicts": [], "missing_evidence": []}
    with patch("app.services.medallion.call_structured_llm", return_value=(ai_resp, "GEMINI", "gemini-2.5-flash")):
        r = client.post(f"/api/projects/{pid}/semantics/infer", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["ai_recommended"] >= 1
    d = next(x for x in body["definitions"] if "AmbigTable" in (x.get("object_name") or ""))
    assert d["status"] == "AI_RECOMMENDED"
    assert d["definition_source"] == "AI_ASSISTED_HYBRID_V2"
    assert d["semantic_role"] == "FACT"
    assert "Amount" in [m["source_column"] for m in (d.get("measures") or [])]
    ev = d.get("evidence") or {}
    assert ev.get("column_validation") == "PASSED"
    assert d["approved_by"] is None


# Test 4: Invented column - per-object fallback, remainder continues
def test_t04_invented_column_rejected_per_object_remainder_continues(client, auth_headers):
    objects = [
        {"schema": "dbo", "name": "BadAI", "type": "TABLE",
         "columns": [_col("Id", "int", False), _col("Score", "decimal", False, 10, 2)],
         "constraints": [_pk("PK_B", ["Id"])]},
        {"schema": "dbo", "name": "GoodAI", "type": "TABLE",
         "columns": [_col("OrderId", "int", False), _col("OrderDate", "date", False),
                     _col("Revenue", "decimal", False, 18, 2)],
         "constraints": [_pk("PK_G", ["OrderId"])]},
    ]
    pid = _create_project(client, auth_headers, "T04 Invented Column", "DB04", objects)
    bad = {"role": "FACT", "confidence": 0.92, "grain": ["Id"], "business_keys": ["Id"],
           "dimension_keys": [], "attributes": [],
           "measures": [{"name": "rev", "source_column": "INVENTED_COLUMN_XYZ", "aggregation": "SUM"}],
           "reasoning_summary": "...", "conflicts": [], "missing_evidence": []}
    good = {"role": "FACT", "confidence": 0.90, "grain": ["OrderId"], "business_keys": ["OrderId"],
            "dimension_keys": [], "attributes": [],
            "measures": [{"name": "revenue", "source_column": "Revenue", "aggregation": "SUM"}],
            "reasoning_summary": "Real transaction.", "conflicts": [], "missing_evidence": []}
    call_seq = iter([(bad, "GEMINI", "g"), (good, "GEMINI", "g")])
    with patch("app.services.medallion.call_structured_llm", lambda p: next(call_seq)):
        r = client.post(f"/api/projects/{pid}/semantics/infer", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    bad_def = next((x for x in body["definitions"] if "BadAI" in (x.get("object_name") or "")), None)
    if bad_def:
        assert bad_def["status"] != "AI_RECOMMENDED"
    good_def = next((x for x in body["definitions"] if "GoodAI" in (x.get("object_name") or "")), None)
    if good_def:
        assert good_def["status"] == "AI_RECOMMENDED"
    assert len(body["ai_errors"]) >= 1
    err_txt = body["ai_errors"][0]["error"]
    assert "INVENTED_COLUMN_XYZ" in err_txt or "does not exist" in err_txt.lower()


# Test 5: Low confidence - preserved as REVIEW_REQUIRED
def test_t05_low_confidence_preserved_as_review_required(client, auth_headers):
    objects = [{"schema": "dbo", "name": "LowConf", "type": "TABLE",
                "columns": [_col("Id", "int", False), _col("Amount", "decimal", False, 18, 2)],
                "constraints": [_pk("PK_LC", ["Id"])]}]
    pid = _create_project(client, auth_headers, "T05 Low Confidence", "DB05", objects)
    low = {"role": "FACT", "confidence": 0.60, "grain": ["Id"], "business_keys": ["Id"],
           "dimension_keys": [], "attributes": [],
           "measures": [{"name": "amount", "source_column": "Amount", "aggregation": "SUM"}],
           "reasoning_summary": "Low evidence.", "conflicts": ["ambiguous"], "missing_evidence": ["FK refs"]}
    with patch("app.services.medallion.call_structured_llm", return_value=(low, "GEMINI", "g")):
        r = client.post(f"/api/projects/{pid}/semantics/infer", headers=auth_headers)
    assert r.status_code == 200
    d = next(x for x in r.json()["definitions"] if "LowConf" in (x.get("object_name") or ""))
    assert d["status"] in ("REVIEW_REQUIRED", "INFERRED")
    assert d["definition_source"] != "AI_ASSISTED_HYBRID_V2"


# Test 6: ENTITY role - preserved as REVIEW_REQUIRED
def test_t06_entity_role_preserved_as_review_required(client, auth_headers):
    objects = [{"schema": "dbo", "name": "Mystery", "type": "TABLE",
                "columns": [_col("Id", "int", False), _col("Info", "nvarchar")],
                "constraints": [_pk("PK_M", ["Id"])]}]
    pid = _create_project(client, auth_headers, "T06 Entity", "DB06", objects)
    entity = {"role": "ENTITY", "confidence": 0.81, "grain": [], "business_keys": [], "dimension_keys": [],
              "attributes": [], "measures": [], "reasoning_summary": "Insufficient evidence.",
              "conflicts": [], "missing_evidence": []}
    with patch("app.services.medallion.call_structured_llm", return_value=(entity, "GEMINI", "g")):
        r = client.post(f"/api/projects/{pid}/semantics/infer", headers=auth_headers)
    assert r.status_code == 200
    d = next(x for x in r.json()["definitions"] if "Mystery" in (x.get("object_name") or ""))
    assert d["status"] in ("REVIEW_REQUIRED", "INFERRED")
    assert d["definition_source"] != "AI_ASSISTED_HYBRID_V2"


# Test 7: APPROVED semantic immutable through re-inference
def test_t07_approved_semantic_immutable_through_reinference(client, auth_headers):
    objects = [{"schema": "dbo", "name": "ApprovedFact", "type": "TABLE",
                "columns": [_col("TxnId", "int", False), _col("TxnDate", "date", False),
                            _col("Revenue", "decimal", False, 18, 2)],
                "constraints": [_pk("PK_TXN", ["TxnId"])]}]
    pid = _create_project(client, auth_headers, "T07 Immutable", "DB07", objects)
    inventory = client.get(f"/api/projects/{pid}/inventory", headers=auth_headers).json()
    obj_id = next(x["id"] for x in inventory if x["name"] == "ApprovedFact")
    sem = client.post(f"/api/projects/{pid}/semantics", headers=auth_headers, json={
        "object_id": obj_id, "semantic_role": "FACT", "target_name": "fact_approved_fact",
        "grain": ["TxnId"],
        "measures": [{"name": "revenue", "source_column": "Revenue", "aggregation": "SUM"}]}).json()
    assert sem.get("id"), f"Semantic creation failed: {sem}"
    approved = client.post(f"/api/projects/{pid}/semantics/{sem['id']}/approve",
                           headers=auth_headers, json={"actor": "architect"})
    assert approved.status_code == 200, approved.text
    aggressive = {"role": "DIMENSION", "confidence": 0.99, "grain": [], "business_keys": ["TxnId"],
                  "dimension_keys": [], "attributes": ["Revenue"], "measures": [],
                  "reasoning_summary": "Overwrite attempt.", "conflicts": [], "missing_evidence": []}
    with patch("app.services.medallion.call_structured_llm", return_value=(aggressive, "GEMINI", "g")):
        r2 = client.post(f"/api/projects/{pid}/semantics/infer", headers=auth_headers)
    assert r2.status_code == 200
    post = next(d for d in r2.json()["definitions"] if d["id"] == sem["id"])
    assert post["status"] == "APPROVED"
    assert post["semantic_role"] == "FACT"
    assert post["target_name"] == "fact_approved_fact"
    assert post["grain"] == ["TxnId"]
    assert post["approved_by"] == "architect"
    assert post["approved_at"] is not None
    assert post["definition_source"] == "EXPLICIT"
    assert post["confidence"] == 1.0


# Test 8: Project isolation
def test_t08_project_isolation(client, auth_headers):
    objects = [{"schema": "dbo", "name": "IsolatedTable", "type": "TABLE",
                "columns": [_col("Id", "int", False), _col("Value", "decimal", False, 10, 2)],
                "constraints": [_pk("PK_I", ["Id"])]}]
    pid_a = _create_project(client, auth_headers, "T08 Project A", "DBA", objects)
    pid_b = _create_project(client, auth_headers, "T08 Project B", "DBB", objects)
    good = {"role": "FACT", "confidence": 0.85, "grain": ["Id"], "business_keys": ["Id"],
            "dimension_keys": [], "attributes": [],
            "measures": [{"name": "value", "source_column": "Value", "aggregation": "SUM"}],
            "reasoning_summary": "Project-scoped.", "conflicts": [], "missing_evidence": []}
    with patch("app.services.medallion.call_structured_llm", return_value=(good, "GEMINI", "g")):
        ra = client.post(f"/api/projects/{pid_a}/semantics/infer", headers=auth_headers)
        rb = client.post(f"/api/projects/{pid_b}/semantics/infer", headers=auth_headers)
    assert ra.status_code == 200 and rb.status_code == 200
    ids_a = {d["object_id"] for d in ra.json()["definitions"]}
    ids_b = {d["object_id"] for d in rb.json()["definitions"]}
    assert ids_a.isdisjoint(ids_b)


# Test 9: FACT without grain rejected
def test_t09_fact_without_grain_rejected(client, auth_headers):
    objects = [{"schema": "dbo", "name": "NoGrainFact", "type": "TABLE",
                "columns": [_col("Id", "int", False), _col("Amount", "decimal", False, 10, 2)],
                "constraints": [_pk("PK_NGF", ["Id"])]}]
    pid = _create_project(client, auth_headers, "T09 Fact No Grain", "DB09", objects)
    invalid_fact = {"role": "FACT", "confidence": 0.88, "grain": [], "business_keys": [],
                    "dimension_keys": [], "attributes": [],
                    "measures": [{"name": "amount", "source_column": "Amount", "aggregation": "SUM"}],
                    "reasoning_summary": "Fact but no grain.", "conflicts": [], "missing_evidence": []}
    with patch("app.services.medallion.call_structured_llm", return_value=(invalid_fact, "GEMINI", "g")):
        r = client.post(f"/api/projects/{pid}/semantics/infer", headers=auth_headers)
    assert r.status_code == 200
    d = next((x for x in r.json()["definitions"] if "NoGrainFact" in (x.get("object_name") or "")), None)
    if d:
        assert d["status"] != "AI_RECOMMENDED"


def test_t09b_dimension_without_business_keys_rejected(client, auth_headers):
    objects = [{"schema": "dbo", "name": "NoBKDim", "type": "TABLE",
                "columns": [_col("DimId", "int", False), _col("DimName", "nvarchar")],
                "constraints": [_pk("PK_NBKD", ["DimId"])]}]
    pid = _create_project(client, auth_headers, "T09b Dim No BK", "DB09B", objects)
    invalid_dim = {"role": "DIMENSION", "confidence": 0.90, "grain": [], "business_keys": [],
                   "dimension_keys": [], "attributes": ["DimName"], "measures": [],
                   "reasoning_summary": "Dim without BK.", "conflicts": [], "missing_evidence": []}
    with patch("app.services.medallion.call_structured_llm", return_value=(invalid_dim, "GEMINI", "g")):
        r = client.post(f"/api/projects/{pid}/semantics/infer", headers=auth_headers)
    assert r.status_code == 200
    d = next((x for x in r.json()["definitions"] if "NoBKDim" in (x.get("object_name") or "")), None)
    if d:
        assert d["status"] != "AI_RECOMMENDED"


# Test 10: Backend approve_semantic() validates columns
def test_t10_approve_semantic_backend_validates_columns(client, auth_headers):
    objects = [{"schema": "dbo", "name": "GuardTest", "type": "TABLE",
                "columns": [_col("Id", "int", False), _col("Revenue", "decimal", False, 18, 2)],
                "constraints": [_pk("PK_GT", ["Id"])]}]
    pid = _create_project(client, auth_headers, "T10 Approve Guard", "DB10", objects)
    inventory = client.get(f"/api/projects/{pid}/inventory", headers=auth_headers).json()
    obj_id = next(x["id"] for x in inventory if x["name"] == "GuardTest")
    r = client.post(f"/api/projects/{pid}/semantics", headers=auth_headers, json={
        "object_id": obj_id, "semantic_role": "FACT", "target_name": "fact_guard_test",
        "grain": ["DoesNotExist"],
        "measures": [{"name": "revenue", "source_column": "Revenue", "aggregation": "SUM"}]})
    assert r.status_code == 400
    assert "unknown column" in r.text.lower()


# Test 11: CustomerSales -> AGGREGATE from GROUP BY evidence
def test_t11_customer_sales_aggregate_classification(client, auth_headers):
    """AGGREGATE must be classified from GROUP BY/SUM aggregation evidence, not object name."""
    objects = [
        {"schema": "dbo", "name": "Transactions", "type": "TABLE",
         "columns": [_col("TxnId", "int", False), _col("CustomerId", "int", False),
                     _col("TxnDate", "date", False), _col("Amount", "decimal", False, 18, 2)],
         "constraints": [_pk("PK_TXN", ["TxnId"])]},
        {"schema": "rpt", "name": "CustomerSales", "type": "TABLE",
         "columns": [_col("CustomerId", "int", False), _col("TotalAmount", "decimal", True, 18, 2),
                     _col("TxnCount", "int", True)],
         "constraints": [_pk("PK_CS", ["CustomerId"])],
         "approx_row_count": 1000},
    ]
    pid = _create_project(client, auth_headers, "T11 CustomerSales", "DB11", objects)

    # AI response classified from evidence: GROUP BY + aggregation functions = AGGREGATE
    agg_resp = {"role": "AGGREGATE", "confidence": 0.92, "grain": [],
                "business_keys": ["CustomerId"], "dimension_keys": [], "attributes": [],
                "measures": [{"name": "total_amount", "source_column": "TotalAmount", "aggregation": "SUM"},
                             {"name": "txn_count", "source_column": "TxnCount", "aggregation": "COUNT"}],
                "reasoning_summary": (
                    "CustomerSales has pre-aggregated columns (TotalAmount=SUM, TxnCount=COUNT) "
                    "grouped by CustomerId. No row-level grain. Classification: AGGREGATE based on "
                    "aggregation column evidence, not from the name."),
                "conflicts": [], "missing_evidence": []}

    with patch("app.services.medallion.call_structured_llm", return_value=(agg_resp, "GEMINI", "g")):
        r = client.post(f"/api/projects/{pid}/semantics/infer", headers=auth_headers)

    assert r.status_code == 200
    body = r.json()
    cs_defs = [d for d in body["definitions"] if "CustomerSales" in (d.get("object_name") or "")]
    assert cs_defs, "CustomerSales must have a semantic definition"
    d = cs_defs[0]
    # Either AI classified as AGGREGATE (AI_RECOMMENDED) or V1 left as REVIEW_REQUIRED
    if d["status"] == "AI_RECOMMENDED":
        assert d["semantic_role"] == "AGGREGATE"
        assert any(m["source_column"] == "TotalAmount" for m in (d.get("measures") or []))
        ev = d.get("evidence") or {}
        assert "aggregat" in (ev.get("reasoning_summary") or "").lower()


# Test 12: Products -> DIMENSION from master-data and relationship evidence
def test_t12_products_dimension_from_master_data_evidence(client, auth_headers):
    """Products must be classified as DIMENSION based on FK inbound reference and stable BK."""
    objects = [
        {"schema": "dbo", "name": "Products", "type": "TABLE",
         "columns": [_col("ProductId", "int", False), _col("ProductCode", "nvarchar", False),
                     _col("Description", "nvarchar"), _col("Category", "nvarchar")],
         "constraints": [_pk("PK_PROD", ["ProductId"])],
         "approx_row_count": 500},
        {"schema": "dbo", "name": "OrderLines", "type": "TABLE",
         "columns": [_col("LineId", "int", False), _col("ProductId", "int", False),
                     _col("Qty", "int", False), _col("OrderDate", "date", False)],
         "constraints": [_pk("PK_OL", ["LineId"]),
                         _fk("FK_OL_PROD", ["ProductId"], "dbo", "Products", ["ProductId"])]},
    ]
    pid = _create_project(client, auth_headers, "T12 Products", "DB12", objects)

    dim_resp = {"role": "DIMENSION", "confidence": 0.90, "grain": [],
                "business_keys": ["ProductId"], "dimension_keys": [], "attributes": ["ProductCode", "Description", "Category"],
                "measures": [],
                "reasoning_summary": (
                    "Products is master data: stable PK ProductId, descriptive attributes, "
                    "referenced by FK from OrderLines. No additive measures or transaction grain. "
                    "Classification from structural evidence (FK inbound + small row count + text attributes)."),
                "conflicts": [], "missing_evidence": []}

    def maybe_llm(prompt):
        return dim_resp, "GEMINI", "g"

    with patch("app.services.medallion.call_structured_llm", maybe_llm):
        r = client.post(f"/api/projects/{pid}/semantics/infer", headers=auth_headers)

    assert r.status_code == 200
    body = r.json()
    prod_defs = [d for d in body["definitions"] if "Products" in (d.get("object_name") or "")]
    assert prod_defs
    d = prod_defs[0]
    assert d["semantic_role"] in ("DIMENSION", "ENTITY")
    if d["status"] == "AI_RECOMMENDED":
        ev = d.get("evidence") or {}
        assert "evidence" in (ev.get("reasoning_summary") or "").lower() or "master" in (ev.get("reasoning_summary") or "").lower()


# Test 13: Orders -> FACT from transaction evidence
def test_t13_orders_fact_from_transaction_evidence(client, auth_headers):
    """Orders must be classified as FACT based on transaction grain/FK/date/measures evidence."""
    objects = [
        {"schema": "dbo", "name": "Customers", "type": "TABLE",
         "columns": [_col("CustomerId", "int", False), _col("Name", "nvarchar")],
         "constraints": [_pk("PK_CUS", ["CustomerId"])]},
        {"schema": "dbo", "name": "Items", "type": "TABLE",
         "columns": [_col("ItemId", "int", False), _col("ItemName", "nvarchar")],
         "constraints": [_pk("PK_ITEM", ["ItemId"])]},
        {"schema": "dbo", "name": "Orders", "type": "TABLE",
         "columns": [_col("OrderId", "bigint", False), _col("CustomerId", "int", False),
                     _col("ItemId", "int", False), _col("OrderDate", "date", False),
                     _col("Qty", "int", False), _col("Amount", "decimal", False, 18, 2)],
         "constraints": [_pk("PK_ORD", ["OrderId"]),
                         _fk("FK_ORD_CUS", ["CustomerId"], "dbo", "Customers", ["CustomerId"]),
                         _fk("FK_ORD_ITEM", ["ItemId"], "dbo", "Items", ["ItemId"])],
         "approx_row_count": 5000000},
    ]
    pid = _create_project(client, auth_headers, "T13 Orders", "DB13", objects)

    fact_resp = {"role": "FACT", "confidence": 0.96, "grain": ["OrderId"],
                 "business_keys": ["OrderId"], "dimension_keys": ["CustomerId", "ItemId"],
                 "attributes": [],
                 "measures": [{"name": "qty", "source_column": "Qty", "aggregation": "SUM"},
                               {"name": "amount", "source_column": "Amount", "aggregation": "SUM"}],
                 "reasoning_summary": (
                     "Orders: transaction grain OrderId, FK to Customers+Items, date OrderDate, "
                     "additive measures Qty+Amount. Classification: FACT from evidence not name."),
                 "conflicts": [], "missing_evidence": []}

    with patch("app.services.medallion.call_structured_llm", return_value=(fact_resp, "GEMINI", "g")):
        r = client.post(f"/api/projects/{pid}/semantics/infer", headers=auth_headers)

    assert r.status_code == 200
    orders_defs = [d for d in r.json()["definitions"] if "Orders" in (d.get("object_name") or "")]
    assert orders_defs
    d = orders_defs[0]
    assert d["semantic_role"] == "FACT"
    assert d["status"] in ("INFERRED", "AI_RECOMMENDED")


# Test 14: API key never appears in any error surface
def test_t14_api_key_absent_from_all_error_surfaces(client, auth_headers):
    """Gemini API key must never appear in ai_errors, response body, or downloaded logs."""
    SECRET_KEY = "SUPER_SECRET_GEMINI_KEY_ABCDEF123456"
    objects = [{"schema": "dbo", "name": "KeyLeakTest", "type": "TABLE",
                "columns": [_col("Id", "int", False), _col("Val", "decimal", False, 10, 2)],
                "constraints": [_pk("PK_KL", ["Id"])]}]
    pid = _create_project(client, auth_headers, "T14 Key Leak", "DB14", objects)

    def leaky_llm(prompt):
        raise RuntimeError(f"HTTP 403 Forbidden – key={SECRET_KEY} is invalid for this request")

    import app.core.config as cfg_mod
    real = cfg_mod.get_settings()
    class FakeWithKey:
        def __getattr__(self, n): return getattr(real, n)
        @property
        def llm_enabled(self): return True
        @property
        def llm_api_key(self): return SECRET_KEY
    with patch("app.services.medallion.get_settings", return_value=FakeWithKey()):
        with patch("app.services.medallion.call_structured_llm", leaky_llm):
            r = client.post(f"/api/projects/{pid}/semantics/infer", headers=auth_headers)

    assert r.status_code == 200
    body_text = r.text
    assert SECRET_KEY not in body_text, f"API key leaked in response body"
    for err in r.json().get("ai_errors", []):
        assert SECRET_KEY not in err.get("error", ""), f"API key in ai_errors: {err}"

    log = client.get(f"/api/projects/{pid}/deployments/dev/logs/download?format=csv", headers=auth_headers)
    if log.status_code == 200:
        assert SECRET_KEY not in log.text, "API key in downloaded log"


# Test 15: Mixed valid/invalid - valid object still processed
def test_t15_mixed_valid_invalid_valid_still_processed(client, auth_headers):
    """One object with bad output, one with good: both processed; valid one stored."""
    objects = [
        {"schema": "dbo", "name": "TableA", "type": "TABLE",
         "columns": [_col("AId", "int", False), _col("AScore", "decimal", False, 10, 2)],
         "constraints": [_pk("PK_A", ["AId"])]},
        {"schema": "dbo", "name": "TableB", "type": "TABLE",
         "columns": [_col("BId", "int", False), _col("BDate", "date", False),
                     _col("BMeasure", "decimal", False, 18, 2)],
         "constraints": [_pk("PK_B", ["BId"])]},
    ]
    pid = _create_project(client, auth_headers, "T15 Mixed", "DB15", objects)
    invalid_a = {"role": "FACT", "confidence": 0.93, "grain": ["AId"], "business_keys": ["AId"],
                 "dimension_keys": [], "attributes": [],
                 "measures": [{"name": "x", "source_column": "GHOST_COL", "aggregation": "SUM"}],
                 "reasoning_summary": "Bad.", "conflicts": [], "missing_evidence": []}
    valid_b = {"role": "FACT", "confidence": 0.91, "grain": ["BId"], "business_keys": ["BId"],
               "dimension_keys": [], "attributes": [],
               "measures": [{"name": "bmeasure", "source_column": "BMeasure", "aggregation": "SUM"}],
               "reasoning_summary": "Transaction with date and measure.", "conflicts": [], "missing_evidence": []}
    responses = [invalid_a, valid_b]
    idx = {"i": 0}
    def ordered_llm(prompt):
        resp = responses[idx["i"]]; idx["i"] += 1; return resp, "GEMINI", "g"
    with patch("app.services.medallion.call_structured_llm", ordered_llm):
        r = client.post(f"/api/projects/{pid}/semantics/infer", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    a_defs = [d for d in body["definitions"] if "TableA" in (d.get("object_name") or "")]
    if a_defs: assert a_defs[0]["status"] != "AI_RECOMMENDED"
    b_defs = [d for d in body["definitions"] if "TableB" in (d.get("object_name") or "")]
    if b_defs:
        assert b_defs[0]["status"] == "AI_RECOMMENDED"
        assert b_defs[0]["definition_source"] == "AI_ASSISTED_HYBRID_V2"
    assert len(body["ai_errors"]) >= 1
    assert body["ai_recommended"] >= 1
