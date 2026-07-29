import { BadRequestException } from '@nestjs/common';
import { VerificationStatus } from '@prisma/client';
import {
  VERIFICATION_TRANSITIONS,
  VerificationTransitionService,
} from './verification-transition.service';

describe('VerificationTransitionService', () => {
  const service = new VerificationTransitionService();

  it.each(
    Object.entries(VERIFICATION_TRANSITIONS).flatMap(([from, destinations]) =>
      destinations.map((to) => [from as VerificationStatus, to] as const),
    ),
  )('allows %s -> %s', (from, to) => {
    expect(service.canTransition(from, to)).toBe(true);
    expect(() => service.assertAllowed(from, to)).not.toThrow();
  });

  it.each(
    Object.values(VerificationStatus).flatMap((from) =>
      Object.values(VerificationStatus)
        .filter((to) => !VERIFICATION_TRANSITIONS[from].includes(to))
        .map((to) => [from, to] as const),
    ),
  )('rejects %s -> %s', (from, to) => {
    expect(service.canTransition(from, to)).toBe(false);
    expect(() => service.assertAllowed(from, to)).toThrow(BadRequestException);
  });

  it('does not allow same-state transitions', () => {
    for (const status of Object.values(VerificationStatus)) {
      expect(service.canTransition(status, status)).toBe(false);
    }
  });

  it('never creates a new UnderReview state', () => {
    for (const destinations of Object.values(VERIFICATION_TRANSITIONS)) {
      expect(destinations).not.toContain(VerificationStatus.UnderReview);
    }
  });
});
