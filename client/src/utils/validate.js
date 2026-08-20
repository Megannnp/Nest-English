/**
 * 校验作文内容是否为空
 * @param {String} content 作文内容
 * @returns {Boolean} 是否有效
 */
export const validateWritingContent = (content) => {
  if (!content || content.trim().length === 0) {
    return false;
  }
  return true;
};

/**
 * 校验用户名格式（4-16位字母/数字）
 * @param {String} username 用户名
 * @returns {Boolean} 是否有效
 */
export const validateUsername = (username) => {
  const reg = /^[a-zA-Z0-9]{4,16}$/;
  return reg.test(username);
};

/**
 * 校验密码强度（至少8位，包含字母+数字）
 * @param {String} password 密码
 * @returns {Boolean} 是否有效
 */
export const validatePassword = (password) => {
  const reg = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
  return reg.test(password);
};