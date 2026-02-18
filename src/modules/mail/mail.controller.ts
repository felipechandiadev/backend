import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MailService } from './mail.service';

@ApiTags('Mail')
@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  /**
   * Endpoint de prueba para verificar envío de correos (SOLO DESARROLLO)
   */
  @Post('test')
  @ApiOperation({ summary: 'Test email sending (development only)' })
  async testEmail(@Body() body: { email: string }) {
    return this.mailService.testEmail(body.email);
  }
}