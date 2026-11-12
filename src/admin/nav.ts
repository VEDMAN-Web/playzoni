// Admin screens (docs/ADMIN.md §5) in sidebar order, with our own simple line icons (24x24, stroke).
export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  /** Lowest role that can open the screen. */
  role: 'analyst' | 'editor' | 'owner';
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: 'Analytics',
    items: [
      { id: 'dashboard', label: 'Dashboard', href: '/admin', role: 'analyst', icon: 'M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 7h6V4h-6z' },
      { id: 'realtime', label: 'Realtime', href: '/admin/realtime', role: 'analyst', icon: 'M3 12h4l3 7 4-14 3 7h4' },
      { id: 'acquisition', label: 'Acquisition', href: '/admin/acquisition', role: 'analyst', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18' },
      { id: 'engagement', label: 'Engagement', href: '/admin/engagement', role: 'analyst', icon: 'M12 8v4l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z' },
      { id: 'search', label: 'Search insights', href: '/admin/search', role: 'analyst', icon: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.5 15.5L20 20' },
    ],
  },
  {
    label: 'Content',
    items: [
      { id: 'games', label: 'Games', href: '/admin/games', role: 'analyst', icon: 'M7 8h10a4 4 0 0 1 4 4v1.5a3 3 0 0 1-5.4 1.8L14.6 14H9.4l-1 1.3A3 3 0 0 1 3 13.5V12a4 4 0 0 1 4-4zM8 10.5v2M7 11.5h2M16 11h.01' },
      { id: 'categories', label: 'Categories', href: '/admin/categories', role: 'analyst', icon: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
      { id: 'home-layout', label: 'Home feed', href: '/admin/home-layout', role: 'editor', icon: 'M3 11l9-7 9 7v9h-6v-6H9v6H3z' },
      { id: 'banners', label: 'Banners and notices', href: '/admin/banners', role: 'editor', icon: 'M4 9v6h3l6 4V5L7 9zM17 9a4 4 0 0 1 0 6' },
      { id: 'content', label: 'Content and SEO', href: '/admin/content', role: 'analyst', icon: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7' },
    ],
  },
  {
    label: 'Growth',
    items: [
      { id: 'ads', label: 'Ads', href: '/admin/ads', role: 'analyst', icon: 'M3 6h18v12H3zM7 15l2.5-6 2.5 6M8 13h3M15 9v6h1.5a3 3 0 0 0 0-6z' },
      { id: 'push', label: 'Push alerts', href: '/admin/push', role: 'analyst', icon: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0' },
      { id: 'experiments', label: 'Experiments', href: '/admin/experiments', role: 'analyst', icon: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3M7.5 14h9' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { id: 'settings', label: 'Settings', href: '/admin/settings', role: 'analyst', icon: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19 12l2-1-1-3-2 .3-1.4-1.4.3-2-3-1-1 2h-2l-1-2-3 1 .3 2L6.8 7.3 5 7l-1 3 2 1v2l-2 1 1 3 2-.3 1.4 1.4-.3 2 3 1 1-2h2l1 2 3-1-.3-2 1.4-1.4 2 .3 1-3-2-1z' },
      { id: 'team', label: 'Team', href: '/admin/team', role: 'owner', icon: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 21a6 6 0 0 0-4-5.7' },
      { id: 'audit', label: 'Audit log', href: '/admin/audit', role: 'analyst', icon: 'M8 4h8M8 4a2 2 0 0 0-2 2v14h12V6a2 2 0 0 0-2-2M9 10h6M9 14h6M9 18h4' },
    ],
  },
];

export const ALL_ITEMS: NavItem[] = NAV.flatMap((g) => g.items);
