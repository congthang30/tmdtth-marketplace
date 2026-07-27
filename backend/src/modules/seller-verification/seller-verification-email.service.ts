import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { HttpException, HttpStatus, Injectable, ServiceUnavailableException } from '@nestjs/common';
import Redis from 'ioredis';
import nodemailer from 'nodemailer';

type Challenge = { userId: string; email: string; digest: string; attempts: number; createdAt: string };
const OTP_TTL = 600;
const RESEND_COOLDOWN = 60;

@Injectable()
export class SellerVerificationEmailService {
  private readonly redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { lazyConnect: true, maxRetriesPerRequest: 2, enableReadyCheck: true });

  async sendSubmissionReceived(email: string, name: string, shopName: string) { await this.sendNotification(email, 'Đã nhận hồ sơ đăng ký người bán', `<h2>Đăng ký hồ sơ thành công</h2><p>Xin chào ${this.escape(name)},</p><p>Chúng tôi đã nhận hồ sơ đăng ký cửa hàng <strong>${this.escape(shopName)}</strong>.</p><p>Hồ sơ dự kiến được xét duyệt trong <strong>1–3 ngày làm việc</strong>. Chúng tôi sẽ gửi email ngay khi có kết quả.</p>`); }
  async sendApproved(email: string, name: string, shopName: string) { await this.sendNotification(email, 'Hồ sơ người bán đã được xét duyệt', `<h2>Hồ sơ đã được xét duyệt thành công</h2><p>Xin chào ${this.escape(name)},</p><p>Hồ sơ cửa hàng <strong>${this.escape(shopName)}</strong> đã được quản trị viên phê duyệt.</p><p>Bạn có thể đăng nhập Kênh người bán và bắt đầu hoạt động.</p>`); }

  async sendCode(userId: bigint, emailValue: string, ipAddress = 'unknown'): Promise<{ challengeId: string; expiresInSeconds: number; resendAfterSeconds: number; developmentCode?: string }> {
    const redis = await this.client(); const email = emailValue.trim().toLowerCase(); const user = userId.toString();
    await this.enforceLimit(redis, `otp:limit:email:${this.identity(email)}`, 3, 900);
    await this.enforceLimit(redis, `otp:limit:user:${user}`, 5, 3600);
    await this.enforceLimit(redis, `otp:limit:ip:${this.identity(ipAddress)}`, 10, 3600);
    const cooldownKey = `otp:cooldown:${user}:${this.identity(email)}`;
    if (!(await redis.set(cooldownKey, '1', 'EX', RESEND_COOLDOWN, 'NX'))) throw new HttpException({ code: 'EMAIL_OTP_RESEND_TOO_SOON', message: 'Vui lòng chờ 60 giây trước khi gửi lại mã.', details: [] }, HttpStatus.TOO_MANY_REQUESTS);

    const challengeId = randomUUID(); const code = String(randomInt(100000, 1000000));
    const challenge: Challenge = { userId: user, email, digest: this.digest(challengeId, user, email, code), attempts: 0, createdAt: new Date().toISOString() };
    await redis.set(`otp:challenge:${challengeId}`, JSON.stringify(challenge), 'EX', OTP_TTL);
    if (!this.isConfigured()) {
      if (process.env.NODE_ENV === 'production') { await redis.del(`otp:challenge:${challengeId}`); throw new ServiceUnavailableException({ code: 'EMAIL_SERVICE_NOT_CONFIGURED', message: 'Dịch vụ gửi email chưa được cấu hình.', details: [] }); }
      return { challengeId, expiresInSeconds: OTP_TTL, resendAfterSeconds: RESEND_COOLDOWN, developmentCode: code };
    }
    try {
      await this.transporter().sendMail({ from: process.env.SMTP_FROM, to: email, subject: 'Mã xác minh email đăng ký người bán', text: `Mã xác minh của bạn là ${code}. Mã có hiệu lực trong 10 phút.`, html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>Xác minh email đăng ký người bán</h2><p>Mã xác minh:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">${code}</p><p>Mã có hiệu lực trong 10 phút và chỉ dùng một lần.</p></div>` });
      return { challengeId, expiresInSeconds: OTP_TTL, resendAfterSeconds: RESEND_COOLDOWN };
    } catch { await redis.del(`otp:challenge:${challengeId}`); throw new ServiceUnavailableException({ code: 'EMAIL_DELIVERY_FAILED', message: 'Không thể gửi mã xác minh. Vui lòng thử lại sau.', details: [] }); }
  }

  async verifyCode(userId: bigint, emailValue: string, challengeId: string, code: string): Promise<boolean> {
    const redis = await this.client(); const key = `otp:challenge:${challengeId}`; const raw = await redis.get(key);
    if (!raw) return false;
    const challenge = JSON.parse(raw) as Challenge; const email = emailValue.trim().toLowerCase();
    if (challenge.userId !== userId.toString() || challenge.email !== email || challenge.attempts >= 5) { await redis.del(key); return false; }
    const actual = Buffer.from(challenge.digest, 'hex'); const expected = Buffer.from(this.digest(challengeId, challenge.userId, email, code), 'hex');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      challenge.attempts += 1;
      if (challenge.attempts >= 5) await redis.del(key); else { const ttl = await redis.ttl(key); if (ttl > 0) await redis.set(key, JSON.stringify(challenge), 'EX', ttl); }
      return false;
    }
    await redis.del(key); return true;
  }

  private async client() { if (this.redis.status === 'wait') await this.redis.connect(); try { await this.redis.ping(); return this.redis; } catch { throw new ServiceUnavailableException({ code: 'OTP_STORE_UNAVAILABLE', message: 'Dịch vụ xác minh email tạm thời không khả dụng.', details: [] }); } }
  private async enforceLimit(redis: Redis, key: string, limit: number, seconds: number) { const count = await redis.incr(key); if (count === 1) await redis.expire(key, seconds); if (count > limit) throw new HttpException({ code: 'EMAIL_OTP_RATE_LIMITED', message: 'Bạn đã yêu cầu mã quá nhiều lần. Vui lòng thử lại sau.', details: [] }, HttpStatus.TOO_MANY_REQUESTS); }
  private digest(challengeId: string, userId: string, email: string, code: string) { const secret = process.env.OTP_HMAC_SECRET; if (!secret) throw new ServiceUnavailableException({ code: 'OTP_SECRET_NOT_CONFIGURED', message: 'Dịch vụ xác minh email chưa được cấu hình đầy đủ.', details: [] }); return createHmac('sha256', secret).update(`${challengeId}:${userId}:${email}:${code}`).digest('hex'); }
  private identity(value: string) { return createHmac('sha256', process.env.OTP_HMAC_SECRET ?? 'configuration-required').update(value).digest('hex'); }
  private async sendNotification(email: string, subject: string, content: string) { if (!this.isConfigured()) return; try { await this.transporter().sendMail({ from: process.env.SMTP_FROM, to: email, subject, html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;line-height:1.6">${content}<hr><p style="color:#667085;font-size:12px">Email tự động từ TMDTTH Marketplace.</p></div>` }); } catch (error) { console.error(`Seller notification email failed: ${error instanceof Error ? error.message : 'Unknown error'}`); } }
  private transporter() { const port = Number(process.env.SMTP_PORT ?? 587); return nodemailer.createTransport({ host: process.env.SMTP_HOST, port, secure: process.env.SMTP_SECURE === 'true' || port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }); }
  private escape(value: string) { return value.replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c] ?? c); }
  private isConfigured() { return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM); }
}
