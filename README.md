# Real Estate Platform Backend

Backend API para la plataforma inmobiliaria desarrollado con NestJS y TypeORM.

## Tecnologías

- **NestJS**: Framework de Node.js para aplicaciones server-side escalables
- **TypeORM**: ORM para TypeScript que soporta múltiples bases de datos
- **MySQL**: Base de datos relacional
- **class-validator**: Validación de datos
- **class-transformer**: Transformación de objetos

## Configuración

### Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=password
DB_DATABASE=real_estate_platform

# Application Configuration
PORT=3000
NODE_ENV=development
```

### Base de Datos

Asegúrate de tener MySQL corriendo y crear la base de datos especificada en las variables de entorno.

## Instalación

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run start:dev

# Ejecutar en modo producción
npm run build
npm run start:prod
```

## Estructura del Proyecto

```
src/
├── config/                 # Configuraciones
│   └── database.config.ts  # Configuración de TypeORM
├── entities/               # Entidades de base de datos
│   └── team-member.entity.ts
├── modules/                # Módulos de la aplicación
│   └── team-members/       # Módulo de miembros del equipo
│       ├── dto/            # Data Transfer Objects
│       ├── team-members.controller.ts
│       ├── team-members.service.ts
│       └── team-members.module.ts
├── app.controller.ts       # Controlador principal
├── app.module.ts          # Módulo principal
├── app.service.ts         # Servicio principal
└── main.ts                # Punto de entrada
```

## API Endpoints

### Team Members

- `GET /team-members` - Obtener todos los miembros del equipo
- `GET /team-members/:id` - Obtener un miembro específico
- `POST /team-members` - Crear un nuevo miembro
- `PATCH /team-members/:id` - Actualizar un miembro
- `DELETE /team-members/:id` - Eliminar un miembro (soft delete)

### Articles

- `GET /articles` - Obtener todos los artículos
- `GET /articles/:id` - Obtener un artículo específico
- `POST /articles` - Crear un nuevo artículo
- `PATCH /articles/:id` - Actualizar un artículo
- `DELETE /articles/:id` - Eliminar un artículo (soft delete)

**Categorías disponibles:** Comprar, Arrendar, Inversión, Decoración, Mercado

### Testimonials

- `GET /testimonials` - Obtener todos los testimonios
- `GET /testimonials/:id` - Obtener un testimonio específico
- `POST /testimonials` - Crear un nuevo testimonio
- `PATCH /testimonials/:id` - Actualizar un testimonio
- `DELETE /testimonials/:id` - Eliminar un testimonio (soft delete)

### Identities

- `GET /identities` - Obtener todas las identidades corporativas
- `GET /identities/:id` - Obtener una identidad específica
- `POST /identities` - Crear una nueva identidad corporativa
- `PATCH /identities/:id` - Actualizar una identidad
- `DELETE /identities/:id` - Eliminar una identidad (soft delete)

### About Us

- `GET /about-us` - Obtener toda la información corporativa
- `GET /about-us/:id` - Obtener información corporativa específica
- `POST /about-us` - Crear nueva información corporativa
- `PATCH /about-us/:id` - Actualizar información corporativa
- `DELETE /about-us/:id` - Eliminar información corporativa (soft delete)

### Users

- `GET /users` - Obtener todos los usuarios
- `GET /users/:id` - Obtener un usuario específico
- `GET /users/:id/profile` - Obtener perfil extendido del usuario
- `POST /users` - Crear un nuevo usuario
- `POST /users/login` - Autenticar usuario
- `PATCH /users/:id` - Actualizar un usuario
- `PATCH /users/:id/status` - Cambiar estado del usuario
- `PATCH /users/:id/role` - Asignar rol al usuario
- `PATCH /users/:id/permissions` - Modificar permisos del usuario
- `PATCH /users/:id/change-password` - Cambiar contraseña
- `DELETE /users/:id` - Eliminar un usuario (soft delete)

**Roles disponibles:** SUPERADMIN, ADMIN, AGENT, COMMUNITY
**Estados disponibles:** ACTIVE, INACTIVE, VACATION, LEAVE

### Properties

- `GET /properties` - Obtener todas las propiedades
- `GET /properties/:id` - Obtener una propiedad específica
- `GET /properties/creator/:creatorUserId` - Obtener propiedades por creador
- `GET /properties/agent/:agentId` - Obtener propiedades por agente asignado
- `POST /properties` - Crear una nueva propiedad
- `PATCH /properties/:id` - Actualizar una propiedad
- `PATCH /properties/:id/assign-agent` - Asignar agente a propiedad
- `DELETE /properties/:id` - Eliminar una propiedad (soft delete)

**Estados disponibles:** REQUEST, PRE-APPROVED, PUBLISHED, INACTIVE, SOLD, RENTED
**Operaciones disponibles:** VENTA, ARRIENDO

### Contracts

- `GET /contracts` - Obtener todos los contratos
- `GET /contracts/:id` - Obtener un contrato específico
- `POST /contracts` - Crear un nuevo contrato
- `PATCH /contracts/:id` - Actualizar un contrato
- `DELETE /contracts/:id` - Eliminar un contrato (soft delete)
- `POST /contracts/:id/close` - Cerrar un contrato
- `POST /contracts/:id/fail` - Marcar contrato como fallido
- `POST /contracts/:id/payments` - Agregar pago al contrato
- `POST /contracts/:id/people` - Agregar persona al contrato
- `GET /contracts/:id/people?role=ROLE` - Obtener personas por rol
- `POST /contracts/:id/validate-roles` - Validar roles requeridos

**Estados disponibles:** IN_PROCESS, CLOSED, FAILED, ON_HOLD
**Operaciones disponibles:** COMPRAVENTA, ARRIENDO
**Roles disponibles:** SELLER, BUYER, LANDLORD, TENANT, GUARANTOR, AGENT

### People

- `GET /people` - Obtener todas las personas
- `GET /people/:id` - Obtener una persona específica
- `POST /people` - Crear una nueva persona
- `PATCH /people/:id` - Actualizar una persona
- `DELETE /people/:id` - Eliminar una persona (soft delete)
- `POST /people/:id/verify` - Verificar persona
- `POST /people/:id/unverify` - Desverificar persona
- `POST /people/:id/request-verification` - Solicitar verificación
- `POST /people/:id/link-user` - Vincular usuario
- `POST /people/:id/unlink-user` - Desvincular usuario

### Multimedia

- `GET /multimedia` - Obtener todos los archivos multimedia
- `GET /multimedia/:id` - Obtener un archivo multimedia específico
- `POST /multimedia` - Crear un nuevo archivo multimedia
- `PATCH /multimedia/:id` - Actualizar un archivo multimedia
- `DELETE /multimedia/:id` - Eliminar un archivo multimedia (soft delete)
- `GET /multimedia/:id/url` - Obtener URL del archivo
- `PATCH /multimedia/:id/seo-title` - Establecer título SEO

**Formatos disponibles:** IMG, VIDEO
**Tipos disponibles:** DNI_FRONT, DNI_REAR, SLIDE, LOGO, STAFF, PROPERTY_IMG, PROPERTY_VIDEO, PARTNERSHIP

### Notifications

- `GET /notifications` - Obtener todas las notificaciones
- `GET /notifications/:id` - Obtener una notificación específica
- `POST /notifications` - Crear una nueva notificación
- `PATCH /notifications/:id` - Actualizar una notificación
- `DELETE /notifications/:id` - Eliminar una notificación (soft delete)
- `POST /notifications/:id/open` - Marcar como abierta
- `GET /notifications/user/:userId` - Obtener notificaciones de usuario

**Tipos disponibles:** INTERES, CONTACTO, COMPROBANTE_DE_PAGO, AVISO_PAGO_VENCIDO, CAMBIO_ESTADO_PUBLICACION, CAMBIO_ESTADO_CONTRATO, NUEVA_ASIGNACION_PROPIEDAD_AGENTE
**Estados disponibles:** SEND, OPEN

### Document Types

- `GET /document-types` - Obtener todos los tipos de documento
- `GET /document-types/:id` - Obtener un tipo de documento específico
- `POST /document-types` - Crear un nuevo tipo de documento
- `PATCH /document-types/:id` - Actualizar un tipo de documento
- `DELETE /document-types/:id` - Eliminar un tipo de documento (soft delete)
- `PATCH /document-types/:id/available` - Cambiar disponibilidad

### Property Types

- `GET /property-types` - Obtener todos los tipos de propiedad
- `GET /property-types/:id` - Obtener un tipo de propiedad específico
- `POST /property-types` - Crear un nuevo tipo de propiedad
- `PATCH /property-types/:id` - Actualizar un tipo de propiedad
- `DELETE /property-types/:id` - Eliminar un tipo de propiedad (soft delete)

## Autenticación (JWE - JSON Web Encryption)

El sistema implementa autenticación segura basada en **tokens JWE cifrados** con RSA-OAEP-256 + A256GCM.

### Endpoints de Autenticación

- `POST /auth/sign-in` - Iniciar sesión y obtener token JWE
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

**Respuesta exitosa:**
```json
{
  "access_token": "eyJhbGciOiJSU0EtT0FFUC0yNTYiLCJlbmMiOiJBMjU2R0NNIn0...",
  "userId": "uuid",
  "email": "user@example.com",
  "role": "AGENT",
  "name": "John Doe",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "AGENT",
    "name": "John Doe"
  }
}
```

### Uso de Tokens

Para acceder a rutas protegidas, incluir el token en el header:
```
Authorization: Bearer <access_token>
```

### Endpoint de Prueba Protegido

- `GET /protected` - Endpoint de prueba que requiere autenticación
  - **Requiere:** Token JWE válido en header Authorization
  - **Respuesta:** Información del usuario autenticado

### Roles de Usuario

- `SUPERADMIN` - Administrador completo del sistema
- `ADMIN` - Administrador con permisos limitados
- `AGENT` - Agente inmobiliario
- `COMMUNITY` - Usuario de la comunidad

### Estados de Usuario

- `ACTIVE` - Usuario activo
- `INACTIVE` - Usuario inactivo
- `VACATION` - Usuario de vacaciones
- `LEAVE` - Usuario de licencia

### Seguridad

- **Hashing de contraseñas:** bcrypt con salt
- **Tokens cifrados:** JWE (no legibles sin clave privada)
- **Expiración corta:** 15 minutos por defecto
- **Auditoría:** Registro de intentos de login exitosos y fallidos
- **Rate limiting:** Recomendado para producción

## Scripts Disponibles

- `npm run build` - Compilar el proyecto
- `npm run format` - Formatear código con Prettier
- `npm run start` - Iniciar en modo producción
- `npm run start:dev` - Iniciar en modo desarrollo con hot reload
- `npm run start:debug` - Iniciar en modo debug
- `npm run test` - Ejecutar tests
- `npm run test:cov` - Ejecutar tests con cobertura
- `npm run test:debug` - Ejecutar tests en modo debug
- `npm run test:e2e` - Ejecutar tests end-to-end

## Desarrollo

### Agregar nuevas entidades

1. Crear la entidad en `src/entities/`
2. Crear DTOs en `src/modules/[entity]/dto/`
3. Crear servicio en `src/modules/[entity]/[entity].service.ts`
4. Crear controlador en `src/modules/[entity]/[entity].controller.ts`
5. Crear módulo en `src/modules/[entity]/[entity].module.ts`
6. Importar el módulo en `app.module.ts`

### Migraciones

Para crear migraciones cuando cambies las entidades:

```bash
npm run typeorm:generate-migration -- --name=NombreDeLaMigracion
npm run typeorm:run-migrations
```

## Licencia

Este proyecto está bajo la Licencia MIT.
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
