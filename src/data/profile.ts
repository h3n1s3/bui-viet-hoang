export type Social = { label: string; url: string; icon: 'github' | 'mail' | 'facebook' | 'linkedin' | 'htb' | 'patchstack' };
export const socials: Social[] = [
  { label: 'GitHub', url: 'https://github.com/h3n1s3', icon: 'github' },
  { label: 'Facebook', url: 'https://www.facebook.com/viet.hoang.bui.33655', icon: 'facebook' },
  { label: 'Email', url: 'mailto:dariousdollars@gmail.com', icon: 'mail' },
  { label: 'Hack The Box', url: 'https://profile.hackthebox.com/', icon: 'htb' },
  { label: 'Patchstack', url: 'https://patchstack.com/database/researchers/e2b27fb5-836f-4e3e-8ae7-9a8c92082c69', icon: 'patchstack' },
  { label: 'LinkedIn', url: 'https://www.linkedin.com/in/viet-hoang-bui-1152b0408/', icon: 'linkedin' },
];

export type Certification = { title: string; issuer: string; date: string; image: string; url?: string };
// Add only your own public credentials. Images belong in public/certifications/.
export const certifications: Certification[] = [];
export const certificationSamples: Certification[] = [
  { title: 'Cyber Foundations', issuer: 'Layout preview', date: 'SAMPLE 01', image: '/certifications/sample-cyber-foundations.svg' },
  { title: 'Web Security', issuer: 'Layout preview', date: 'SAMPLE 02', image: '/certifications/sample-web-security.svg' },
  { title: 'CTF Operations', issuer: 'Layout preview', date: 'SAMPLE 03', image: '/certifications/sample-ctf-operations.svg' },
  { title: 'Research Methods', issuer: 'Layout preview', date: 'SAMPLE 04', image: '/certifications/sample-research-methods.svg' },
];

export type SecurityAchievement = {
  status: 'published' | 'in-disclosure';
  statusLabel: string;
  title: string;
  description: string;
  date?: string;
  dateLabel?: string;
  meta?: string;
  url?: string;
  credit?: string;
  advisoryUrl?: string;
  advisoryLabel?: string;
};

export const securityAchievements: SecurityAchievement[] = [
  {
    status: 'published',
    statusLabel: 'PUBLISHED',
    title: 'CVE-2026-129027',
    description: 'Unauthenticated broken access control in Taxi Booking Manager for WooCommerce, affecting versions up to 2.2.9. A guest can book a fixed-route vehicle at the base fare by submitting a case-mismatched route name. Fixed in 2.2.10.',
    date: '2026-11-17',
    dateLabel: '17 Nov 2026',
    meta: 'CVSS 5.3 / Medium',
    url: 'https://www.cve.org/CVERecord?id=CVE-2026-129027',
    credit: 'Credited as henise through the Patchstack Bug Bounty Program.',
    advisoryUrl: 'https://patchstack.com/database/wordpress/plugin/ecab-taxi-booking-manager/vulnerability/wordpress-taxi-booking-manager-for-woocommerce-plugin-2-2-9-broken-access-control-vulnerability',
    advisoryLabel: 'Read advisory',
  },
  {
    status: 'published',
    statusLabel: 'PUBLISHED',
    title: 'CVE-2026-129060',
    description: 'Unauthenticated broken access control in Booking and Rental Manager for WooCommerce, affecting versions up to 2.8.4. A guest can create a WooCommerce booking order for a rental after it is changed to Draft by reusing the linked product ID. Fixed in 2.8.5.',
    date: '2026-11-17',
    dateLabel: '17 Nov 2026',
    meta: 'CVSS 5.3 / Medium',
    url: 'https://www.cve.org/CVERecord?id=CVE-2026-129060',
    credit: 'Credited as henise through the Patchstack Bug Bounty Program.',
    advisoryUrl: 'https://patchstack.com/database/wordpress/plugin/booking-and-rental-manager-for-woocommerce/vulnerability/wordpress-booking-and-rental-manager-plugin-2-8-4-broken-access-control-vulnerability',
    advisoryLabel: 'Read advisory',
  },
  {
    status: 'published',
    statusLabel: 'PUBLISHED',
    title: 'CVE-2026-125831',
    description: 'Contributor-level stored XSS in PowerPack Lite for Beaver Builder, affecting versions up to 1.3.2. A Contributor can store an unescaped button_2_effect value that executes in an administrator preview and on published pages. Fixed in 1.3.3.',
    date: '2026-11-13',
    dateLabel: '13 Nov 2026',
    meta: 'CVSS 6.5 / Medium',
    url: 'https://www.cve.org/CVERecord?id=CVE-2026-125831',
    credit: 'Credited as henise through the Patchstack Bug Bounty Program.',
    advisoryUrl: 'https://patchstack.com/database/wordpress/plugin/powerpack-addon-for-beaver-builder/vulnerability/wordpress-powerpack-lite-for-beaver-builder-plugin-1-3-2-cross-site-scripting-xss-vulnerability',
    advisoryLabel: 'Read advisory',
  },
  {
    status: 'published',
    statusLabel: 'PUBLISHED',
    title: 'CVE-2026-103067',
    description: 'Customer-level CSRF/account-linking chain in Memberful WP, affecting versions up to 1.81.0. The OAuth callback lacks state validation and can link an attacker-controlled identity to an administrator account. Fixed in 1.81.1.',
    date: '2026-10-01',
    dateLabel: '1 Oct 2026',
    meta: 'CVSS 8.0 / High',
    url: 'https://www.cve.org/CVERecord?id=CVE-2026-103067',
    credit: 'Credited as henise through the Patchstack Bug Bounty Program.',
    advisoryUrl: 'https://patchstack.com/database/wordpress/plugin/memberful-wp/vulnerability/wordpress-memberful-membership-plugin-plugin-1-81-0-cross-site-request-forgery-csrf-vulnerability',
    advisoryLabel: 'Read advisory',
  },
  {
    status: 'published',
    statusLabel: 'PUBLISHED',
    title: 'CVE-2026-62101',
    description: 'Unauthenticated broken authentication in the WordPress EduAdmin Booking plugin, affecting versions up to 5.4.2. Fixed in version 6.0.0.',
    date: '2026-09-17',
    dateLabel: '17 Sep 2026',
    meta: 'CVSS 9.8 / Critical',
    url: 'https://www.cve.org/CVERecord?id=CVE-2026-62101',
    credit: 'Credited as henise through the Patchstack Bug Bounty Program.',
    advisoryUrl: 'https://patchstack.com/database/wordpress/plugin/eduadmin-booking/vulnerability/wordpress-eduadmin-booking-plugin-5-4-2-broken-authentication-vulnerability',
    advisoryLabel: 'Read advisory',
  },
];

export type CtfAchievement = {
  title: string;
  result?: string;
  description: string;
  date?: string;
  dateLabel?: string;
  url?: string;
  linkLabel?: string;
};

// Add verified competition results and milestones here.
export const ctfAchievements: CtfAchievement[] = [
  {
    title: 'KMACTF Season 1',
    result: 'CONSOLATION PRIZE',
    description: 'Awarded a consolation prize in the first KMACTF competition.',
    url: 'https://www.facebook.com/share/p/1ErDoE34T7/',
    linkLabel: 'View announcement',
  },
  {
    title: 'KMACTF Season 2',
    result: 'CONSOLATION PRIZE',
    description: 'Awarded a consolation prize in the second KMACTF competition.',
    url: 'https://www.facebook.com/share/p/1J8zCM6NrL/',
    linkLabel: 'View announcement',
  },
  {
    title: 'Digital Dragons',
    result: 'GRAND FINALIST',
    description: 'Reached the grand final of the Digital Dragons competition.',
    url: 'https://www.facebook.com/share/p/19mmC4u8Hp/',
    linkLabel: 'View announcement',
  },
];

export type Project = { id: string; title: string; description: string; tags: string[]; url: string };
export const projects: Project[] = [
  {
    id: 'PR-001',
    title: 'Personal research website',
    description: 'A static home for cybersecurity notes, experiments and writeups. Built with Astro, Markdown and Shiki.',
    tags: ['Astro', 'TypeScript', 'Markdown'],
    url: 'https://github.com/h3n1s3/bui-viet-hoang',
  },
  {
    id: 'PR-002',
    title: 'KMA miniCTF 2026 — Web CTF Challenges',
    description: 'Designed and built three web security challenges for KMA miniCTF 2026: Simple Note, DNS Guard and Legend Portal.',
    tags: ['CTF', 'Web Security', 'Docker'],
    url: 'https://github.com/h3n1s3/web-ctf-challenges',
  },
];
