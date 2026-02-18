# 📧 Configuración de EmailService - Guía para Gmail

## ❌ Problema Actual
El test falló con error: "Username and Password not accepted"

## ✅ Solución: Configurar App Password de Gmail

### Paso 1: Habilitar 2FA en Gmail
1. Ve a https://myaccount.google.com/security
2. En "Signing in to Google", activa "2-Step Verification"

### Paso 2: Generar App Password
1. Ve a https://myaccount.google.com/apppasswords
2. Selecciona "Mail" como app
3. Selecciona "Other" como device y escribe "Real Estate Platform"
4. Copia la contraseña de 16 caracteres generada

### Paso 3: Actualizar .env
Reemplaza la contraseña actual en `.env`:

```env
# Email Configuration
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=felipe.chandia.dev@gmail.com
MAIL_PASS=tu_app_password_de_16_caracteres  # ⚠️ Usar App Password, NO la contraseña normal
MAIL_FROM=felipe.chandia.dev@gmail.com
```

## 🔧 Alternativa: Usar Mailtrap (Recomendado para Testing)

Si prefieres no usar Gmail para testing, puedes usar Mailtrap:

1. Crear cuenta gratuita en https://mailtrap.io
2. Crear un inbox de testing
3. Usar estas credenciales en `.env`:

```env
# Email Configuration (Mailtrap)
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=tu_mailtrap_username
MAIL_PASS=tu_mailtrap_password
MAIL_FROM=noreply@realestate.com
```

## 🚀 Una vez configurado:

```bash
cd backend
NODE_OPTIONS='--experimental-vm-modules' npx jest test/notifications/email.e2e.spec.ts -i --runInBand --detectOpenHandles --verbose
```

## 📝 Notas de Seguridad

- ✅ NUNCA uses tu contraseña personal de Gmail
- ✅ Usa App Passwords específicas para aplicaciones
- ✅ Considera rotar las App Passwords periódicamente
- ✅ Para producción, usa servicios como SendGrid o AWS SES

---

**¿Necesitas ayuda para configurar las credenciales?** 
Proporciona las credenciales correctas y ejecuto el test nuevamente.