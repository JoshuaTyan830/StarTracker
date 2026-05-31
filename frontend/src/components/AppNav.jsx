import { MAX_COMPARE, PAGE_SHELL_NAV } from '../lib/constants';

export default function AppNav({ activePage, onNavigate, compareCount }) {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className={`${PAGE_SHELL_NAV} flex items-center gap-1 h-16`}>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-1.5 mr-6 hover:opacity-85 transition-opacity"
        >
          <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-800 to-indigo-600 bg-clip-text text-transparent">
            StarTracker
          </span>
          <span className="text-lg leading-none" aria-hidden>
            🌟
          </span>
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
