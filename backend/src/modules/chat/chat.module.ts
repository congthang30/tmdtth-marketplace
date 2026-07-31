import { Module } from '@nestjs/common';
import { RedisModule } from '../../redis/redis.module';
import { AddressesModule } from '../addresses/addresses.module';
import { AuthModule } from '../auth/auth.module';
import { CartModule } from '../cart/cart.module';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { ShippingModule } from '../shipping/shipping.module';
import { VouchersModule } from '../vouchers/vouchers.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ConversationService } from './conversation.service';
import { LlmService } from './llm.service';
import { PromptService } from './prompt.service';
import { ToolDispatcher } from './tools/tool-dispatcher';

@Module({
  imports: [
    RedisModule,
    AuthModule,
    ProductsModule,
    ReviewsModule,
    CartModule,
    OrdersModule,
    AddressesModule,
    VouchersModule,
    ShippingModule,
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    ConversationService,
    LlmService,
    PromptService,
    ToolDispatcher,
  ],
})
export class ChatModule {}
