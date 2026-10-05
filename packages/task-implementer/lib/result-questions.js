'use strict';
function resultQuestions(result){
 if(Array.isArray(result?.structured_output?.questions))return result.structured_output.questions.filter(q=>typeof q==='string'&&q.trim()).slice(0,5);
 const section=String(result?.result||'').match(/^## Questions\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m)?.[1]||'';
 return section.split('\n').filter(line=>/^\s*\d+\.\s+/.test(line)).map(line=>line.replace(/^\s*\d+\.\s+/,'').trim()).slice(0,5);
}
module.exports={resultQuestions};
