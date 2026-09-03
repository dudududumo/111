import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "发生未知错误，请稍后重试。";
      let errorDetails = this.state.error?.message || "";

      try {
        // Check if it's our structured Firestore error
        const parsedError = JSON.parse(errorDetails);
        if (parsedError.error && parsedError.operationType) {
          errorMessage = "数据库访问权限不足或操作失败。";
          errorDetails = `操作类型: ${parsedError.operationType}\n路径: ${parsedError.path}\n详情: ${parsedError.error}`;
        }
      } catch (e) {
        // Not a JSON error, use the original message
      }

      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-frost-50 p-6">
          <div className="w-full max-w-md glass rounded-3xl p-8 shadow-xl text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-coral-50 text-coral-500">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-ink-900 mb-2">应用出错了</h2>
              <p className="text-ink-500 text-sm">{errorMessage}</p>
            </div>
            
            {errorDetails && (
              <div className="bg-coral-50/40 border border-coral-100 p-4 rounded-xl text-left overflow-auto max-h-40">
                <pre className="text-xs text-coral-700 whitespace-pre-wrap font-mono">
                  {errorDetails}
                </pre>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink-900 px-4 py-3 text-white font-medium hover:bg-ink-800 transition-colors"
            >
              <RefreshCw size={18} />
              重新加载页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
