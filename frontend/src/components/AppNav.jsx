import { MAX_COMPARE, PAGE_SHELL_COMPARE, PAGE_SHELL_HOME } from '../lib/constants';

export default function AppNav({ activePage, onNavigate, compareCount }) {
  const shell = `${
    activePage === 'compare' ? PAGE_SHELL_COMPARE : PAGE_SHELL_HOME
  } flex items-center gap-1 h-14`;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className={shell}>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="text-lg font-bold text-blue-900 mr-4 hover:opacity-80 transition-opacity"
        >
          StarTracker 🌟
        </button>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activePage === 'home'
              ? 'bg-blue-100 text-blue-800'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          校系資料庫
        </button>
        <button
          type="button"
          onClick={() => onNavigate('compare')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
            activePage === 'compare'
              ? 'bg-blue-100 text-blue-800'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          校系比對
          {compareCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold text-white bg-blue-600 rounded-full min-w-[1.25rem] text-center">
              {compareCount}/{MAX_COMPARE}
            </span>
          )}
        </button>
      </div>
    </nav>
  );
}
