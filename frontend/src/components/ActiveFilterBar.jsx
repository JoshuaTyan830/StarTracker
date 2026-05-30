import { useMemo } from 'react';
import { FILTER_CHIP, PRESENCE_FILTER_ALL } from '../lib/constants';
import { GROUP_ORDER } from '../lib/deptUtils';
import FilterChip from './FilterChip';

export default function ActiveFilterBar({
  presenceYear,
  selectedGroupIds,
  selectedSchoolIds,
  schoolOptions,
  onClearYear,
  onRemoveGroup,
  onRemoveSchool,
  onClearAll,
}) {
  const schoolById = useMemo(
    () => new Map(schoolOptions.map((s) => [s.school_id, s])),
    [schoolOptions]
  );

  const groupChips = GROUP_ORDER.filter((g) => selectedGroupIds.has(g));
  const schoolChips = [...selectedSchoolIds].sort((a, b) =>
    String(a).localeCompare(String(b), undefined, { numeric: true })
  );

  const hasFilters =
    presenceYear !== PRESENCE_FILTER_ALL ||
    groupChips.length > 0 ||
    schoolChips.length > 0;

  if (!hasFilters) return null;

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-xs text-gray-400 shrink-0">已篩選：</span>
      <div className="flex-1 min-w-0 overflow-x-auto">
        <div className="flex items-center gap-2 w-max pr-1">
          {presenceYear !== PRESENCE_FILTER_ALL && (
            <FilterChip
              label={presenceYear}
              chipClass={FILTER_CHIP.year}
              onRemove={onClearYear}
            />
          )}
          {groupChips.map((group) => (
            <FilterChip
              key={group}
              label={group}
              chipClass={FILTER_CHIP.group}
              onRemove={() => onRemoveGroup(group)}
            />
          ))}
          {schoolChips.map((schoolId) => (
            <FilterChip
              key={schoolId}
              label={schoolById.get(schoolId)?.school_name ?? schoolId}
              chipClass={FILTER_CHIP.school}
              onRemove={() => onRemoveSchool(schoolId)}
            />
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs text-gray-500 hover:text-red-600 underline shrink-0 pl-1"
      >
        清除
      </button>
    </div>
  );
}
