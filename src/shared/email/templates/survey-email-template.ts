// src/mail/templates/survey-share.email.template.ts

export interface SurveyShareEmailParams {
  /** Full name of the survey creator / organiser */
  organizerName:  string;
  /** Title of the survey e.g. "Perambur Election Survey 2026" */
  surveyTitle:    string;
  /** Media partner / channel name e.g. "ABC TV Channel" */
  mediaName?:     string;
  /** Full survey vote URL (may contain spaces – will be encoded) */
  surveyUrl:      string;
  /** Short alias used in the display URL e.g. "voter-pulse.com/s/abc123" */
  shortUrl:       string;
  /** Survey close date — JavaScript Date object */
  expiryDate:     Date;
  /** Optional personal message from the organiser */
  customMessage?: string;
  /** Domain used for the support mailto link */
  domain?:        string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

function encodeUrl(raw: string): string {
  try { return encodeURI(raw); } catch { return raw; }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });
}

function daysUntil(date: Date): number {
  const diff = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ─────────────────────────────────────────────────────────────────────────────
//  Social share URL builders
// ─────────────────────────────────────────────────────────────────────────────

function whatsappShareUrl(text: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

function facebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

function twitterShareUrl(text: string, url: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

function linkedinShareUrl(url: string, title: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main template
// ─────────────────────────────────────────────────────────────────────────────

export const surveyShareEmailTemplate = (params: SurveyShareEmailParams): string => {
  const {
    organizerName,
    surveyTitle,
    mediaName,
    surveyUrl,
    shortUrl,
    expiryDate,
    customMessage,
    domain = 'ProjectManagement.com',
  } = params;

  const year          = new Date().getFullYear();
  const encodedUrl    = encodeUrl(surveyUrl);
  const formattedDate = formatDate(expiryDate);
  const remaining     = daysUntil(expiryDate);
  const urgencyColor  = remaining <= 3 ? '#e11d48' : remaining <= 7 ? '#d97706' : '#059669';
  const urgencyBg     = remaining <= 3 ? '#fff1f2' : remaining <= 7 ? '#fffbeb' : '#f0fdf4';

  //logo image as base64 string (small file, so okay to inline)
    const mailIconSrc1 = `https://storage.googleapis.com/inv-images/home/votec.png`;
    const mailIconSrc  = `https://storage.googleapis.com/inv-images/home/vplogo10.png`;
  // Social share message
  const shareText = `🗳️ Cast your vote in "${surveyTitle}"! Your voice matters. Vote before ${formattedDate}.`;

  // Social share URLs
  const waUrl  = whatsappShareUrl(`${shareText} ${surveyUrl}`);
  const fbUrl  = facebookShareUrl(surveyUrl);
  const twUrl  = twitterShareUrl(shareText, surveyUrl);
  const liUrl  = linkedinShareUrl(surveyUrl, surveyTitle);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>Vote Now – ${surveyTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f0f2ff;
             font-family:'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:#f0f2ff;padding:36px 16px;">
    <tr><td align="center">

      <table width="100%" cellpadding="0" cellspacing="0" border="0"
             style="max-width:600px;background:#ffffff;border-radius:24px;
                    box-shadow:0 8px 40px rgba(79,70,229,0.14);overflow:hidden;">

        <!-- ════════════════════════════════
             HEADER — Brand + Survey title
        ════════════════════════════════ -->
        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);
                     padding:40px 40px 32px;text-align:center;">

            <!-- Logo / brand mark -->
            <div style="display:inline-block;background:rgba(255,255,255,0.05);
                        border-radius:18px;padding:4px;margin-bottom:18px;">                        
              <img src="${mailIconSrc}"
                     alt="Mail icon" width="80" height="80"
                     style="display:block;border:0;" />
            </div>

            <!-- Site name -->
            <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,0.75);
                        text-transform:uppercase;letter-spacing:2px;margin-bottom:10px;">
              Project Management
            </div>

            <!-- Survey title -->
            <h1 style="margin:0 0 10px;font-size:26px;font-weight:900;
                       color:#ffffff;letter-spacing:-0.4px;line-height:1.2;">
              ${surveyTitle}
            </h1>

            <!-- Media name badge (if provided) -->
            ${mediaName ? `
            <div style="display:inline-block;background:rgba(245,158,11,0.25);
                        border:1px solid rgba(245,158,11,0.5);
                        border-radius:50px;padding:5px 16px;margin-top:6px;">
              <span style="font-size:12px;font-weight:700;color:#fde68a;letter-spacing:0.3px;">
                📺 Presented by ${mediaName}
              </span>
            </div>` : ''}
          </td>
        </tr>

        <!-- ════════════════════════════════
             BODY
        ════════════════════════════════ -->
        <tr>
          <td style="padding:36px 40px 28px;">

            <!-- Greeting -->
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.75;">
              Hi there,
            </p>
            <p style="margin:0 0 ${customMessage ? '16px' : '28px'};
                      font-size:15px;color:#444;line-height:1.75;">
              <strong style="color:#1e1b4b;">${organizerName}</strong> has invited you
              to participate in an election survey.
              Your vote is completely confidential and takes less than a minute.
            </p>

            ${customMessage ? `
            <!-- Custom message from organiser -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="margin-bottom:28px;">
              <tr>
                <td style="background:#f5f3ff;border-left:4px solid #7c3aed;
                           border-radius:0 10px 10px 0;padding:14px 18px;">
                  <p style="margin:0;font-size:14px;color:#374151;
                             font-style:italic;line-height:1.6;">
                    "${customMessage}"
                  </p>
                  <p style="margin:6px 0 0;font-size:12px;color:#9ca3af;font-weight:600;">
                    — ${organizerName}
                  </p>
                </td>
              </tr>
            </table>` : ''}

            <!-- ── Short URL vote button ── -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="margin-bottom:20px;">
              <tr>
                <td align="center">
                  <a href="${encodedUrl}"
                     style="display:inline-block;
                            background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);
                            color:#ffffff;text-decoration:none;
                            font-size:18px;font-weight:800;
                            padding:18px 52px;border-radius:50px;
                            box-shadow:0 8px 24px rgba(79,70,229,0.45);
                            letter-spacing:0.3px;">
                    🗳️ &nbsp;Cast Your Vote Now
                  </a>
                </td>
              </tr>
            </table>

            <!-- Short URL display box -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="margin-bottom:24px;">
              <tr>
                <td style="background:#f8f7ff;border:1px solid #ddd6fe;
                           border-radius:12px;padding:14px 18px;text-align:center;">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;
                             color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">
                    Survey Link
                  </p>
                  <a href="${encodedUrl}"
                     style="font-size:14px;font-weight:700;color:#4f46e5;
                            text-decoration:none;word-break:break-all;">
                    ${shortUrl}
                  </a>
                  <p style="margin:6px 0 0;font-size:11px;color:#9ca3af;">
                    Click the link or copy it to your browser
                  </p>
                </td>
              </tr>
            </table>

            <!-- ── Expiry / urgency pill ── -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="margin-bottom:28px;">
              <tr>
                <td width="50%" style="padding-right:8px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                    <td style="background:${urgencyBg};border-radius:10px;
                               padding:14px 16px;text-align:center;">
                      <p style="margin:0 0 3px;font-size:10px;font-weight:700;
                                 color:${urgencyColor};text-transform:uppercase;
                                 letter-spacing:0.7px;">
                        ⏰ Voting closes
                      </p>
                      <p style="margin:0;font-size:13px;font-weight:700;
                                 color:${urgencyColor};">
                        ${formattedDate}
                      </p>
                    </td>
                  </tr></table>
                </td>
                <td width="50%" style="padding-left:8px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                    <td style="background:#eef2ff;border-radius:10px;
                               padding:14px 16px;text-align:center;">
                      <p style="margin:0 0 3px;font-size:10px;font-weight:700;
                                 color:#4f46e5;text-transform:uppercase;
                                 letter-spacing:0.7px;">
                        🔒 One vote per person
                      </p>
                      <p style="margin:0;font-size:13px;font-weight:700;color:#4f46e5;">
                        ${remaining > 0 ? remaining + ' day' + (remaining === 1 ? '' : 's') + ' remaining' : 'Last day to vote!'}
                      </p>
                    </td>
                  </tr></table>
                </td>
              </tr>
            </table>

            <!-- ════════════════════════════════
                 SHARE ON SOCIAL MEDIA
            ════════════════════════════════ -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="margin-bottom:24px;">
              <tr>
                <td style="background:#f9f8ff;border:1px solid #ede9fe;
                           border-radius:14px;padding:22px 20px;text-align:center;">

                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;
                             color:#7c3aed;text-transform:uppercase;letter-spacing:1.2px;">
                    Spread the word
                  </p>
                  <p style="margin:0 0 18px;font-size:13px;color:#6b7280;">
                    Share this survey so more voices are heard
                  </p>

                  <!-- Social buttons row -->
                  <table cellpadding="0" cellspacing="0" border="0"
                         style="margin:0 auto;">
                    <tr>

                      <!-- WhatsApp -->
                      <td style="padding:0 6px;">
                        <a href="${waUrl}" target="_blank"
                           style="display:inline-flex;align-items:center;gap:7px;
                                  background:#25d366;color:#ffffff;text-decoration:none;
                                  font-size:13px;font-weight:700;
                                  padding:11px 18px;border-radius:50px;
                                  box-shadow:0 4px 12px rgba(37,211,102,0.35);">
                          <svg xmlns="http://www.w3.org/2000/svg"
                               viewBox="0 0 24 24" width="16" height="16" fill="white">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.531 5.845L.057 23.25l5.565-1.459A11.948 11.948 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.372l-.359-.213-3.307.868.882-3.227-.234-.372A9.818 9.818 0 1112 21.818z"/>
                          </svg>
                          WhatsApp
                        </a>
                      </td>

                      <!-- Facebook -->
                      <td style="padding:0 6px;">
                        <a href="${fbUrl}" target="_blank"
                           style="display:inline-flex;align-items:center;gap:7px;
                                  background:#1877f2;color:#ffffff;text-decoration:none;
                                  font-size:13px;font-weight:700;
                                  padding:11px 18px;border-radius:50px;
                                  box-shadow:0 4px 12px rgba(24,119,242,0.35);">
                          <svg xmlns="http://www.w3.org/2000/svg"
                               viewBox="0 0 24 24" width="16" height="16" fill="white">
                            <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1
                                     4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025
                                     1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513
                                     c-1.491 0-1.956.93-1.956 1.887v2.267h3.328l-.532 3.49h-2.796V24
                                     C19.612 23.094 24 18.1 24 12.073z"/>
                          </svg>
                          Facebook
                        </a>
                      </td>

                      <!-- X / Twitter -->
                      <td style="padding:0 6px;">
                        <a href="${twUrl}" target="_blank"
                           style="display:inline-flex;align-items:center;gap:7px;
                                  background:#000000;color:#ffffff;text-decoration:none;
                                  font-size:13px;font-weight:700;
                                  padding:11px 18px;border-radius:50px;
                                  box-shadow:0 4px 12px rgba(0,0,0,0.25);">
                          <svg xmlns="http://www.w3.org/2000/svg"
                               viewBox="0 0 24 24" width="15" height="15" fill="white">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231
                                     -5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161
                                     17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                          X (Twitter)
                        </a>
                      </td>

                      <!-- LinkedIn -->
                      <td style="padding:0 6px;">
                        <a href="${liUrl}" target="_blank"
                           style="display:inline-flex;align-items:center;gap:7px;
                                  background:#0a66c2;color:#ffffff;text-decoration:none;
                                  font-size:13px;font-weight:700;
                                  padding:11px 18px;border-radius:50px;
                                  box-shadow:0 4px 12px rgba(10,102,194,0.35);">
                          <svg xmlns="http://www.w3.org/2000/svg"
                               viewBox="0 0 24 24" width="16" height="16" fill="white">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037
                                     -1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046
                                     c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286z
                                     M5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0
                                     112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452z
                                     M22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24
                                     1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774
                                     23.2 0 22.222 0h.003z"/>
                          </svg>
                          LinkedIn
                        </a>
                      </td>

                    </tr>
                  </table>

                  <!-- Instagram note -->
                  <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">
                    📸 <strong>Instagram:</strong> Copy the link above and paste it in your
                    Instagram bio or story to share with your followers.
                  </p>

                </td>
              </tr>
            </table>

            <!-- Privacy note -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background:#fef9f0;border-left:4px solid #f59e0b;
                           border-radius:0 10px 10px 0;padding:12px 16px;">
                  <p style="margin:0;font-size:12px;color:#92400e;line-height:1.6;">
                    <strong>Your privacy is protected.</strong>
                    Your vote is anonymous and confidential. Only one vote per person is allowed.
                    Voting closes on <strong>${formattedDate}</strong>.
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- ════════════════════════════════
             FOOTER
        ════════════════════════════════ -->
        <tr>
          <td style="background:#f7f8ff;border-top:1px solid #e5e7eb;
                     padding:22px 40px;text-align:center;">
            <p style="margin:0 0 6px;font-size:13px;color:#888;line-height:1.6;">
              This survey is powered by
              <strong style="color:#4f46e5;">Project Management</strong>.
              ${mediaName ? `Conducted in partnership with <strong>${mediaName}</strong>.` : ''}
            </p>
            <p style="margin:0 0 6px;font-size:12px;color:#aaa;">
              Questions?
              <a href="mailto:support@${domain}"
                 style="color:#4f46e5;text-decoration:none;font-weight:600;">
                Contact support
              </a>
            </p>
            <p style="margin:0;font-size:11px;color:#bbb;">
              © ${year} Project Management. All rights reserved.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`.trim();
};


// ─────────────────────────────────────────────────────────────────────────────
//  Short URL helper
//  Replace this with your actual URL shortener service call
//  (e.g. Bitly API, TinyURL API, or your own /short-url endpoint)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a deterministic short code from the survey ID.
 * In production, call a proper URL shortener API here.
 */
export function buildShortUrl(surveyId: string, baseDomain = 'voter-pulse.com'): string {
  // Take the first 10 alphanumeric chars of the survey ID as a readable code
  const code = surveyId.replace(/[^a-z0-9]/gi, '').slice(0, 10).toLowerCase();
  return `https://${baseDomain}/v/${code}`;
}


// ─────────────────────────────────────────────────────────────────────────────
//  Usage in your NestJS service (e.g. surveys.service.ts)
// ─────────────────────────────────────────────────────────────────────────────
//
//  import { surveyShareEmailTemplate, buildShortUrl } from '../mail/templates/survey-share.email.template';
//
//  async publishSurvey(surveyId: string, userId: string): Promise<void> {
//    const survey = await this.surveyRepo.findOne({ where: { id: surveyId }, relations: [...] });
//
//    const surveyUrl = `https://voter-pulse.com/${survey.createdBy.username}/vote/${surveyId}`;
//    const shortUrl  = buildShortUrl(surveyId);  // or call Bitly / TinyURL API
//
//    const html = surveyShareEmailTemplate({
//      organizerName: survey.createdBy.fullName,
//      surveyTitle:   survey.name,
//      mediaName:     survey.mediaPartner ?? undefined,
//      surveyUrl,
//      shortUrl,
//      expiryDate:    new Date(survey.endDate),
//      customMessage: survey.shareMessage ?? undefined,
//      domain:        'voter-pulse.com',
//    });
//
//    await this.mailService.send({
//      to:      recipientEmail,        // or a list of recipients
//      subject: `🗳️ Vote now – ${survey.name}`,
//      html,
//    });
//  }