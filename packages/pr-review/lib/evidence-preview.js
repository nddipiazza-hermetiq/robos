'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const LIMIT = 256 * 1024;
async function readEvidenceText(items, id) {
  const item = items.find(entry => entry.id === id);
  if (!item?.path) throw Error('This file is not in the review evidence.');
  if (!['.txt', '.md', '.json', '.jsonl', '.log', '.csv', '.xml', '.yaml', '.yml'].includes(path.extname(item.path).toLowerCase())) {
    throw Error('Preview is not available for this file type. Use “Open file in another app”.');
  }
  const file = await fs.open(item.path, 'r');
  try {
    const stat = await file.stat();
    if (!stat.isFile()) throw Error('This evidence entry is not a file.');
    const buffer = Buffer.alloc(Math.min(stat.size, LIMIT));
    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    return { text: buffer.subarray(0, bytesRead).toString('utf8'), truncated: stat.size > LIMIT };
  } finally { await file.close(); }
}
module.exports = { readEvidenceText };
