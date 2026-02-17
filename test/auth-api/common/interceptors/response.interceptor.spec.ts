import { of } from 'rxjs';
import { ResponseInterceptor } from '../../../../apps/auth-api/src/common/interceptors/response.interceptor';

describe('ResponseInterceptor', () => {
    let interceptor: ResponseInterceptor<any>;
    const mockReflector = {
        getAllAndOverride: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        interceptor = new ResponseInterceptor(mockReflector as any);
    });

    function createContext(url = '/test', method = 'GET', statusCode = 200) {
        return {
            switchToHttp: () => ({
                getRequest: () => ({ url, method, headers: {} }),
                getResponse: () => ({ statusCode }),
            }),
            getHandler: () => ({}),
            getClass: () => ({}),
        } as any;
    }

    it('should wrap data in ApiResponse format', (done) => {
        mockReflector.getAllAndOverride.mockReturnValue('Test message');
        const ctx = createContext();
        const next = { handle: () => of({ id: 'u1' }) };

        interceptor.intercept(ctx, next as any).subscribe((result) => {
            expect(result.success).toBe(true);
            expect(result.statusCode).toBe(200);
            expect(result.message).toBe('Test message');
            expect(result.data).toEqual({ id: 'u1' });
            expect(result.errors).toBeNull();
            expect(result.meta.path).toBe('/test');
            expect(result.meta.method).toBe('GET');
            expect(result.meta.requestId).toBeDefined();
            expect(result.meta.timestamp).toBeDefined();
            done();
        });
    });

    it('should use default message when no decorator', (done) => {
        mockReflector.getAllAndOverride.mockReturnValue(undefined);
        const ctx = createContext();
        const next = { handle: () => of(null) };

        interceptor.intercept(ctx, next as any).subscribe((result) => {
            expect(result.message).toBe('Operación realizada correctamente');
            expect(result.data).toBeNull();
            done();
        });
    });

    it('should handle undefined data as null', (done) => {
        mockReflector.getAllAndOverride.mockReturnValue('Ok');
        const ctx = createContext('/api', 'POST', 201);
        const next = { handle: () => of(undefined) };

        interceptor.intercept(ctx, next as any).subscribe((result) => {
            expect(result.data).toBeNull();
            expect(result.statusCode).toBe(201);
            done();
        });
    });
});
