/* Declarative evidence components: templates supply slots, never executable HTML. */
'use strict';
(()=>{
 const element=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text)n.textContent=text;return n;};
 class EvidenceTemplateView extends HTMLElement{
  set evidence(value){this.value=value;this.render();}
  render(){
   this.replaceChildren();if(!this.value?.template)return;
   const {template,scenarios=[],artifacts=[],templateBindings=[]}=this.value;
   const heading=element('div','evidence-template-heading');
   heading.append(element('h4','','Evidence template used for this task: '+template['dcterms:title']));
   const metadata=element('details','evidence-template-meta');metadata.append(element('summary','','Template details'),element('p','',template['@id']+' · Version '+template['robos:version']),element('p','',template['robos:collectionInstructions']));heading.append(metadata);this.append(heading);
   for(const scenario of scenarios){
    const section=element('section','evidence-template-scenario');section.append(element('h4','',scenario.title||scenario.id));
    const grid=element('div','evidence-template-slots');
    for(const slot of template['robos:artifactSlots']){
     const card=element('article','evidence-template-slot');card.dataset.slot=slot.id;card.append(element('h5','',slot.name));
     const matches=templateBindings.filter(b=>b.scenarioId===scenario.id&&b.slotId===slot.id).map(b=>artifacts.find(a=>a.id===b.artifactId)).filter(Boolean);
     if(!matches.length&&!slot.required)continue;
     if(!matches.length)card.append(element('p','evidence-slot-missing',slot.required?'Not captured yet':'No artifact recorded (optional)'));
     for(const artifact of matches){
      const button=element('button','',slot.kind==='screenshot'?'View screenshot':slot.kind==='text'?'Read '+slot.name.toLowerCase():'Open '+slot.name.toLowerCase());
      button.setAttribute('aria-label',button.textContent+': '+(scenario.title||scenario.id));
      button.onclick=()=>this.dispatchEvent(new CustomEvent('evidence-open',{detail:{id:artifact.id},bubbles:true}));
      card.append(element('p','evidence-slot-label',artifact.label||slot.name));
      if(artifact.source)card.append(element('p','evidence-slot-source',artifact.source));
      if(slot.kind==='screenshot'){const img=element('img');img.src='robos-evidence://screenshot/'+artifact.id;img.alt=slot.name;img.loading='lazy';card.append(img);}
      if(slot.kind==='text'&&this.readArtifact){
       const output=element('pre','evidence-slot-output','Loading captured output…');card.append(output);
       Promise.resolve().then(()=>this.readArtifact(artifact.id)).then(result=>{
        output.textContent=result.ok?result.text:result.error||'Could not read captured output.';
        if(result.truncated)card.append(element('p','','Preview limited to 256 KB. Open the file for the rest.'));
       }).catch(error=>{output.textContent=error.message;});
      }
      card.append(button);
     }
     grid.append(card);
    }
    section.append(grid);this.append(section);
   }
  }
 }
 for(const tag of ['robos-evidence-transcript','robos-evidence-gallery','robos-evidence-checks'])if(!customElements.get(tag))customElements.define(tag,class extends EvidenceTemplateView{});
})();
