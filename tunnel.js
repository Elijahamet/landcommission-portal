const { spawn } = require('child_process');
let cf = null;
try {
  cf = require('cloudflared');
} catch (e) {
  // Gracefully ignored on serverless or cloud platforms like Vercel
}

let tunnelProcess = null;
let currentPublicUrl = null;
const onUrlCallbacks = [];

function startTunnel(port = 5000, onUrl) {
  if (process.env.VERCEL || !cf) return;
  if (onUrl) {
    onUrlCallbacks.push(onUrl);
    if (currentPublicUrl) {
      onUrl(currentPublicUrl);
    }
  }

  if (tunnelProcess) return;

  try {
    const bin = cf.bin;
    tunnelProcess = spawn(bin, ['tunnel', '--url', `http://localhost:${port}`], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const handleOutput = (data) => {
      const text = data.toString();
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (match && !currentPublicUrl) {
        currentPublicUrl = match[0];
        console.log(`\n=======================================================`);
        console.log(` 🌐 WORLDWIDE PUBLIC HTTPS URL ACTIVE`);
        console.log(` Works on ANY phone, ANY Wi-Fi, and 4G/5G mobile data!`);
        console.log(` URL: ${currentPublicUrl}`);
        console.log(`=======================================================\n`);
        onUrlCallbacks.forEach(cb => {
          try { cb(currentPublicUrl); } catch (e) {}
        });
      }
    };

    tunnelProcess.stdout.on('data', handleOutput);
    tunnelProcess.stderr.on('data', handleOutput);

    tunnelProcess.on('exit', (code) => {
      tunnelProcess = null;
      currentPublicUrl = null;
      // Restart if process terminates unexpectedly
      setTimeout(() => {
        if (!tunnelProcess) startTunnel(port);
      }, 5000);
    });

    process.on('exit', () => {
      if (tunnelProcess) tunnelProcess.kill();
    });

  } catch (err) {
    console.warn('Could not launch automatic tunnel:', err.message);
  }
}

function getPublicUrl() {
  return currentPublicUrl;
}

function stopTunnel() {
  if (tunnelProcess) {
    tunnelProcess.kill();
    tunnelProcess = null;
    currentPublicUrl = null;
  }
}

module.exports = { startTunnel, getPublicUrl, stopTunnel };

