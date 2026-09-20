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
  {
    status: 'in-disclosure',
    statusLabel: 'IN DISCLOSURE',
    title: 'Memberful WP — account-linking vulnerability',
    description: 'Reported an OAuth state-validation weakness in Memberful WP ≤ 1.81.0. The reported impact is a persistent account-linking flaw that can lead to administrator account takeover.',
    meta: 'Patch & CVE assignment pending',
    credit: 'Submitted as a privilege-escalation chain involving CSRF. Details and status are based on my research report; a public CVE identifier has not yet been assigned.',
  },
];

export type CtfAchievement = {
  title: string;
  description: string;
  date?: string;
  dateLabel?: string;
  url?: string;
  linkLabel?: string;
};

// Add verified competition results and milestones here.
export const ctfAchievements: CtfAchievement[] = [];

export type Project = { id: string; title: string; description: string; tags: string[]; url: string };
export const projects: Project[] = [
  {
    id: 'PR-001',
    title: 'Personal research website',
    description: 'A static home for cybersecurity notes, experiments and writeups. Built with Astro, Markdown and Shiki.',
    tags: ['Astro', 'TypeScript', 'Markdown'],
    url: 'https://github.com/h3n1s3/bui-viet-hoang',
  },
];
