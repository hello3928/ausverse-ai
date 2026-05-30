// Cloudflare Worker — Custom Error Pages for Ausverse AI
// Deploy at: Workers & Pages → Create Worker → paste this → add route ausverseai.com/*

const ERROR_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Ausverse AI — Offline</title>
  <link rel="icon" href="/favicon.ico" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'JetBrains Mono', monospace;
      background: #0a0a0a; color: #e0e0e0;
      min-height: 100vh; display: flex;
      align-items: center; justify-content: center; padding: 24px;
    }
    .container { max-width: 520px; width: 100%; }
    .code-row { display: flex; align-items: flex-end; gap: 16px; margin-bottom: 12px; }
    .code {
      font-size: 72px; font-weight: 700; color: #f0f0f0;
      line-height: 1; letter-spacing: -3px; font-variant-numeric: tabular-nums;
    }
    .severity-wrap { padding-bottom: 8px; }
    .severity-badge { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
    .severity-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #ff4444; box-shadow: 0 0 8px #ff4444;
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .severity-label { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; color: #ff4444; text-transform: uppercase; }
    .title { font-size: 16px; font-weight: 600; color: #b0b0b0; }
    .message { font-size: 13px; color: #666; line-height: 1.7; margin-bottom: 20px; }
    .details {
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;
    }
    .details-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .details-title { font-size: 11px; font-weight: 600; color: #555; letter-spacing: 1px; text-transform: uppercase; }
    .copy-btn {
      font-size: 11px; color: #555; background: none; border: none;
      cursor: pointer; font-family: inherit; padding: 2px 6px; transition: color 0.2s;
    }
    .copy-btn:hover { color: #888; }
    .copy-btn.copied { color: #4ade80; }
    .detail-row { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 6px; }
    .detail-row:last-child { margin-bottom: 0; }
    .detail-key { font-size: 11px; color: #555; min-width: 70px; flex-shrink: 0; }
    .detail-val { font-size: 11px; color: #b0b0b0; word-break: break-all; }
    .detail-val.incident { color: #ff4444; font-weight: 500; }
    .detail-val.cause { color: #ffaa00; }
    .actions { display: flex; align-items: center; gap: 12px; }
    .btn {
      font-size: 13px; color: #888; padding: 8px 18px;
      border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;
      text-decoration: none; font-family: inherit;
      background: rgba(255,255,255,0.03); cursor: pointer; transition: border-color 0.2s;
    }
    .btn:hover { border-color: rgba(255,255,255,0.15); }
    .btn-text { font-size: 13px; color: #555; padding: 8px 18px; text-decoration: none; font-family: inherit; background: none; border: none; cursor: pointer; }
  </style>
</head>
<body>
  <div class="container">
    <div class="code-row">
      <p class="code" id="error-code">503</p>
      <div class="severity-wrap">
        <div class="severity-badge">
          <div class="severity-dot"></div>
          <span class="severity-label">CRITICAL</span>
        </div>
        <p class="title" id="error-title">Service Unavailable</p>
      </div>
    </div>
    <p class="message" id="error-message">
      The Ausverse AI terminal is currently offline. The application server is unreachable or restarting.
      This is usually resolved automatically within a few minutes.
    </p>
    <div class="details">
      <div class="details-header">
        <span class="details-title">Incident Details</span>
        <button class="copy-btn" id="copy-btn" onclick="copyIncident()">Copy</button>
      </div>
      <div class="detail-row">
        <span class="detail-key">incident</span>
        <span class="detail-val incident" id="incident-id"></span>
      </div>
      <div class="detail-row">
        <span class="detail-key">status</span>
        <span class="detail-val" id="status-text"></span>
      </div>
      <div class="detail-row">
        <span class="detail-key">time</span>
        <span class="detail-val" id="timestamp"></span>
      </div>
      <div class="detail-row">
        <span class="detail-key">path</span>
        <span class="detail-val" id="request-path"></span>
      </div>
      <div class="detail-row">
        <span class="detail-key">cause</span>
        <span class="detail-val cause" id="cause-text"></span>
      </div>
      <div class="detail-row">
        <span class="detail-key">edge</span>
        <span class="detail-val" id="edge-location"></span>
      </div>
    </div>
    <div class="actions">
      <button class="btn" onclick="location.reload()">Retry</button>
      <a href="/status" class="btn-text">System Status</a>
    </div>
  </div>
  <script>
    var ERROR_MAP = {
      520: { title: 'Unknown Error', cause: 'Origin returned an unexpected response' },
      521: { title: 'Web Server Down', cause: 'Origin web server refused the connection' },
      522: { title: 'Connection Timed Out', cause: 'TCP handshake to origin server timed out' },
      523: { title: 'Origin Unreachable', cause: 'DNS or routing failure to origin server' },
      524: { title: 'Origin Timeout', cause: 'Origin server did not respond within timeout' },
      525: { title: 'SSL Handshake Failed', cause: 'SSL/TLS negotiation with origin failed' },
      526: { title: 'Invalid SSL Certificate', cause: 'Origin SSL certificate could not be validated' },
      502: { title: 'Bad Gateway', cause: 'Upstream returned an invalid response' },
      503: { title: 'Service Unavailable', cause: 'Application server is offline or restarting' },
      504: { title: 'Gateway Timeout', cause: 'Upstream did not respond in time' },
    };

    var code = parseInt(document.getElementById('error-code').dataset.code || '503');
    var info = ERROR_MAP[code] || { title: 'Service Unavailable', cause: 'Upstream server not responding' };

    document.getElementById('error-code').textContent = code;
    document.getElementById('error-title').textContent = info.title;
    document.getElementById('status-text').textContent = code + ' ' + info.title;
    document.getElementById('cause-text').textContent = info.cause;

    var now = Date.now();
    var rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    var incidentId = 'INC-' + now.toString(36).toUpperCase() + '-' + rand;
    var ts = new Date().toISOString();
    var path = window.location.pathname + window.location.search;
    var edge = document.getElementById('edge-location').dataset.edge || 'unknown';

    document.getElementById('incident-id').textContent = incidentId;
    document.getElementById('timestamp').textContent = ts;
    document.getElementById('request-path').textContent = path || '/';
    document.getElementById('edge-location').textContent = edge;

    function copyIncident() {
      var report = [
        'Incident: ' + incidentId,
        'Code: ' + code + ' ' + info.title,
        'Time: ' + ts,
        'Path: ' + path,
        'Cause: ' + info.cause,
        'Edge: ' + edge,
        'UA: ' + navigator.userAgent
      ].join('\\n');
      navigator.clipboard.writeText(report).then(function() {
        var btn = document.getElementById('copy-btn');
        btn.textContent = 'Copied';
        btn.classList.add('copied');
        setTimeout(function() { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
      });
    }
  </script>
</body>
</html>`;

const ERROR_TITLES = {
  520: 'Unknown Error',
  521: 'Web Server Down',
  522: 'Connection Timed Out',
  523: 'Origin Unreachable',
  524: 'Origin Timeout',
  525: 'SSL Handshake Failed',
  526: 'Invalid SSL Certificate',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

export default {
  async fetch(request, env, ctx) {
    try {
      const response = await fetch(request);

      // If origin returns an error, serve our custom page
      if (response.status >= 500) {
        const code = response.status;
        const colo = request.cf?.colo || 'unknown';

        // Inject the error code and edge location into the HTML
        const html = ERROR_PAGE
          .replace('id="error-code">503', `id="error-code" data-code="${code}">${code}`)
          .replace('id="edge-location">', `id="edge-location" data-edge="${colo}">`);

        return new Response(html, {
          status: 200, // Return 200 so Cloudflare doesn't intercept
          headers: {
            'Content-Type': 'text/html;charset=UTF-8',
            'Cache-Control': 'no-store',
            'X-AIA-Error': String(code),
            'X-AIA-Edge': colo,
          },
        });
      }

      return response;
    } catch (err) {
      // fetch() itself failed — origin is completely unreachable (522-like)
      const colo = request.cf?.colo || 'unknown';
      const html = ERROR_PAGE
        .replace('id="error-code">503', `id="error-code" data-code="522">522`)
        .replace('id="edge-location">', `id="edge-location" data-edge="${colo}">`);

      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html;charset=UTF-8',
          'Cache-Control': 'no-store',
          'X-AIA-Error': '522',
          'X-AIA-Edge': colo,
        },
      });
    }
  },
};
