import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction): void => {
  console.error('Error:', err);

  if (err.code === 'P2002') {
    res.status(409).json({
      error: 'A record with this value already exists.',
      field: err.meta?.target,
    });
    return;
  }

  if (err.code === 'P2025') {
    res.status(404).json({ error: 'Record not found.' });
    return;
  }

  if (err.name === 'ZodError') {
    res.status(400).json({
      error: 'Validation failed.',
      details: err.errors,
    });
    return;
  }

  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({ error: 'Invalid token.' });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({ error: 'Token expired.' });
    return;
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error.',
  });
};
