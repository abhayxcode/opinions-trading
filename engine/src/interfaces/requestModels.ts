export interface ON_RAMP_REQUEST {
  userId: string;
  amount: number;
}

export interface ORDER_REQUEST {
  userId: string;
  stockSymbol: string;
  quantity: number;
  price: number;
  stockType: "yes" | "no";
}

export interface MINT_REQUEST {
  userId: string;
  stockSymbol: string;
  quantity: number;
}

export interface REGISTER_REQUEST {
  userId: string;
  password: string;
}

export interface LOGIN_REQUEST {
  userId: string;
  password: string;
}

export interface QUEUE_DATA_ELEMENT {
  _id: string;
  endpoint: string;
  req: QUEUE_REQUEST;
}

export interface QUEUE_REQUEST {
  body: {
    userId?: string;
    password?: string;
    amount?: number;
    stockSymbol?: string;
    quantity?: number;
    price?: number;
    stockType?: "yes" | "no";
  };
  params: { userId?: string; stockSymbol?: string };
}

export interface QUEUE_DATA_WITH_AUTH extends QUEUE_DATA_ELEMENT {
  auth?: {
    userId: string;
    role: 'admin' | 'user';
  };
}
