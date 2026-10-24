import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { MailService } from './mail.service';

export class SendEmailDto {
  @IsEmail({}, { message: 'A valid recipient email address is required.' })
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsNotEmpty({ message: 'Email subject is required.' })
  subject: string;

  @IsString()
  @IsOptional()
  html?: string;

  @IsString()
  @IsOptional()
  text?: string;

  @IsString()
  @IsOptional()
  clientName?: string;

  @IsString()
  @IsOptional()
  referralCode?: string;
}

@Controller(['email', 'mail'])
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('send')
  async sendEmail(@Body() body: SendEmailDto) {
    if (!body.to || !body.to.includes('@')) {
      throw new BadRequestException('A valid recipient email address is required.');
    }
    if (!body.subject || body.subject.trim().length === 0) {
      throw new BadRequestException('Email subject is required.');
    }

    const htmlContent =
      body.html || `<div style="font-family:sans-serif;padding:20px;color:#1c1917;"><p>${body.text || 'Message from ASK Tour & Travel'}</p></div>`;

    const result = await this.mailService.sendMail({
      to: body.to.trim(),
      subject: body.subject.trim(),
      html: htmlContent,
      text: body.text,
    });

    return {
      success: result.success,
      messageId: result.messageId,
      provider: result.provider,
      sender: this.mailService.getSenderEmail(),
      message: `Email processed via ${result.provider} provider.`,
    };
  }
}

