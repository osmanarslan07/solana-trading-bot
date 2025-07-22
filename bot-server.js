require('dotenv').config();
require('./build/sol_trading_bot_clarified_score.js');
require('http').createServer((_, res) => res.end('Bot is running')).listen(process.env.PORT || 3001);
