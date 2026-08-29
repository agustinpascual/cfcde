type P = React.SVGProps<SVGSVGElement>;
const base = { viewBox: "0 0 24 24", width: 17, height: 17, fill: "none", stroke: "currentColor",
  strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const IconeVendas = (p: P) => (<svg {...base} {...p}><path d="M3 3v18h18" /><path d="m7 14 4-4 3 3 5-6" /></svg>);
export const IconeVivo   = (p: P) => (<svg {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M6.5 6.5a8 8 0 0 0 0 11M17.5 6.5a8 8 0 0 1 0 11" /></svg>);
export const IconePedidos= (p: P) => (<svg {...base} {...p}><path d="M6 2h9l4 4v16H6z" /><path d="M15 2v5h4M9 13h7M9 17h5" /></svg>);
export const IconePlug   = (p: P) => (<svg {...base} {...p}><path d="M9 2v6M15 2v6" /><path d="M6 8h12v4a6 6 0 0 1-12 0z" /><path d="M12 18v4" /></svg>);
export const IconeChat   = (p: P) => (<svg {...base} {...p}><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6A8 8 0 1 1 21 12z" /></svg>);

export const IconeBanco = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
    <ellipse cx="12" cy="5.5" rx="7.5" ry="3" />
    <path d="M4.5 5.5v6c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-6" />
    <path d="M4.5 11.5v6c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-6" />
  </svg>
);
