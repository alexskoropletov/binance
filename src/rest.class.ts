import _ from 'underscore';
import axios, { AxiosInstance, Method } from 'axios';
import crypto from 'crypto';
import qs from 'querystring';
import ConfigInterface from './interfaces/config.interface';
import Logger from './logger.class';

class BinanceRest {
  private config: ConfigInterface = {
    key: '',
    secret: '',
    recvWindow: false,
    timeout: 15000,
    disableBeautification: false,
    handleDrift: false,
    baseUrl: 'https://api.binance.com/',
    requestOptions: {}
  }

  private candleLinesFields = [
    "openTime",
    "openPrice",
    "highPrice",
    "lowPrice",
    "closePrice",
    "volume",
    "closeTime",
    "quoteAssetVolume",
    "numberOfTrades",
  ];

  private logger: Logger;

  private drift: number;

  constructor(config: ConfigInterface) {
    this.config = { ...this.config, ...config };
    
    this.logger = new Logger();
    if ('/' != this.config.baseUrl.substr(-1)) {
      this.config.baseUrl += '/';
    }

    this.drift = 0;
  }

  public async ping() {
    return this.makeRequest('api/v1/ping');
  }

  public async time() {
    return this.makeRequest('api/v1/time');
  }

  public async depth(query: any = {}) {
    return this.makeRequest('api/v1/depth', query);
  }

  public async trades(query: any = {}) {
    return this.makeRequest('api/v1/trades', query);
  }

  public async historicalTrades(query: any = {}) {
    return this.makeRequest('api/v1/historicalTrades', query, 'API-KEY',);
  }

  public async aggTrades(query: any = {}) {
    return this.makeRequest('api/v1/aggTrades', query);
  }

  public async exchangeInfo() {
    return this.makeRequest('api/v1/exchangeInfo');
  }

  public async klines(query: any = {}) {
    const data = await this.makeRequest('api/v1/klines', query);
    return data.map(item => {
      const response = {};
      item.array.forEach((element, index) => {
        response[this.candleLinesFields[index]] = element;
      });
    });
  }

  public async ticker24hr(query: any = {}) {
    return this.makeRequest('api/v1/ticker/24hr', query);
  }

  public async tickerPrice(query: any = {}) {
    return this.makeRequest('api/v3/ticker/price', query);
  }

  public async bookTicker(query: any = {}) {
    return this.makeRequest('api/v3/ticker/bookTicker', query);
  }

  public async allBookTickers() {
    return this.makeRequest('api/v1/ticker/allBookTickers');
  }

  public async allPrices() {
    return this.makeRequest('api/v1/ticker/allPrices');
  }

  public async newOrder(query: any = {}) {
    return this.makeRequest('api/v3/order', this.setTimestamp(query), 'SIGNED', 'POST');
  }

  public async testOrder(query: any = {}) {
    return this.makeRequest('api/v3/order/test', this.setTimestamp(query), 'SIGNED', 'POST');
  }

  public async queryOrder(query: any = {}) {
    return this.makeRequest('api/v3/order', this.setTimestamp(query), 'SIGNED');
  }

  public async cancelOrder(query: any = {}) {
    return this.makeRequest('api/v3/order', this.setTimestamp(query), 'SIGNED', 'DELETE');
  }

  public async openOrders(query: any = {}) {
    return this.makeRequest('api/v3/openOrders', this.setTimestamp(query), 'SIGNED');
  }

  public async allOrders(query: any = {}) {
    return this.makeRequest('api/v3/allOrders', this.setTimestamp(query), 'SIGNED');
  }

  public async account(query: any = {}) {
    return this.makeRequest('api/v3/account', this.setTimestamp(query), 'SIGNED');
  }

  public async myTrades(query: any = {}) {
    return this.makeRequest('api/v3/myTrades', this.setTimestamp(query), 'SIGNED');
  }

  public async withdraw(query: any = {}) {
    return this.makeRequest('wapi/v3/withdraw.html', this.setTimestamp(query), 'SIGNED', 'POST');
  }

  public async depositHistory(query: any = {}) {
    if (_.isString(query)) {
      query = { asset: query };
    }
    return this.makeRequest('wapi/v3/depositHistory.html', this.setTimestamp(query), 'SIGNED');
  }

  public async withdrawHistory(query: any = {}) {
    if (_.isString(query)) {
      query = { asset: query };
    }
    return this.makeRequest('wapi/v3/withdrawHistory.html', this.setTimestamp(query), 'SIGNED');
  }

  public async depositAddress(query: any = {}) {
    if (_.isString(query)) {
      query = { asset: query };
    }
    return this.makeRequest('wapi/v3/depositAddress.html', this.setTimestamp(query), 'SIGNED');
  }

  public async accountStatus() {
    return this.makeRequest('wapi/v3/accountStatus.html', this.setTimestamp({}), 'SIGNED');
  }

  public async startUserDataStream(callback) {
    return this.makeRequest('api/v1/userDataStream', {}, 'API-KEY', 'POST');
  }

  public async keepAliveUserDataStream(query: any = {}) {
    return this.makeRequest('api/v1/userDataStream', query, 'API-KEY', 'PUT');
  }

  public async closeUserDataStream(query: any = {}) {
    return this.makeRequest('api/v1/userDataStream', query, 'API-KEY', 'DELETE');
  }

  private get axios(): AxiosInstance {
    const client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    return client;
  }

  private getUrl(url: string, security: string, query: any): string {
    if (security === 'SIGNED' && this.config.recvWindow) {
      query.recvWindow = this.config.recvWindow;
    }
    const queryString = qs.stringify(query || {});
    let result = `${url}?${queryString}`;
    if (security === 'SIGNED') {
      if (queryString.length) {
        result += '&';
      }
      result += `signature=${this.sign(queryString)}`;
    }

    return result;
  }

  private getAdditionalHeaders(security: string) {
    if (security === 'API-KEY' || security === 'SIGNED') {
      return { 'X-MBX-APIKEY': this.config.key };
    }

    return {};
  }

  private async makeRequest(url: string, query?: any, security?: string, method: Method = 'get', attempt = 0) {
    if (_.isString(query)) {
      query = { symbol: query };
    }
    try {
      const { data } = await this.axios.request({
        url: this.getUrl(url, security, query),
        method,
        headers: this.getAdditionalHeaders(security),
      });
      return data;
    } catch(error) {
      // eslint-disable-next-line no-console
      // console.log('[!] error', error);
      this.logger.warn(method);
      this.logger.warn(url);
      if (
        error.isAxiosError
        && error.response
        && error.response.data
      ) {
        this.logger.warn(error.response.status);
        this.logger.warn(error.response.statusText);
        this.logger.error(error.response.data.code);
        this.logger.error(error.response.data.msg);
      } else {
        this.logger.error(JSON.stringify(error));
      }
      return false;
    }
  }

  private sign(queryString) {
    return crypto
      .createHmac('sha256', this.config.secret)
      .update(queryString)
      .digest('hex');
  }

  private setTimestamp(query) {
    if (_.isString(query)) {
      query = { symbol: query };
    }
    if (!query.timestamp) {
      query.timestamp = new Date().getTime() + this.drift;
    }
    return query;
  }
}

export default BinanceRest;
