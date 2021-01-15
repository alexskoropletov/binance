import BigNumber from 'bignumber.js';

function valueProcessor(
  symbolInfo,
  { quantity, price },
  {
    priceRounding = 'ROUND_HALF_UP',
    quantityRounding = 'ROUND_DOWN'
  } = {}
) {
  if (typeof price === 'number') {
    price = price.toFixed(8);
  }
  if (typeof quantity === 'number') {
    quantity = quantity.toFixed(8);
  }

  const priceFilter = symbolInfo.filters.filter(f => f.filterType === 'PRICE_FILTER')[0];

  if (priceFilter) {
    const { minPrice, maxPrice, tickSize } = priceFilter;
    const dp = new BigNumber(tickSize).dp();
    if (new BigNumber(price).lt(minPrice)) {
      price = minPrice;
    }
    if (new BigNumber(price).gt(maxPrice)) {
      price = maxPrice;
    }
    const mod = new BigNumber(price).mod(tickSize);
    price = new BigNumber(price)
      .minus(mod)
      .toFixed(dp, BigNumber[priceRounding]);
  }

  const lotSizeFilter = symbolInfo.filters.filter(f => f.filterType === 'LOT_SIZE')[0];

  if (lotSizeFilter) {
    const { minQty, maxQty, stepSize } = lotSizeFilter;
    const dp = new BigNumber(stepSize).dp();
    if (new BigNumber(quantity).lt(minQty)) {
      quantity = minQty;
    }
    if (new BigNumber(quantity).gt(maxQty)) {
      quantity = maxQty;
    }

    const minNotionalFilter = symbolInfo.filters.filter(f => f.filterType === 'MIN_NOTIONAL')[0];
    if (minNotionalFilter) {
      if (
        new BigNumber(quantity)
          .times(price)
          .lt(minNotionalFilter.minNotional)
      ) {
        // Always round up for minNotional since we can't be below it.
        quantity = new BigNumber(minNotionalFilter.minNotional)
          .div(price)
          .toFixed(dp, BigNumber.ROUND_UP);

        const mod = new BigNumber(quantity).mod(stepSize);
        if (mod.gt(0)) {
          quantity = new BigNumber(quantity)
            .plus(stepSize)
            .minus(mod)
            .toFixed(dp, BigNumber[quantityRounding]);
        }
      }
    }

    const mod = new BigNumber(quantity).mod(stepSize);
    quantity = new BigNumber(quantity)
      .minus(mod)
      .toFixed(dp, BigNumber[quantityRounding]);

    quantity = new BigNumber(quantity).toFixed(dp, BigNumber[quantityRounding]);
  }

  return {
    quantity,
    price
  };
}

export default valueProcessor;
