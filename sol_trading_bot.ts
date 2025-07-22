import axios from 'axios';
const Binance = require('binance-api-node').default;
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { SMA, RSI, MACD, ATR } = require('technicalindicators');
const { format } = require('date-fns');
const { toZonedTime } = require('date-fns-tz');

dotenv.config();

const binance = Binance({
  apiKey: process.env.BINANCE_API_KEY,
  apiSecret: process.env.BINANCE_API_SECRET,
});

async function getTradableSymbols(): Promise<string[]> {
  const res = await axios.get('https://api.binance.com/api/v3/exchangeInfo');
  const symbols = res.data.symbols;

  return symbols
    .filter((s: any) =>
      s.quoteAsset === 'USDT' &&
      s.status === 'TRADING' &&
      s.isSpotTradingAllowed &&
      !s.symbol.includes('UP') && !s.symbol.includes('DOWN') && !s.symbol.includes('BEAR') && !s.symbol.includes('BULL')
    )
    .map((s: any) => s.symbol);
}

async function filterHighVolumeSymbols(symbols: string[]): Promise<string[]> {
  const { data } = await axios.get('https://api.binance.com/api/v3/ticker/24hr');
  const highVolume = data
    .filter((ticker: any) =>
      symbols.includes(ticker.symbol) &&
      parseFloat(ticker.quoteVolume) > 1000000
    )
    .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
    .map((t: any) => t.symbol);

  return highVolume.slice(0, 50);
}

let cachedSymbols: string[] = [];
let lastFetched = 0;

async function getCachedSymbols(): Promise<string[]> {
  const now = Date.now();
  if (now - lastFetched > 5 * 60 * 1000) {
    const all = await getTradableSymbols();
    cachedSymbols = await filterHighVolumeSymbols(all);
    lastFetched = now;
  }
  return cachedSymbols;
}

const INTERVAL = '5m';
const TRAILING_STOP_MULTIPLIER = 1.5;
const POSITION_SIZE_PERCENTAGE = 0.3;
const VOLUME_CONFIRMATION_MULTIPLIER = 1.3;
const minBuyAmount = 20;
const loopTimeInMinutes = 5;
const loopTimeInSeconds = loopTimeInMinutes * 60 * 1000;

const LOGS_DIR = 'logs';
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR);
}

function logMessage(message, symbol = null, type = 'INFO') {
  const now = toZonedTime(new Date(), 'Europe/Istanbul');
  const formattedTime = format(now, 'yyyy-MM-dd HH:mm:ss');

  const logEntry = {
    time: formattedTime,
    message,
    symbol,
    type,
  };

  const logFilePath = path.join(LOGS_DIR, `structured_log_${format(new Date(), 'yyyy-MM-dd')}.json`);

  let logs = [];
  if (fs.existsSync(logFilePath)) {
    logs = JSON.parse(fs.readFileSync(logFilePath, 'utf8'));
  }

  logs.unshift(logEntry);
  fs.writeFileSync(logFilePath, JSON.stringify(logs.slice(0, 1000), null, 2));
}

let tradeData = {};

async function fetchCandles(symbol, limit = 50) {
  try {
    const candles = await binance.candles({ symbol, interval: INTERVAL, limit });
    return candles.map((c) => ({
      time: c.closeTime,
      close: parseFloat(c.close),
      high: parseFloat(c.high),
      low: parseFloat(c.low),
      volume: parseFloat(c.volume),
    }));
  } catch (error) {
    logMessage(`Error fetching candles for ${symbol}: ${error}`, symbol, 'ERROR');
    return [];
  }
}

async function getBalance() {
  try {
    const accountInfo = await binance.accountInfo();
    const balances = accountInfo.balances.reduce((acc, b) => {
      acc[b.asset] = parseFloat(b.free || '0');
      return acc;
    }, {});
    return balances;
  } catch (error) {
    logMessage(`Error getting balances: ${error}`, null, 'ERROR');
    return {};
  }
}

async function placeOrder(symbol, side, quantity) {
  try {
    const order = await binance.order({
      symbol,
      side,
      type: 'MARKET',
      quantity: quantity.toFixed(5),
    });
    const executedPrice = parseFloat(order.fills?.[0]?.price || '0');
    logMessage(`${side} Order Executed for ${symbol} at ${executedPrice}`, symbol, side);
    return executedPrice;
  } catch (error) {
    logMessage(`Error placing ${side} order for ${symbol}: ${error}`, symbol, 'ERROR');
    return null;
  }
}

async function run() {
  logMessage('----------------------------------------------------------------');
  logMessage('Trading bot started...');

  while (true) {
    try {
      const balances = await getBalance();
      const symbols = await getCachedSymbols();

      const nonZeroBalances = {};
      for (const [asset, amount] of Object.entries(balances)) {
        if (Number(amount) > 0 && asset !== 'USDT') {
          const symbol = `${asset}USDT`;
          try {
            const ticker = await binance.prices({ symbol });
            const price = parseFloat(ticker[symbol]);
            nonZeroBalances[asset] = {
              amount: Number(amount),
              usdtValue: Number((Number(amount) * price).toFixed(2))
            };
          } catch {
            nonZeroBalances[asset] = {
              amount: Number(amount),
              usdtValue: null
            };
          }
        } else if (asset === 'USDT' && Number(amount) > 0) {
          nonZeroBalances[asset] = {
            amount: Number(amount),
            usdtValue: Number(amount)
          };
        }
      }

      fs.writeFileSync('dashboard/balance_data.json', JSON.stringify(nonZeroBalances, null, 2));

      for (const SYMBOL of symbols) {

        
        if (!tradeData[SYMBOL]) {
          tradeData[SYMBOL] = { buyPrice: null, stopLossPrice: null, takeProfitPrice: null, highestPriceSinceBuy: null };
        }

        logMessage(`Checking ${SYMBOL}...`, SYMBOL);

        const candles = await fetchCandles(SYMBOL, 50);
        if (candles.length < 21) {
          logMessage(`Not enough data for ${SYMBOL}...`, SYMBOL);
          continue;
        }

        const prices = candles.map((c) => c.close);
        const volumes = candles.map((c) => c.volume);
        const ma9 = SMA.calculate({ period: 9, values: prices });
        const ma21 = SMA.calculate({ period: 21, values: prices });
        const rsi = RSI.calculate({ period: 14, values: prices });
        const macd = MACD.calculate({
          values: prices,
          fastPeriod: 12,
          slowPeriod: 26,
          signalPeriod: 9,
          SimpleMAOscillator: true,
          SimpleMASignal: true,
        });
        const atr = ATR.calculate({ period: 14, high: candles.map((c) => c.high), low: candles.map((c) => c.low), close: prices });
        const volumeMA = SMA.calculate({ period: 50, values: volumes });

        const currentPrice = prices[prices.length - 1];
        const baseAsset = SYMBOL.replace('USDT', '');
        const coinBalance = balances[baseAsset] || 0;
        const usdtBalance = balances['USDT'] || 0;

        const maCondition = ma9[ma9.length - 1] > ma21[ma21.length - 1];
        const rsiCondition = rsi[rsi.length - 1] < 45;
        const macdCondition = macd[macd.length - 1]?.MACD > macd[macd.length - 1]?.signal;
        const volumeCondition = volumes[volumes.length - 1] > volumeMA[volumeMA.length - 1] * VOLUME_CONFIRMATION_MULTIPLIER;

        if (!tradeData[SYMBOL].buyPrice && maCondition && rsiCondition && macdCondition && volumeCondition) {
          let positionSize = (usdtBalance * POSITION_SIZE_PERCENTAGE) / currentPrice;
          if (usdtBalance - (positionSize * currentPrice) < minBuyAmount) {
            positionSize = (usdtBalance - minBuyAmount) / currentPrice;
          }

          tradeData[SYMBOL].buyPrice = await placeOrder(SYMBOL, 'BUY', positionSize);
          fs.writeFileSync('dashboard/trade_data.json', JSON.stringify(tradeData, null, 2));
          logMessage(`Buy action executed for ${SYMBOL}. Reason: MA9 > MA21, RSI < 45, MACD bull cross, Volume confirmation.`, SYMBOL, 'BUY');
        } else {
          const conditionWeight = 25;
          let trueConditions = 0;
          if (maCondition) trueConditions += 1;
          if (rsiCondition) trueConditions += 1;
          if (macdCondition) trueConditions += 1;
          if (volumeCondition) trueConditions += 1;
          const percentageMet = trueConditions * conditionWeight;
          logMessage(`No Buy Action: ${percentageMet}% conditions met. MA9>${ma21[ma21.length - 1]}: ${maCondition}, RSI<45: ${rsiCondition}, MACD>Signal: ${macdCondition}, Volume OK: ${volumeCondition}`, SYMBOL);
        }

        if (tradeData[SYMBOL].buyPrice) {
          if (currentPrice > tradeData[SYMBOL].highestPriceSinceBuy) {
            tradeData[SYMBOL].highestPriceSinceBuy = currentPrice;
            tradeData[SYMBOL].stopLossPrice = currentPrice - atr[atr.length - 1] * TRAILING_STOP_MULTIPLIER;
            fs.writeFileSync('dashboard/trade_data.json', JSON.stringify(tradeData, null, 2));
            logMessage(`Updated stop loss to ${tradeData[SYMBOL].stopLossPrice}`, SYMBOL, 'INFO');
          }

          if (currentPrice <= tradeData[SYMBOL].stopLossPrice) {
            await placeOrder(SYMBOL, 'SELL', coinBalance);
            tradeData[SYMBOL] = { buyPrice: null, stopLossPrice: null, takeProfitPrice: null, highestPriceSinceBuy: null };
            fs.writeFileSync('dashboard/trade_data.json', JSON.stringify(tradeData, null, 2));
            logMessage(`Sell action executed. Reason: hit stop loss.`, SYMBOL, 'SELL');
          } else {
            logMessage(`Holding position. Price above stop loss.`, SYMBOL);
          }
        }
      }
      fs.writeFileSync('dashboard/trade_data.json', JSON.stringify(tradeData, null, 2));
      await new Promise((res) => setTimeout(res, loopTimeInSeconds));
    } catch (error) {
      logMessage(`Error in main loop: ${error}`, null, 'ERROR');
      await new Promise((res) => setTimeout(res, 60000));
    }
    logMessage('****************************************************************');
  }
}

run();
