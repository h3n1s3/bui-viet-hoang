export const profile = {
  name: 'Bui Viet Hoang',
  handle: 'h3n1s3',
  role: 'Security Researcher · CTF Player',
  description: 'Research, experiments and field notes in cybersecurity.',
  github: 'https://github.com/h3n1s3',
};

export function withBase(path = ''): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}
