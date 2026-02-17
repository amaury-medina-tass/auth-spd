jest.mock('bcrypt', () => ({
    hash: jest.fn().mockResolvedValue('hashed_password'),
    compare: jest.fn().mockResolvedValue(true),
}));

import { hashPassword, verifyPassword } from '../../../libs/common/src/security/password';
import * as bcrypt from 'bcrypt';

describe('password', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('hashPassword', () => {
        it('should hash with 12 salt rounds', async () => {
            const result = await hashPassword('mypassword');
            expect(bcrypt.hash).toHaveBeenCalledWith('mypassword', 12);
            expect(result).toBe('hashed_password');
        });
    });

    describe('verifyPassword', () => {
        it('should return true for matching password', async () => {
            const result = await verifyPassword('raw', 'hash');
            expect(bcrypt.compare).toHaveBeenCalledWith('raw', 'hash');
            expect(result).toBe(true);
        });

        it('should return false for non-matching password', async () => {
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
            const result = await verifyPassword('wrong', 'hash');
            expect(result).toBe(false);
        });
    });
});
