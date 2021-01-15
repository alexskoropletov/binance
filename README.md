![npm downloads](https://img.shields.io/npm/dt/binance.svg)
![testing status](https://img.shields.io/travis/aarongarvey/binance.svg)
![code coverage](https://img.shields.io/coveralls/github/aarongarvey/binance.svg)

# Binance

A library to work with Binance API, written in typescript. Forked from Zoey Garveys's binance (zoeyg/binance) js library.

# Example

```js
import BinanceRest, { BinanceWS, ConfigInterface } from "./index";

(async () => {
  const config: ConfigInterface = {
    key: '<your key goes here>',
    secret: '<your secret goes here>',
  };
  const rest = new BinanceRest(config);
  await rest.ticker24hr({ symbol: 'BTCUSDT' });

  const bws = new BinanceWS();
  bws.onTicker('BTCUSDT', (data) => {
    console.log(data);
  });
})();

```
