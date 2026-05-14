const PAGE_503 = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>503 — AusVerse Intelligence Agency</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0a0a0a;
      color: #f0f0f0;
      font-family: ui-monospace, "SF Mono", "Cascadia Code", "Fira Code", monospace;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
    }
    .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 48px; }
    .brand-badge {
      width: 28px; height: 28px; background: #cc0000;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 800; color: white; letter-spacing: 1px;
    }
    .brand-name { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.6); letter-spacing: 0.3px; text-align: left; }
    .brand-sub { font-size: 10px; color: rgba(255,255,255,0.2); margin-top: 2px; text-align: left; }
    .card {
      padding: 48px 56px;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 12px;
      background: rgba(255,255,255,0.02);
      max-width: 440px; width: 100%;
    }
    .code { font-size: 80px; font-weight: 900; color: white; line-height: 1; letter-spacing: -3px; }
    .divider { width: 32px; height: 2px; background: #cc0000; margin: 16px auto; }
    .title { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.7); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px; }
    .desc { font-size: 12px; color: rgba(255,255,255,0.3); line-height: 1.7; }
    .badge {
      display: inline-block; margin-top: 24px;
      font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
      color: rgba(255,255,255,0.15); padding: 4px 10px;
      border: 1px solid rgba(255,255,255,0.07); border-radius: 4px;
    }
    .back {
      display: inline-block; margin-top: 32px;
      font-size: 11px; color: rgba(255,255,255,0.5); letter-spacing: 1px;
      padding: 9px 20px; border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px; text-decoration: none;
    }
    .footer { position: fixed; bottom: 20px; font-size: 10px; color: rgba(255,255,255,0.1); letter-spacing: 2px; }
  </style>
</head>
<body>
  <div class="brand">
    <div class="brand-badge">AIA</div>
    <div>
      <div class="brand-name">AusVerse</div>
      <div class="brand-sub">Intelligence Agency</div>
    </div>
  </div>
  <div class="card">
    <div class="code">503</div>
    <div class="divider"></div>
    <div class="title">Service Unavailable</div>
    <div class="desc">This system is temporarily offline for maintenance or is under heavy load. Operations will resume shortly.</div>
    <div class="badge">ERR_503</div>
  </div>
  <a class="back" href="/">← Return to Terminal</a>
  <div class="footer">AIA · SECURE TERMINAL</div>
</body>
</html>`;

export default {
  async fetch(request, env, ctx) {
    try {
      const response = await fetch(request);
      if (response.status >= 500) {
        return new Response(PAGE_503, {
          status: 503,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
      return response;
    } catch {
      return new Response(PAGE_503, {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
  },
};
