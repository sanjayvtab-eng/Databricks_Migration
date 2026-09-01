from __future__ import annotations
import re

TYPE_MAP = {
    "bigint":"BIGINT", "int":"INT", "smallint":"SMALLINT", "tinyint":"SMALLINT",
    "bit":"BOOLEAN", "float":"DOUBLE", "real":"FLOAT", "char":"STRING", "varchar":"STRING",
    "text":"STRING", "nchar":"STRING", "nvarchar":"STRING", "ntext":"STRING", "date":"DATE",
    "datetime":"TIMESTAMP", "datetime2":"TIMESTAMP", "smalldatetime":"TIMESTAMP",
    "uniqueidentifier":"STRING", "binary":"BINARY", "varbinary":"BINARY", "image":"BINARY",
    "xml":"STRING", "timestamp":"BINARY", "rowversion":"BINARY",
    "datetimeoffset":"STRING", "sysname":"STRING", "hierarchyid":"STRING", "json":"STRING"
}

def map_sqlserver_type(name: str, precision: int|None=None, scale: int|None=None) -> str:
    raw = name.lower().strip().replace("[", "").replace("]", "")
    declared = re.fullmatch(r"([a-z0-9_]+)\s*\(\s*(max|\d+)\s*(?:,\s*(\d+)\s*)?\)", raw)
    n = declared.group(1) if declared else raw
    if n in {"decimal","numeric"}:
        declared_precision = int(declared.group(2)) if declared and declared.group(2).isdigit() else None
        declared_scale = int(declared.group(3)) if declared and declared.group(3) else None
        return f"DECIMAL({precision or declared_precision or 38},{scale if scale is not None else (declared_scale or 0)})"
    if n in {"money","smallmoney"}: return "DECIMAL(19,4)"
    if n == "time": return "STRING"
    if n in {"sql_variant","geography","geometry"}: return "STRING"
    return TYPE_MAP.get(n, "STRING")

def classify_layer(object_type: str, definition: str|None="", name: str="") -> tuple[str,float,str]:
    t = object_type.upper(); d=(definition or "").lower(); n=name.lower()
    score_gold = 0
    if any(k in d for k in ["group by","sum(","avg(","count(","rollup","cube"]): score_gold += 2
    if any(k in n for k in ["fact","dim","aggregate","agg_","kpi","report","semantic"]): score_gold += 2
    if t in {"VIEW","PROCEDURE","FUNCTION"} and any(k in d for k in ["join ","case ","row_number(","dense_rank("]):
        if score_gold < 2: return "SILVER",0.82,"Reusable transformation/business logic detected"
    if score_gold >= 3: return "GOLD",0.86,"Reporting/dimensional/aggregation signals detected"
    if t == "TABLE": return "BRONZE",0.80,"Source-aligned persistent table candidate"
    if t in {"TRIGGER"}: return "SILVER",0.55,"Trigger requires architectural review; Silver is only a planning placeholder"
    return "SILVER",0.70,"Reusable non-table transformation object"

def classify_procedure(definition: str) -> tuple[str,str]:
    d=definition.lower()
    if "cursor" in d: return "MANUAL_REVIEW","Notebook or Workflow redesign"
    if "begin tran" in d or "transaction" in d: return "OPERATIONAL_TRANSACTION","Manual redesign"
    if "merge " in d or any(k in d for k in ["insert ","update ","delete "]): return "ETL_LOAD","Databricks SQL or PySpark/Lakeflow"
    if any(k in d for k in ["select ","group by","having"]): return "REPORTING_QUERY","Databricks SQL"
    return "UNSUPPORTED","Manual review"

def classify_function(definition: str) -> tuple[str,str]:
    d=definition.lower()
    if "returns table" in d and "begin" not in d: return "INLINE_TVF","VIEW_OR_SQL_FUNCTION"
    if "returns @" in d or ("returns table" in d and "begin" in d): return "MULTI_STATEMENT_TVF","PYSPARK_OR_TRANSFORMATION"
    return "SCALAR_UDF","SQL_FUNCTION_OR_EXPRESSION"

def classify_trigger(definition: str) -> tuple[str,str]:
    d=definition.lower()
    if "audit" in d or "history" in d: return "AUDIT","CDF or audit pipeline"
    if "raiserror" in d or "throw" in d: return "VALIDATION","Constraint/expectation/application logic"
    if any(k in d for k in ["send","mail","notify"]): return "NOTIFICATION","Workflow/notification integration"
    return "OPERATIONAL_SIDE_EFFECT","ARCHITECT_REVIEW"

def rewrite_common_tsql(sql: str) -> str:
    out = re.sub(r"\bGETDATE\s*\(\s*\)", "current_timestamp()", sql, flags=re.I)
    out = re.sub(r"\bISNULL\s*\(", "coalesce(", out, flags=re.I)
    out = re.sub(r"\[([^\]]+)\]", r"`\1`", out)
    out = re.sub(r"\bTOP\s*\(?(\d+)\)?\s+", "", out, flags=re.I)
    return out
