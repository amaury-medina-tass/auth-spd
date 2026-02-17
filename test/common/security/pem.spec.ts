import { normalizePem } from '../../../libs/common/src/security/pem';

describe('normalizePem', () => {
    it('should replace literal \\n with newlines', () => {
        const input = '-----BEGIN PUBLIC KEY-----\\nMIIBI\\n-----END PUBLIC KEY-----';
        const result = normalizePem(input);
        expect(result).toBe('-----BEGIN PUBLIC KEY-----\nMIIBI\n-----END PUBLIC KEY-----');
    });

    it('should trim whitespace', () => {
        const input = '  some-key  ';
        const result = normalizePem(input);
        expect(result).toBe('some-key');
    });

    it('should handle empty string', () => {
        const result = normalizePem('');
        expect(result).toBe('');
    });

    it('should handle already normalized PEM', () => {
        const input = '-----BEGIN KEY-----\ndata\n-----END KEY-----';
        const result = normalizePem(input);
        expect(result).toBe('-----BEGIN KEY-----\ndata\n-----END KEY-----');
    });
});
