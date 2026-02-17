import { RESPONSE_MESSAGE_KEY, ResponseMessage } from '../../../../apps/auth-api/src/common/decorators/response-message.decorator';

describe('ResponseMessage', () => {
    it('should set metadata with message', () => {
        const decorator = ResponseMessage('Lista obtenida');
        const target = {};
        decorator(target, undefined as any, undefined as any);

        const metadata = Reflect.getMetadata(RESPONSE_MESSAGE_KEY, target);
        expect(metadata).toBe('Lista obtenida');
    });
});
