export const profile = {
  name: 'Bui Viet Hoang',
  handle: 'h3n1s3',
  role: 'CTF Player · Penetration Tester · Bug Bounty Researcher',
  description: 'Information security student at the Academy of Cryptography Techniques.',
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
