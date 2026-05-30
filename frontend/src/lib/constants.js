export const DEFAULT_YEARS = Array.from({ length: 10 }, (_, i) => String(115 - i));
export const DEFAULT_REFERENCE_YEAR = '115';
export const PRESENCE_FILTER_ALL = '全部';

export const MAX_COMPARE = 5;
export const COMPARE_SLOT_COUNT = 5;

/** 主頁列表；校系比對需較寬以容納五欄表格與折線圖 */
export const PAGE_SHELL_HOME =
  'w-full max-w-6xl mx-auto px-6 sm:px-8';
export const PAGE_SHELL_COMPARE =
  'w-full max-w-7xl mx-auto px-4 sm:px-5 lg:px-6';

export const FILTER_CHIP = {
  year: 'bg-violet-100 text-violet-800 border-violet-200',
  group: 'bg-sky-100 text-sky-800 border-sky-200',
  school: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};
