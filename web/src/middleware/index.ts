import { NextFunction, Request, Response } from "express";
// import rateLimit from 'express-rate-limit';

export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { code, lang } = req.body;

  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Code is required and must be a string" });
    return;
  }

  if (!lang || !["py", "js", "java", "cpp"].includes(lang)) {
    res.status(400).json({ error: "Invalid or unsupported language" });
    return;
  }

  next();
};

// export const rateLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100 // limit each IP to 100 requests per windowMs
// });
export const allowCORS = (req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, Content-Type, X-Auth-Token",
  );
  next();
};
