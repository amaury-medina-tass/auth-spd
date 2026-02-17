import { HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from '../../../../apps/auth-api/src/common/filters/all-exceptions.filter';

describe('AllExceptionsFilter', () => {
    let filter: AllExceptionsFilter;
    let mockReply: jest.Mock;
    let mockHost: any;
    let mockRequest: any;

    beforeEach(() => {
        mockReply = jest.fn();
        mockRequest = { headers: { 'x-request-id': 'req-123' }, url: '/test', method: 'GET' };
        const httpAdapter = {
            reply: mockReply,
            getRequestUrl: jest.fn(() => '/test'),
            getRequestMethod: jest.fn(() => 'GET'),
        };
        filter = new AllExceptionsFilter({ httpAdapter } as any);
        mockHost = {
            switchToHttp: () => ({
                getRequest: () => mockRequest,
                getResponse: () => ({}),
            }),
        } as any;
    });

    it('should handle HttpException with string response', () => {
        const ex = new HttpException('Not found', HttpStatus.NOT_FOUND);
        filter.catch(ex, mockHost);
        expect(mockReply).toHaveBeenCalled();
        const body = mockReply.mock.calls[0][1];
        expect(body.success).toBe(false);
        expect(body.statusCode).toBe(404);
        expect(body.message).toBe('Not found');
    });

    it('should handle HttpException with object response', () => {
        const ex = new HttpException({ message: 'Custom msg', code: 'ERR_CUSTOM' }, HttpStatus.BAD_REQUEST);
        filter.catch(ex, mockHost);
        const body = mockReply.mock.calls[0][1];
        expect(body.statusCode).toBe(400);
        expect(body.message).toBe('Custom msg');
        expect(body.errors.code).toBe('ERR_CUSTOM');
    });

    it('should handle validation errors (array message)', () => {
        const ex = new HttpException(
            { message: ['email must be valid', 'name is required'], statusCode: 400 },
            HttpStatus.BAD_REQUEST,
        );
        filter.catch(ex, mockHost);
        const body = mockReply.mock.calls[0][1];
        expect(body.message).toBe('Errores de validación');
        expect(body.errors).toHaveLength(2);
        expect(body.errors[0].message).toBe('email must be valid');
    });

    it('should handle unknown exception as 500', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        filter.catch(new Error('Unexpected'), mockHost);
        const body = mockReply.mock.calls[0][1];
        expect(body.statusCode).toBe(500);
        expect(body.message).toBe('Internal server error');
        consoleSpy.mockRestore();
    });

    it('should include meta with requestId, path, method', () => {
        const ex = new HttpException('err', 400);
        filter.catch(ex, mockHost);
        const body = mockReply.mock.calls[0][1];
        expect(body.meta.requestId).toBe('req-123');
        expect(body.meta.path).toBe('/test');
        expect(body.meta.method).toBe('GET');
    });

    it('should generate requestId if header missing', () => {
        mockRequest.headers = {};
        filter.catch(new HttpException('err', 400), mockHost);
        const body = mockReply.mock.calls[0][1];
        expect(body.meta.requestId).toBeDefined();
    });

    it('should extract additional error properties', () => {
        const ex = new HttpException(
            { message: 'conflict', code: 'DUPLICATE', existingId: '123' },
            HttpStatus.CONFLICT,
        );
        filter.catch(ex, mockHost);
        const body = mockReply.mock.calls[0][1];
        expect(body.errors.existingId).toBe('123');
    });
});
