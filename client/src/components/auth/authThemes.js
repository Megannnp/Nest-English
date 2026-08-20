// Single source of truth for auth-flow theming, consumed by AuthShell.jsx and AuthMainForm.jsx.
// Previously these two files each kept their own copy of this table (plus a third copy in
// AuthPrimaryButton.jsx, which already reads from ../../styles/moduleColors.js instead).
//
// `shell` has no "reading" entry on purpose: AuthShell has never had a reading variant, so a
// reading-themed form has always shown the writing brand title/subtitle here. Preserved as-is
// rather than silently fixed, since fixing it changes what's rendered on screen.
const AUTH_THEME_STYLES = {
  grammar: {
    shell: {
      subtitleText: "筑巢语法",
      subtitleColor: "#6c48b8",
      titleColor: "#2e2840",
    },
    form: {
      label: "#5c3d9e",
      accent: "#6c48b8",
      switch: "#5c3d9e",
      inputBorder: "#ded7f2",
      inputColor: "#2e2840",
      inputBackground: "rgba(255, 255, 255, 0.50)",
      inactive: "#9080b8",
      tabBg: "rgba(108,72,184,0.07)",
      forgot: "#6b5aa0",
      backHome: {
        border: "1px solid rgba(92, 61, 158, 0.22)",
        color: "#5c3d9e",
        boxShadow: "0 10px 24px rgba(92, 61, 158, 0.08)",
      },
    },
  },
  reading: {
    form: {
      label: "#1a7a6e",
      accent: "#1a7a6e",
      switch: "#1a7a6e",
      inputBorder: "#c4e3de",
      inputColor: "#0f2e2a",
      inputBackground: "rgba(255,255,255,0.55)",
      inactive: "#5a9a90",
      tabBg: "rgba(26,122,110,0.07)",
      forgot: "#8a7d6e",
      backHome: {
        border: "1px solid rgba(26, 122, 110, 0.22)",
        color: "#1a7a6e",
        boxShadow: "0 10px 24px rgba(26, 122, 110, 0.08)",
      },
    },
  },
  portal: {
    shell: {
      subtitleText: "nest portal",
      subtitleColor: "#222222",
      titleColor: "#111111",
    },
    form: {
      label: "#222222",
      accent: "#111111",
      switch: "#111111",
      inputBorder: "#dddddd",
      inputColor: "#111111",
      inputBackground: "#ffffff",
      inactive: "#666666",
      tabBg: "#f0f0f0",
      forgot: "#333333",
      backHome: {
        border: "1px solid rgba(17, 17, 17, 0.16)",
        color: "#111111",
        boxShadow: "0 10px 24px rgba(0, 0, 0, 0.06)",
      },
    },
  },
  writing: {
    shell: {
      subtitleText: "筑巢写作",
      subtitleColor: "#c8852a",
      titleColor: "#2a1f14",
    },
    form: {
      label: "#7c5c2e",
      accent: "#c8852a",
      switch: "#7c5c2e",
      inputBorder: "#e8ded0",
      inputColor: "#2a1f14",
      inputBackground: "rgba(250, 248, 245, 0.82)",
      inactive: "#a09080",
      tabBg: "rgba(200,133,42,0.07)",
      forgot: "#8a7d6e",
      backHome: undefined,
    },
  },
};

const getTheme = (theme) => AUTH_THEME_STYLES[theme] || AUTH_THEME_STYLES.writing;

export const getShellTheme = (theme) => getTheme(theme).shell || AUTH_THEME_STYLES.writing.shell;
export const getFormTheme = (theme) => getTheme(theme).form;
