const express = require('express');
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const bodyParser = require('body-parser');
app.use(bodyParser.json());



const app = express();
const PORT = 3000;

const auth = require('express-basic-auth');
const user = process.env.DASHBOARD_USER;
const pass = process.env.DASHBOARD_PASS;


if (!process.env.DASHBOARD_USER || !process.env.DASHBOARD_PASS) {
  console.error("❌ ERROR: Missing DASHBOARD_USER or DASHBOARD_PASS in .env");
  process.exit(1);
}


app.use(auth({
  users: { [user]: pass },
  challenge: true
}));


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const tradeDataPath = path.join(__dirname, 'trade_data.json');
  const balancePath = path.join(__dirname, 'balance_data.json');
  const logFileName = `structured_log_${today}.json`;
  const logPath = path.join(__dirname, '..', 'logs', logFileName);

  let data = {};
  let balance = {};
  let structuredLogs = [];

  try {
    if (fs.existsSync(tradeDataPath)) {
      data = JSON.parse(fs.readFileSync(tradeDataPath, 'utf8'));
    }
    if (fs.existsSync(balancePath)) {
      balance = JSON.parse(fs.readFileSync(balancePath, 'utf8'));
    }
    if (fs.existsSync(logPath)) {
      structuredLogs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    }
  } catch (e) {
    console.log('Error reading data or logs:', e.message);
  }

  res.render('index', { data, balance, structuredLogs, logFileName });
});

app.listen(PORT, () => {
  console.log(`🚀 Dashboard running at http://localhost:${PORT}`);
});


app.post('/api/update-balance', (req, res) => {
  const data = req.body;
  const filePath = path.join(__dirname, 'balance_data.json');

  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.status(200).json({ message: '✅ Balance updated successfully' });
  } catch (error) {
    console.error("❌ Error writing balance:", error.message);
    res.status(500).json({ message: '❌ Failed to write file', error });
  }
});

app.post('/api/update-log', (req, res) => {
  const log = req.body;
  const today = new Date().toISOString().split('T')[0]; // e.g. 2025-07-22
  const logFileName = `structured_log_${today}.json`;
  const logPath = path.join(__dirname, '..', 'logs', logFileName);

  try {
    let logs = [];
    if (fs.existsSync(logPath)) {
      logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    }

    logs.push(log);
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
    res.status(200).json({ message: '✅ Log entry added' });
  } catch (error) {
    console.error("❌ Error writing log:", error.message);
    res.status(500).json({ message: '❌ Failed to update log', error });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Dashboard running at http://localhost:${PORT}`);

  // Run bot in same process
  require('ts-node').register();
  require('../sol_trading_bot_clarified_score.ts');
});

