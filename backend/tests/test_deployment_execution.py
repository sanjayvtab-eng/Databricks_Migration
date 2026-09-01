from sqlalchemy import select
from app.services.engine import ensure_project, add_source, ingest_snapshot, classify_project, create_mappings, generate_artifact, uid
from app.services import deployment
from app.models.entities import MigrationArtifactVersion, MigrationReview, MigrationRun, MigrationQualityGate


def seed_approved(db, name='Deploy P'):
    p=ensure_project(db,name); s=add_source(db,p.id,'src','server','DB1')
    snap={'database':'DB1','objects':[{'schema':'sales','name':'Orders','type':'TABLE','columns':[{'name':'OrderId','type':'int','nullable':False}]}]}
    ingest_snapshot(db,p.id,s.id,snap); classify_project(db,p.id); create_mappings(db,p.id,'DEV','cat_dev')
    obj=db.scalar(select(deployment.MigrationObject).where(deployment.MigrationObject.project_id==p.id))
    av=generate_artifact(db,p.id,obj.id)
    db.add(MigrationReview(id=uid('REV'),project_id=p.id,artifact_version_id=av.id,review_type='ARCHITECT_REVIEW',status='APPROVED',reviewer='tester'))
    db.commit(); return p,obj,av


def test_dev_precheck_requires_current_approval(db):
    p=ensure_project(db,'No approval'); s=add_source(db,p.id,'src','server','DB1')
    ingest_snapshot(db,p.id,s.id,{'database':'DB1','objects':[{'schema':'dbo','name':'T','type':'TABLE','columns':[{'name':'Id','type':'int'}]}]})
    classify_project(db,p.id); create_mappings(db,p.id,'DEV','cat_dev')
    obj=db.scalar(select(deployment.MigrationObject).where(deployment.MigrationObject.project_id==p.id)); generate_artifact(db,p.id,obj.id)
    r=deployment.dev_precheck(db,p.id,test_databricks=False)
    assert not r['eligible'] and any(x['code']=='APPROVAL' for x in r['blockers'])


def test_dev_deployment_records_evidence_and_can_gate(db,monkeypatch):
    p,obj,av=seed_approved(db)
    monkeypatch.setattr(deployment,'dev_precheck',lambda *a,**k:{'eligible':True,'blockers':[]})
    monkeypatch.setattr(deployment,'execute_sql',lambda *a,**k:[])
    monkeypatch.setattr(deployment,'_apply_table_schema_policy',lambda *a,**k:{'action':'CREATE','schema_status':'MISSING'})
    monkeypatch.setattr(deployment,'_safe_execute_artifact',lambda content:None)
    monkeypatch.setattr(deployment,'load_bronze_table',lambda *a,**k:{'status':'PASSED','rows':7})
    r=deployment.deploy_dev(db,p.id)
    assert r['status']=='PASSED'
    status=deployment.deployment_status(db,p.id)
    assert status['status']=='PASSED' and status['passed']==1
    # add passed reconciliation evidence then gate must pass
    from app.models.canonical import MigrationReconciliation
    db.add(MigrationReconciliation(id=uid('REC'),project_id=p.id,environment='DEV',status='PASSED',payload_json='{}'));db.commit()
    g=deployment.evaluate_dev_gate(db,p.id)
    assert g['status']=='PASSED'


def test_failed_run_preserves_state_for_resume(db,monkeypatch):
    p,obj,av=seed_approved(db,'Resume P')
    monkeypatch.setattr(deployment,'dev_precheck',lambda *a,**k:{'eligible':True,'blockers':[]})
    monkeypatch.setattr(deployment,'execute_sql',lambda *a,**k:[])
    monkeypatch.setattr(deployment,'_apply_table_schema_policy',lambda *a,**k:{'action':'CREATE','schema_status':'MISSING'})
    monkeypatch.setattr(deployment,'_safe_execute_artifact',lambda content:(_ for _ in ()).throw(RuntimeError('simulated dbx failure')))
    r=deployment.deploy_dev(db,p.id)
    assert r['status']=='FAILED' and r['run_id']
    failed=deployment.latest_failed_dev_run(db,p.id)
    assert failed and failed.id==r['run_id'] and failed.checkpoint=='sales.Orders'
