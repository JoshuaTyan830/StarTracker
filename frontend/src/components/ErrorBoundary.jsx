import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white rounded-2xl border border-red-200 shadow-lg p-6">
            <h1 className="text-lg font-bold text-red-700 mb-2">頁面發生錯誤</h1>
            <p className="text-sm text-gray-600 mb-4 font-mono break-all">
              {this.state.error.message}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold"
              >
                重新整理
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    sessionStorage.removeItem('startracker_compare');
                  } catch {
                    /* ignore */
                  }
                  window.location.reload();
                }}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                清除比對快取並重整
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
