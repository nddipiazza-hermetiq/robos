'use strict';
// One composer for walkthroughs and conversational prompt windows.
window.createRobosChatComposer = function ({id,placeholder='Ask a question or request a change…',label='Message the agent'}={}) {
  if(!document.getElementById('robos-chat-composer-styles')){
    const style=document.createElement('style');style.id='robos-chat-composer-styles';
    style.textContent='.robos-chat-composer{flex:1;min-width:0;font:14px system-ui,sans-serif}robos-ai-textarea.robos-chat-composer button{color:#e6edf3;background:#212b38;border:1px solid #384758;border-radius:6px;padding:7px 12px;cursor:pointer}robos-ai-textarea.robos-chat-composer button:hover:not(:disabled){border-color:#00bcd4}robos-ai-textarea.robos-chat-composer button:disabled{opacity:.45;cursor:default}.robos-chat-composer .robos-ai-inner{max-height:min(32vh,300px);overflow-y:auto}';document.head.append(style);
  }
  const input=document.createElement('robos-ai-textarea');
  if(id)input.id=id;
  input.classList.add('robos-chat-composer');
  input.setAttribute('min-height','64');input.setAttribute('max-chars','16000');
  input.setAttribute('show-agent','false');input.setAttribute('placeholder',placeholder);
  input.configureChatComposer=()=>{
    const send=input.querySelector('.robos-submit-btn');if(send){send.textContent='Send';send.type='button';}
    const editable=input.querySelector('.robos-ai-inner');if(editable){editable.setAttribute('role','textbox');editable.setAttribute('aria-label',label);editable.setAttribute('aria-multiline','true');}
  };
  return input;
};
