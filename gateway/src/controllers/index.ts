import { v4 as uuidv4 } from "uuid";
import { queueName } from "../config/Constants";
import { Request, Response } from "express";
import { pushToQueue, subscriber } from "../services/redis";
import { QUEUE_DATA } from "../interfaces/types";

/**
 * Forward request and wait for the response
 * @param req - The request object
 * @param res - The response object
 * @param endpoint - The endpoint
 */
const forwardRequest = async (
  req: Request,
  res: Response,
  endpoint: string
) => {
  const payload: QUEUE_DATA = {
    _id: uuidv4(),
    endpoint,
    req: { body: req.body, params: req.params },
    auth: req.auth,
  };

  try {
    // Waiting for the response to get published on unique channel
    await new Promise(async (resolve) => {
      const callbackFunc = (message: string) => {
        const { statusCode, data } = JSON.parse(message);
        res.status(statusCode).send(data);
        subscriber.unsubscribe(payload._id, callbackFunc);
        resolve(undefined);
      };

      subscriber.subscribe(payload._id, callbackFunc);
      // Push request to the queue
      await pushToQueue(queueName, JSON.stringify(payload));
    });

    return;
  } catch (error) {
    console.log(error);
  }
};

export default forwardRequest;
