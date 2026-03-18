import type { Request, Response } from "express";

export function healthController() {
  return async function health(_req: Request, res: Response) {
    res.json({
      ok: true,
      service: "ai102-backend",
      time: new Date().toISOString()
    });
  };
}

