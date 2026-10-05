'use strict';
// Ask for individual untracked files so an unrelated file in .robos/ still blocks.
// Tracked/staged evidence changes are never excluded.
const statusArgs=['status','--porcelain','--untracked-files=all'];
function hasSourceChanges(status){
 return String(status).split('\n').some(line=>line.trim()&&!line.startsWith('?? .robos/task-evidence/'));
}
module.exports={statusArgs,hasSourceChanges};
