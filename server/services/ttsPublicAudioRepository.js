import db from '../db/database.js';
import { logError } from '../utils/logger.js';

export function buildTtsPublicAudioUrl(key) {
  return `/api/tts/public/${key}`;
}

export async function isTtsPublicAudioReferenced(key) {
  const publicUrl = buildTtsPublicAudioUrl(key);
  try {
    const material = await db.prepare('SELECT id FROM materials WHERE audio_url = ? LIMIT 1').get(publicUrl);
    if (material) return true;
    const phonetics = await db.prepare('SELECT question_id FROM phonetics_questions WHERE audio_url = ? LIMIT 1').get(publicUrl);
    return !!phonetics;
  } catch (err) {
    logError('tts_public_audio_reference_lookup_error', err, { key });
    return true;
  }
}
