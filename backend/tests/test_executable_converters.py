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
    assert '-- NON_EXECUTABLE:' not in sp.content


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
