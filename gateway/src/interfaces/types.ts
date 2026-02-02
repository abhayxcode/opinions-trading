export interface AuthContext {
  userId: string;
  role: 'admin' | 'user';
}

export interface QUEUE_DATA {
  _id: string;
  endpoint: string;
  req: {
    body: {};
    params: {};
  };
  auth?: AuthContext;
}
