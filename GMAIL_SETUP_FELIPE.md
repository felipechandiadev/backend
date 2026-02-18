📧 CONFIGURACIÓN GMAIL APP PASSWORD PARA FELIPE

🔐 PASOS PARA CONFIGURAR APP PASSWORD:

1. Ve a: https://myaccount.google.com/security
2. Activa "2-Step Verification" si no está activado
3. Ve a: https://myaccount.google.com/apppasswords
4. Selecciona "Mail" y "Other" 
5. Escribe "Real Estate Platform"
6. Copia la contraseña de 16 caracteres

🛠️ ACTUALIZA EL .env:

Edita: /Users/felipe/dev/realEstatePlatform/backend/.env

Reemplaza esta línea:
MAIL_PASS=your_gmail_app_password_here

Por:
MAIL_PASS=tu_app_password_de_16_caracteres

🚀 EJECUTAR TEST:

cd backend
NODE_OPTIONS='--experimental-vm-modules' npx jest test/notifications/email-real-gmail.e2e.spec.ts -i --runInBand --detectOpenHandles --verbose

📧 RESULTADO ESPERADO:
- ✅ 4 emails enviados a felipe.chandia.cast@gmail.com
- ✅ Email de bienvenida con template profesional
- ✅ Notificación de propiedad con detalles completos
- ✅ Email de recuperación de contraseña
- ✅ Email personalizado con HTML

🔍 REVISA TU GMAIL:
Los 4 emails deberían llegar a tu bandeja de entrada real.

⚠️ SI HAY PROBLEMAS:
1. Verifica que el App Password sea correcto
2. Confirma que 2FA esté activado en Gmail
3. Revisa que no tengas restricciones de seguridad

💡 ALTERNATIVA SIN GMAIL:
Si prefieres no usar Gmail, puedo configurar Mailtrap para testing.