from app.services.rules import *

def test_datatype_mappings():
    assert map_sqlserver_type('bigint')=='BIGINT'
    assert map_sqlserver_type('decimal',18,4)=='DECIMAL(18,4)'
    assert map_sqlserver_type('uniqueidentifier')=='STRING'
    assert map_sqlserver_type('varbinary(max)')=='BINARY'
    assert map_sqlserver_type('decimal(18,4)')=='DECIMAL(18,4)'

def test_rowversion_is_binary():
    assert map_sqlserver_type('rowversion')=='BINARY'
    assert map_sqlserver_type('timestamp')=='BINARY'

def test_classification_not_table_equals_bronze_only():
    assert classify_layer('VIEW','select sum(amount) from x group by k','SalesAggregate')[0]=='GOLD'
    assert classify_layer('VIEW','select a.id,b.name from a join b on a.id=b.id','vw_clean')[0]=='SILVER'

def test_proc_function_trigger_classification():
    assert classify_procedure('begin tran update x set y=1')[0]=='OPERATIONAL_TRANSACTION'
    assert classify_function('returns table as return select 1 x')[0]=='INLINE_TVF'
    assert classify_trigger('create trigger x as insert into AuditLog values(1)')[0]=='AUDIT'
