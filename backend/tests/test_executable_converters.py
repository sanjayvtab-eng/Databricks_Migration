from sqlalchemy import select
from app.services.engine import ensure_project, add_source, ingest_snapshot, classify_project, create_mappings, generate_artifact, uid
from app.services import deployment
from app.models.entities import MigrationObject, MigrationReview


def _seed_routines(db):
    p=ensure_project(db,'Routine conversion')
    s=add_source(db,p.id,'src','server','DB1')
    snapshot={'database':'DB1','objects':[
        {'schema':'dbo','name':'Orders','type':'TABLE','columns':[{'name':'OrderId','type':'int'},{'name':'CustomerId','type':'int'},{'name':'Amount','type':'decimal','precision':18,'scale':2}]},
        {'schema':'dbo','name':'fn_OrderTotal','type':'FUNCTION','definition':'CREATE FUNCTION dbo.fn_OrderTotal(@CustomerId int) RETURNS decimal(18,2) AS BEGIN RETURN (SELECT COALESCE(SUM(Amount),0) FROM dbo.Orders WHERE CustomerId=@CustomerId); END','parameters':[{'name':'@CustomerId','ordinal':1,'type':'int'}]},
        {'schema':'dbo','name':'usp_GetCustomerOrders','type':'PROCEDURE','definition':'CREATE PROCEDURE dbo.usp_GetCustomerOrders @CustomerId int AS BEGIN SET NOCOUNT ON; SELECT OrderId, Amount FROM dbo.Orders WHERE CustomerId=@CustomerId; END','parameters':[{'name':'@CustomerId','ordinal':1,'type':'int','is_output':False}]},
        {'schema':'dbo','name':'usp_DailySalesETL','type':'PROCEDURE','definition':'CREATE PROCEDURE dbo.usp_DailySalesETL AS BEGIN EXEC dbo.usp_GetCustomerOrders; END','parameters':[]},
    ]}
    ingest_snapshot(db,p.id,s.id,snapshot); classify_project(db,p.id); create_mappings(db,p.id,'DEV','migration_dev')
    return p


def test_function_and_procedure_generate_executable_artifacts(db):
    p=_seed_routines(db)
    objs={o.object_name:o for o in db.scalars(select(MigrationObject).where(MigrationObject.project_id==p.id)).all()}
    fn=generate_artifact(db,p.id,objs['fn_OrderTotal'].id)
    sp=generate_artifact(db,p.id,objs['usp_GetCustomerOrders'].id)
    assert 'CREATE OR REPLACE FUNCTION' in fn.content
    assert '-- NON_EXECUTABLE:' not in fn.content
    assert '`migration_dev`.`bronze`.`Orders`' in fn.content
    assert 'CREATE OR REPLACE PROCEDURE' in sp.content
    assert 'LANGUAGE SQL' in sp.content
    assert 'SQL SECURITY INVOKER' in sp.content
    assert '-- NON_EXECUTABLE:' not in sp.content

    orchestration=generate_artifact(db,p.id,objs['usp_DailySalesETL'].id)
    assert 'CALL `migration_dev`.`silver`.`usp_GetCustomerOrders`();' in orchestration.content
    assert 'SQL SECURITY INVOKER' in orchestration.content
    assert 'EXEC ' not in orchestration.content.upper()
    assert '-- NON_EXECUTABLE:' not in orchestration.content


def test_static_validation_rejects_procedure_missing_databricks_security_clause(db):
    from app.services.engine import static_validate

    p = _seed_routines(db)
    obj = db.scalar(select(MigrationObject).where(
        MigrationObject.project_id == p.id,
        MigrationObject.object_name == 'usp_GetCustomerOrders',
    ))
    version = generate_artifact(db, p.id, obj.id)
    version.content = version.content.replace('\nSQL SECURITY INVOKER', '')
    version.target_hash = 'missing-security-clause'
    db.commit()

    result = static_validate(db, p.id, obj.id, 'DEV')
    assert result['status'] == 'FAILED'
    assert result['artifact_version_id'] == version.id
    assert any('SQL SECURITY INVOKER' in issue for issue in result['issues'])


def test_ai_procedure_candidate_gets_safe_security_clause_before_acceptance(db):
    from app.services.ai_remediation import validate_candidate_content
    from app.models.entities import MigrationMapping

    p = _seed_routines(db)
    obj = db.scalar(select(MigrationObject).where(
        MigrationObject.project_id == p.id,
        MigrationObject.object_name == 'usp_GetCustomerOrders',
    ))
    mapping = db.scalar(select(MigrationMapping).where(
        MigrationMapping.project_id == p.id,
        MigrationMapping.object_id == obj.id,
        MigrationMapping.environment == 'DEV',
    ))
    candidate = (
        f'CREATE OR REPLACE PROCEDURE {mapping.target_fqn}()\n'
        'LANGUAGE SQL\nAS BEGIN\nSELECT 1;\nEND;'
    )

    result = validate_candidate_content(obj, mapping, candidate)
    assert result['valid'] is True
    assert 'LANGUAGE SQL\nSQL SECURITY INVOKER\nAS BEGIN' in result['normalized_candidate']


def test_precheck_deduplicates_blockers(db):
    p=_seed_routines(db)
    objs=db.scalars(select(MigrationObject).where(MigrationObject.project_id==p.id)).all()
    for obj in objs:
        av=generate_artifact(db,p.id,obj.id)
        db.add(MigrationReview(id=uid('REV'),project_id=p.id,artifact_version_id=av.id,review_type='ARCHITECT_REVIEW',status='APPROVED',reviewer='tester'))
    db.commit()
    r=deployment.dev_precheck(db,p.id,test_databricks=False)
    keys=[(x['code'],x['message']) for x in r['blockers']]
    assert len(keys)==len(set(keys))
    assert not any(x['code']=='NON_EXECUTABLE_ARTIFACT' for x in r['blockers'])


def test_ai_function_candidate_replaces_contains_sql_with_reads_sql_data(db):
    from app.services.ai_remediation import validate_candidate_content
    from app.services.engine import databricks_routine_contract_issues
    from app.models.entities import MigrationMapping

    p = _seed_routines(db)
    obj = db.scalar(select(MigrationObject).where(
        MigrationObject.project_id == p.id,
        MigrationObject.object_name == 'fn_OrderTotal',
    ))
    mapping = db.scalar(select(MigrationMapping).where(
        MigrationMapping.project_id == p.id,
        MigrationMapping.object_id == obj.id,
        MigrationMapping.environment == 'DEV',
    ))
    # Unnormalized candidate with CONTAINS SQL querying a table
    raw_candidate = (
        f'CREATE OR REPLACE FUNCTION {mapping.target_fqn}(OrderID INT)\n'
        'RETURNS DECIMAL(18,2)\n'
        'LANGUAGE SQL\n'
        'CONTAINS SQL\n'
        'RETURN (\n'
        f'  SELECT COALESCE(SUM(Amount), CAST(0 AS DECIMAL(18,2)))\n'
        f'  FROM `migration_dev`.`bronze`.`Orders` AS t\n'
        '  WHERE t.OrderId = OrderID\n'
        ');'
    )
    # Raw issues should flag CONTAINS SQL on a table-reading function
    issues = databricks_routine_contract_issues(raw_candidate, 'FUNCTION')
    assert any('READS SQL DATA' in x for x in issues)

    # Validation should normalize CONTAINS SQL to READS SQL DATA
    result = validate_candidate_content(obj, mapping, raw_candidate)
    assert result['valid'] is True
    assert 'READS SQL DATA' in result['normalized_candidate']
    assert 'CONTAINS SQL' not in result['normalized_candidate']
