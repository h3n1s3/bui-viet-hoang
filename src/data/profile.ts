export type Social = { label: string; url: string; icon: 'github' | 'mail' | 'facebook' | 'linkedin' | 'htb' | 'patchstack' };
export const socials: Social[] = [
 {label:'GitHub',url:'https://github.com/h3n1s3',icon:'github'},
 {label:'Facebook',url:'https://www.facebook.com/viet.hoang.bui.33655',icon:'facebook'},
 {label:'Email',url:'mailto:dariousdollars@gmail.com',icon:'mail'},
 {label:'Hack The Box',url:'https://profile.hackthebox.com/',icon:'htb'},
 {label:'Patchstack',url:'https://patchstack.com/database/researchers/e2b27fb5-836f-4e3e-8ae7-9a8c92082c69',icon:'patchstack'},
 {label:'LinkedIn',url:'https://www.linkedin.com/in/viet-hoang-bui-1152b0408/',icon:'linkedin'},
];
export type Certification = { title: string; issuer: string; date: string; image: string; url?: string };
// Add only your own public credentials. Images belong in public/certifications/.
export const certifications: Certification[] = [];
export const projects = [{id:'PR-001',title:'Personal research website',description:'A static home for cybersecurity notes, experiments and writeups. Built with Astro, Markdown and Shiki.',tags:['Astro','TypeScript','Markdown'],url:'https://github.com/h3n1s3/bui-viet-hoang'}];
