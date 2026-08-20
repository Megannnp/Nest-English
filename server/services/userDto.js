export function toSafeUser(row) {
  if (!row) return null;
  const displayName = row.real_name || '';
  let preferences = {};
  try {
    preferences = row.preferences ? JSON.parse(row.preferences) : {};
  } catch {
    preferences = {};
  }
  return {
    id: row.id || '',
    accountCode: row.account_code || '',
    name: displayName,
    email: row.email || '',
    phone: row.phone || '',
    role: row.role || 'student',
    realName: row.real_name || '',
    classId: row.class_id || null,
    className: row.class_name || '',
    preferences,
    createdAt: row.created_at || 0,
    is_admin: row.is_admin === 1 ? 1 : 0,
  };
}
