import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PasswordRecoveryService } from '../src/modules/password-recovery/password-recovery.service';

async function main() {
  const appContext = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const passwordRecoveryService = appContext.get(PasswordRecoveryService);
    await passwordRecoveryService.requestReset('admin@re.cl', {
      ipAddress: '127.0.0.1',
      userAgent: 'debug-script',
    });
    console.log('✅ requestReset completed without throwing.');
  } catch (error) {
    console.error('❌ requestReset threw an error:');
    console.error(error);
  } finally {
    await appContext.close();
  }
}

main().catch((error) => {
  console.error('Unhandled error in debug script:', error);
  process.exit(1);
});
