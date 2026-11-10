// Category paging: 60 games per page (docs/SEO-PLAN.md §URLs and PRD §5).
export const PER_PAGE = 60;

// At least one page, even for an empty category.
export function pageCount(total: number, perPage: number = PER_PAGE): number {
  return Math.max(1, Math.ceil(total / perPage));
}
