type P = React.SVGProps<SVGSVGElement>;

export const TruckIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M1 3h13v13H1z" /><path d="M14 8h4l3 3v5h-7z" /><circle cx="5.5" cy="18.5" r="2" /><circle cx="17.5" cy="18.5" r="2" />
  </svg>
);

export const CartIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M2 3h3l2.6 12h10.2l2.2-8H6.2" /><circle cx="10" cy="20" r="1.6" /><circle cx="18" cy="20" r="1.6" />
  </svg>
);

export const HeartIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="23" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
    <path d="M12 20.5S3.5 14.9 3.5 9.2A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.5 2.8c0 5.7-8.5 11.3-8.5 11.3z" />
  </svg>
);

export const ChevronDown = (p: P) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const ArrowLeft = (p: P) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="m15 5-7 7 7 7" />
  </svg>
);

export const ArrowRight = (p: P) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);

export const ClockIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.2 2" />
  </svg>
);

export const MailIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="50" height="50" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="2" y="5" width="20" height="14" rx="2" /><path d="m2.5 6.5 9.5 7 9.5-7" />
  </svg>
);

export const GiftIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="9" width="18" height="12" rx="1.5" /><path d="M3 13h18M12 9v12" />
    <path d="M12 9C10 9 7.5 8.4 7.5 6.2A2.2 2.2 0 0 1 12 5.6a2.2 2.2 0 0 1 4.5.6C16.5 8.4 14 9 12 9z" />
  </svg>
);

export const Star = ({ variant = "full", ...p }: P & { variant?: "full" | "half" | "empty" }) => (
  <svg viewBox="0 0 24 24" width="15" height="15" {...p}>
    {variant === "half" && (
      <defs>
        <linearGradient id="bb-half">
          <stop offset="50%" stopColor="currentColor" /><stop offset="50%" stopColor="transparent" />
        </linearGradient>
      </defs>
    )}
    <path
      d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.45 6.2 20.5l1.1-6.47L2.6 9.45l6.5-.95L12 2.6z"
      fill={variant === "full" ? "currentColor" : variant === "half" ? "url(#bb-half)" : "none"}
      stroke="currentColor" strokeWidth={variant === "empty" ? 1.5 : 0.8}
    />
  </svg>
);

export const Stars = ({ nota = 5, size = 15 }: { nota?: number; size?: number }) => (
  <span style={{ display: "inline-flex", gap: 1, color: "var(--bb-star)" }}>
    {[0, 1, 2, 3, 4].map((i) => {
      const d = nota - i;
      const v = d >= 1 ? "full" : d >= 0.5 ? "half" : "empty";
      return <Star key={i} variant={v} width={size} height={size} style={v === "half" ? { color: "var(--bb-star-half)" } : undefined} />;
    })}
  </span>
);

export const MenuIcon = ({ aberto = false, ...p }: P & { aberto?: boolean }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
    {aberto ? <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>
            : <><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></>}
  </svg>
);
