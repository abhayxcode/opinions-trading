import { INR_BALANCES, ORDERBOOK, STOCK_BALANCES } from "../config/globals";
import { ORDER_REQUEST, QUEUE_REQUEST } from "../interfaces/requestModels";
import { priceRange } from "../interfaces/globals";
import { publishOrderbook } from "../services/redis";
import { initiateSellOrder, matchOrder } from "../helper";

/**
 * Get order book
 * @param req - The request object
 * @returns The response object
 */
export const getOrderBook = (req: QUEUE_REQUEST) => {
  const formattedOrderbook = Object.fromEntries(
    Object.entries(ORDERBOOK).map(([key, object]) => {
      const yes = Object.fromEntries(Array.from(object.yes));
      const no = Object.fromEntries(Array.from(object.no));
      return [key, { yes, no }];
    })
  );

  return { statusCode: 200, data: formattedOrderbook };
};

/**
 * View Buy and Sell Orders
 * @param req - The request object
 * @returns The response object
 */
export const viewOrders = (req: QUEUE_REQUEST) => {
  const stockSymbol = req.params.stockSymbol as string;

  const symbolExists = ORDERBOOK[stockSymbol];
  if (!symbolExists) {
    return {
      statusCode: 404,
      data: { error: `Stock with stockSymbol ${stockSymbol} does not exist` },
    };
  }
  return { statusCode: 200, data: ORDERBOOK[stockSymbol] };
};

/**
 * Buy Order
 * @param req - The request object
 * @returns The response object
 */
export const buyOrder = (req: QUEUE_REQUEST) => {
  const { userId, stockSymbol } = req.body as ORDER_REQUEST;
  const quantity = Number(req.body.quantity);
  const price: priceRange = Number(req.body.price) as priceRange;
  const stockType = req.body.stockType as "yes" | "no";

  const userExists = INR_BALANCES[userId];
  const symbolExists = ORDERBOOK[stockSymbol];

  if (!userExists) {
    return {
      statusCode: 400,
      data: { error: `User with user Id ${userId} does not exist` },
    };
  }
  if (!symbolExists) {
    return {
      statusCode: 400,
      data: { error: `Stock with stockSymbol ${stockSymbol} does not exist` },
    };
  }

  const requiredBalance = quantity * price;
  const userBalance = INR_BALANCES[userId].balance / 100;

  if (requiredBalance > userBalance) {
    return { statusCode: 400, data: { message: "Insufficient INR balance" } };
  }

  // Filter the orderbook for less than or equal to price
  const filteredByPrice = new Map(
    Array.from(ORDERBOOK[stockSymbol][stockType]).filter(
      ([key, value]) => key <= price && value.total != 0
    )
  );

  const buyOrderArray = Array.from(filteredByPrice).map(([price, item]) => {
    const orders = item.orders.filter((order) => order.userId !== userId);
    const total = orders.reduce((acc, value) => {
      return acc + value.quantity;
    }, 0);
    return { price, total, orders };
  });

  // Check for total available quantity of all stocks that can match
  let availableQuantity = buyOrderArray.reduce(
    (acc, item) => acc + item.total,
    0
  );

  // No stocks for sale -> Create a Pseudo Sell Order
  if (availableQuantity == 0) {
    initiateSellOrder(stockSymbol, stockType, price, quantity, userId, "buy");
    return { statusCode: 200, data: { message: "Bid Submitted" } };
  }

  // ********** Matching Logic ************
  let requiredQuantity = quantity;

  // loop over yes/no orders -> one price at a time
  for (const buyOrder in buyOrderArray) {
    const orderPrice = Number(buyOrderArray[buyOrder].price) as priceRange;

    requiredQuantity = matchOrder(
      stockSymbol,
      stockType,
      orderPrice,
      requiredQuantity,
      buyOrderArray[buyOrder],
      userId,
      "buy"
    );

    // If total quantity at a price is zero delete it from the order book
    if (
      ORDERBOOK[stockSymbol][stockType].get(orderPrice) &&
      ORDERBOOK[stockSymbol][stockType].get(orderPrice)!.total == 0
    ) {
      ORDERBOOK[stockSymbol][stockType].delete(orderPrice);
    }

    // Publish to all subscribers
    publishOrderbook(stockSymbol);

    if (requiredQuantity == 0) {
      break;
    }

    availableQuantity = buyOrderArray.reduce(
      (acc, item) => acc + item.total,
      0
    );
    console.log();
    // Inititate a partial pseudo sell order for remaining quantities
    if (availableQuantity == 0) {
      initiateSellOrder(
        stockSymbol,
        stockType,
        price,
        requiredQuantity,
        userId,
        "buy"
      );
      break;
    }
  }

  return {
    statusCode: 200,
    data: {
      message: `Buy order placed and trade executed`,
    },
  };
};

/**
 * Sell Order
 * @param req - The request object
 * @returns The response object
 */
export const sellOrder = (req: QUEUE_REQUEST) => {
  const { userId, stockSymbol } = req.body as ORDER_REQUEST;
  const quantity = Number(req.body.quantity);
  const price = Number(req.body.price) as priceRange;
  const stockType = req.body.stockType as "yes" | "no";

  const userExists = INR_BALANCES[userId];
  const symbolExists = ORDERBOOK[stockSymbol];

  if (!userExists) {
    return {
      statusCode: 400,
      data: { error: `User with user Id ${userId} does not exist` },
    };
  }
  if (!symbolExists) {
    return {
      statusCode: 400,
      data: { error: `Stock with stockSymbol ${stockSymbol} does not exist` },
    };
  }

  const stockAvailable = STOCK_BALANCES[userId][stockSymbol]; // Does user have this stock.
  if (!stockAvailable) {
    return {
      statusCode: 400,
      data: { message: `You do not own any stock of ${stockSymbol}` },
    };
  }

  const stockBalanceOfUser = Number(stockAvailable[stockType]?.quantity) || 0; // Quantity of stocks user own

  if (quantity > stockBalanceOfUser) {
    return { statusCode: 400, data: { message: "Insufficient stock balance" } };
  }

  // Checking for any buy orders (pseudo sell in opposite stock type)
  let pseudoType: "yes" | "no" = "yes";
  let pseudoPrice: priceRange = Number(10 - price) as priceRange;
  if (stockType == "yes") {
    pseudoType = "no";
  }

  const sellOrderObject = ORDERBOOK[stockSymbol][pseudoType].get(pseudoPrice);

  let totalAvailableQuantity: number = 0;

  if (sellOrderObject) {
    totalAvailableQuantity = sellOrderObject.orders.reduce((acc, item) => {
      if (item.type == "buy") {
        return (acc += item.quantity);
      } else {
        return acc;
      }
    }, 0);
  }

  if (totalAvailableQuantity == 0) {
    initiateSellOrder(stockSymbol, stockType, price, quantity, userId, "exit");

    return {
      statusCode: 200,
      data: {
        message: `Sell order placed for ${quantity} '${stockType}' options at price ${price}.`,
      },
    };
  }

  // Matching Sell Orders with Buy orders (pseudo Sell)
  let sellingQuantity = quantity;

  if (totalAvailableQuantity >= quantity) {
    sellingQuantity = matchOrder(
      stockSymbol,
      stockType,
      price,
      sellingQuantity,
      sellOrderObject!,
      userId,
      "sell"
    );
    publishOrderbook(stockSymbol); // Publish to all subscribers
    return {
      statusCode: 200,
      data: { message: "Sell order filled completely" },
    };
  }

  // Sell Order with partial Matching
  sellingQuantity = matchOrder(
    stockSymbol,
    stockType,
    price,
    sellingQuantity,
    sellOrderObject!,
    userId,
    "sell"
  );
  publishOrderbook(stockSymbol); // Publish to all subscribers
  return {
    statusCode: 200,
    data: { message: "Sell order partially filled and rest are initiated" },
  };
};

/**
 * Cancel Order - Cancels all pending orders for a user on a specific symbol and stockType
 * @param req - The request object
 * @returns The response object
 */
export const cancelOrder = (req: QUEUE_REQUEST) => {
  const { userId, stockSymbol } = req.body;
  const stockType = req.body.stockType as "yes" | "no";
  const userExists = INR_BALANCES[userId];
  const symbolExists = ORDERBOOK[stockSymbol];

  if (!userExists) {
    return {
      statusCode: 400,
      data: { error: `User with user Id ${userId} does not exist` },
    };
  }
  if (!symbolExists) {
    return {
      statusCode: 400,
      data: { error: `Stock with stockSymbol ${stockSymbol} does not exist` },
    };
  }

  let cancelledCount = 0;
  let refundedInr = 0;
  let refundedStock = 0;

  // Cancel exit orders (actual sell orders) - stored on the same stockType
  const exitOrderbook = ORDERBOOK[stockSymbol][stockType];
  for (const [price, orderData] of exitOrderbook.entries()) {
    const userOrders = orderData.orders.filter(
      (order) => order.userId === userId && order.type === "exit"
    );

    for (const order of userOrders) {
      // Refund locked stock
      if (STOCK_BALANCES[userId]?.[stockSymbol]?.[stockType]) {
        STOCK_BALANCES[userId][stockSymbol][stockType]!.locked -= order.quantity;
        STOCK_BALANCES[userId][stockSymbol][stockType]!.quantity += order.quantity;
        refundedStock += order.quantity;
      }

      // Update orderbook total
      orderData.total -= order.quantity;
      cancelledCount++;
    }

    // Remove user's orders from the orders array
    orderData.orders = orderData.orders.filter(
      (order) => !(order.userId === userId && order.type === "exit")
    );

    // Clean up empty price levels
    if (orderData.total === 0) {
      exitOrderbook.delete(price);
    }
  }

  // Cancel buy orders (pseudo-sell orders) - stored on the opposite stockType
  const oppositeType: "yes" | "no" = stockType === "yes" ? "no" : "yes";
  const buyOrderbook = ORDERBOOK[stockSymbol][oppositeType];

  for (const [price, orderData] of buyOrderbook.entries()) {
    const userOrders = orderData.orders.filter(
      (order) => order.userId === userId && order.type === "buy"
    );

    for (const order of userOrders) {
      // Calculate the original buy price (pseudo-sell is stored at 10 - originalPrice)
      const originalPrice = 10 - price;

      // Refund locked INR (stored in paise)
      INR_BALANCES[userId].locked -= order.quantity * originalPrice * 100;
      INR_BALANCES[userId].balance += order.quantity * originalPrice * 100;
      refundedInr += order.quantity * originalPrice;

      // Update orderbook total
      orderData.total -= order.quantity;
      cancelledCount++;
    }

    // Remove user's orders from the orders array
    orderData.orders = orderData.orders.filter(
      (order) => !(order.userId === userId && order.type === "buy")
    );

    // Clean up empty price levels
    if (orderData.total === 0) {
      buyOrderbook.delete(price);
    }
  }

  if (cancelledCount === 0) {
    return {
      statusCode: 404,
      data: { message: `No pending orders found for ${stockType} on ${stockSymbol}` },
    };
  }

  // Publish updated orderbook
  publishOrderbook(stockSymbol);

  return {
    statusCode: 200,
    data: {
      message: `Cancelled ${cancelledCount} order(s)`,
      refundedInr,
      refundedStock,
    },
  };
};
