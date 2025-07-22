const express = require('express');
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });


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
