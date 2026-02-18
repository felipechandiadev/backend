import * as jwt from 'jsonwebtoken';
import { JweService } from '../../src/auth/jwe/jwe.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

let jweService: JweService;

export const setJweService = (service: JweService) => {
  jweService = service;
};

export const createJwtToken = async (payload: JwtPayload): Promise<string> => {
  if (jweService && process.env.NODE_ENV !== 'test') {
    return await jweService.encrypt(payload, '1h');
  }
  // Always use plain JWT in tests or as fallback
  return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', {
    expiresIn: '1h',
  });
};
