'use strict';
// Shared conversation view: the host supplies its session transport.
window.createRobosAgentChat = function (transport) {
  const host=document.createElement('section');host.className='robos-agent-chat';transport.container.append(host);
  let state;
  function button(text,label,fn){const b=document.createElement('button');b.type='button';b.textContent=text;b.title=label;b.addEventListener('click',fn);return b;}
  const historyNotice = document.createElement('small'); historyNotice.className = 'walkthrough-history-note';
  const chatHeader = document.createElement('div'); chatHeader.className = 'walkthrough-chat-header';
  const clearChat = button('Clear chat', 'Clear this conversation', () => clearDialog.showModal()); const savedHistory = button('Saved history', 'Browse the saved conversation', () => { historyDialog.showModal(); loadHistory(); }); chatHeader.append(historyNotice, savedHistory, clearChat);
  const chat = document.createElement('div'); chat.className = 'walkthrough-chat'; chat.setAttribute('role', 'log'); chat.setAttribute('aria-label', 'Live demo conversation');
  let followLatest=true;
  try { followLatest=localStorage.getItem('robos-walkthrough-follow-latest')!=='false'; } catch {}
  const followLabel=document.createElement('label');followLabel.className='walkthrough-follow-latest';
  const followCheckbox=document.createElement('input');followCheckbox.type='checkbox';
  followLabel.append(followCheckbox,' Follow latest');
  followCheckbox.addEventListener('change',()=>{
    followLatest=followCheckbox.checked;updateFollowCheckbox();
    try { localStorage.setItem('robos-walkthrough-follow-latest',String(followLatest)); } catch {}
    if(followLatest)chat.scrollTop=chat.scrollHeight;
  });
  function updateFollowCheckbox(){followCheckbox.checked=followLatest;followLabel.title=followLatest?'Following new messages. Uncheck to read earlier messages.':'Following paused. Check to jump to the latest message.';}
  updateFollowCheckbox();chatHeader.insertBefore(followLabel,clearChat);
  let pendingMessage = null;
  const receipt = document.createElement('div'); receipt.className = 'walkthrough-receipt'; receipt.setAttribute('role', 'status');
  const form = document.createElement('div'); form.className = 'walkthrough-compose';
  const input = window.createRobosChatComposer({placeholder:'Ask a question or request a change…',label:'Message the review agent'});
  const error = document.createElement('p'); error.className = 'walkthrough-error'; error.setAttribute('role', 'alert');
  form.append(input, receipt); host.append(chatHeader, chat, error, form);
  input.configureChatComposer();
  const send = input.querySelector('.robos-submit-btn');
  const receivedTimes = new Map(); let historyInitialized = false;
  const clearDialog = document.createElement('dialog'); clearDialog.className = 'walkthrough-clear-dialog'; clearDialog.setAttribute('aria-labelledby', 'clear-chat-title');
  const clearTitle = document.createElement('h3'); clearTitle.id = 'clear-chat-title'; clearTitle.textContent = 'Clear chat?';
  const clearDescription = document.createElement('p'); clearDescription.textContent = 'Clear the chat window? Your current step and code changes will stay. Previously saved messages remain in the local archive. A running agent will continue and may add new messages.';
  const cancelClear = button('Cancel', 'Keep the conversation', () => clearDialog.close()); cancelClear.autofocus = true;
  const confirmClear = button('Clear chat', 'Confirm clearing the conversation', async () => {
    confirmClear.disabled = true;
    try { const result = await transport.clear(); if (!result.ok) throw new Error(result.error); render(result.state); clearDialog.close(); clearChat.focus(); }
    catch (e) { clearError.textContent = e.message; }
    finally { confirmClear.disabled = false; }
  });
  const clearError = document.createElement('p'); clearError.setAttribute('role', 'alert');
  clearDialog.append(clearTitle, clearDescription, clearError, cancelClear, confirmClear); host.append(clearDialog);
  const historyDialog = document.createElement('dialog'); historyDialog.className = 'walkthrough-history-dialog'; historyDialog.setAttribute('aria-label', 'Saved conversation');
  const historyTitle = document.createElement('h3'); historyTitle.textContent = 'Saved conversation';
  const historyBody = document.createElement('div'); historyBody.className = 'walkthrough-saved-messages';
  let historyCursor;
  const older = button('Older messages', 'Load the previous page', () => loadHistory(historyCursor));
  const newest = button('Latest messages', 'Return to the latest saved page', () => loadHistory());
  historyDialog.append(historyTitle, historyBody, older, newest, button('Close', 'Close saved history', () => historyDialog.close())); host.append(historyDialog);
  async function openSessionFile() { try { const result = await transport.openSession(); if (!result.ok) throw new Error(result.error); } catch(e) { error.textContent = e.message; } }
  async function loadHistory(before) {
    older.disabled = true;
    try { const page = await transport.history(before); historyCursor = page.before; historyBody.replaceChildren();
      for (const message of page.messages) { const entry = document.createElement('p'); const who = message.role === 'user' ? 'You' : message.agentName || 'Status'; const when = button(new Date(message.timestamp).toLocaleString(), 'Open saved session in your default text editor', openSessionFile); when.className = 'walkthrough-timestamp'; const text = document.createElement('span'); text.textContent = `\n${message.text}`; entry.append(who + ' · ', when, text); historyBody.append(entry); }
      if (!page.messages.length) historyBody.textContent = 'No saved messages in this conversation yet.';
      older.disabled = !historyCursor; historyBody.scrollTop = 0;
    } catch(e) { historyBody.textContent = e.message; }
  }

  function render(value){
    if(!value){send.disabled=true;receipt.textContent='Open a local task review with an agent configured.';return;}
    const currentIds = new Set(value.messages.map(m => m.id));
    for (const id of receivedTimes.keys()) if (!currentIds.has(id)) receivedTimes.delete(id);
    for (const m of value.messages) if (m.id && !receivedTimes.has(m.id)) receivedTimes.set(m.id, historyInitialized ? Date.now() : null);
    historyInitialized = true;
    savedHistory.hidden = !value.historyAvailable;
    if (value.persistenceError) error.textContent = value.persistenceError;
    clearChat.disabled = value.messages.length === 0;
    state = value; const busy = value.status === 'running';
    if (pendingMessage && value.messages.some(m => m.role === 'user' && m.text === pendingMessage.text && m.id !== pendingMessage.lastId)) {
      if (input.value.trim() === pendingMessage.text) { input.value = ''; input.dispatchEvent(new Event('input')); }
      pendingMessage = null;
    }
    receipt.hidden = busy;
    if (!busy && !pendingMessage) receipt.textContent = 'Ready for your next message.';

    send.disabled=false;send.textContent=busy?'Steer':'Send';
    const previousTop=chat.scrollTop;
    const anchor=[...chat.children].find(el=>el.getBoundingClientRect().bottom>chat.getBoundingClientRect().top);
    const anchorId=anchor?.dataset.messageId,anchorOffset=anchor?anchor.getBoundingClientRect().top-chat.getBoundingClientRect().top:0;
    historyNotice.textContent = value.historyAvailable ? 'Conversation saved locally · Recent messages shown here. Open Saved history for earlier messages.' : 'History keeps the newest 120 entries, up to 128 KB; oldest entries are removed first.';
    chat.replaceChildren();
    for (const message of value.messages) { const bubble = document.createElement('div'); bubble.dataset.messageId=String(message.id); bubble.className = 'walkthrough-bubble ' + message.role + (message.kind === 'progress' ? ' progress-entry' : ''); const label = document.createElement('strong'); label.textContent = message.role === 'user' ? 'You' : message.role === 'assistant' ? message.agentName || value.agentName || 'Demo agent' : 'Status'; label.textContent = label.textContent.replace(/ · configured default$/, '');
      const timestamp = document.createElement('time');
      const recordedTime = message.timestamp ?? receivedTimes.get(message.id);
      if (Number.isFinite(recordedTime)) {
        const date = new Date(recordedTime); timestamp.dateTime = date.toISOString();
        timestamp.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); timestamp.title = (message.timestamp ? '' : 'Received: ') + date.toLocaleString();
      } else { timestamp.textContent = '—'; timestamp.title = 'Time was not recorded for this older message.'; }
      const timestampLink = button('', 'Open saved session in your default text editor', openSessionFile); timestampLink.className = 'walkthrough-timestamp'; timestampLink.append(timestamp);
      const header = document.createElement('div'); header.className = 'walkthrough-bubble-header'; header.append(label, timestampLink);
      const body = document.createElement('p'); body.textContent = message.text; bubble.append(header, body); chat.append(bubble); }
    if (followLatest) chat.scrollTop = chat.scrollHeight;
    else {chat.scrollTop=previousTop;const retained=[...chat.children].find(el=>el.dataset.messageId===anchorId);if(retained)chat.scrollTop+=retained.getBoundingClientRect().top-chat.getBoundingClientRect().top-anchorOffset;}
  }

  async function submit(text){error.textContent='';try{const result=await transport.send(text);if(!result.ok)throw Error(result.error);render(result.state);return true;}catch(e){error.textContent=e.message;return false;}}
  input.addEventListener('robos-submit', async event => {
    if (pendingMessage) return;
    if (!state) { error.textContent = 'Open a local task review with an agent configured.'; return; }
    const text = event.detail.value.trim(); if (!text) return;
    if (text.length > 16000) { error.textContent = 'Keep your message under 16,000 characters.'; return; }
    pendingMessage = { text, lastId: state.messages.filter(m => m.role === 'user').at(-1)?.id }; receipt.textContent = 'Sending your message…';
    if (!await submit(text)) { pendingMessage = null; receipt.textContent = 'Message was not sent. Your draft is still here.'; }
  });

  const unsubscribe=transport.subscribe(render);
  const ready=transport.getState().then(render).catch(e=>{error.textContent=e.message;send.disabled=true;});
  return {element:host,render,ready,focus(){if(state)render(state);input.querySelector('.robos-ai-inner')?.focus();},destroy(){unsubscribe?.();}};
};
