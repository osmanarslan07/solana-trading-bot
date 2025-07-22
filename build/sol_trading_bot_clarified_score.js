"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var node_fetch_1 = require("node-fetch");
var axios_1 = require("axios");
var blacklistedSymbols = [
    'LUNCUSDT', 'BNBUSDT', 'USDCUSDT',
    'BUSDUSDT', 'DAIUSDT', 'TUSDUSDT', 'FDUSDUSDT',
    'WBTCUSDT', 'WETHUSDT',
    'USTCUSDT', 'GUSDUSDT', 'USDPUSDT'
];
var Binance = require('binance-api-node').default;
var dotenv = require('dotenv');
var fs = require('fs');
var path = require('path');
var _a = require('technicalindicators'), SMA = _a.SMA, RSI = _a.RSI, MACD = _a.MACD, ATR = _a.ATR;
var format = require('date-fns').format;
var toZonedTime = require('date-fns-tz').toZonedTime;
dotenv.config();
var binance = Binance({
    apiKey: process.env.BINANCE_API_KEY,
    apiSecret: process.env.BINANCE_API_SECRET,
    getTime: function () { return __awaiter(void 0, void 0, void 0, function () {
        var res, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, node_fetch_1.default)('https://api.binance.com/api/v3/time')];
                case 1:
                    res = _a.sent();
                    return [4 /*yield*/, res.json()];
                case 2:
                    data = _a.sent();
                    return [2 /*return*/, data.serverTime];
            }
        });
    }); }
});
function getTradableSymbols() {
    return __awaiter(this, void 0, void 0, function () {
        var res, symbols;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, axios_1.default.get('https://api.binance.com/api/v3/exchangeInfo')];
                case 1:
                    res = _a.sent();
                    symbols = res.data.symbols;
                    return [2 /*return*/, symbols
                            .filter(function (s) {
                            return s.quoteAsset === 'USDT' &&
                                s.status === 'TRADING' &&
                                s.isSpotTradingAllowed &&
                                !s.symbol.includes('UP') && !s.symbol.includes('DOWN') && !s.symbol.includes('BEAR') && !s.symbol.includes('BULL');
                        })
                            .map(function (s) { return s.symbol; })];
            }
        });
    });
}
function filterHighVolumeSymbols(symbols) {
    return __awaiter(this, void 0, void 0, function () {
        var data, highVolume;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, axios_1.default.get('https://api.binance.com/api/v3/ticker/24hr')];
                case 1:
                    data = (_a.sent()).data;
                    highVolume = data
                        .filter(function (ticker) {
                        return symbols.includes(ticker.symbol) &&
                            parseFloat(ticker.quoteVolume) > 1000000;
                    })
                        .sort(function (a, b) { return parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume); })
                        .map(function (t) { return t.symbol; });
                    return [2 /*return*/, highVolume.slice(0, 50)];
            }
        });
    });
}
var cachedSymbols = [];
var lastFetched = 0;
function getCachedSymbols() {
    return __awaiter(this, void 0, void 0, function () {
        var now, all;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    now = Date.now();
                    if (!(now - lastFetched > 5 * 60 * 1000)) return [3 /*break*/, 3];
                    return [4 /*yield*/, getTradableSymbols()];
                case 1:
                    all = _a.sent();
                    return [4 /*yield*/, filterHighVolumeSymbols(all)];
                case 2:
                    cachedSymbols = _a.sent();
                    lastFetched = now;
                    _a.label = 3;
                case 3: return [2 /*return*/, cachedSymbols];
            }
        });
    });
}
var INTERVAL = '5m';
var TRAILING_STOP_MULTIPLIER = 1.5;
var POSITION_SIZE_PERCENTAGE = 0.3;
var VOLUME_CONFIRMATION_MULTIPLIER = 1.3;
var minBuyAmount = 20;
function calculateBuyScore(_a) {
    var rsiValue = _a.rsiValue, rsiTrendUp = _a.rsiTrendUp, macdCrossUp = _a.macdCrossUp, priceAboveSMA20 = _a.priceAboveSMA20, priceAboveSMA50 = _a.priceAboveSMA50, volumeSpike = _a.volumeSpike;
    var score = 0;
    if (rsiValue < 30 && rsiTrendUp)
        score += 30;
    if (macdCrossUp)
        score += 30;
    if (priceAboveSMA20 && priceAboveSMA50)
        score += 20;
    if (volumeSpike)
        score += 20;
    return score;
}
var loopTimeInMinutes = 5;
var loopTimeInSeconds = loopTimeInMinutes * 60 * 1000;
var LOGS_DIR = 'logs';
if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR);
}
function logMessage(message, symbol, type) {
    if (symbol === void 0) { symbol = null; }
    if (type === void 0) { type = 'INFO'; }
    var now = toZonedTime(new Date(), 'Europe/Istanbul');
    var formattedTime = format(now, 'yyyy-MM-dd HH:mm:ss');
    var logEntry = {
        time: formattedTime,
        message: message,
        symbol: symbol,
        type: type,
    };
    var logFilePath = path.join(LOGS_DIR, "structured_log_".concat(format(new Date(), 'yyyy-MM-dd'), ".json"));
    var logs = [];
    if (fs.existsSync(logFilePath)) {
        logs = JSON.parse(fs.readFileSync(logFilePath, 'utf8'));
    }
    logs.unshift(logEntry);
    fs.writeFileSync(logFilePath, JSON.stringify(logs.slice(0, 1000), null, 2));
}
var tradeData = {};
function fetchCandles(symbol_1) {
    return __awaiter(this, arguments, void 0, function (symbol, limit) {
        var candles, error_1;
        if (limit === void 0) { limit = 50; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, binance.candles({ symbol: symbol, interval: INTERVAL, limit: limit })];
                case 1:
                    candles = _a.sent();
                    return [2 /*return*/, candles.map(function (c) { return ({
                            time: c.closeTime,
                            close: parseFloat(c.close),
                            high: parseFloat(c.high),
                            low: parseFloat(c.low),
                            volume: parseFloat(c.volume),
                        }); })];
                case 2:
                    error_1 = _a.sent();
                    logMessage("Error fetching candles for ".concat(symbol, ": ").concat(error_1), symbol, 'ERROR');
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function getBalance() {
    return __awaiter(this, void 0, void 0, function () {
        var accountInfo, balances, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, binance.accountInfo()];
                case 1:
                    accountInfo = _a.sent();
                    balances = accountInfo.balances.reduce(function (acc, b) {
                        acc[b.asset] = parseFloat(b.free || '0');
                        return acc;
                    }, {});
                    return [2 /*return*/, balances];
                case 2:
                    error_2 = _a.sent();
                    logMessage("Error getting balances: ".concat(error_2), null, 'ERROR');
                    return [2 /*return*/, {}];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function placeOrder(symbol, side, quantity) {
    return __awaiter(this, void 0, void 0, function () {
        var order, executedPrice, error_3;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, binance.order({
                            symbol: symbol,
                            side: side,
                            type: 'MARKET',
                            quantity: quantity.toFixed(5),
                        })];
                case 1:
                    order = _c.sent();
                    executedPrice = parseFloat(((_b = (_a = order.fills) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.price) || '0');
                    logMessage("".concat(side, " Order Executed for ").concat(symbol, " at ").concat(executedPrice), symbol, side);
                    return [2 /*return*/, executedPrice];
                case 2:
                    error_3 = _c.sent();
                    logMessage("Error placing ".concat(side, " order for ").concat(symbol, ": ").concat(error_3), symbol, 'ERROR');
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var balances, symbols, nonZeroBalances, _i, _a, _b, asset, amount, symbol, ticker, price, _c, _d, symbols_1, SYMBOL, candles, prices, volumes, ma9, ma21, rsi, macd, atr, volumeMA, currentPrice, baseAsset, coinBalance, usdtBalance, maCondition, rsiCondition, macdCondition, volumeCondition, score, positionSize, _e, conditionWeight, trueConditions, percentageMet, error_4;
        var _f, _g, _h, _j, _k, _l;
        return __generator(this, function (_m) {
            switch (_m.label) {
                case 0:
                    logMessage('----------------------------------------------------------------');
                    logMessage('Trading bot started...');
                    _m.label = 1;
                case 1:
                    if (!true) return [3 /*break*/, 26];
                    _m.label = 2;
                case 2:
                    _m.trys.push([2, 23, , 25]);
                    return [4 /*yield*/, getBalance()];
                case 3:
                    balances = _m.sent();
                    return [4 /*yield*/, getCachedSymbols()];
                case 4:
                    symbols = _m.sent();
                    nonZeroBalances = {};
                    _i = 0, _a = Object.entries(balances);
                    _m.label = 5;
                case 5:
                    if (!(_i < _a.length)) return [3 /*break*/, 12];
                    _b = _a[_i], asset = _b[0], amount = _b[1];
                    if (!(Number(amount) > 0 && asset !== 'USDT')) return [3 /*break*/, 10];
                    symbol = "".concat(asset, "USDT");
                    _m.label = 6;
                case 6:
                    _m.trys.push([6, 8, , 9]);
                    return [4 /*yield*/, binance.prices({ symbol: symbol })];
                case 7:
                    ticker = _m.sent();
                    price = parseFloat(ticker[symbol]);
                    nonZeroBalances[asset] = {
                        amount: Number(amount),
                        usdtValue: Number((Number(amount) * price).toFixed(2))
                    };
                    return [3 /*break*/, 9];
                case 8:
                    _c = _m.sent();
                    nonZeroBalances[asset] = {
                        amount: Number(amount),
                        usdtValue: null
                    };
                    return [3 /*break*/, 9];
                case 9: return [3 /*break*/, 11];
                case 10:
                    if (asset === 'USDT' && Number(amount) > 0) {
                        nonZeroBalances[asset] = {
                            amount: Number(amount),
                            usdtValue: Number(amount)
                        };
                    }
                    _m.label = 11;
                case 11:
                    _i++;
                    return [3 /*break*/, 5];
                case 12:
                    fs.writeFileSync('dashboard/balance_data.json', JSON.stringify(nonZeroBalances, null, 2));
                    _d = 0, symbols_1 = symbols;
                    _m.label = 13;
                case 13:
                    if (!(_d < symbols_1.length)) return [3 /*break*/, 21];
                    SYMBOL = symbols_1[_d];
                    if (blacklistedSymbols.includes(SYMBOL)) {
                        logMessage("Skipping blacklisted symbol: ".concat(SYMBOL), SYMBOL, 'INFO');
                        return [3 /*break*/, 20];
                    }
                    if (!tradeData[SYMBOL]) {
                        tradeData[SYMBOL] = { buyPrice: null, stopLossPrice: null, takeProfitPrice: null, highestPriceSinceBuy: null };
                    }
                    logMessage("Checking ".concat(SYMBOL, "..."), SYMBOL);
                    return [4 /*yield*/, fetchCandles(SYMBOL, 50)];
                case 14:
                    candles = _m.sent();
                    if (candles.length < 21) {
                        logMessage("Not enough data for ".concat(SYMBOL, "..."), SYMBOL);
                        return [3 /*break*/, 20];
                    }
                    prices = candles.map(function (c) { return c.close; });
                    volumes = candles.map(function (c) { return c.volume; });
                    ma9 = SMA.calculate({ period: 9, values: prices });
                    ma21 = SMA.calculate({ period: 21, values: prices });
                    rsi = RSI.calculate({ period: 14, values: prices });
                    macd = MACD.calculate({
                        values: prices,
                        fastPeriod: 12,
                        slowPeriod: 26,
                        signalPeriod: 9,
                        SimpleMAOscillator: true,
                        SimpleMASignal: true,
                    });
                    atr = ATR.calculate({ period: 14, high: candles.map(function (c) { return c.high; }), low: candles.map(function (c) { return c.low; }), close: prices });
                    volumeMA = SMA.calculate({ period: 50, values: volumes });
                    currentPrice = prices[prices.length - 1];
                    baseAsset = SYMBOL.replace('USDT', '');
                    coinBalance = balances[baseAsset] || 0;
                    usdtBalance = balances['USDT'] || 0;
                    maCondition = ma9[ma9.length - 1] > ma21[ma21.length - 1];
                    rsiCondition = rsi[rsi.length - 1] < 45;
                    macdCondition = ((_f = macd[macd.length - 1]) === null || _f === void 0 ? void 0 : _f.MACD) > ((_g = macd[macd.length - 1]) === null || _g === void 0 ? void 0 : _g.signal);
                    volumeCondition = volumes[volumes.length - 1] > volumeMA[volumeMA.length - 1] * VOLUME_CONFIRMATION_MULTIPLIER;
                    score = calculateBuyScore({
                        rsiValue: rsi[rsi.length - 1],
                        rsiTrendUp: rsi[rsi.length - 1] > rsi[rsi.length - 2],
                        macdCrossUp: ((_h = macd[macd.length - 1]) === null || _h === void 0 ? void 0 : _h.MACD) > ((_j = macd[macd.length - 1]) === null || _j === void 0 ? void 0 : _j.signal) &&
                            ((_k = macd[macd.length - 2]) === null || _k === void 0 ? void 0 : _k.MACD) <= ((_l = macd[macd.length - 2]) === null || _l === void 0 ? void 0 : _l.signal),
                        priceAboveSMA20: prices[prices.length - 1] > ma9[ma9.length - 1],
                        priceAboveSMA50: prices[prices.length - 1] > ma21[ma21.length - 1],
                        volumeSpike: volumes[volumes.length - 1] > volumeMA[volumeMA.length - 1] * 1.5
                    });
                    logMessage("Score: ".concat(score, " (No buy. Waiting for score \u2265 80)"), SYMBOL, 'INFO');
                    if (!(!tradeData[SYMBOL].buyPrice && score >= 80)) return [3 /*break*/, 16];
                    positionSize = (usdtBalance * POSITION_SIZE_PERCENTAGE) / currentPrice;
                    if (usdtBalance - (positionSize * currentPrice) < minBuyAmount) {
                        positionSize = (usdtBalance - minBuyAmount) / currentPrice;
                    }
                    _e = tradeData[SYMBOL];
                    return [4 /*yield*/, placeOrder(SYMBOL, 'BUY', positionSize)];
                case 15:
                    _e.buyPrice = _m.sent();
                    fs.writeFileSync('dashboard/trade_data.json', JSON.stringify(tradeData, null, 2));
                    logMessage("Buy action executed for ".concat(SYMBOL, ". Score: ").concat(score, ". Reason: MA9 > MA21, RSI < 45, MACD bull cross, Volume confirmation."), SYMBOL, 'BUY');
                    return [3 /*break*/, 17];
                case 16:
                    conditionWeight = 25;
                    trueConditions = 0;
                    if (maCondition)
                        trueConditions += 1;
                    if (rsiCondition)
                        trueConditions += 1;
                    if (macdCondition)
                        trueConditions += 1;
                    if (volumeCondition)
                        trueConditions += 1;
                    percentageMet = trueConditions * conditionWeight;
                    logMessage("No Buy Action: ".concat(percentageMet, "% conditions met. MA9>").concat(ma21[ma21.length - 1], ": ").concat(maCondition, ", RSI<45: ").concat(rsiCondition, ", MACD>Signal: ").concat(macdCondition, ", Volume OK: ").concat(volumeCondition), SYMBOL);
                    _m.label = 17;
                case 17:
                    if (!tradeData[SYMBOL].buyPrice) return [3 /*break*/, 20];
                    if (currentPrice > tradeData[SYMBOL].highestPriceSinceBuy) {
                        tradeData[SYMBOL].highestPriceSinceBuy = currentPrice;
                        tradeData[SYMBOL].stopLossPrice = currentPrice - atr[atr.length - 1] * TRAILING_STOP_MULTIPLIER;
                        fs.writeFileSync('dashboard/trade_data.json', JSON.stringify(tradeData, null, 2));
                        logMessage("Updated stop loss to ".concat(tradeData[SYMBOL].stopLossPrice), SYMBOL, 'INFO');
                    }
                    if (!(currentPrice <= tradeData[SYMBOL].stopLossPrice)) return [3 /*break*/, 19];
                    return [4 /*yield*/, placeOrder(SYMBOL, 'SELL', coinBalance)];
                case 18:
                    _m.sent();
                    tradeData[SYMBOL] = { buyPrice: null, stopLossPrice: null, takeProfitPrice: null, highestPriceSinceBuy: null };
                    fs.writeFileSync('dashboard/trade_data.json', JSON.stringify(tradeData, null, 2));
                    logMessage("Sell action executed. Reason: hit stop loss.", SYMBOL, 'SELL');
                    return [3 /*break*/, 20];
                case 19:
                    logMessage("Holding position. Price above stop loss.", SYMBOL);
                    _m.label = 20;
                case 20:
                    _d++;
                    return [3 /*break*/, 13];
                case 21:
                    fs.writeFileSync('dashboard/trade_data.json', JSON.stringify(tradeData, null, 2));
                    return [4 /*yield*/, new Promise(function (res) { return setTimeout(res, loopTimeInSeconds); })];
                case 22:
                    _m.sent();
                    return [3 /*break*/, 25];
                case 23:
                    error_4 = _m.sent();
                    logMessage("Error in main loop: ".concat(error_4), null, 'ERROR');
                    return [4 /*yield*/, new Promise(function (res) { return setTimeout(res, 60000); })];
                case 24:
                    _m.sent();
                    return [3 /*break*/, 25];
                case 25:
                    logMessage('****************************************************************');
                    return [3 /*break*/, 1];
                case 26: return [2 /*return*/];
            }
        });
    });
}
run();
