import _ from 'underscore';
import WebSocket from 'ws';
import { Beautifier } from './beautifier';

const BinanceErrors = Object.freeze({
  INVALID_LISTEN_KEY: -1125
});

class BinanceWS {
  private baseUrl = 'wss://stream.binance.com:9443/ws/';
  private combinedBaseUrl = 'wss://stream.binance.com:9443/stream?streams=';
  private sockets = {};
  private beautifier: Beautifier;
  private beautify: boolean;
  private userDataRefresh: { intervalId: any, failCount: number } = {
    intervalId: false,
    failCount: 0,
  };

  public streams = {
    aggTrade: symbol => `${symbol.toLowerCase()}@aggTrade`,
    allTickers: () => '!ticker@arr',
    depth: symbol => `${symbol.toLowerCase()}@depth`,
    depthLevel: (symbol, level) => `${symbol.toLowerCase()}@depth${level}`,
    indexPrice: (symbol) => `${symbol.toLowerCase()}@indexPrice`,
    markPrice: (symbol) => `${symbol.toLowerCase()}@markPrice`,
    kline: (symbol, interval) => `${symbol.toLowerCase()}@kline_${interval}`,
    ticker: symbol => `${symbol.toLowerCase()}@ticker`,
    trade: symbol => `${symbol.toLowerCase()}@trade`,
  };

  constructor(beautify = true) {
    this.beautifier = new Beautifier();
    this.beautify = beautify;
  }

  public onAggTrade(symbol: string, eventHandler) {
    return this.setupWebSocket(
      eventHandler,
      this.streams.aggTrade(symbol)
    );
  }

  public onAllTickers(eventHandler) {
    return this.setupWebSocket(eventHandler, this.streams.allTickers());
  }

  public onDepthUpdate(symbol: string, eventHandler) {
    return this.setupWebSocket(eventHandler, this.streams.depth(symbol));
  }

  public onDepthLevelUpdate(symbol: string, level, eventHandler) {
    return this.setupWebSocket(eventHandler, this.streams.depthLevel(symbol, level));
  }

  public onIndexPrice(symbol: string, eventHandler) {
    return this.setupWebSocket(eventHandler, this.streams.indexPrice(symbol));
  }

  public onMarkPrice(symbol: string, eventHandler) {
    return this.setupWebSocket(eventHandler, this.streams.markPrice(symbol));
  }

  public onKline(symbol: string, interval, eventHandler) {
    return this.setupWebSocket(eventHandler, this.streams.kline(symbol, interval));
  }

  public onTrade(symbol: string, eventHandler) {
    return this.setupWebSocket(eventHandler, this.streams.trade(symbol));
  }

  public onTicker(symbol: string, eventHandler) {
    return this.setupWebSocket(eventHandler, this.streams.ticker(symbol));
  }

  public onUserData(binanceRest, eventHandler, interval = 60000) {
    this.clearUserDataInterval();
    return binanceRest.startUserDataStream().then(response => {
      this.userDataRefresh.intervalId = setInterval(
        () => this.sendUserDataKeepAlive(binanceRest, response),
        interval
      );
      this.userDataRefresh.failCount = 0;

      return this.setupWebSocket(eventHandler, response.listenKey);
    });
  }

  public onCombinedStream(streams, eventHandler) {
    return this.setupWebSocket(eventHandler, streams.join('/'), true);
  }

  private setupWebSocket(eventHandler, path: string, isCombined?: boolean) {
    if (this.sockets[path]) {
      return this.sockets[path];
    }
    path = (isCombined ? this.combinedBaseUrl : this.baseUrl) + path;
    const ws = new WebSocket(path);

    ws.on('message', message => {
      let event;
      try {
        event = JSON.parse(message);
      } catch (e) {
        event = message;
      }
      if (this.beautify) {
        if (event.stream) {
          event.data = this.beautifyResponse(event.data);
        } else {
          event = this.beautifyResponse(event);
        }
      }

      eventHandler(event);
    });

    ws.on('error', () => {
      // node.js EventEmitters will throw and then exit if no error listener is registered
    });

    return ws;
  }

  private beautifyResponse(data) {
    if (_.isArray(data)) {
      return _.map(data, event => {
        if (event.e) {
          return this.beautifier.beautify(event, event.e + 'Event');
        }
        return event;
      });
    } else if (data.e) {
      return this.beautifier.beautify(data, data.e + 'Event');
    }
    return data;
  }

  private clearUserDataInterval() {
    if (this.userDataRefresh.intervalId) {
      clearInterval(this.userDataRefresh.intervalId);
    }

    this.userDataRefresh.intervalId = false;
    this.userDataRefresh.failCount = 0;
  }

  private sendUserDataKeepAlive(binanceRest, response) {
    return binanceRest.keepAliveUserDataStream(response).catch(e => {
      this.userDataRefresh.failCount++;
      const msg =
        'Failed requesting keepAliveUserDataStream for onUserData listener';
      if (e && e.code === BinanceErrors.INVALID_LISTEN_KEY) {
        // eslint-disable-next-line no-console
        console.error(
          new Date(),
          msg,
          'listen key expired - clearing keepAlive interval',
          e
        );
        this.clearUserDataInterval();
        return;
      }
      // eslint-disable-next-line no-console
      console.error(
        new Date(),
        msg,
        'failCount: ',
        this.userDataRefresh.failCount,
        e
      );
    });
  }
}

export default BinanceWS;
