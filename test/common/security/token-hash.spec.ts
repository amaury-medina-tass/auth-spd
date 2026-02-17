jest.mock('bcrypt', () => ({
    hash: jest.fn().mockResolvedValue('hashed_token'),
    compare: jest.fn().mockResolvedValue(true),
}));

import { hashToken, verifyToken } from '../../../libs/common/src/security/token-hash';
import * as bcrypt from 'bcrypt';

describe('token-hash', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('hashToken', () => {
        it('should hash with 10 salt rounds', async () => {
            const result = await hashToken('raw-token');
            expect(bcrypt.hash).toHaveBeenCalledWith('raw-token', 10);
            expect(result).toBe('hashed_token');
        });
    });

    describe('verifyToken', () => {
        it('should return true for valid token', async () => {
            const result = await verifyToken('raw', 'hash');
            expect(bcrypt.compare).toHaveBeenCalledWith('raw', 'hash');
            expect(result).toBe(true);
        });

        it('should return false for invalid token', async () => {
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
            const result = await verifyToken('wrong', 'hash');
            expect(result).toBe(false);
        });
    });
});
