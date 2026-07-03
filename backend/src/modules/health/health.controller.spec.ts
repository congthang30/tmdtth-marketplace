import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns an ok health payload', () => {
    const controller = new HealthController();

    expect(controller.getHealth()).toEqual(
      expect.objectContaining({
        status: 'ok',
        service: 'tmdtth-backend',
      }),
    );
  });
});
