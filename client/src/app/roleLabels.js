export function getUserRoleLabel(user) {
  if (user?.is_admin === 1) return "平台管理员";
  if (user?.role === "teacher") return "教师";
  if (user?.role === "parent") return "家长";
  return "学生";
}
