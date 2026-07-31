import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { setupApp } from '../src/common/setup-app';
import { AppRole } from '../src/modules/auth/app-role.enum';
import { AuthService } from '../src/modules/auth/auth.service';
import { OptionalJwtAuthGuard } from '../src/modules/auth/guards/optional-jwt-auth.guard';
import type { AuthenticatedUser, JwtPayload } from '../src/modules/auth/types';
import { ChatController } from '../src/modules/chat/chat.controller';
import { ChatService } from '../src/modules/chat/chat.service';
import { ConversationService } from '../src/modules/chat/conversation.service';

type ChatServiceMock = {
  send: jest.Mock;
  deleteConversation: jest.Mock;
};

type ConversationServiceMock = {
  scopeForUser: jest.Mock;
  scopeForGuest: jest.Mock;
  enforceRateLimit: jest.Mock;
};

const customer: AuthenticatedUser = {
  id: 1n,
  idString: '1',
  email: 'customer@example.com',
  phoneNumber: null,
  userStatus: 'Active',
  roles: [AppRole.Customer],
  profile: null,
};

const response = {
  conversationId: '11111111-1111-4111-8111-111111111111',
  message: 'Tôi có thể giúp bạn tìm sản phẩm.',
  pendingAction: null,
  suggestedActions: [],
};

const validBody = {
  conversationId: null,
  message: 'Tìm gạo ngon',
  confirmationToken: null,
};

describe('Chat HTTP boundary (e2e)', () => {
  let app: INestApplication;
  let chat: ChatServiceMock;
  let conversation: ConversationServiceMock;
  let jwt: { verifyAsync: jest.Mock<Promise<JwtPayload>, [string]> };
  let auth: {
    getAuthenticatedUser: jest.Mock<
      Promise<AuthenticatedUser | null>,
      [bigint]
    >;
  };

  beforeAll(async () => {
    chat = {
      send: jest.fn().mockResolvedValue(response),
      deleteConversation: jest.fn().mockResolvedValue({ deleted: true }),
    };
    conversation = {
      scopeForUser: jest.fn((id: string) => `user:${id}`),
      scopeForGuest: jest.fn(() => 'guest:hashed-ip'),
      enforceRateLimit: jest.fn().mockResolvedValue(undefined),
    };
    jwt = {
      verifyAsync: jest.fn<Promise<JwtPayload>, [string]>(),
    };
    auth = {
      getAuthenticatedUser: jest.fn<
        Promise<AuthenticatedUser | null>,
        [bigint]
      >(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        Reflector,
        OptionalJwtAuthGuard,
        { provide: ChatService, useValue: chat },
        { provide: ConversationService, useValue: conversation },
        { provide: JwtService, useValue: jwt },
        { provide: AuthService, useValue: auth },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
  });

  afterAll(async () => app.close());

  beforeEach(() => {
    jest.clearAllMocks();
    chat.send.mockResolvedValue(response);
    chat.deleteConversation.mockResolvedValue({ deleted: true });
    conversation.scopeForUser.mockImplementation((id: string) => `user:${id}`);
    conversation.scopeForGuest.mockReturnValue('guest:hashed-ip');
    conversation.enforceRateLimit.mockResolvedValue(undefined);
    jwt.verifyAsync.mockImplementation((token) =>
      token === 'valid-token'
        ? Promise.resolve({ sub: '1', email: customer.email })
        : Promise.reject(new Error('Invalid token')),
    );
    auth.getAuthenticatedUser.mockResolvedValue(customer);
  });

  it('allows a guest and enforces the guest rate scope', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/chat/messages')
      .send(validBody)
      .expect(200);

    expect(conversation.enforceRateLimit).toHaveBeenCalledWith(
      'guest:hashed-ip',
      10,
      300,
    );
    expect(chat.send).toHaveBeenCalledWith(
      undefined,
      expect.any(String),
      expect.objectContaining(validBody),
    );
  });

  it('injects a valid authenticated actor and uses the user rate scope', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/chat/messages')
      .set('Authorization', 'Bearer valid-token')
      .send(validBody)
      .expect(200);

    expect(conversation.enforceRateLimit).toHaveBeenCalledWith(
      'user:1',
      20,
      300,
    );
    expect(chat.send).toHaveBeenCalledWith(
      customer,
      expect.any(String),
      expect.objectContaining(validBody),
    );
  });

  it('rejects an invalid bearer token instead of downgrading to guest', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/chat/messages')
      .set('Authorization', 'Bearer invalid-token')
      .send(validBody)
      .expect(401);

    expect(chat.send).not.toHaveBeenCalled();
    expect(conversation.enforceRateLimit).not.toHaveBeenCalled();
  });

  it('rejects unknown DTO fields at the global validation boundary', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/chat/messages')
      .send({ ...validBody, userId: '999' })
      .expect(400);

    expect(chat.send).not.toHaveBeenCalled();
  });

  it('deletes a conversation through the current guest scope only', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const id = '11111111-1111-4111-8111-111111111111';

    await request(server).delete(`/api/chat/conversations/${id}`).expect(200);

    expect(chat.deleteConversation).toHaveBeenCalledWith(
      undefined,
      expect.any(String),
      id,
    );
  });
});
