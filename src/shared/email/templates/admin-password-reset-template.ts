/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Admin password reset email (self-contained)
 *
 *  Exports:
 *    - adminPasswordResetSubject()
 *    - adminPasswordResetTemplate(data) → "an administrator reset your password"
 *
 *  Same structure and theme as verify-email-template.ts:
 *    1. PALETTE   2. THEME   3. STYLES   4. Components   5. Layout   6. Template
 *
 *  To re-theme, change PALETTE (or THEME). No markup needs touching.
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
} as const;

/* ───────────────────────── 2. THEME ───────────────────────── */

const p = PALETTE.primary;
const s = PALETTE.secondary;

/** '#005faf', 0.4 → 'rgba(0,95,175,0.4)' */
function alpha(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const THEME = {
  brandName: 'Project Management',
  supportMailbox: 'support',
  lockIcon: 'https://img.icons8.com/ios-filled/50/ffffff/lock--v1.png',

  color: {
    primary: p[40],
    primaryHover: p[35],
    primarySurface: p[95],
    primaryBorder: p[90],
    onPrimary: p[100],
    secondary: s[40],
    secondarySurface: s[95],

    pageBg: p[95],
    surface: p[100],
    surfaceAlt: p[98],
    border: s[90],

    heading: s[10],
    text: s[25],
    textMuted: s[50],
    textSubtle: s[60],
    link: p[40],

    warnSurface: '#fff6e0',
    warnBorder: '#e0a100',
    warnText: '#6b4a00',

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
    warnSurface: '#3a2d08',
    warnText: '#ffe29a',
  },

  heroGradient: 'linear-gradient(160deg,#0f4c81 0%,#1565c0 50%,#0b2e59 100%)',
  heroFallback: p[30],

  font: {
    family: `'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif`,
    outlook: `'Segoe UI',Arial,sans-serif`,
    mono: `'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace`,
  },

  radius: { sm: 8, md: 10, lg: 20, icon: 16 },
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

  content: { padding: '44px 40px 36px' },
  paragraph: { ...font, margin: '0 0 12px', fontSize: 15, lineHeight: 1.7, color: c.text },
  accent: { color: c.primary, fontWeight: 700 },
  strong: { fontWeight: 700 },

  /* Credentials card */
  credsRow: { paddingTop: 28 },
  creds: {
    backgroundColor: c.surfaceAlt,
    border: `1px solid ${c.primaryBorder}`,
    borderRadius: THEME.radius.md,
    padding: '18px 20px',
  },
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
  credValue: { ...font, margin: '0 0 14px', fontSize: 15, lineHeight: 1.4, fontWeight: 600, color: c.heading },
  credSecret: {
    margin: 0,
    padding: 0,
    fontFamily: THEME.font.mono,
    fontSize: 18,
    lineHeight: 1.4,
    fontWeight: 700,
    letterSpacing: '0.5px',
    color: c.primary,
  },

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

  /* Callouts */
  calloutRow: { paddingTop: 28 },
  callout: {
    backgroundColor: c.primarySurface,
    borderLeft: `4px solid ${c.primary}`,
    borderRadius: 6,
    padding: '14px 18px',
  },
  calloutWarn: {
    backgroundColor: c.warnSurface,
    borderLeft: `4px solid ${c.warnBorder}`,
    borderRadius: 6,
    padding: '14px 18px',
  },
  calloutText: { ...font, fontSize: 13, lineHeight: 1.6, color: c.textMuted },
  calloutWarnText: { ...font, fontSize: 13, lineHeight: 1.6, color: c.warnText },

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

const st = (...names: StyleName[]): string => css(...names.map((n) => STYLES[n] as Style));

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
    }

    @media (prefers-color-scheme: dark) {
      .em-page { background-color: ${d.pageBg} !important; }
      .em-card { background-color: ${d.surface} !important; }
      .em-surface { background-color: ${d.surfaceAlt} !important; border-color: ${d.border} !important; }
      .em-warn { background-color: ${d.warnSurface} !important; }
      .em-warn-text { color: ${d.warnText} !important; }
      .em-heading { color: ${d.heading} !important; }
      .em-text { color: ${d.text} !important; }
      .em-muted { color: ${d.textMuted} !important; }
      .em-link { color: ${d.link} !important; }
    }
    [data-ogsc] .em-heading { color: ${d.heading} !important; }
    [data-ogsc] .em-text { color: ${d.text} !important; }
    [data-ogsc] .em-muted { color: ${d.textMuted} !important; }
    [data-ogsc] .em-link { color: ${d.link} !important; }
    [data-ogsb] .em-page { background-color: ${d.pageBg} !important; }
    [data-ogsb] .em-card { background-color: ${d.surface} !important; }
    [data-ogsb] .em-surface { background-color: ${d.surfaceAlt} !important; }
  `.replace(/\n\s+/g, '\n').trim();
}

/* ───────────────────────── 4. Components ───────────────────────── */

const T = 'role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"';

const escapeHtml = (v: unknown): string =>
  String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string);

function hostOf(domain: string): string {
  try {
    return new URL(/^https?:\/\//i.test(domain) ? domain : `https://${domain}`).hostname;
  } catch {
    return domain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  }
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

function credentials(email: string, password: string): string {
  return `
<table ${T}><tr><td style="${st('credsRow')}">
  <table ${T}><tr><td class="em-surface" bgcolor="${c.surfaceAlt}" style="${st('creds')}">
    <p class="em-muted" style="${st('label')}">Email</p>
    <p class="em-heading" style="${st('credValue')}">${escapeHtml(email)}</p>
    <p class="em-muted" style="${st('label')}">Temporary password</p>
    <p class="em-link" style="${st('credSecret')}">${escapeHtml(password)}</p>
  </td></tr></table>
</td></tr></table>`;
}

function callout(title: string, body: string, tone: 'info' | 'warn'): string {
  const box: StyleName = tone === 'warn' ? 'calloutWarn' : 'callout';
  const text: StyleName = tone === 'warn' ? 'calloutWarnText' : 'calloutText';
  const bg = tone === 'warn' ? c.warnSurface : c.primarySurface;
  const icon = tone === 'warn' ? '⚠' : '🛡';
  return `
<table ${T}><tr><td style="${st('calloutRow')}">
  <table ${T}><tr><td class="${tone === 'warn' ? 'em-warn' : 'em-surface'}" bgcolor="${bg}" style="${st(box)}">
    <p class="${tone === 'warn' ? 'em-warn-text' : 'em-text'}" style="${st(text)}">${icon}&nbsp;<strong style="${st('strong')}">${title}</strong> ${body}</p>
  </td></tr></table>
</td></tr></table>`;
}

/* ───────────────────────── 5. Template ───────────────────────── */

export interface AdminPasswordResetData {
  /** Recipient's first name for the greeting. */
  firstName: string;
  /** Login email of the account — echoed so the user knows which account was reset. */
  email: string;
  /** The temporary password the account was reset to. */
  temporaryPassword: string;
  /** Display name of the administrator who performed the reset. */
  resetBy: string;
  /** Application origin; builds the sign-in link and the support address. */
  domain: string;
}

export const adminPasswordResetSubject = (): string =>
  `Your password has been reset – ${THEME.brandName}`;

export const adminPasswordResetTemplate = (d: AdminPasswordResetData): string => {
  const brand = escapeHtml(THEME.brandName);
  const support = `${THEME.supportMailbox}@${hostOf(d.domain)}`;
  const signIn = escapeHtml(`${d.domain.replace(/\/+$/, '')}/auth/login`);
  const year = new Date().getFullYear();
  const preheader = `An administrator reset your ${brand} password. Sign in with the temporary password and change it right away.`;

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
  <title>${escapeHtml(adminPasswordResetSubject())}</title>
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
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;opacity:0;">${preheader}${'&#847;&zwnj;&nbsp;'.repeat(40)}</div>

  <table ${T} class="em-page" bgcolor="${c.pageBg}" style="${st('wrapper')}">
    <tr>
      <td align="center" class="em-wrap" style="${st('wrapperCell')}">
        <!--[if mso]><table role="presentation" width="${THEME.size.container}" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->

        <table ${T} class="em-card" bgcolor="${c.surface}" style="${st('card')}">

          <!-- Hero -->
          <tr>
            <td class="em-hero" align="center" bgcolor="${THEME.heroFallback}" style="${st('hero')}">
              <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px;">
                <tr><td style="${st('heroIconBox')}">
                  <img src="${THEME.lockIcon}" alt="Lock icon" width="${THEME.size.icon}" height="${THEME.size.icon}" style="${st('heroIcon')}" />
                </td></tr>
              </table>
              <h1 class="em-h1" style="${st('heroTitle')}">Your password has been reset</h1>
              <p style="${st('heroSubtitle')}">Sign in with the temporary password below.</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="em-pad" style="${st('content')}">
              <p class="em-text" style="${st('paragraph')}">Hi ${escapeHtml(d.firstName || 'there')},</p>
              <p class="em-text" style="${css(STYLES.paragraph, { margin: 0 })}">
                <strong class="em-link" style="${st('accent')}">${escapeHtml(d.resetBy)}</strong> reset the password for your
                ${brand} account at your request. Use the temporary password below to sign in.
              </p>

              ${credentials(d.email, d.temporaryPassword)}
              ${button(signIn, '🔐&nbsp;&nbsp;Sign In')}
              ${callout('Change it right away.', 'This temporary password is the same for every reset, so choose a new password of your own as soon as you have signed in.', 'warn')}
              ${callout("Didn't ask for this?", 'Contact your administrator straight away so the account can be secured.', 'info')}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="em-pad em-surface" align="center" bgcolor="${c.surfaceAlt}" style="${st('footer')}">
              <p class="em-muted" style="${st('footerText')}">
                This email was sent by <strong class="em-link" style="${st('accent')}">${brand}</strong>.
                If you have questions, contact our
                <a class="em-link" href="mailto:${support}" style="${st('footerLink')}">support team</a>.
              </p>
              <p class="em-muted" style="${st('footerCopy')}">&copy; ${year} ${brand}. All rights reserved.</p>
            </td>
          </tr>

        </table>

        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
};
