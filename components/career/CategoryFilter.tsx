'use client';

import { CAREER_CATEGORIES, CAREER_GROUPS, type CareerCategoryId, type CareerGroupId } from '@/data/careers';

/**
 * Two level field filter, shared by the public explorer and onboarding.
 *
 * With twenty four categories a single row of pills is a scroll, not a filter.
 * The first row picks a group; the second appears only once a group is chosen
 * and narrows within it. Picking a group is itself a filter, so the common case
 * of "show me business roles" takes one tap rather than a hunt through a long
 * row.
 *
 * Both callers render the same control, so the taxonomy can grow in one place.
 */
export default function CategoryFilter({
  group,
  category,
  onGroup,
  onCategory,
  counts,
}: {
  group: CareerGroupId | 'all';
  category: CareerCategoryId | 'all';
  onGroup: (g: CareerGroupId | 'all') => void;
  onCategory: (c: CareerCategoryId | 'all') => void;
  /** Roles per category, so an empty filter is never offered. */
  counts?: Map<string, number>;
}) {
  const visible = CAREER_CATEGORIES.filter(
    (c) => (group === 'all' || c.group === group) && (!counts || (counts.get(c.id) ?? 0) > 0),
  );

  return (
    <div className="stack-sm">
      <div className="wrap chip-row" role="tablist" aria-label="Career groups">
        <button
          type="button"
          role="tab"
          className="pill"
          aria-selected={group === 'all'}
          onClick={() => {
            onGroup('all');
            onCategory('all');
          }}
        >
          All fields
        </button>
        {CAREER_GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            role="tab"
            className="pill"
            aria-selected={group === g.id}
            onClick={() => {
              onGroup(g.id);
              onCategory('all');
            }}
          >
            {g.label}
          </button>
        ))}
      </div>

      {group !== 'all' && visible.length > 1 ? (
        <div className="wrap chip-row" role="tablist" aria-label="Career categories">
          <button
            type="button"
            role="tab"
            className="pill pill-sub"
            aria-selected={category === 'all'}
            onClick={() => onCategory('all')}
          >
            Everything
          </button>
          {visible.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              className="pill pill-sub"
              aria-selected={category === c.id}
              onClick={() => onCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
