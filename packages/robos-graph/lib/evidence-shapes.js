'use strict';
const required=path=>({path,minCount:1,message:'Evidence template requires '+path});
const EVIDENCE_SHAPES=[{
 shapeId:'robos:WalkthroughTemplateShape',targetClass:'robos:WalkthroughTemplate',
 refersFrom:'https://schema.org/HowTo',domainStandard:'https://schema.org/HowTo',
 properties:['dcterms:title','robos:version','robos:webElement','robos:instructions','robos:checkpoints'].map(path=>({path,minCount:1,message:'Walkthrough template requires '+path}))
},{
 shapeId:'robos:EvidenceTemplateShape',targetClass:'robos:EvidenceTemplate',
 refersFrom:'https://schema.org/CreativeWork',domainStandard:'https://schema.org/CreativeWork',
 properties:['dcterms:title','robos:version','robos:webElement','robos:artifactSlots','robos:collectionInstructions'].map(required)
},{
 shapeId:'robos:EvidenceBundleShape',targetClass:'robos:EvidenceBundle',
 refersFrom:'http://open-services.net/ns/qm#TestResult',domainStandard:'http://open-services.net/ns/qm#TestResult',
 properties:[{path:'robos:evidenceTemplate',minCount:1},{path:'robos:revision',minCount:1},{path:'robos:resultPath',minCount:1}]
}];
module.exports={EVIDENCE_SHAPES};
