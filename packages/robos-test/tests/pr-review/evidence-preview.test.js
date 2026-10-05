const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {readEvidenceText}=require('../../../pr-review/lib/evidence-preview');
test('preview resolves registered IDs, bounds reads and rejects unsupported files',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'evidence-preview-'));
 const file=path.join(dir,'reply.txt');await fs.writeFile(file,'<script>original response</script>');
 const items=[{id:'reply',path:file},{id:'binary',path:path.join(dir,'app.exe')}];
 assert.deepEqual(await readEvidenceText(items,'reply'),{text:'<script>original response</script>',truncated:false});
 await assert.rejects(readEvidenceText(items,file),/not in the review/);
 await assert.rejects(readEvidenceText(items,'binary'),/file type/);
 await fs.writeFile(file,'x'.repeat(300000));const result=await readEvidenceText(items,'reply');assert.equal(result.text.length,256*1024);assert.equal(result.truncated,true);
});
