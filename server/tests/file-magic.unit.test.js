import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import { validateFileMagicBytes } from '../utils/validateFileMagicBytes.js';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function zipWithCentralEntries(entryNames) {
  const localHeader = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
  const centralEntries = entryNames.map((name) => {
    const nameBuffer = Buffer.from(name);
    const header = Buffer.alloc(46);
    header[0] = 0x50;
    header[1] = 0x4B;
    header[2] = 0x01;
    header[3] = 0x02;
    header.writeUInt16LE(nameBuffer.length, 28);
    return Buffer.concat([header, nameBuffer]);
  });
  return Buffer.concat([localHeader, ...centralEntries]);
}

test('docx validation requires the expected Word document zip entries', () => {
  assert.equal(validateFileMagicBytes(zipWithCentralEntries(['readme.txt']), DOCX_MIME), false);
  assert.equal(
    validateFileMagicBytes(zipWithCentralEntries(['[Content_Types].xml', 'word/document.xml']), DOCX_MIME),
    true
  );
});
