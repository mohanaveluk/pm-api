/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Vendor blacklist approval email (self-contained)
 *
 *  Exports:
 *    - vendorBlacklistApprovalSubject(data)   → subject line (plain text)
 *    - vendorBlacklistApprovalTemplate(data)  → approval request email
 *    - vendorBlacklistWithdrawnSubject(data)  → subject line (plain text)
 *    - vendorBlacklistWithdrawnTemplate(data) → "request cancelled / withdrawn" email
 *    - vendorBlacklistApprovedSubject(data)   → subject line (plain text)
 *    - vendorBlacklistApprovedTemplate(data)  → "request approved" email (requester + approver)
 *    - vendorBlacklistRejectedSubject(data)   → subject line (plain text)
 *    - vendorBlacklistRejectedTemplate(data)  → "request rejected" email (requester + approver)
 *
 *  Same structure and look as verify-email-template.ts:
 *    1. PALETTE: copy of the website SCSS palette (primary / secondary)
 *    2. THEME: semantic roles (colours, fonts, sizes) built from the palette
 *    3. STYLES: named inline-style objects built from THEME
 *    4. Components: small HTML builders that use STYLES
 *    5. Shell: shared <head>, hero and footer
 *    6. Templates: content only, with no raw colours or fonts
 *
 *  Keep sections 1–2 identical across email files so every email matches.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/* ───────────────────────── 1. PALETTE (mirrors website SCSS) ───────────────────────── */

const PALETTE = {
  primary: {
    0: '#000000', 10: '#001c3a', 20: '#00315f', 25: '#003c72', 30: '#004786', 35: '#00539a',
    40: '#005faf', 50: '#1d78d4', 60: '#4492f0', 70: '#72adff', 80: '#a5c8ff', 90: '#d4e3ff',
    95: '#ebf1ff', 98: '#f9f9ff', 99: '#fdfcff', 100: '#ffffff',
  },
  secondary: {
    0: '#000000', 10: '#001c3a', 20: '#163153', 25: '#233c5e', 30: '#2f486a', 35: '#3b5377',
    40: '#475f84', 50: '#60789e', 60: '#7992b9', 70: '#94acd5', 80: '#afc8f1', 90: '#d4e3ff',
    95: '#ebf1ff', 98: '#f9f9ff', 99: '#fdfcff', 100: '#ffffff',
  },
  /**
   * Status tones (Material 3 baseline "error" palette, the same system the
   * website palette uses). Replace with the website's error palette if you add one.
   */
  error: { 20: '#690005', 40: '#ba1a1a', 80: '#ffb4ab', 95: '#ffedea' },
  /** Success tones (green). Replace with the website's success palette if you add one. */
  success: { 20: '#00391c', 40: '#1b6d3a', 80: '#8fd8a0', 95: '#e6f6ea' },
} as const;

/* ───────────────────────── 2. THEME ───────────────────────── */

const p = PALETTE.primary;
const s = PALETTE.secondary;
const e = PALETTE.error;
const g = PALETTE.success;

/** '#005faf', 0.4 → 'rgba(0,95,175,0.4)' */
function alpha(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const THEME = {
  brandName: 'Project Management',
  /** White 50px PNGs shown in the hero. Hosted PNGs render in every client. */
  heroIcon: 'https://img.icons8.com/ios-filled/50/ffffff/approval.png',
  heroIconWithdrawn: 'https://img.icons8.com/ios-filled/50/ffffff/cancel.png',
  heroIconApproved: 'https://img.icons8.com/ios-filled/50/ffffff/ok.png',
  heroIconRejected: 'https://img.icons8.com/ios-filled/50/ffffff/cancel.png',

  color: {
    primary: p[40], // website --primary (.submit-btn)
    primaryHover: p[35],
    primarySurface: p[95],
    primaryBorder: p[90],
    onPrimary: p[100],
    secondary: s[40],
    secondarySurface: s[95],

    danger: e[40],
    dangerSurface: e[95],
    success: g[40],
    successSurface: g[95],

    pageBg: p[95],
    surface: p[100],
    surfaceAlt: p[98],
    border: s[90],

    heading: s[10],
    text: s[25],
    textMuted: s[50],
    textSubtle: s[60],
    link: p[40],

    onHero: p[100],
    onHeroMuted: alpha(p[100], 0.85),
    heroIconBg: alpha(p[100], 0.16),
  },

  dark: {
    pageBg: s[10],
    surface: s[20],
    surfaceAlt: s[25],
    border: s[30],
    heading: p[95],
    text: s[90],
    textMuted: s[80],
    link: p[80],
    danger: e[80],
    dangerSurface: e[20],
    success: g[80],
    successSurface: g[20],
  },

  /** Mirrors website .login-page__left */
  heroGradient: 'linear-gradient(160deg,#0f4c81 0%,#1565c0 50%,#0b2e59 100%)',
  heroFallback: p[30], // Outlook desktop (no gradients)

  font: {
    family: `'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif`,
    mono: `'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace`,
    outlook: `'Segoe UI',Arial,sans-serif`,
  },

  radius: { sm: 8, md: 10, lg: 20, icon: 16, pill: 999 }, // sm = website --r-sm
  size: { container: 600, buttonHeight: 50, buttonMinWidth: 260, icon: 40 },
  shadow: {
    card: `0 8px 32px ${alpha(p[30], 0.12)}`,
    button: `0 6px 18px ${alpha(p[40], 0.32)}`,
  },
} as const;

const c = THEME.color;

/* ───────────────────────── 3. STYLES ───────────────────────── */

type Style = Record<string, string | number | undefined>;

const UNITLESS = new Set(['fontWeight', 'lineHeight', 'opacity']);

/** Style object → inline CSS string. Numbers get "px" (except unitless props). */
function css(...styles: Style[]): string {
  return Object.entries(Object.assign({}, ...styles) as Style)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => {
      const prop = k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
      const val = typeof v === 'number' && v !== 0 && !UNITLESS.has(k) ? `${v}px` : v;
      return `${prop}:${val}`;
    })
    .join(';');
}

const font: Style = { fontFamily: THEME.font.family, margin: 0, padding: 0 };

const STYLES = {
  /* Shell (same as verify email) */
  body: { ...font, width: '100%', backgroundColor: c.pageBg },
  wrapper: { backgroundColor: c.pageBg },
  wrapperCell: { padding: '40px 16px' },
  card: {
    maxWidth: THEME.size.container,
    backgroundColor: c.surface,
    borderRadius: THEME.radius.lg,
    boxShadow: THEME.shadow.card,
    overflow: 'hidden',
  },

  /* Hero */
  hero: {
    backgroundColor: THEME.heroFallback,
    backgroundImage: THEME.heroGradient,
    padding: '44px 40px 36px',
    textAlign: 'center',
  },
  heroIconBox: { backgroundColor: c.heroIconBg, borderRadius: THEME.radius.icon, padding: 14 },
  heroIcon: { display: 'block', border: 0, fontFamily: THEME.font.family, fontSize: 11, color: c.onHero },
  heroTitle: { ...font, margin: '0 0 8px', fontSize: 26, lineHeight: 1.25, fontWeight: 700, letterSpacing: '-0.3px', color: c.onHero },
  heroSubtitle: { ...font, fontSize: 15, lineHeight: 1.5, color: c.onHeroMuted },

  /* Body */
  content: { padding: '44px 40px 36px' },
  paragraph: { ...font, margin: '0 0 12px', fontSize: 15, lineHeight: 1.7, color: c.text },
  strong: { fontWeight: 700 },
  accent: { color: c.primary, fontWeight: 700 },
  sectionTitle: {
    ...font,
    margin: '0 0 10px',
    fontSize: 11,
    lineHeight: 1.4,
    fontWeight: 700,
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    color: c.textSubtle,
  },

  /* Details (key / value) card */
  detailsRow: { paddingTop: 28 },
  details: {
    backgroundColor: c.surfaceAlt,
    border: `1px solid ${c.primaryBorder}`,
    borderRadius: THEME.radius.md,
    padding: '6px 18px',
  },
  kvLabel: {
    ...font,
    width: '38%',
    padding: '12px 12px 12px 0',
    verticalAlign: 'top',
    fontSize: 13,
    lineHeight: 1.5,
    fontWeight: 600,
    color: c.textMuted,
  },
  kvValue: {
    ...font,
    padding: '12px 0',
    verticalAlign: 'top',
    fontSize: 14,
    lineHeight: 1.5,
    fontWeight: 600,
    color: c.heading,
    wordBreak: 'break-word',
  },
  kvDivider: { borderTop: `1px solid ${c.border}` },
  mono: { fontFamily: THEME.font.mono, fontSize: 12, fontWeight: 400, wordBreak: 'break-all' },
  tokenLink: { color: c.link, textDecoration: 'none' },
  badgeDanger: {
    display: 'inline-block',
    padding: '3px 10px',
    fontSize: 11,
    lineHeight: 1.4,
    fontWeight: 700,
    letterSpacing: '0.6px',
    textTransform: 'uppercase',
    color: c.danger,
    backgroundColor: c.dangerSurface,
    borderRadius: THEME.radius.pill,
  },

  /* Impact list */
  impactRow: { paddingTop: 28 },
  badgeNeutral: {
    display: 'inline-block',
    padding: '3px 10px',
    fontSize: 11,
    lineHeight: 1.4,
    fontWeight: 700,
    letterSpacing: '0.6px',
    textTransform: 'uppercase',
    color: c.secondary,
    backgroundColor: c.secondarySurface,
    borderRadius: THEME.radius.pill,
  },
  strike: { textDecoration: 'line-through', color: c.textMuted, fontWeight: 600 },
  impactIcon: { ...font, width: 22, padding: '3px 0', verticalAlign: 'top', fontSize: 13, lineHeight: 1.6, fontWeight: 700, color: c.danger },
  impactIconOk: { color: c.primary },
  impactText: { ...font, padding: '3px 0', verticalAlign: 'top', fontSize: 14, lineHeight: 1.6, color: c.text },
  impactNote: { ...font, margin: '10px 0 0', fontSize: 13, lineHeight: 1.6, color: c.textMuted },

  /* Button (mirrors .submit-btn) */
  buttonRow: { padding: '32px 0 0' },
  button: {
    ...font,
    display: 'inline-block',
    minWidth: THEME.size.buttonMinWidth,
    padding: '0 32px',
    fontSize: 16,
    fontWeight: 600,
    lineHeight: `${THEME.size.buttonHeight}px`,
    letterSpacing: '0.2px',
    textAlign: 'center',
    textDecoration: 'none',
    color: c.onPrimary,
    backgroundColor: c.primary,
    borderRadius: THEME.radius.sm,
    boxShadow: THEME.shadow.button,
  },

  /* Info pills */
  pillsRow: { paddingTop: 32 },
  pillCellLeft: { paddingRight: 8, verticalAlign: 'top' },
  pillCellRight: { paddingLeft: 8, verticalAlign: 'top' },
  pillPrimary: { backgroundColor: c.primarySurface, borderRadius: THEME.radius.md, padding: '14px 16px' },
  pillSecondary: { backgroundColor: c.secondarySurface, borderRadius: THEME.radius.md, padding: '14px 16px' },
  label: {
    ...font,
    margin: '0 0 4px',
    fontSize: 11,
    lineHeight: 1.4,
    fontWeight: 600,
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    color: c.textSubtle,
  },
  pillLabelPrimary: { color: c.primary, fontWeight: 700 },
  pillLabelSecondary: { color: c.secondary, fontWeight: 700 },
  pillValue: { ...font, fontSize: 14, lineHeight: 1.4, fontWeight: 600, color: c.heading },

  /* Callouts */
  calloutRow: { paddingTop: 20 },
  calloutFirstRow: { paddingTop: 28 },
  calloutInfo: {
    backgroundColor: c.primarySurface,
    borderLeft: `4px solid ${c.primary}`,
    borderRadius: 6,
    padding: '14px 18px',
  },
  badgeSuccess: {
    display: 'inline-block',
    padding: '3px 10px',
    fontSize: 11,
    lineHeight: 1.4,
    fontWeight: 700,
    letterSpacing: '0.6px',
    textTransform: 'uppercase',
    color: c.success,
    backgroundColor: c.successSurface,
    borderRadius: THEME.radius.pill,
  },
  calloutSuccess: {
    backgroundColor: c.successSurface,
    borderLeft: `4px solid ${c.success}`,
    borderRadius: 6,
    padding: '14px 18px',
  },
  quote: { fontStyle: 'italic' },
  calloutDanger: {
    backgroundColor: c.dangerSurface,
    borderLeft: `4px solid ${c.danger}`,
    borderRadius: 6,
    padding: '14px 18px',
  },
  calloutText: { ...font, fontSize: 13, lineHeight: 1.6, color: c.textMuted },

  /* Footer */
  footer: {
    backgroundColor: c.surfaceAlt,
    borderTop: `1px solid ${c.border}`,
    padding: '24px 40px',
    textAlign: 'center',
  },
  footerText: { ...font, margin: '0 0 6px', fontSize: 13, lineHeight: 1.6, color: c.textMuted },
  footerLink: { color: c.link, textDecoration: 'none', fontWeight: 600 },
  footerCopy: { ...font, fontSize: 11, lineHeight: 1.5, color: c.textSubtle },
} satisfies Record<string, Style>;

type StyleName = keyof typeof STYLES;

/** st('paragraph') or st('label', 'pillLabelPrimary') → inline style string */
const st = (...names: StyleName[]): string => css(...names.map((n) => STYLES[n] as Style));

/** <head> styles: hover, mobile and dark mode (clients that support <style>). */
function headStyles(): string {
  const d = THEME.dark;
  return `
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }

    .em-btn:hover { background-color: ${c.primaryHover} !important; }

    @media only screen and (max-width: ${THEME.size.container}px) {
      .em-wrap { padding: 16px 8px !important; }
      .em-pad { padding-left: 24px !important; padding-right: 24px !important; }
      .em-hero { padding: 32px 24px 24px !important; }
      .em-h1 { font-size: 22px !important; }
      .em-btn { display: block !important; min-width: 0 !important; }
      .em-stack { display: block !important; width: 100% !important; padding: 0 0 12px 0 !important; }
      .em-kv-label { display: block !important; width: 100% !important; padding: 12px 0 2px 0 !important; }
      .em-kv-value { display: block !important; width: 100% !important; padding: 0 0 12px 0 !important; border-top: 0 !important; }
    }

    @media (prefers-color-scheme: dark) {
      .em-page { background-color: ${d.pageBg} !important; }
      .em-card { background-color: ${d.surface} !important; }
      .em-surface { background-color: ${d.surfaceAlt} !important; border-color: ${d.border} !important; }
      .em-heading { color: ${d.heading} !important; }
      .em-text { color: ${d.text} !important; }
      .em-muted { color: ${d.textMuted} !important; }
      .em-link { color: ${d.link} !important; }
      .em-line { border-color: ${d.border} !important; }
      .em-danger { color: ${d.danger} !important; }
      .em-danger-surface { background-color: ${d.dangerSurface} !important; }
      .em-success { color: ${d.success} !important; }
      .em-success-surface { background-color: ${d.successSurface} !important; }
    }
    [data-ogsc] .em-heading { color: ${d.heading} !important; }
    [data-ogsc] .em-text { color: ${d.text} !important; }
    [data-ogsc] .em-muted { color: ${d.textMuted} !important; }
    [data-ogsc] .em-link { color: ${d.link} !important; }
    [data-ogsc] .em-danger { color: ${d.danger} !important; }
    [data-ogsb] .em-page { background-color: ${d.pageBg} !important; }
    [data-ogsb] .em-card { background-color: ${d.surface} !important; }
    [data-ogsb] .em-surface { background-color: ${d.surfaceAlt} !important; }
    [data-ogsb] .em-danger-surface { background-color: ${d.dangerSurface} !important; }
    [data-ogsc] .em-success { color: ${d.success} !important; }
    [data-ogsb] .em-success-surface { background-color: ${d.successSurface} !important; }
  `.replace(/\n\s+/g, '\n').trim();
}

/* ───────────────────────── 4. Components ───────────────────────── */

const T = 'role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"';

const escapeHtml = (v: unknown): string =>
  String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string);

/** ISO date → "Sep 20, 2026, 4:00 AM UTC". Unparseable values are shown as given. */
function formatDate(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return escapeHtml(value);
  const text = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(d);
  return `${escapeHtml(text)} UTC`;
}

function button(href: string, label: string): string {
  const h = THEME.size.buttonHeight;
  const arc = Math.round((THEME.radius.sm / h) * 100);
  return `
<table ${T}><tr><td align="center" style="${st('buttonRow')}">
  <!--[if mso]>
  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:${h}px;v-text-anchor:middle;width:280px;" arcsize="${arc}%" stroke="f" fillcolor="${c.primary}">
    <w:anchorlock/>
    <center style="color:${c.onPrimary};font-family:${THEME.font.outlook};font-size:16px;font-weight:bold;">${label}</center>
  </v:roundrect>
  <![endif]-->
  <!--[if !mso]><!-- --><a class="em-btn" href="${href}" target="_blank" style="${st('button')}">${label}</a><!--<![endif]-->
</td></tr></table>`;
}

interface DetailRow {
  label: string;
  /** Trusted HTML; escape user values before passing them in. */
  value: string;
}

function detailsCard(title: string, rows: DetailRow[]): string {
  const body = rows
    .map((r, i) => {
      const line = i === 0 ? '' : st('kvDivider');
      return `<tr>
        <td class="em-kv-label em-muted em-line" style="${st('kvLabel')};${line}">${r.label}</td>
        <td class="em-kv-value em-heading em-line" style="${st('kvValue')};${line}">${r.value}</td>
      </tr>`;
    })
    .join('');
  return `
<table ${T}><tr><td style="${st('detailsRow')}">
  <p class="em-muted" style="${st('sectionTitle')}">${title}</p>
  <table ${T}><tr><td class="em-surface" bgcolor="${c.surfaceAlt}" style="${st('details')}">
    <table ${T}>${body}</table>
  </td></tr></table>
</td></tr></table>`;
}

function impactList(title: string, items: string[], note: string, tone: 'danger' | 'ok' = 'danger'): string {
  const icon =
    tone === 'danger'
      ? `<td class="em-danger" width="22" style="${st('impactIcon')}">✕</td>`
      : `<td class="em-link" width="22" style="${st('impactIcon', 'impactIconOk')}">✓</td>`;
  const rows = items
    .map(
      (item) => `<tr>
        ${icon}
        <td class="em-text" style="${st('impactText')}">${item}</td>
      </tr>`,
    )
    .join('');
  return `
<table ${T}><tr><td style="${st('impactRow')}">
  <p class="em-muted" style="${st('sectionTitle')}">${title}</p>
  <table ${T}>${rows}</table>
  ${note ? `<p class="em-muted" style="${st('impactNote')}">${note}</p>` : ''}
</td></tr></table>`;
}

interface Pill {
  icon: string;
  label: string;
  value: string;
  tone: 'primary' | 'secondary';
}

function infoPills(left: Pill, right: Pill): string {
  const pill = (x: Pill) => {
    const box: StyleName = x.tone === 'primary' ? 'pillPrimary' : 'pillSecondary';
    const lbl: StyleName = x.tone === 'primary' ? 'pillLabelPrimary' : 'pillLabelSecondary';
    return `<table ${T}><tr><td class="em-surface" bgcolor="${(STYLES[box] as Style).backgroundColor}" style="${st(box)}">
      <p class="em-link" style="${st('label', lbl)}">${x.icon}&nbsp;${x.label}</p>
      <p class="em-heading" style="${st('pillValue')}">${x.value}</p>
    </td></tr></table>`;
  };
  return `
<table ${T}><tr><td style="${st('pillsRow')}">
  <table ${T}><tr>
    <td class="em-stack" width="50%" style="${st('pillCellLeft')}">${pill(left)}</td>
    <td class="em-stack" width="50%" style="${st('pillCellRight')}">${pill(right)}</td>
  </tr></table>
</td></tr></table>`;
}

type CalloutTone = 'info' | 'danger' | 'success';

const CALLOUT_TONES: Record<CalloutTone, { box: StyleName; cls: string; bg: string }> = {
  info: { box: 'calloutInfo', cls: 'em-surface', bg: c.primarySurface },
  danger: { box: 'calloutDanger', cls: 'em-danger-surface', bg: c.dangerSurface },
  success: { box: 'calloutSuccess', cls: 'em-success-surface', bg: c.successSurface },
};

/** `title` and `body` are trusted HTML; escape user values before passing them in. */
function callout(tone: CalloutTone, icon: string, title: string, body: string, first = false): string {
  const { box, cls, bg } = CALLOUT_TONES[tone];
  return `
<table ${T}><tr><td style="${st(first ? 'calloutFirstRow' : 'calloutRow')}">
  <table ${T}><tr><td class="${cls}" bgcolor="${bg}" style="${st(box)}">
    <p class="em-text" style="${st('calloutText')}">${icon}&nbsp;<strong style="${st('strong')}">${title}</strong> ${body}</p>
  </td></tr></table>
</td></tr></table>`;
}


/* ───────────────────────── 5. Shell (shared by every email in this file) ───────────────────────── */

interface ShellOptions {
  title: string;
  preheader: string;
  heroIcon: string;
  heroIconAlt: string;
  heroTitle: string;
  heroSubtitle: string;
  /** Inner HTML of the white content area. */
  body: string;
  supportEmail?: string;
}

function renderShell(o: ShellOptions): string {
  const brand = escapeHtml(THEME.brandName);
  const year = new Date().getFullYear();
  const support = o.supportEmail
    ? ` Questions? Contact <a class="em-link" href="mailto:${escapeHtml(o.supportEmail)}" style="${st('footerLink')}">${escapeHtml(o.supportEmail)}</a>.`
    : '';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${escapeHtml(o.title)}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <style>body, table, td, a, p, h1 { font-family: ${THEME.font.outlook} !important; }</style>
  <![endif]-->
  <style>
${headStyles()}
  </style>
</head>
<body class="em-page" style="${st('body')}">

  <!-- Preheader (inbox preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;opacity:0;">${o.preheader}${'&#847;&zwnj;&nbsp;'.repeat(40)}</div>

  <table ${T} class="em-page" bgcolor="${c.pageBg}" style="${st('wrapper')}">
    <tr>
      <td align="center" class="em-wrap" style="${st('wrapperCell')}">
        <!--[if mso]><table role="presentation" width="${THEME.size.container}" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->

        <!-- Card -->
        <table ${T} class="em-card" bgcolor="${c.surface}" style="${st('card')}">

          <!-- Hero -->
          <tr>
            <td class="em-hero" align="center" bgcolor="${THEME.heroFallback}" style="${st('hero')}">
              <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px;">
                <tr><td style="${st('heroIconBox')}">
                  <img src="${o.heroIcon}" alt="${escapeHtml(o.heroIconAlt)}" width="${THEME.size.icon}" height="${THEME.size.icon}" style="${st('heroIcon')}" />
                </td></tr>
              </table>
              <h1 class="em-h1" style="${st('heroTitle')}">${escapeHtml(o.heroTitle)}</h1>
              <p style="${st('heroSubtitle')}">${escapeHtml(o.heroSubtitle)}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="em-pad" style="${st('content')}">
${o.body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="em-pad em-surface" align="center" bgcolor="${c.surfaceAlt}" style="${st('footer')}">
              <p class="em-muted" style="${st('footerText')}">
                This is an automated message from <strong class="em-link" style="${st('accent')}">${brand}</strong>.${support}
              </p>
              <p class="em-muted" style="${st('footerCopy')}">&copy; ${year} ${brand}. All rights reserved.</p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const mailto = (email: string): string =>
  `<a class="em-link" href="mailto:${escapeHtml(email)}" style="${st('tokenLink')}">${escapeHtml(email)}</a>`;

/* ───────────────────────── 6a. Template: approval request ───────────────────────── */

export interface VendorBlacklistApprovalData {
  vendorCode: string;
  vendorName: string;
  /** Defaults to "Blacklist". */
  requestedAction?: string;
  reason: string;
  requestedBy: string;
  requestedOn: string | Date;
  token: string;
  /** Full review URL including requestId and token. */
  approvalUrl: string;
  expiresOn: string | Date;
  /** Optional; adds a "contact support" link to the footer. */
  supportEmail?: string;
}

/** Plain-text subject line (do not HTML-escape). */
export const vendorBlacklistApprovalSubject = (d: VendorBlacklistApprovalData): string =>
  `Approval required: ${escapeHtml(d.requestedAction || 'Blacklist')} vendor ${d.vendorCode} — ${d.vendorName}`;

export const vendorBlacklistApprovalTemplate = (d: VendorBlacklistApprovalData): string => {
  const url = escapeHtml(d.approvalUrl);
  const expires = formatDate(d.expiresOn);
  const vendor = `${escapeHtml(d.vendorCode)} — ${escapeHtml(d.vendorName)}`;
  const reason = escapeHtml(d.reason || '—').replace(/\r?\n/g, '<br />');
  const action = d.requestedAction?.toLowerCase() === 'blacklist' ? 'Blacklist' : 'Remove Blacklist';

  const body = `
              <p class="em-text" style="${css(STYLES.paragraph, { margin: 0 })}">
                A request has been raised to <strong style="${st('strong')}">${action.toLowerCase()}</strong> the following vendor.
                Please review the details below and record your decision.
              </p>

              ${detailsCard('Request details', [
                { label: 'Vendor Code', value: escapeHtml(d.vendorCode) },
                { label: 'Vendor Name', value: escapeHtml(d.vendorName) },
                { label: 'Requested Action', value: `<span class="em-danger em-danger-surface" style="${st('badgeDanger')}">${action}</span>` },
                { label: 'Reason', value: reason },
                { label: 'Requested By', value: mailto(d.requestedBy) },
                { label: 'Requested On', value: formatDate(d.requestedOn) },
                { label: 'Token', value: `<a class="em-link" href="${url}" style="${css(STYLES.tokenLink, STYLES.mono)}">${escapeHtml(d.token)}</a>` },
              ])}

              ${impactList(
                'Once approved, the vendor is excluded from',
                ['Vendor selection', 'RFQs', 'The Approved Vendor List', 'New purchase orders'],
                'Existing transactional history is retained.',
              )}

              ${button(url, 'Review &amp; Approve')}

              ${infoPills(
                { icon: '⏳', label: 'Link expires', value: expires, tone: 'primary' },
                { icon: '🔐', label: 'Sign-in required', value: 'Before any decision', tone: 'secondary' },
              )}

              ${callout(
                'info',
                'ℹ️',
                'Opening this link does not approve anything on its own.',
                'You will be asked to sign in before the decision is recorded, and you can also reject the request from the same screen.',
                true,
              )}
              ${callout('danger', '⚠️', 'Did not expect this request?', 'Do not action it. Contact your procurement administrator.')}`;

  return renderShell({
    title: vendorBlacklistApprovalSubject(d),
    preheader: `Your approval is needed to blacklist ${vendor}. The link expires ${expires}.`,
    heroIcon: THEME.heroIcon,
    heroIconAlt: 'Approval',
    heroTitle: 'Vendor Blacklist Approval Required',
    heroSubtitle: 'A vendor status change is waiting for your decision.',
    body,
    supportEmail: d.supportEmail,
  });
};

/* ───────────────────────── 6b. Template: request cancelled / withdrawn ───────────────────────── */

export type WithdrawalOutcome = 'withdrawn' | 'cancelled';

export interface VendorBlacklistWithdrawnData {
  /** ID of the original approval request (same requestId used in the approval link). */
  requestId: string;
  vendorCode: string;
  vendorName: string;
  /** Defaults to "Blacklist". */
  requestedAction?: string;
  /** Reason given on the original blacklist request (optional, for context). */
  originalReason?: string;
  requestedBy: string;
  requestedOn: string | Date;

  /** "withdrawn" (requester pulled it back) or "cancelled" (admin/system). Defaults to "withdrawn". */
  outcome?: WithdrawalOutcome;
  /** Why the request was withdrawn / cancelled. */
  withdrawalReason: string;
  /** Email or display name of the person who withdrew it. */
  withdrawnBy: string;
  withdrawnOn: string | Date;

  /** Optional link to the request / vendor record (read-only view). Adds a "View request" button. */
  requestUrl?: string;
  /** Optional; adds a "contact support" link to the footer. */
  supportEmail?: string;
}

const OUTCOME_LABEL: Record<WithdrawalOutcome, { word: string; title: string }> = {
  withdrawn: { word: 'Withdrawn', title: 'withdrawn' },
  cancelled: { word: 'Cancelled', title: 'cancelled' },
};

/** Plain-text subject line (do not HTML-escape). */
export const vendorBlacklistWithdrawnSubject = (d: VendorBlacklistWithdrawnData): string =>
  `${OUTCOME_LABEL[d.outcome ?? 'withdrawn'].word}: blacklist request for vendor ${d.vendorCode} — ${d.vendorName}`;

export const vendorBlacklistWithdrawnTemplate = (d: VendorBlacklistWithdrawnData): string => {
  const o = OUTCOME_LABEL[d.outcome ?? 'withdrawn'];
  const vendor = `${escapeHtml(d.vendorCode)} — ${escapeHtml(d.vendorName)}`;
  const action = escapeHtml(d.requestedAction || 'Blacklist');
  const withdrawalReason = escapeHtml(d.withdrawalReason || '—').replace(/\r?\n/g, '<br />');
  const withdrawnBy = d.withdrawnBy.includes('@') ? mailto(d.withdrawnBy) : escapeHtml(d.withdrawnBy);

  const requestRows = [
    { label: 'Request ID', value: `<span style="${st('mono')}">${escapeHtml(d.requestId)}</span>` },
    { label: 'Vendor Code', value: escapeHtml(d.vendorCode) },
    { label: 'Vendor Name', value: escapeHtml(d.vendorName) },
    { label: 'Requested Action', value: `<span class="em-muted" style="${st('strike')}">${action}</span>` },
    { label: 'Status', value: `<span class="em-surface em-muted" style="${st('badgeNeutral')}">${o.word}</span>` },
    ...(d.originalReason ? [{ label: 'Original Reason', value: escapeHtml(d.originalReason).replace(/\r?\n/g, '<br />') }] : []),
    { label: 'Requested By', value: mailto(d.requestedBy) },
    { label: 'Requested On', value: formatDate(d.requestedOn) },
  ];

  const body = `
              <p class="em-text" style="${css(STYLES.paragraph, { margin: 0 })}">
                The request to <strong style="${st('strong')}">blacklist</strong> vendor
                <strong style="${st('strong')}">${vendor}</strong> has been
                <strong style="${st('strong')}">${o.title}</strong>. No action is required from you.
              </p>

              ${detailsCard(`${o.word === 'Withdrawn' ? 'Withdrawal' : 'Cancellation'} details`, [
                { label: `${o.word} By`, value: withdrawnBy },
                { label: `${o.word} On`, value: formatDate(d.withdrawnOn) },
                { label: 'Reason', value: withdrawalReason },
              ])}

              ${detailsCard('Original request', requestRows)}

              ${impactList(
                'What this means',
                [
                  'The vendor’s current status is unchanged',
                  'The approval link sent earlier is no longer valid',
                  'No approval or rejection is needed',
                ],
                '',
                'ok',
              )}

              ${d.requestUrl ? button(escapeHtml(d.requestUrl), 'View Request') : ''}

              ${infoPills(
                { icon: '🚫', label: 'Status', value: o.word, tone: 'secondary' },
                { icon: '✅', label: 'Action needed', value: 'None', tone: 'primary' },
              )}

              ${callout(
                'info',
                'ℹ️',
                'Already opened the approval link?',
                `It will now show this request as ${o.title}, and no decision can be recorded against it.`,
                true,
              )}
              ${callout(
                'danger',
                '⚠️',
                'Did not expect this message?',
                'Contact your procurement administrator.',
              )}`;

  return renderShell({
    title: vendorBlacklistWithdrawnSubject(d),
    preheader: `The blacklist request for ${vendor} was ${o.title}. No action is required.`,
    heroIcon: THEME.heroIconWithdrawn,
    heroIconAlt: o.word,
    heroTitle: `Vendor Blacklist Request ${o.word}`,
    heroSubtitle: 'No action is needed from you.',
    body,
    supportEmail: d.supportEmail,
  });
};

/* ───────────────────────── 6c. Template: request approved ───────────────────────── */

/** Who this copy of the email is addressed to; only changes the opening sentence. */
export type ApprovedAudience = 'requester' | 'approver' | 'all';

export interface VendorBlacklistApprovedData {
  vendorName: string;
  vendorCode: string;
  /** e.g. "Blacklist". Drives the subject, badge and "what this means" list. */
  requestType: string;
  requestReason: string;
  /** When the request was raised (ISO string or Date). */
  requestAt: string | Date;
  requestedBy: string;
  approvedBy: string;
  approvedOn: string | Date;
  /** Approver's comments; optional, shown as a quote when present. */
  decisionComments?: string;

  /** Recommended: the requestId, shown for traceability. */
  requestId?: string;
  /** Defaults to "all" (one email to requester, cc approver). */
  audience?: ApprovedAudience;
  /** Optional read-only link to the vendor or request record. Adds a "View Vendor" button. */
  vendorUrl?: string;
  /** Optional; adds a "contact support" link to the footer. */
  supportEmail?: string;
}

const isBlacklistType = (type: string): boolean => /^(black|block)\s*list/i.test(type.trim());

/** Plain-text subject line (do not HTML-escape). */
export const vendorBlacklistApprovedSubject = (d: VendorBlacklistApprovedData): string =>
  `Approved: ${d.requestType.toLowerCase()} vendor ${d.vendorCode} — ${d.vendorName}`;

export const vendorBlacklistApprovedTemplate = (d: VendorBlacklistApprovedData): string => {
  const type = escapeHtml(d.requestType || 'Blacklist');
  const verb = type.toLowerCase();
  const vendor = `${escapeHtml(d.vendorCode)} — ${escapeHtml(d.vendorName)}`;
  const approvedOn = formatDate(d.approvedOn);
  const approver = d.approvedBy.includes('@') ? mailto(d.approvedBy) : escapeHtml(d.approvedBy);
  const approverText = escapeHtml(d.approvedBy);
  const b = (html: string) => `<strong style="${st('strong')}">${html}</strong>`;

  const intro: Record<ApprovedAudience, string> = {
    requester: `Your request to ${b(verb)} vendor ${b(vendor)} has been ${b('approved')} by ${approverText}.`,
    approver: `This confirms that you ${b('approved')} the request to ${b(verb)} vendor ${b(vendor)}. The decision has been recorded.`,
    all: `The request to ${b(verb)} vendor ${b(vendor)} has been ${b('approved')} by ${approverText}.`,
  };

  const decisionRows = [
    { label: 'Decision', value: `<span class="em-success em-success-surface" style="${st('badgeSuccess')}">Approved</span>` },
    { label: 'Approved By', value: approver },
    { label: 'Approved On', value: approvedOn },
  ];

  const requestRows = [
    ...(d.requestId ? [{ label: 'Request ID', value: `<span style="${st('mono')}">${escapeHtml(d.requestId)}</span>` }] : []),
    { label: 'Vendor Code', value: escapeHtml(d.vendorCode) },
    { label: 'Vendor Name', value: escapeHtml(d.vendorName) },
    { label: 'Request Type', value: `<span class="em-danger em-danger-surface" style="${st('badgeDanger')}">${type}</span>` },
    { label: 'Reason', value: escapeHtml(d.requestReason || '—').replace(/\r?\n/g, '<br />') },
    { label: 'Requested By', value: mailto(d.requestedBy) },
    { label: 'Requested On', value: formatDate(d.requestAt) },
  ];

  const impact = isBlacklistType(d.requestType)
    ? impactList(
        'The vendor is now excluded from',
        ['Vendor selection', 'RFQs', 'The Approved Vendor List', 'New purchase orders'],
        'Existing transactional history is retained.',
      )
    : impactList('What this means', [`The ${verb} request has been applied to the vendor`], '', 'ok');

  const comments = d.decisionComments?.trim()
    ? callout(
        'success',
        '💬',
        'Approver comments:',
        `<span style="${st('quote')}">“${escapeHtml(d.decisionComments.trim()).replace(/\r?\n/g, '<br />')}”</span>`,
        true,
      )
    : '';

  const body = `
              <p class="em-text" style="${css(STYLES.paragraph, { margin: 0 })}">
                ${intro[d.audience ?? 'all']}
              </p>

              ${comments}

              ${detailsCard('Decision', decisionRows)}

              ${detailsCard('Original request', requestRows)}

              ${impact}

              ${d.vendorUrl ? button(escapeHtml(d.vendorUrl), 'View Vendor') : ''}

              ${infoPills(
                { icon: '✅', label: 'Status', value: 'Approved', tone: 'primary' },
                { icon: '📅', label: 'Effective', value: approvedOn, tone: 'secondary' },
              )}

              ${callout(
                'info',
                'ℹ️',
                'No further action is needed.',
                'This email is a record of the decision. The approval link from the original request can no longer be used.',
                true,
              )}
              ${(d.audience ?? 'all') === 'approver' ? '' : callout('danger', '⚠️', 'Think this decision is wrong?', 'Contact your procurement administrator.')}`;

  return renderShell({
    title: vendorBlacklistApprovedSubject(d),
    preheader: `The ${d.requestType.toLowerCase()} request for ${d.vendorCode} — ${d.vendorName} was approved by ${d.approvedBy}.`,
    heroIcon: THEME.heroIconApproved,
    heroIconAlt: 'Approved',
    heroTitle: `Vendor ${d.requestType} Request Approved`,
    heroSubtitle: 'The decision has been recorded.',
    body,
    supportEmail: d.supportEmail,
  });
};

/* ───────────────────────── 6d. Template: request rejected ───────────────────────── */

export type DecisionAudience = ApprovedAudience;

export interface VendorBlacklistRejectedData {
  vendorName: string;
  vendorCode: string;
  /** e.g. "Blacklist". */
  requestType: string;
  requestReason: string;
  /** When the request was raised (ISO string or Date). */
  requestAt: string | Date;
  requestedBy: string;
  rejectedBy: string;
  rejectedOn: string | Date;
  /** Why it was rejected. Strongly recommended, so the requester knows what to fix. */
  decisionComments?: string;

  /** Recommended: the requestId, shown for traceability. */
  requestId?: string;
  /** Defaults to "all" (one email to requester, cc approver). */
  audience?: DecisionAudience;
  /** Optional link to raise a new request or view the vendor. Adds a button. */
  actionUrl?: string;
  /** Button label for actionUrl. Defaults to "View Vendor". */
  actionLabel?: string;
  /** Optional; adds a "contact support" link to the footer. */
  supportEmail?: string;
}

/** Plain-text subject line (do not HTML-escape). */
export const vendorBlacklistRejectedSubject = (d: VendorBlacklistRejectedData): string =>
  `Rejected: ${d.requestType.toLowerCase()} vendor ${d.vendorCode} — ${d.vendorName}`;

export const vendorBlacklistRejectedTemplate = (d: VendorBlacklistRejectedData): string => {
  const type = escapeHtml(d.requestType || 'Blacklist');
  const verb = type.toLowerCase();
  const vendor = `${escapeHtml(d.vendorCode)} — ${escapeHtml(d.vendorName)}`;
  const rejectedOn = formatDate(d.rejectedOn);
  const rejecter = d.rejectedBy.includes('@') ? mailto(d.rejectedBy) : escapeHtml(d.rejectedBy);
  const rejecterText = escapeHtml(d.rejectedBy);
  const b = (html: string) => `<strong style="${st('strong')}">${html}</strong>`;

  const intro: Record<DecisionAudience, string> = {
    requester: `Your request to ${b(verb)} vendor ${b(vendor)} has been ${b('rejected')} by ${rejecterText}.`,
    approver: `This confirms that you ${b('rejected')} the request to ${b(verb)} vendor ${b(vendor)}. The decision has been recorded.`,
    all: `The request to ${b(verb)} vendor ${b(vendor)} has been ${b('rejected')} by ${rejecterText}.`,
  };

  const decisionRows = [
    { label: 'Decision', value: `<span class="em-danger em-danger-surface" style="${st('badgeDanger')}">Rejected</span>` },
    { label: 'Rejected By', value: rejecter },
    { label: 'Rejected On', value: rejectedOn },
  ];

  const requestRows = [
    ...(d.requestId ? [{ label: 'Request ID', value: `<span style="${st('mono')}">${escapeHtml(d.requestId)}</span>` }] : []),
    { label: 'Vendor Code', value: escapeHtml(d.vendorCode) },
    { label: 'Vendor Name', value: escapeHtml(d.vendorName) },
    { label: 'Request Type', value: `<span class="em-muted" style="${st('strike')}">${type}</span>` },
    { label: 'Reason', value: escapeHtml(d.requestReason || '—').replace(/\r?\n/g, '<br />') },
    { label: 'Requested By', value: mailto(d.requestedBy) },
    { label: 'Requested On', value: formatDate(d.requestAt) },
  ];

  const impact = isBlacklistType(d.requestType)
    ? impactList(
        'What this means',
        [
          'The vendor’s current status is unchanged',
          'The vendor remains available for selection, RFQs, the Approved Vendor List and new purchase orders',
          'The approval link from the original request can no longer be used',
        ],
        '',
        'ok',
      )
    : impactList(
        'What this means',
        ['The vendor’s current status is unchanged', 'The approval link from the original request can no longer be used'],
        '',
        'ok',
      );

  const comments = d.decisionComments?.trim()
    ? callout(
        'danger',
        '💬',
        'Reason for rejection:',
        `<span style="${st('quote')}">“${escapeHtml(d.decisionComments.trim()).replace(/\r?\n/g, '<br />')}”</span>`,
        true,
      )
    : '';

  const nextStep =
    (d.audience ?? 'all') === 'approver'
      ? callout('info', 'ℹ️', 'No further action is needed.', 'This email is a record of your decision.', true)
      : callout(
          'info',
          'ℹ️',
          'Need to raise it again?',
          'Review the reason above and submit a new request with additional supporting details.',
          true,
        );

  const body = `
              <p class="em-text" style="${css(STYLES.paragraph, { margin: 0 })}">
                ${intro[d.audience ?? 'all']}
              </p>

              ${comments}

              ${detailsCard('Decision', decisionRows)}

              ${detailsCard('Original request', requestRows)}

              ${impact}

              ${d.actionUrl ? button(escapeHtml(d.actionUrl), escapeHtml(d.actionLabel || 'View Vendor')) : ''}

              ${infoPills(
                { icon: '⛔', label: 'Status', value: 'Rejected', tone: 'primary' },
                { icon: '📅', label: 'Decided on', value: rejectedOn, tone: 'secondary' },
              )}

              ${nextStep}
              ${(d.audience ?? 'all') === 'approver' ? '' : callout('danger', '⚠️', 'Think this decision is wrong?', 'Contact your procurement administrator.')}`;

  return renderShell({
    title: vendorBlacklistRejectedSubject(d),
    preheader: `The ${d.requestType.toLowerCase()} request for ${d.vendorCode} — ${d.vendorName} was rejected by ${d.rejectedBy}.`,
    heroIcon: THEME.heroIconRejected,
    heroIconAlt: 'Rejected',
    heroTitle: `Vendor ${d.requestType} Request Rejected`,
    heroSubtitle: 'The decision has been recorded.',
    body,
    supportEmail: d.supportEmail,
  });
};
