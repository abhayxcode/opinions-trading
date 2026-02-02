export interface INR_BALANCES_TYPE {
  [userId: string]: {
    balance: number;
    locked: number;
  };
}

export interface STOCK_BALANCES_TYPE {
  [userId: string]: {
    [stockSymbol: string]: {
      yes?: {
        quantity: number;
        locked: number;
      };
      no?: {
        quantity: number;
        locked: number;
      };
    };
  };
}

export type priceRange =
  | 0.5
  | 1
  | 1.5
  | 2
  | 2.5
  | 3
  | 3.5
  | 4
  | 4.5
  | 5
  | 5.5
  | 6
  | 6.5
  | 7
  | 7.5
  | 8
  | 8.5
  | 9
  | 9.5
  | 10;

export type Order = {
  userId: string;
  id: string;
  quantity: number;
  type: "buy" | "exit";
}[];

export type ORDERDATA = {
  total: number;
  orders: Order;
};

export interface ORDER_BOOK_TYPE {
  [stockSymbol: string]: {
    yes: Map<priceRange, ORDERDATA>;
    no: Map<priceRange, ORDERDATA>;
  };
}

export interface USER_TYPE {
  passwordHash: string;
  role: 'admin' | 'user';
  createdAt: number;
}

export interface USERS_TYPE {
  [userId: string]: USER_TYPE;
}

export interface AuthContext {
  userId: string;
  role: 'admin' | 'user';
}
