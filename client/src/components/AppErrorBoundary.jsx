import React from "react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || String(error || "") };
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, errorMessage: "" });
    }
  }

  componentDidCatch(error, errorInfo) {
    console.error("Application crashed:", error, errorInfo);
  }

  handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f5f5f5",
            color: "#111",
            padding: "24px",
          }}
        >
          <div
            style={{
              maxWidth: "420px",
              width: "100%",
              background: "#fff",
              border: "1px solid #e0e0e0",
              borderRadius: "20px",
              padding: "24px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.06)",
            }}
          >
            <h1 style={{ margin: "0 0 12px", fontSize: "24px" }}>页面出现异常</h1>
            <p style={{ margin: "0 0 20px", lineHeight: 1.6, color: "#555" }}>
              页面刚刚遇到一个未处理错误。你可以刷新重试，如果问题持续出现，再联系维护人员排查。
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                border: "none",
                borderRadius: "999px",
                background: "#111",
                color: "#fff",
                padding: "10px 18px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
