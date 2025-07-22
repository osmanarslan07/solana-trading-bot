// Load .env if needed
require('dotenv').config();

// Import your trading bot code
require('./sol_trading_bot_clarified_score.ts');

// Keep the process alive with a simple HTTP server
require('http')
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running\n');
  })
  .listen(process.env.PORT || 3001);
