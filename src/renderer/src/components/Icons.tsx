import type { CSSProperties, JSX } from 'react'

const paths: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5',
  pen: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
  note: 'M6 3h9l4 4v14H6V3zM15 3v4h4M9 12h7M9 16h5',
  users: 'M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  chart: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
  search: 'M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  plus: 'M12 5v14M5 12h14',
  folder: 'M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z',
  chevronDown: 'M6 9l6 6 6-6',
  chevronRight: 'M9 6l6 6-6 6',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6',
  restore: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M3 12a9 9 0 0 1 9-9',
  x: 'M6 6l12 12M18 6L6 18',
  save: 'M5 3h11l5 5v13H5V3zM8 3v6h8V3M8 21v-8h8v8',
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  image: 'M3 5h18v14H3V5zM8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5-9 9',
  table: 'M3 5h18v14H3V5zM3 10h18M3 15h18M9 5v14M15 5v14',
  link: 'M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
  undo: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  redo: 'M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  check: 'M4 12.5l5 5L20 6.5',
  pencil: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
  dots: 'M5 12h.01M12 12h.01M19 12h.01',
  copy: 'M8 8h12v12H8V8zM4 16V4h12',
  arrowUp: 'M12 19V5M5 12l7-7 7 7',
  arrowDown: 'M12 5v14M19 12l-7 7-7-7',
  quote: 'M4 7h5v6a4 4 0 0 1-4 4M14 7h5v6a4 4 0 0 1-4 4',
  code: 'M8 6 3 12l5 6M16 6l5 6-5 6',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  listOrdered: 'M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M4 18h2M3.5 14.5a1.5 1.5 0 1 1 1 2.6L4 18',
  task: 'M4 6h3l2 2 4-6 3 5h4M9 13l2 2 5-6M4 18h10',
  alignLeft: 'M4 6h16M4 10h11M4 14h16M4 18h11',
  alignCenter: 'M4 6h16M7 10h10M7 14h10M4 18h16',
  alignRight: 'M4 6h16M9 10h11M4 14h16M9 18h11',
  hr: 'M3 12h18',
  h1: 'M4 5v14M12 5v14M4 12h8M17 5v14M17 5l4 2',
  h2: 'M4 5v14M12 5v14M4 12h8M18 5h4v3M16 19h6M16 16l4-3a2 2 0 1 0-2.8-2.8',
  h3: 'M4 5v14M12 5v14M4 12h8M19 7a2 2 0 0 0-2-2h-2v5h2a2 2 0 0 1 0 4h-2v5h2a2 2 0 0 0 2-2',
  clear: 'M6 6l12 12M12 3l9 9-9 9',
  highlight: 'M7 17 3 21l1-5L15 5l4 4L7 17zM9 10l5 5',
  bold: 'M7 4h5a3.5 3.5 0 0 1 0 7H7V4zM7 11h6a3.5 3.5 0 0 1 0 7H7v-7z',
  italic: 'M10 5h9M7 19h9M14 5l-4 14',
  underline: 'M6 4v7a6 6 0 0 0 12 0V4M4 21h16',
  strike: 'M5 12h14M9 6a4 4 0 0 1 6-1M15 18a4 4 0 0 1-6 0',
  file: 'M6 2h8l5 5v15H6V2zM14 2v5h5',
  chevronLeft: 'M15 6l-6 6 6 6',
  pin: 'M12 17v5M9 5l3-3 3 3M9 5v6l-3 3h12l-3-3V5',
  book: 'M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2V5zM4 19a2 2 0 0 1 2-2h14',
  alert: 'M12 3 2 21h20L12 3zM12 10v5M12 18h.01',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  clipboard: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 1 2 2M9 13l2 2 4-4'
}

export type IconName = keyof typeof paths

export function Icon({
  name,
  size = 16,
  style
}: {
  name: IconName
  size?: number
  style?: CSSProperties
}): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={paths[name]} />
    </svg>
  )
}

export function Logo({ size = 40 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="ir-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22314f" />
          <stop offset="60%" stopColor="#3b5b92" />
          <stop offset="100%" stopColor="#2f8f8a" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#ir-grad)" />
      <path d="M37 24 C 31 30 26 34 21 38 C 17 41 13 44 10 49" fill="none" stroke="#fff" strokeWidth="6.5" strokeLinecap="round" />
      <path d="M37 24 C 34 27 31 30 29 33" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
      <g transform="rotate(38 44 18)">
        <rect x="41.6" y="3.5" width="4.8" height="19" rx="2.4" fill="#f0e3c8" />
        <rect x="40.8" y="22" width="6.4" height="3.2" rx="1.6" fill="#dcc79e" />
        <path d="M44 25.2 C 42.6 28.6 42 31.6 42 34.6 C 42 36.6 44 37.2 44 37.2 C 44 37.2 46 36.6 46 34.6 C 46 31.6 45.4 28.6 44 25.2 Z" fill="#fff" />
      </g>
      <rect x="48" y="46" width="10" height="10" rx="2.2" fill="#d4503f" />
    </svg>
  )
}
