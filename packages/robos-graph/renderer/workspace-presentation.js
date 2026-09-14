'use strict';
// All source/agent content is rendered as text, never HTML.
window.WorkspacePresentation = (() => {
  const node = (tag, text, cls) => { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (cls) e.className = cls; return e; };
  const label = key => key.replace(/^(robos:|dcterms:|schema:|@)/, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
  const details = (title, body) => { const e = node('details'); e.append(node('summary', title), body); return e; };
  function value(data) {
    if (data === undefined) return node('span', 'Not set', 'review-muted');
    if (data === null) return node('span', 'None', 'review-muted');
    if (typeof data !== 'object') return node('span', String(data));
    if (Array.isArray(data)) {
      if (!data.length) return node('span', 'None', 'review-muted');
      const list = node('ul'); for (const item of data) { const li = node('li'); li.append(value(item)); list.append(li); } return list;
    }
    const dl = node('dl', undefined, 'review-fields');
    for (const [key, item] of Object.entries(data)) { const dd = node('dd'); dd.append(value(item)); dl.append(node('dt', label(key)), dd); }
    return dl;
  }
  function raw(data) { return details('Advanced: raw JSON', node('pre', JSON.stringify(data, null, 2), 'review-raw')); }
  function card(n) {
    const c = node('article', undefined, 'review-card');
    c.append(node('h4', n['dcterms:title'] || n['@id'] || 'Source record'));
    c.append(node('p', [n['robos:package'], [].concat(n['@type'] || []).map(label).join(', ')].filter(Boolean).join(' · '), 'review-muted'));
    if (n['dcterms:description']) c.append(node('p', n['dcterms:description']));
    c.append(node('p', n['@id'], 'review-id'));
    const evidence = n['robos:evidence'];
    c.append(details(evidence?.length ? `Source evidence (${evidence.length})` : 'No source evidence recorded', value(evidence || [])));
    const rest = Object.fromEntries(Object.entries(n).filter(([k]) => !['@id', '@type', 'dcterms:title', 'dcterms:description', 'robos:package', 'robos:evidence'].includes(k)));
    c.append(details('Relationships and other properties', value(rest)));
    return c;
  }
  function brief(target, b) {
    target.replaceChildren(node('h3', 'Your refinement request'), node('p', b.prompt || 'No request entered. Add what you want to investigate or change.'));
    target.append(node('p', `${b.nodes.length} of ${b.totalMatches} matching records · ${b.relatedNodes.length} related records`, 'review-muted'));
    if (b.truncated) target.append(node('p', 'Only part of the matching graph is included. Narrow the focus to include more relevant evidence.', 'review-warning'));
    target.append(node('p', 'The agent uses these records and cited sources to propose changes. Nothing is saved until you review and save a valid proposal.'));
    if (!b.nodes.length) target.append(node('p', 'No matching records. Try a broader title or an exact node ID.'));
    const cards = node('div', undefined, 'review-cards'); b.nodes.forEach(n => cards.append(card(n))); target.append(cards);
    const related = node('div', undefined, 'review-cards'); b.relatedNodes.forEach(n => related.append(card(n)));
    if (b.relatedNodes.length) target.append(details('Related records', related));
    target.append(details('Advanced: agent instructions and validation rules', value({ instructions: b.instructions, shapes: b.shapes })), raw(b));
  }
  function preview(target, p, questions = []) {
    target.replaceChildren(node('h3', 'Review proposed changes'));
    const { delta, validation } = p;
    if (!delta.added.length && !delta.changed.length && !delta.removed.length) target.append(node('p', 'No changes proposed.'));
    for (const n of delta.added) { const c = card(n); c.prepend(node('p', 'Add record', 'review-added')); target.append(c); }
    for (const change of delta.changed) {
      const c = node('article', undefined, 'review-card'); c.append(node('h4', `Update record · ${change.id}`));
      for (const prop of change.properties) {
        c.append(node('h5', label(prop.property)));
        const row = node('div', undefined, 'review-comparison');
        for (const [title, data] of [['Before', prop.before], ['After', prop.after]]) { const cell = node('div'); cell.append(node('strong', title), value(data)); row.append(cell); }
        c.append(row);
      }
      const evidence = p.candidate['robos:nodes'].find(n => n['@id'] === change.id)?.['robos:evidence'];
      c.append(details('Source evidence', value(evidence || []))); target.append(c);
    }
    for (const n of delta.removed) { const c = node('article', undefined, 'review-card'); c.append(node('h4', 'Remove record'), value(n)); target.append(c); }
    target.append(node('h4', validation.conforms ? 'Structural validation passed' : 'Resolve validation errors before saving'));
    target.append(node('p', 'Validation checks graph structure, not whether the proposed facts are true.', 'review-muted'));
    for (const [title, data] of [['Validation errors', validation.errors], ['Warnings', validation.warnings], ['Conflicts', p.conflicts], ['Stale source records', p.stale], ['Open questions', questions]]) {
      if (Array.isArray(data) ? data.length : data && Object.keys(data).length) { target.append(node('h4', title), value(data)); }
    }
    target.append(raw({ ...p, questions }));
  }
  return { brief, preview, value, raw };
})();
