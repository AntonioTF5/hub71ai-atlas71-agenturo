// Inline stroke icons (24px grid, round joins). Decorative by default: aria-hidden.
import type { ReactNode, SVGProps } from "react";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

function Svg({ size = 20, strokeWidth = 1.9, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
);

export const IconX = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Svg>
);

export const IconArrowUp = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 12 7-7 7 7" />
    <path d="M12 19V5" />
  </Svg>
);

export const IconArrowDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14" />
    <path d="m19 12-7 7-7-7" />
  </Svg>
);

export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </Svg>
);

export const IconChevronUp = (p: IconProps) => (
  <Svg {...p}>
    <path d="m18 15-6-6-6 6" />
  </Svg>
);

export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

export const IconLock = (p: IconProps) => (
  <Svg {...p}>
    <rect width="16" height="11" x="4" y="11" rx="2.5" />
    <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
  </Svg>
);

export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);

export const IconSend = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.5 21.7a.5.5 0 0 0 .9 0l6.5-19a.5.5 0 0 0-.6-.6l-19 6.5a.5.5 0 0 0 0 .9l7.9 3.2a2 2 0 0 1 1.1 1.1z" />
    <path d="m21.9 2.1-10.9 11" />
  </Svg>
);

export const IconAlert = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5" />
    <path d="M12 16.2h.01" />
  </Svg>
);

export const IconInfo = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16v-4.5" />
    <path d="M12 8h.01" />
  </Svg>
);

export const IconFlag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 21V4" />
    <path d="M5 4.5c1.4-.9 2.9-1.3 4.5-1 2 .4 3.2 1.6 5.2 1.9 1.5.2 2.9-.1 4.3-.9v9.6c-1.4.8-2.8 1.1-4.3.9-2-.3-3.2-1.5-5.2-1.9-1.6-.3-3.1.1-4.5 1" />
  </Svg>
);

export const IconRoute = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="6" cy="19" r="2.5" />
    <path d="M8.5 19H17a3.5 3.5 0 0 0 0-7H7a3.5 3.5 0 0 1 0-7h8.5" />
    <circle cx="18" cy="5" r="2.5" />
  </Svg>
);

export const IconCalendar = (p: IconProps) => (
  <Svg {...p}>
    <rect width="18" height="17" x="3" y="4.5" rx="2.5" />
    <path d="M8 2.5v4" />
    <path d="M16 2.5v4" />
    <path d="M3 10h18" />
  </Svg>
);

export const IconReceipt = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 2.5v19l2.3-1.4 2.4 1.4 2.3-1.4 2.3 1.4 2.4-1.4 2.3 1.4v-19l-2.3 1.4-2.4-1.4-2.3 1.4-2.3-1.4-2.4 1.4z" />
    <path d="M9 8.5h6" />
    <path d="M9 12h6" />
    <path d="M9 15.5h3.5" />
  </Svg>
);

export const IconLandmark = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 21h18" />
    <path d="M5 17.5v-6.5" />
    <path d="M9.6 17.5v-6.5" />
    <path d="M14.4 17.5v-6.5" />
    <path d="M19 17.5v-6.5" />
    <path d="M12 2.5 20.5 7.5h-17z" />
  </Svg>
);

export const IconDownload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5v11.5" />
    <path d="m7 10.5 5 5 5-5" />
    <path d="M4 17.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5" />
  </Svg>
);

export const IconRefresh = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5" />
    <path d="M3.5 3.5v5h5" />
  </Svg>
);

export const IconFastForward = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12.5 18.5 20 12l-7.5-6.5z" />
    <path d="M3 18.5 10.5 12 3 5.5z" />
  </Svg>
);

export const IconSkip = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 4.5 15 12 5 19.5z" />
    <path d="M19 5v14" />
  </Svg>
);

export const IconMore = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="5.5" cy="12" r="1.2" fill="currentColor" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    <circle cx="18.5" cy="12" r="1.2" fill="currentColor" />
  </Svg>
);

export const IconExternal = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4h6v6" />
    <path d="M10.5 13.5 20 4" />
    <path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
  </Svg>
);

export const IconCard = (p: IconProps) => (
  <Svg {...p}>
    <rect width="19" height="14" x="2.5" y="5" rx="2.5" />
    <path d="M2.5 10h19" />
    <path d="M6.5 15h3" />
  </Svg>
);

export const IconFile = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 2.5H7a2.5 2.5 0 0 0-2.5 2.5v14A2.5 2.5 0 0 0 7 21.5h10a2.5 2.5 0 0 0 2.5-2.5V8z" />
    <path d="M14 2.5V8h5.5" />
    <path d="M9 13h6" />
    <path d="M9 16.5h4" />
  </Svg>
);

export const IconUsers = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20.5v-1A4.5 4.5 0 0 1 7 15h4a4.5 4.5 0 0 1 4.5 4.5v1" />
    <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" />
    <path d="M21.5 20.5v-1a4.5 4.5 0 0 0-3.3-4.3" />
  </Svg>
);

export const IconBuilding = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 21.5V4.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17" />
    <path d="M3 21.5h18" />
    <path d="M10 7h4" />
    <path d="M10 11h4" />
    <path d="M10 15h4" />
  </Svg>
);

export const IconWallet = (p: IconProps) => (
  <Svg {...p}>
    <rect width="19" height="13" x="2.5" y="6.5" rx="2.5" />
    <path d="M2.5 10.5h19" />
    <path d="M6 4h12" />
  </Svg>
);

export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </Svg>
);

export const IconPhone = (p: IconProps) => (
  <Svg {...p}>
    <rect width="12" height="19" x="6" y="2.5" rx="2.5" />
    <path d="M11 18.5h2" />
  </Svg>
);

export const IconShare = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v12" />
    <path d="m8 7 4-4 4 4" />
    <path d="M5 12.5v6A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5v-6" />
  </Svg>
);

export const IconPanel = (p: IconProps) => (
  <Svg {...p}>
    <rect width="18" height="16" x="3" y="4" rx="2.5" />
    <path d="M14.5 4v16" />
  </Svg>
);

export const IconSparkle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5c.5 3.9 2.6 6 6.5 6.5-3.9.5-6 2.6-6.5 6.5-.5-3.9-2.6-6-6.5-6.5 3.9-.5 6-2.6 6.5-6.5z" />
    <path d="M19 15.5c.2 1.6 1 2.4 2.5 2.5-1.5.2-2.3 1-2.5 2.5-.2-1.5-1-2.3-2.5-2.5 1.5-.1 2.3-.9 2.5-2.5z" />
  </Svg>
);

export const IconPaperclip = (p: IconProps) => (
  <Svg {...p}>
    <path d="m21.4 11.1-9.2 9.2a6 6 0 0 1-8.5-8.5l8.6-8.6a4 4 0 1 1 5.7 5.7l-8.6 8.6a2 2 0 0 1-2.8-2.8l8.5-8.5" />
  </Svg>
);

export const IconMic = (p: IconProps) => (
  <Svg {...p}>
    <rect width="6" height="12" x="9" y="2.5" rx="3" />
    <path d="M18.5 10.5v1a6.5 6.5 0 0 1-13 0v-1" />
    <path d="M12 18v3.5" />
  </Svg>
);

export const IconImage = (p: IconProps) => (
  <Svg {...p}>
    <rect width="18" height="18" x="3" y="3" rx="2.5" />
    <circle cx="9" cy="9" r="1.8" />
    <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
  </Svg>
);

export const IconStop = (p: IconProps) => (
  <svg width={p.size ?? 14} height={p.size ?? 14} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={p.className}>
    <rect x="5" y="5" width="14" height="14" rx="3" />
  </svg>
);

export const IconScale = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v18" />
    <path d="M7 21h10" />
    <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    <path d="m2 16 3-8 3 8c-.9.6-1.9 1-3 1s-2.1-.4-3-1z" />
    <path d="m16 16 3-8 3 8c-.9.6-1.9 1-3 1s-2.1-.4-3-1z" />
  </Svg>
);

export const IconAt = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
  </Svg>
);

export const IconMail = (p: IconProps) => (
  <Svg {...p}>
    <rect width="19" height="15" x="2.5" y="4.5" rx="2.5" />
    <path d="m21.5 7.5-8.4 5.4a2 2 0 0 1-2.2 0L2.5 7.5" />
  </Svg>
);

export const IconUserPlus = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20.5v-1A4.5 4.5 0 0 1 7 15h4a4.5 4.5 0 0 1 4.5 4.5v1" />
    <path d="M19 8v6" />
    <path d="M22 11h-6" />
  </Svg>
);

export const IconLogOut = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 21H5.5A2.5 2.5 0 0 1 3 18.5v-13A2.5 2.5 0 0 1 5.5 3H9" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </Svg>
);

/** A thin ring with a moving arc; static under reduced motion. */
export function Spinner({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`atlas-spin ${className}`}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
