/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Request for Quotation emails (self-contained)
 *
 *  Exports:
 *    - rfqIssuedSubject(data)  → subject line (plain text)
 *    - rfqIssuedTemplate(data) → the RFQ issued to the vendor, with
 *                                "Acknowledge RFQ" and "View RFQ" buttons
 *
 *  Same structure and look as material-requisition-review-template.ts:
 *    1. PALETTE  2. THEME  3. STYLES  4. Components  5. Shell  6. Templates
 *
 *  Keep sections 1–2 identical across email files so every email matches.
 *  Every user-supplied value is HTML-escaped before it is placed in markup.
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
  heroIconReturned: 'https://img.icons8.com/ios-filled/50/ffffff/undo.png',
  heroIconResubmitted: 'https://img.icons8.com/ios-filled/50/ffffff/available-updates.png',
  heroIconRfq: 'https://img.icons8.com/ios-filled/50/ffffff/purchase-order.png',

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

  /* Requisition lines table */
  linesRow: { paddingTop: 28 },
  linesBox: {
    border: `1px solid ${c.primaryBorder}`,
    borderRadius: THEME.radius.md,
    overflow: 'hidden',
  },
  linesHead: {
    ...font,
    padding: '10px 12px',
    fontSize: 11,
    lineHeight: 1.4,
    fontWeight: 700,
    letterSpacing: '0.6px',
    textTransform: 'uppercase',
    textAlign: 'left',
    color: c.textSubtle,
    backgroundColor: c.surfaceAlt,
  },
  linesCell: {
    ...font,
    padding: '10px 12px',
    fontSize: 13,
    lineHeight: 1.5,
    verticalAlign: 'top',
    color: c.text,
    borderTop: `1px solid ${c.border}`,
  },
  linesNum: { textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600, color: c.heading },
  linesCode: { fontFamily: THEME.font.mono, fontSize: 12, fontWeight: 600, color: c.primary, whiteSpace: 'nowrap' },

  /* Decision comments */
  commentsRow: { paddingTop: 28 },
  commentCard: {
    backgroundColor: c.surfaceAlt,
    border: `1px solid ${c.primaryBorder}`,
    borderRadius: THEME.radius.md,
    padding: '14px 18px',
  },
  commentGap: { paddingTop: 10 },
  commentName: { ...font, fontSize: 14, lineHeight: 1.5, fontWeight: 700, color: c.heading },
  commentMeta: { ...font, margin: '2px 0 8px', fontSize: 12, lineHeight: 1.5, color: c.textMuted },
  commentText: { ...font, fontSize: 14, lineHeight: 1.6, color: c.text, fontStyle: 'italic' },
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

/* ───────────────────────── 4b. RFQ components ───────────────────────── */

/** "2026-11-15" → "Nov 15, 2026" (a calendar day — no time zone shift). */
function formatDay(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const iso = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return escapeHtml(value);
  const text = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' })
    .format(new Date(Date.UTC(y, m - 1, d)));
  return escapeHtml(text);
}

const or = (value: string | number | null | undefined): string =>
  value === null || value === undefined || value === '' ? '—' : escapeHtml(value);

const multiline = (value: string | null | undefined): string =>
  escapeHtml(value || '—').replace(/\r?\n/g, '<br />');

type BadgeTone = 'success' | 'danger' | 'neutral';

const BADGE_STYLE: Record<BadgeTone, { style: StyleName; cls: string }> = {
  success: { style: 'badgeSuccess', cls: 'em-success em-success-surface' },
  danger:  { style: 'badgeDanger',  cls: 'em-danger em-danger-surface' },
  neutral: { style: 'badgeNeutral', cls: 'em-surface' },
};

function badge(label: string, tone: BadgeTone): string {
  const b = BADGE_STYLE[tone];
  return `<span class="${b.cls}" style="${st(b.style)}">${escapeHtml(label)}</span>`;
}

export interface RfqMailLine {
  lineNumber: number;
  itemCode: string;
  description: string;
  uom: string | null;
  rfqQuantity: number;
}

export interface RfqIssuedData {
  rfqNumber: string;
  revisionNo: number;
  subject: string;
  /** The letter's body, as the buyer wrote it. */
  content: string | null;
  vendorName: string;
  vendorAddress: string | null;
  projectCode: string | null;
  projectName: string | null;
  clientName: string | null;
  requisitions: string[];
  issueDate: string | null;
  /** YYYY-MM-DD */
  bidClosingDate: string | null;
  sealedBid: boolean;
  /** "Technical", "Commercial", "Technical and Commercial" or null. */
  ndaScope: string | null;
  itemCount: number;
  /** The first lines (the email shows up to ten). */
  lines: RfqMailLine[];
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  trackingId: string | null;
  acknowledgeUrl: string;
  viewUrl: string;
  supportEmail?: string;
}

const MAX_LINES_SHOWN = 10;

function rfqDetails(d: RfqIssuedData): string {
  const project = [d.projectCode, d.projectName].filter(Boolean).map(escapeHtml).join(' — ') || '—';
  const contact = [
    d.contactName ? escapeHtml(d.contactName) : '',
    d.contactEmail ? mailto(d.contactEmail) : '',
    d.contactPhone ? escapeHtml(d.contactPhone) : '',
  ].filter(Boolean).join('<br />') || '—';
  return detailsCard('RFQ details', [
    { label: 'RFQ Number', value: `<span style="${st('accent')}">${escapeHtml(d.rfqNumber)}</span> &nbsp;${badge(`Rev ${d.revisionNo}`, 'neutral')}` },
    { label: 'Issue Date', value: formatDay(d.issueDate) },
    { label: 'Bid Closing Date', value: `<strong style="${st('strong')}">${formatDay(d.bidClosingDate)}</strong>` },
    { label: 'Project', value: project },
    { label: 'Client', value: or(d.clientName) },
    { label: 'Material Requisitions', value: or(d.requisitions.join(', ')) },
    { label: 'Items', value: `${d.itemCount} line${d.itemCount === 1 ? '' : 's'}` },
    { label: 'Sealed Bid', value: d.sealedBid ? badge('Yes', 'success') : badge('No', 'neutral') },
    ...(d.ndaScope ? [{ label: 'Non-Disclosure Agreement', value: escapeHtml(d.ndaScope) }] : []),
    { label: 'Contact Person', value: contact },
    { label: 'Tracking ID', value: `<span style="${st('mono')}">${or(d.trackingId)}</span>` },
  ]);
}

function rfqLinesTable(d: RfqIssuedData): string {
  if (!d.lines.length) return '';
  const shown = d.lines.slice(0, MAX_LINES_SHOWN);
  const rows = shown
    .map((l) => `<tr>
      <td class="em-text em-line" style="${st('linesCell')}">${l.lineNumber}</td>
      <td class="em-link em-line" style="${st('linesCell', 'linesCode')}">${escapeHtml(l.itemCode)}</td>
      <td class="em-text em-line" style="${st('linesCell')}">${escapeHtml(l.description)}</td>
      <td class="em-heading em-line" style="${st('linesCell', 'linesNum')}">${escapeHtml(l.rfqQuantity)} ${escapeHtml(l.uom ?? '')}</td>
    </tr>`)
    .join('');
  const more = d.itemCount - shown.length;
  return `
<table ${T}><tr><td style="${st('linesRow')}">
  <p class="em-muted" style="${st('sectionTitle')}">Items to quote</p>
  <table ${T}><tr><td class="em-surface em-line" style="${st('linesBox')}">
    <table ${T}>
      <tr>
        <th class="em-muted em-surface" align="left" style="${st('linesHead')}">#</th>
        <th class="em-muted em-surface" align="left" style="${st('linesHead')}">Item</th>
        <th class="em-muted em-surface" align="left" style="${st('linesHead')}">Description</th>
        <th class="em-muted em-surface" align="right" style="${css(STYLES.linesHead, { textAlign: 'right' })}">RFQ Qty</th>
      </tr>
      ${rows}
    </table>
  </td></tr></table>
  ${more > 0 ? `<p class="em-muted" style="${st('impactNote')}">…and ${more} more line${more === 1 ? '' : 's'} — open the RFQ to see them all.</p>` : ''}
</td></tr></table>`;
}

/* ───────────────────────── 6. Template: RFQ issued to the vendor ───────────────────────── */

/** Plain-text subject line (do not HTML-escape). */
export const rfqIssuedSubject = (d: RfqIssuedData): string =>
  `${d.subject || 'Request for Quotation'} — RFQ ${d.rfqNumber}${d.revisionNo ? ` Rev ${d.revisionNo}` : ''}`;

export const rfqIssuedTemplate = (d: RfqIssuedData): string => {
  const rfqNo = escapeHtml(d.rfqNumber);
  const body = `
              <p class="em-text" style="${css(STYLES.paragraph, { margin: 0 })}">Dear <strong style="${st('strong')}">${escapeHtml(d.vendorName)}</strong>,</p>
              ${d.vendorAddress ? `<p class="em-muted" style="${css(STYLES.paragraph, { margin: '4px 0 0' })}">${escapeHtml(d.vendorAddress)}</p>` : ''}

              <p class="em-heading" style="${css(STYLES.paragraph, { margin: '20px 0 0' })}"><strong style="${st('strong')}">Subject: ${escapeHtml(d.subject)}</strong></p>
              <p class="em-text" style="${css(STYLES.paragraph, { margin: '12px 0 0' })}">${multiline(d.content)}</p>

              ${rfqDetails(d)}

              ${rfqLinesTable(d)}

              ${button(escapeHtml(d.acknowledgeUrl), 'Acknowledge RFQ')}
              ${button(escapeHtml(d.viewUrl), 'View RFQ')}

              ${infoPills(
                { icon: '📅', label: 'Bid closes on', value: formatDay(d.bidClosingDate), tone: 'primary' },
                { icon: '📦', label: 'Items to quote', value: String(d.itemCount), tone: 'secondary' },
              )}

              ${callout(
                'info',
                'ℹ️',
                'What happens next.',
                `Please acknowledge RFQ ${rfqNo} first, then submit your quotation in the application before the bid closing date. The RFQ package holds the scope, specifications, drawings, commercial terms and the price schedule.`,
                true,
              )}
              ${d.sealedBid ? callout('success', '🔒', 'Sealed bid.', 'Your quotation stays sealed until the bid opening, which needs at least three company members.') : ''}
              ${callout('danger', '⚠️', 'Not expecting this?', `Do not action it. Contact ${d.contactEmail ? mailto(d.contactEmail) : 'the buyer'}.`)}`;

  return renderShell({
    title: rfqIssuedSubject(d),
    preheader: escapeHtml(`RFQ ${d.rfqNumber} — please acknowledge and quote before ${d.bidClosingDate ?? 'the bid closing date'}.`),
    heroIcon: THEME.heroIconRfq,
    heroIconAlt: 'Request for Quotation',
    heroTitle: 'Request for Quotation',
    heroSubtitle: 'You are invited to submit your quotation.',
    body,
    supportEmail: d.supportEmail,
  });
};

/* ───────────────────────── 7. Template: the vendor submitted its response (to the buyer) ───────────────────────── */

export interface RfqResponseSubmittedData {
  rfqNumber: string;
  revisionNo: number;
  subject: string | null;
  vendorName: string;
  projectCode: string | null;
  projectName: string | null;
  clientName: string | null;
  bidClosingDate: string | null;
  submittedBy: string;
  submittedAt: string | Date;
  /** True when the vendor revised a response it had already submitted. */
  resubmitted: boolean;
  quotedCurrency: string | null;
  /** Items + other charges, in the quoted currency. */
  quotedTotal: number | null;
  quotedTotalUsd: number | null;
  itemCount: number;
  pricedCount: number;
  compliant: number;
  nonCompliant: number;
  deviationCount: number;
  checklistProvided: number;
  checklistTotal: number;
  trackingId: string | null;
  viewUrl: string;
  supportEmail?: string;
}

const money = (v: number | null, currency: string | null): string =>
  v == null
    ? '—'
    : `${escapeHtml(new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v))}${currency ? ` ${escapeHtml(currency)}` : ''}`;

/** Plain-text subject line (do not HTML-escape). */
export const rfqResponseSubmittedSubject = (d: RfqResponseSubmittedData): string =>
  `${d.resubmitted ? 'Updated response' : 'Response received'}: RFQ ${d.rfqNumber}${d.revisionNo ? ` Rev ${d.revisionNo}` : ''} — ${d.vendorName}`;

export const rfqResponseSubmittedTemplate = (d: RfqResponseSubmittedData): string => {
  const project = [d.projectCode, d.projectName].filter(Boolean).map(escapeHtml).join(' — ') || '—';
  const verb = d.resubmitted ? 'updated its' : 'submitted its';
  const body = `
              <p class="em-text" style="${css(STYLES.paragraph, { margin: 0 })}">
                <strong style="${st('strong')}">${escapeHtml(d.vendorName)}</strong> has ${verb} response to
                RFQ <strong style="${st('strong')}">${escapeHtml(d.rfqNumber)}</strong>${d.subject ? ` — ${escapeHtml(d.subject)}` : ''}.
              </p>

              ${detailsCard('Response summary', [
                { label: 'RFQ Number', value: `<span style="${st('accent')}">${escapeHtml(d.rfqNumber)}</span> &nbsp;${badge(`Rev ${d.revisionNo}`, 'neutral')}` },
                { label: 'Vendor', value: escapeHtml(d.vendorName) },
                { label: 'Project', value: project },
                { label: 'Client', value: or(d.clientName) },
                { label: 'Submitted', value: `${formatDate(d.submittedAt)}${d.submittedBy ? `<br />${mailto(d.submittedBy)}` : ''}` },
                { label: 'Bid Closing Date', value: formatDay(d.bidClosingDate) },
                { label: 'Quotation Total', value: `<strong style="${st('strong')}">${money(d.quotedTotal, d.quotedCurrency)}</strong>` },
                { label: 'Total (USD)', value: money(d.quotedTotalUsd, 'USD') },
                { label: 'Items Priced', value: `${d.pricedCount} of ${d.itemCount}` },
                {
                  label: 'Compliance',
                  value: `${badge(`${d.compliant} compliant`, 'success')} ${d.nonCompliant ? badge(`${d.nonCompliant} not compliant`, 'danger') : ''}`,
                },
                { label: 'Deviations', value: String(d.deviationCount) },
                { label: 'Checklist', value: `${d.checklistProvided} of ${d.checklistTotal} provided` },
                { label: 'Tracking ID', value: `<span style="${st('mono')}">${or(d.trackingId)}</span>` },
              ])}

              ${button(escapeHtml(d.viewUrl), 'Review Response')}

              ${callout('info', 'ℹ️', 'Next step.', 'Open the RFQ to review the prices, compliance answers, deviations and documents, then complete or approve it.', true)}`;

  return renderShell({
    title: rfqResponseSubmittedSubject(d),
    preheader: escapeHtml(`${d.vendorName} has ${verb} response to RFQ ${d.rfqNumber}.`),
    heroIcon: THEME.heroIconApproved,
    heroIconAlt: 'Response received',
    heroTitle: d.resubmitted ? 'Vendor Response Updated' : 'Vendor Response Received',
    heroSubtitle: `${d.vendorName} has responded to your Request for Quotation.`,
    body,
    supportEmail: d.supportEmail,
  });
};
