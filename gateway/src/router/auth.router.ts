import express from "express";
import { v4 as uuidv4 } from "uuid";
import { queueName } from "../config/Constants";
import { pushToQueue, subscriber } from "../services/redis";
import { QUEUE_DATA } from "../interfaces/types";
import { generateToken } from "../utils/jwt.utils";
import { validate } from "../middleware/validation.middleware";
import { authRateLimiter } from "../middleware/ratelimit.middleware";
import { registerSchema, loginSchema } from "../schemas";

const router = express.Router();

router.post("/register", authRateLimiter, validate(registerSchema), async (req, res) => {
  const payload: QUEUE_DATA = {
    _id: uuidv4(),
    endpoint: "/auth/register",
    req: { body: req.body, params: {} },
  };

  try {
    await new Promise(async (resolve) => {
      const callbackFunc = (message: string) => {
        const { statusCode, data } = JSON.parse(message);

        if (statusCode === 201 && data.userId && data.role) {
          const token = generateToken({ userId: data.userId, role: data.role });
          res.status(statusCode).send({ ...data, token });
        } else {
          res.status(statusCode).send(data);
        }

        subscriber.unsubscribe(payload._id, callbackFunc);
        resolve(undefined);
      };

      subscriber.subscribe(payload._id, callbackFunc);
      await pushToQueue(queueName, JSON.stringify(payload));
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", authRateLimiter, validate(loginSchema), async (req, res) => {
  const payload: QUEUE_DATA = {
    _id: uuidv4(),
    endpoint: "/auth/login",
    req: { body: req.body, params: {} },
  };

  try {
    await new Promise(async (resolve) => {
      const callbackFunc = (message: string) => {
        const { statusCode, data } = JSON.parse(message);

        if (statusCode === 200 && data.userId && data.role) {
          const token = generateToken({ userId: data.userId, role: data.role });
          res.status(statusCode).send({ ...data, token });
        } else {
          res.status(statusCode).send(data);
        }

        subscriber.unsubscribe(payload._id, callbackFunc);
        resolve(undefined);
      };

      subscriber.subscribe(payload._id, callbackFunc);
      await pushToQueue(queueName, JSON.stringify(payload));
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
