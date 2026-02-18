import { AppDataSource, initializeDataSource } from './seeder.config';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { DeepPartial } from 'typeorm';
import { User, UserRole, UserStatus, Permission } from '../../src/entities/user.entity';
import { Person } from '../../src/entities/person.entity';
import { Property } from '../../src/entities/property.entity';
import { PropertyStatus } from '../../src/common/enums/property-status.enum';
import { PropertyOperationType } from '../../src/common/enums/property-operation-type.enum';
import { CurrencyPriceEnum } from '../../src/entities/property.entity';
import { PropertyType } from '../../src/entities/property-type.entity';
import { DocumentType } from '../../src/entities/document-type.entity';
import {
  Contract,
  ContractOperationType,
  ContractStatus,
  ContractCurrency,
  ContractRole,
  PaymentType as ContractPaymentType,
} from '../../src/entities/contract.entity';
import {
  Payment,
  PaymentStatus,
  PaymentType as PaymentEntityType,
} from '../../src/entities/payment.entity';
import { Slide } from '../../src/entities/slide.entity';
import { Article, ArticleCategory } from '../../src/entities/article.entity';
import { Testimonial } from '../../src/entities/testimonial.entity';
import { Identity } from '../../src/entities/identity.entity';
import { AboutUs } from '../../src/entities/about-us.entity';
import { TeamMember } from '../../src/entities/team-member.entity';
import { RegionEnum } from '../../src/common/regions/regions.enum';
import { ComunaEnum } from '../../src/common/regions/comunas.enum';
import { cleanPublicDirectory } from '../../scripts/clean-public';

async function seedDatabase() {
  try {
    await initializeDataSource();

    try {
      console.log('Cleaning public uploads directory...');
      await cleanPublicDirectory();
    } catch (error) {
      console.error('Failed to clean public uploads directory:', error);
    }
    
    // Clear existing data
    console.log('Cleaning existing data...');
    await AppDataSource.synchronize(true);
    
    // ===== STEP 1: CREATE ADMIN USER =====
    console.log('Creating admin user...');
    const userRepository = AppDataSource.getRepository(User);
    const personRepository = AppDataSource.getRepository(Person);

    const createPersonForUser = async (user: User, overrides: Partial<Person> = {}) => {
      const firstName = user.personalInfo?.firstName?.trim() ?? '';
      const lastName = user.personalInfo?.lastName?.trim() ?? '';
      const composedName = `${firstName} ${lastName}`.trim() || user.username;

      const person = personRepository.create({
        name: overrides.name ?? composedName,
        email: overrides.email ?? user.email,
        phone: overrides.phone ?? user.personalInfo?.phone,
        verified: false,
        ...overrides,
        user,
      });

      const savedPerson = await personRepository.save(person);
      await userRepository.update(user.id, { personId: savedPerson.id });
      return savedPerson;
    };
    const adminUser = await userRepository.save(
      userRepository.create({
        username: 'admin',
        email: 'admin@re.cl',
        password: await bcrypt.hash('890890', 10),
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        permissions: Object.values(Permission),
        personalInfo: {
          firstName: 'Administrador',
          lastName: 'Sistema',
          phone: '+56 9 1234 5678',
          avatarUrl: undefined
        },
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );
    console.log(`✓ Admin user created: ${adminUser.email}`);
    const adminPerson = await createPersonForUser(adminUser);

    // Backward-compatible admin used by integration tests
    const adminTestUser = await userRepository.save(
      userRepository.create({
        username: 'admin_test',
        email: 'admin@realestate.com',
        password: await bcrypt.hash('7890', 10),
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        permissions: Object.values(Permission),
        personalInfo: {
          firstName: 'Admin',
          lastName: 'Tests',
          phone: '+56 9 0000 0000',
          avatarUrl: undefined
        },
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );
    console.log(`✓ Backward-compatible admin created for tests: ${adminTestUser.email}`);
    await createPersonForUser(adminTestUser);
    
    // ===== STEP 1B: CREATE AGENT USERS =====
    console.log('Creating agent users...');
    const agents = await userRepository.save([
      userRepository.create({
        username: 'agent1',
        email: 'agent1@re.cl',
        password: await bcrypt.hash('1234', 10),
        role: UserRole.AGENT,
        status: UserStatus.ACTIVE,
        permissions: [Permission.MANAGE_PROPERTIES, Permission.MANAGE_CONTRACTS, Permission.MANAGE_MULTIMEDIA],
        personalInfo: {
          firstName: 'Carlos',
          lastName: 'Navarro',
          phone: '+56 9 9876 5432',
          avatarUrl: undefined
        },
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      userRepository.create({
        username: 'agent2',
        email: 'agent2@re.cl',
        password: await bcrypt.hash('1234', 10),
        role: UserRole.AGENT,
        status: UserStatus.ACTIVE,
        permissions: [Permission.MANAGE_PROPERTIES, Permission.MANAGE_CONTRACTS, Permission.MANAGE_MULTIMEDIA],
        personalInfo: {
          firstName: 'Daniela',
          lastName: 'Ortiz',
          phone: '+56 9 8765 4321',
          avatarUrl: undefined
        },
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      userRepository.create({
        username: 'agent3',
        email: 'agent3@re.cl',
        password: await bcrypt.hash('1234', 10),
        role: UserRole.AGENT,
        status: UserStatus.ACTIVE,
        permissions: [Permission.MANAGE_PROPERTIES, Permission.MANAGE_CONTRACTS, Permission.MANAGE_MULTIMEDIA],
        personalInfo: {
          firstName: 'José',
          lastName: 'López',
          phone: '+56 9 7654 3210',
          avatarUrl: undefined
        },
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }),
    ]);
    console.log(`✓ Created ${agents.length} agent users`);
    const agentPersons = await Promise.all(agents.map(agent => createPersonForUser(agent)));
    
    // ===== STEP 1B: CREATE TEAM MEMBERS =====
    console.log('Creating team members...');
    const teamMemberRepository = AppDataSource.getRepository(TeamMember);
    const teamMembers = await teamMemberRepository.save([
      teamMemberRepository.create({
        name: 'Ana López',
        position: 'Directora de Ventas',
        bio: 'Especialista en ventas inmobiliarias con más de 10 años de experiencia en el mercado chileno.',
        phone: '+56 9 1111 2222',
        mail: 'ana.lopez@realestate.cl',
        multimediaUrl: undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      teamMemberRepository.create({
        name: 'Carlos Martínez',
        position: 'Agente Inmobiliario Senior',
        bio: 'Experto en propiedades comerciales y residenciales en Santiago.',
        phone: '+56 9 3333 4444',
        mail: 'carlos.martinez@realestate.cl',
        multimediaUrl: undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      teamMemberRepository.create({
        name: 'María González',
        position: 'Especialista en Arriendos',
        bio: 'Dedicada a facilitar arriendos seguros y rentables para propietarios e inquilinos.',
        phone: '+56 9 5555 6666',
        mail: 'maria.gonzalez@realestate.cl',
        multimediaUrl: undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      teamMemberRepository.create({
        name: 'Pedro Ramírez',
        position: 'Analista de Mercado',
        bio: 'Analiza tendencias del mercado inmobiliario para optimizar inversiones.',
        phone: '+56 9 7777 8888',
        mail: 'pedro.ramirez@realestate.cl',
        multimediaUrl: undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      teamMemberRepository.create({
        name: 'Sofia Herrera',
        position: 'Coordinadora de Marketing',
        bio: 'Encargada de promocionar propiedades y gestionar la presencia digital.',
        phone: '+56 9 9999 0000',
        mail: 'sofia.herrera@realestate.cl',
        multimediaUrl: undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      teamMemberRepository.create({
        name: 'Diego Silva',
        position: 'Asesor Legal',
        bio: 'Proporciona asesoría legal en transacciones inmobiliarias.',
        phone: '+56 9 2222 3333',
        mail: 'diego.silva@realestate.cl',
        multimediaUrl: undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    ]);
    console.log(`✓ Created ${teamMembers.length} team members`);
    
    // ===== STEP 2: CREATE SAMPLE NOTIFICATIONS =====
    console.log('Creating sample notifications...');
    const { Notification, NotificationType, NotificationStatus, NotificationSenderType } = require('../../src/entities/notification.entity');
    const notificationRepository = AppDataSource.getRepository(Notification);

    function getAgentName(agent: any) {
      return agent?.personalInfo ? `${agent.personalInfo.firstName} ${agent.personalInfo.lastName}` : agent?.username || 'Agente';
    }

    await notificationRepository.save([
      notificationRepository.create({
        senderType: NotificationSenderType.USER,
        senderId: agents[0].id,
        senderName: getAgentName(agents[0]),
        isSystem: false,
        message: 'El agente está interesado en la propiedad #1234.',
        targetUserIds: [adminUser.id],
        type: NotificationType.INTEREST,
        status: NotificationStatus.SEND,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      notificationRepository.create({
        senderType: NotificationSenderType.SYSTEM,
        senderId: null,
        senderName: 'Sistema',
        isSystem: true,
        message: 'Se ha asignado una nueva propiedad al agente.',
        targetUserIds: [agents[1].id],
        type: NotificationType.PROPERTY_AGENT_ASSIGNMENT,
        status: NotificationStatus.SEND,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      notificationRepository.create({
        senderType: NotificationSenderType.USER,
        senderId: agents[2].id,
        senderName: getAgentName(agents[2]),
        isSystem: false,
        message: 'El agente solicita contacto.',
        targetUserIds: [adminUser.id],
        type: NotificationType.CONTACT,
        status: NotificationStatus.SEND,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    ]);
    console.log('✓ Sample notifications created');
    console.log('Seeding property types...');
    const propertyTypeRepository = AppDataSource.getRepository(PropertyType);
    const propertyTypes = await propertyTypeRepository.save([
      propertyTypeRepository.create({
        name: 'Casa',
        description: 'Vivienda unifamiliar independiente',
        hasBedrooms: true,
        hasBathrooms: true,
        hasBuiltSquareMeters: true,
        hasLandSquareMeters: true,
        hasParkingSpaces: true,
        hasFloors: false,
        hasConstructionYear: true,
        deletedAt: undefined
      }),
      propertyTypeRepository.create({
        name: 'Apartamento',
        description: 'Departamento en condominio',
        hasBedrooms: true,
        hasBathrooms: true,
        hasBuiltSquareMeters: true,
        hasLandSquareMeters: false,
        hasParkingSpaces: true,
        hasFloors: true,
        hasConstructionYear: true,
        deletedAt: undefined
      }),
      propertyTypeRepository.create({
        name: 'Terreno',
        description: 'Lote de terreno para construcción',
        hasBedrooms: false,
        hasBathrooms: false,
        hasBuiltSquareMeters: false,
        hasLandSquareMeters: true,
        hasParkingSpaces: false,
        hasFloors: false,
        hasConstructionYear: false,
        deletedAt: undefined
      }),
      propertyTypeRepository.create({
        name: 'Comercial',
        description: 'Espacio comercial o retail',
        hasBedrooms: false,
        hasBathrooms: true,
        hasBuiltSquareMeters: true,
        hasLandSquareMeters: false,
        hasParkingSpaces: true,
        hasFloors: true,
        hasConstructionYear: true,
        deletedAt: undefined
      }),
      propertyTypeRepository.create({
        name: 'Oficina',
        description: 'Oficina en centro de negocios',
        hasBedrooms: false,
        hasBathrooms: true,
        hasBuiltSquareMeters: true,
        hasLandSquareMeters: false,
        hasParkingSpaces: true,
        hasFloors: true,
        hasConstructionYear: true,
        deletedAt: undefined
      })
    ]);
    console.log(`✓ Created ${propertyTypes.length} property types`);

    const propertyTypeMap = propertyTypes.reduce<Record<string, PropertyType>>((acc, type) => {
      acc[type.name.toLowerCase()] = type;
      return acc;
    }, {});
    
    // ===== STEP 2.5: CREATE DOCUMENT TYPES =====
    console.log('Creating document types...');
    const documentTypeRepository = AppDataSource.getRepository(DocumentType);
    const documentTypes = await documentTypeRepository.save([
      documentTypeRepository.create({
        name: 'DNI Frontal',
        description: 'Documento Nacional de Identidad - Cara frontal',
        available: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      documentTypeRepository.create({
        name: 'DNI Trasero',
        description: 'Documento Nacional de Identidad - Cara trasera',
        available: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      documentTypeRepository.create({
        name: 'Contrato de Arriendo',
        description: 'Contrato de arrendamiento de propiedad',
        available: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      documentTypeRepository.create({
        name: 'Certificado de Dominio',
        description: 'Certificado de dominio vigente',
        available: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      documentTypeRepository.create({
        name: 'Comprobante de Pago',
        description: 'Comprobante de pago de arriendo o servicio',
        available: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      documentTypeRepository.create({
        name: 'Escritura Pública',
        description: 'Escritura pública de propiedad',
        available: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      documentTypeRepository.create({
        name: 'Pagaré',
        description: 'Pagaré o documento de garantía',
        available: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      documentTypeRepository.create({
        name: 'Certificado de Avalúo',
        description: 'Certificado de avalúo fiscal',
        available: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      documentTypeRepository.create({
        name: 'Permiso de Edificación',
        description: 'Permiso municipal de edificación',
        available: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      documentTypeRepository.create({
        name: 'Recibo de Contribuciones',
        description: 'Recibo de pago de contribuciones',
        available: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    ]);
    console.log(`✓ Created ${documentTypes.length} document types`);
    
    // ===== STEP 3: SEED 12 PUBLISHED PROPERTIES (6 SALE + 6 RENT) =====
    console.log('Seeding 12 published properties...');
    const propertyRepository = AppDataSource.getRepository(Property);
    
    // Helper function to generate property codes
    const generatePropertyCode = async (operationType: PropertyOperationType): Promise<string> => {
      const year = new Date().getFullYear().toString().slice(-2);
      const prefix = operationType === PropertyOperationType.SALE ? 'PV' : 'PA';
      
      // Find last code for this prefix and year
      const lastProperty = await propertyRepository
        .createQueryBuilder('property')
        .where('property.code LIKE :pattern', { pattern: `${prefix}-${year}-%` })
        .orderBy('property.code', 'DESC')
        .getOne();
      
      let sequence = 1;
      if (lastProperty && lastProperty.code) {
        const parts = lastProperty.code.split('-');
        if (parts.length === 3) {
          sequence = parseInt(parts[2], 10) + 1;
        }
      }
      
      return `${prefix}-${year}-${sequence.toString().padStart(7, '0')}`;
    };
    
    interface SeedPropertyInput {
      title: string;
      description: string;
      bedrooms?: number | null;
      bathrooms?: number | null;
      builtSquareMeters?: number | null;
      landSquareMeters?: number | null;
      parkingSpaces?: number | null;
      price: number;
      currencyPrice?: CurrencyPriceEnum;
      state: RegionEnum;
      city: ComunaEnum;
      latitude: number;
      longitude: number;
      isFeatured: boolean;
      operationType: PropertyOperationType;
      propertyTypeName: string;
    }

    const propertiesData: SeedPropertyInput[] = [
      // 12 SALE properties (mix of featured and non-featured)
      {
        title: 'Casa moderna con piscina y jardín',
        description: `Esta residencia contemporánea fue diseñada para quienes valoran los espacios amplios y la conexión con la naturaleza sin renunciar a la sofisticación urbana. Al cruzar el portón automatizado, un corredor de pérgolas y jardines xerófitos guía a los visitantes hacia un hall de doble altura con celosías de raulí y un muro de piedra volcánica traída desde la Araucanía. El living principal se abre mediante ventanales envolventes hacia una terraza techada con quincho profesional, barra de granito negro y calefactores infrarrojos, creando un ambiente perfecto para recibir a familia y amigos durante todo el año. La cocina, equipada con electrodomésticos de última generación y una isla central de cuarzo, conecta con un family room íntimo que mira directamente a la piscina temperada de bordes infinitos. En el segundo nivel se ubica la suite principal con walk-in closet revestido en maderas nobles, sala de baño spa con ducha tipo lluvia y tina exenta junto a un ventanal que invita a contemplar la cordillera. Tres dormitorios secundarios, dos escritorios flexibles y una sala de cine insonorizada completan el programa. El jardín posterior fue diseñado por paisajistas premiados e integra macizos de lavandas, un fogón hundido y juegos de iluminación LED programable. El sistema domótico permite controlar cortinas, riego, climatización y seguridad desde el móvil, mientras que 24 paneles fotovoltaicos reducen drásticamente el consumo energético. Una bodega subterránea aislada se habilitó como cava para 600 botellas, con temperatura y humedad controladas. La propiedad incluye cerco perimetral inteligente con sensores, estacionamiento para cuatro vehículos con cargador para autos eléctricos y un taller creativo con iluminación natural ideal para proyectos personales.`,
        bedrooms: 4,
        bathrooms: 3,
        builtSquareMeters: 280,
        landSquareMeters: 450,
        parkingSpaces: 2,
        price: 1200000000,
        currencyPrice: CurrencyPriceEnum.CLP,
        state: RegionEnum.METROPOLITANA,
        city: ComunaEnum.LAS_CONDES,
        latitude: -33.3882,
        longitude: -70.5683,
        isFeatured: true,
        operationType: PropertyOperationType.SALE,
        propertyTypeName: 'Casa',
      },
      {
        title: 'Apartamento lujoso con vista al río',
        description: `En pleno corazón de Providencia y sobre el borde del Mapocho, este departamento de lujo ocupa un piso completo y se abre hacia vistas despejadas de la ciudad y la cordillera. Un ascensor privado desembarca en un recibo revestido en mármol de Carrara que conduce a un living comedor de 60 m² con muros revestidos en boiserie de nogal europeo y ventanales termo panel de piso a cielo. La cocina, separada pero con puertas correderas ocultas, integra electrodomésticos panelables, artefactos Gaggenau y una despensa climatizada para vinos. Tres dormitorios amplios se distribuyen hacia el sector oriente; la suite principal incorpora dressing room iluminado naturalmente, sala de baño con doble vanitorio, ducha efecto cascada y jacuzzi con cromoterapia. Un escritorio completamente insonorizado permite trabajar con serenidad, mientras que el balcón panorámico de 15 metros lineales ofrece espacio para jardines en maceteros y un comedor exterior. La domótica centralizada controla climatización, cortinas eléctricas y audio multisala. La comunidad del edificio incluye gimnasio equipado profesionalmente, piscina interior climatizada, sala de cowork, sala de cine para 12 personas y estacionamientos de visitas. El departamento cuenta con tres estacionamientos subterráneos y bodega de gran formato.`,
        bedrooms: 3,
        bathrooms: 2,
        builtSquareMeters: 150,
        landSquareMeters: 0,
        parkingSpaces: 1,
        price: 16500,
        currencyPrice: CurrencyPriceEnum.UF,
        state: RegionEnum.METROPOLITANA,
        city: ComunaEnum.PROVIDENCIA,
        latitude: -33.4201,
        longitude: -70.6044,
        isFeatured: true,
        operationType: PropertyOperationType.SALE,
        propertyTypeName: 'Apartamento',
      },
      {
        title: 'Casa familiar amplia',
        description: `Esta casa de estilo tradicional ha sido renovada con materiales cálidos y soluciones funcionales pensadas para familias numerosas. Se ubica en una calle interior muy tranquila, rodeada de plazas arboladas y colegios destacados. El acceso principal se realiza por un antejardín con césped y especies nativas que requieren bajo mantenimiento. En la planta baja se encuentran el living y comedor separados por puertas francesas, ambos con chimenea a gas y pisos de madera maciza recientemente pulidos. La cocina fue ampliada para incorporar una isla central con cubierta de cuarzo, comedor de diario para ocho personas y ventanales abatibles que conectan directamente con la terraza. Un dormitorio de visitas en suite, baño de cortesía y un escritorio luminoso completan el programa del primer nivel. En el segundo piso se distribuyen cuatro dormitorios: la suite principal se orienta al oriente con vista a los cerros y cuenta con walk-in closet de grandes dimensiones; los dormitorios secundarios comparten una sala de estar familiar ideal para tareas y juegos. El jardín trasero incluye quincho techado, horno de barro operativo, piscina cercada, juegos infantiles y un huerto orgánico con riego por goteo.`,
        bedrooms: 5,
        bathrooms: 2,
        builtSquareMeters: 320,
        landSquareMeters: 500,
        parkingSpaces: 3,
        price: 950000000,
        currencyPrice: CurrencyPriceEnum.CLP,
        state: RegionEnum.METROPOLITANA,
        city: ComunaEnum.NUNOA,
        latitude: -33.4274,
        longitude: -70.5740,
        isFeatured: true,
        operationType: PropertyOperationType.SALE,
        propertyTypeName: 'Casa',
      },
      {
        title: 'Casa en barrio pintoresco',
        description: `Ubicada a pasos del circuito cultural de Bellavista, esta casa restaurada combina el carácter patrimonial con comodidades modernas. La fachada conserva balcones de fierro forjado y molduras originales, mientras que el interior fue reforzado y aislado para otorgar confort térmico. El primer nivel integra un amplio hall con cielos altos, living comedor continuo con estufa a pellet y cocina concepto abierto equipada con cubierta de cuarzo, mesón desayunador y muebles fabricados a medida por artesanos locales. Un patio interior con piso de adoquines y pérgola retráctil ilumina los ambientes centrales durante todo el año. En el segundo piso se encuentran tres dormitorios luminosos, cada uno con closets empotrados y balcones con vista hacia las copas de los árboles; el baño principal incorpora tina de hierro fundido restaurada, ducha independiente y ventilación natural. Desde la azotea, habilitada como terraza mirador, se aprecian el cerro San Cristóbal y los murales del barrio. La casa cuenta con sistema de cámaras, cableado nuevo para domótica básica y una pequeña cava subterránea.`,
        bedrooms: 3,
        bathrooms: 2,
        builtSquareMeters: 180,
        landSquareMeters: 300,
        parkingSpaces: 1,
        price: 680000000,
        currencyPrice: CurrencyPriceEnum.CLP,
        state: RegionEnum.METROPOLITANA,
        city: ComunaEnum.RECOLETA,
        latitude: -33.4291,
        longitude: -70.6636,
        isFeatured: false,
        operationType: PropertyOperationType.SALE,
        propertyTypeName: 'Casa',
      },
      {
        title: 'Casa con patio grande',
        description: `Esta vivienda unifamiliar se levanta sobre un terreno amplio que permite disfrutar de un patio versátil y seguro. El acceso conduce a un living comedor con orientación norte que recibe luz natural durante todo el día; los pisos flotantes de alto tráfico fueron instalados recientemente y las paredes cuentan con pintura lavable de tonos neutros. La cocina independiente fue renovada con muebles modulares, cubierta posformada y conexión para lavavajillas, adyacente a una logia cerrada con almacenaje adicional. La zona privada dispone de tres dormitorios con closets empotrados, baño completo con vanitorio doble y un baño de visitas con ventilación natural. El patio posterior ofrece 200 m² de áreas verdes con riego automático, un sector de juegos infantiles con piso de caucho reciclado y una terraza techada ideal para celebraciones familiares. Además, incluye un taller cerrado que puede ser utilizado como sala de hobbies, gimnasio o bodega.`,
        bedrooms: 3,
        bathrooms: 2,
        builtSquareMeters: 160,
        landSquareMeters: 350,
        parkingSpaces: 1,
        price: 420000000,
        currencyPrice: CurrencyPriceEnum.CLP,
        state: RegionEnum.METROPOLITANA,
        city: ComunaEnum.MAIPU,
        latitude: -33.5261,
        longitude: -70.7620,
        isFeatured: false,
        operationType: PropertyOperationType.SALE,
        propertyTypeName: 'Casa',
      },
      {
        title: 'Casa económica en zona de crecimiento',
        description: `Pensada para quienes buscan una inversión segura en un sector con alta plusvalía, esta casa destaca por su distribución práctica y materiales de fácil mantención. El living comedor se conecta con la cocina mediante una barra desayunadora, generando un espacio social integrado que facilita reuniones familiares. La cocina posee muebles nuevos, campana de acero inoxidable y espacio para refrigerador doble puerta. Tres dormitorios luminosos se ubican en el ala oriente; el principal incluye walking closet y acceso directo al baño completo. Un segundo baño de visitas aporta funcionalidad. El patio posterior está nivelado y cuenta con radier listo para futuras ampliaciones o la instalación de un quincho. La propiedad se sitúa en un barrio en expansión con ciclovías nuevas, centros comerciales proyectados y acceso expedito a la autopista.`,
        bedrooms: 3,
        bathrooms: 1,
        builtSquareMeters: 140,
        landSquareMeters: 280,
        parkingSpaces: 1,
        price: 310000000,
        currencyPrice: CurrencyPriceEnum.CLP,
        state: RegionEnum.METROPOLITANA,
        city: ComunaEnum.PUDAHUEL,
        latitude: -33.4081,
        longitude: -70.8168,
        isFeatured: false,
        operationType: PropertyOperationType.SALE,
        propertyTypeName: 'Casa',
      },
      {
        title: 'Terreno agrícola en San Vicente',
        description: `Esta parcela agrícola de 1,5 hectáreas se ubica en un polo frutícola consolidado del valle de Cachapoal y ha sido manejada orgánicamente durante los últimos cinco años. Cuenta con derechos de agua inscritos, pozo profundo operativo y un sistema de riego tecnificado por goteo sectorizado en ocho sectores, lo que permite combinar cultivos de carozos, vides premium y berries. El suelo presenta textura franco arcillosa con alta retención de humedad y ha sido sometido a análisis de laboratorio que confirman su fertilidad. La propiedad incorpora una caseta de control con tablero eléctrico nuevo, bodega de insumos, zona de lavado certificado y techo metálico para resguardar maquinaria. Cerca del acceso principal se levantó un quincho rustico que sirve de punto de encuentro para cuadrillas durante las cosechas. Caminos interiores estabilizados facilitan el tránsito de tractores y camiones. Este activo es ideal para agricultores que buscan diversificar portafolios o para empresas que deseen desarrollar un proyecto agroindustrial con valor agregado.`,
        bedrooms: null,
        bathrooms: null,
        builtSquareMeters: 0,
        landSquareMeters: 15000,
        parkingSpaces: 0,
        price: 220000000,
        currencyPrice: CurrencyPriceEnum.CLP,
        state: RegionEnum.OHIGGINS,
        city: ComunaEnum.SAN_VICENTE,
        latitude: -34.4339,
        longitude: -71.0791,
        isFeatured: false,
        operationType: PropertyOperationType.SALE,
        propertyTypeName: 'Terreno',
      },
      {
        title: 'Centro logístico en Quilicura',
        description: `Complejo logístico emplazado a minutos del enlace Américo Vespucio con Panamericana Norte, diseñado para operaciones de distribución de alto volumen. El terreno de 3.000 m² alberga dos naves industriales con estructura metálica de 11 metros de altura libre, piso de alto tráfico nivelado y 22 andenes de carga con niveladoras hidráulicas. Un sistema de rociadores ESFR, detectores de humo direccionables y cortinas cortafuego otorgan la certificación NFPA vigente. La zona de oficinas, climatizada y con redes de datos categoría 6A, ofrece recepción, sala de reuniones, comedor de personal, camarines independientes y cinco privados. Un patio perimetral pavimentado permite la circulación simultánea de camiones articulados, mientras que el acceso controlado incluye garita, barreras motociclo y CCTV perimetral con monitoreo remoto. La propiedad cuenta con factibilidad para instalar paneles fotovoltaicos y ampliar la potencia contratada a 200 kW.`,
        bedrooms: null,
        bathrooms: 4,
        builtSquareMeters: 1500,
        landSquareMeters: 3000,
        parkingSpaces: 15,
        price: 1750000000,
        currencyPrice: CurrencyPriceEnum.CLP,
        state: RegionEnum.METROPOLITANA,
        city: ComunaEnum.QUILICURA,
        latitude: -33.3670,
        longitude: -70.7390,
        isFeatured: true,
        operationType: PropertyOperationType.SALE,
        propertyTypeName: 'Comercial',
      },
      {
        title: 'Oficinas corporativas en Antofagasta',
        description: `Edificio de oficinas categoría A ubicado en el borde costero de Antofagasta, ideal para empresas mineras o energéticas que requieran presencia estratégica en la zona norte. La planta de 420 m² se entrega habilitada con cielos modulares, luminarias LED regulables, climatización VRV sectorizada y piso técnico elevado para facilitar cambios de layout. Grandes ventanales termopanel brindan vista directa al océano Pacífico y reducen la carga térmica. El inmueble forma parte de un proyecto con certificación LEED Silver, lo que asegura consumos eficientes de agua y energía, además de un sistema de reciclaje de residuos institucionalizado. Incluye recepción con mobiliario a medida, 10 oficinas privadas, dos salas de directorio, open space para 40 puestos de trabajo, kitchenette amplia y archivo compacto. El edificio dispone de control de acceso biométrico, conserjería 24/7, estacionamientos subterráneos, bicicletero, duchas y bodegas anexas.`,
        bedrooms: null,
        bathrooms: 4,
        builtSquareMeters: 420,
        landSquareMeters: 0,
        parkingSpaces: 6,
        price: 980000000,
        currencyPrice: CurrencyPriceEnum.CLP,
        state: RegionEnum.ANTOFAGASTA,
        city: ComunaEnum.ANTOFAGASTA,
        latitude: -23.6500,
        longitude: -70.4000,
        isFeatured: true,
        operationType: PropertyOperationType.SALE,
        propertyTypeName: 'Oficina',
      },
      {
        title: 'Departamento dúplex en Viña del Mar',
        description: `Este departamento dúplex se ubica en el sector más exclusivo de Reñaca y ofrece una experiencia residencial que combina vida de playa con elegancia contemporánea. En el primer nivel se desarrolla el área social: un living comedor con doble altura y ventanales plegables que se abren completamente para integrar la terraza panorámica de 25 m², donde el sonido del mar se convierte en protagonista. La cocina gourmet incorpora isla con cubierta de cuarzo blanco, muebles con cierre suave, refrigerador panelable y cava para 80 botellas. Un baño de visitas con revestimientos en porcelanato italiano atiende a esta planta. En el segundo nivel se distribuyen tres dormitorios, cada uno con salida a balcones privados; la suite principal incluye walking closet con iluminación LED, baño con ducha rain shower, tina hidro y vista al océano. El departamento cuenta con calefacción por losa radiante, sistema de audio integrado, persianas eléctricas y cortinas blackout de diseño. Dos estacionamientos en tandem y bodega con racks metálicos completan la oferta.`,
        bedrooms: 3,
        bathrooms: 3,
        builtSquareMeters: 190,
        landSquareMeters: 0,
        parkingSpaces: 2,
        price: 11500,
        currencyPrice: CurrencyPriceEnum.UF,
        state: RegionEnum.VALPARAISO,
        city: ComunaEnum.VINA_DEL_MAR,
        latitude: -33.0140,
        longitude: -71.5510,
        isFeatured: true,
        operationType: PropertyOperationType.SALE,
        propertyTypeName: 'Apartamento',
      },
      {
        title: 'Casa colonial en La Serena',
        description: `Esta casa colonial data de 1920 y fue restaurada respetando su valor patrimonial, convirtiéndose en una joya arquitectónica del barrio El Centro en La Serena. La fachada fue recuperada con estuco a la cal y carpintería original, mientras que el interior se reforzó con estructura metálica para garantizar seguridad. Un zaguán con mosaicos hidráulicos originales conduce a dos patios interiores con naranjos y fuente central, alrededor de los cuales se ordenan los distintos ambientes. El living principal conserva puertas de madera tallada y cielos con molduras florales, en tanto que el comedor formal incluye una chimenea de piedra laja funcional. La cocina, totalmente actualizada, mezcla mesones de granito, campana industrial y muebles artesanales con vitrinas empavonadas. Los cuatro dormitorios poseen alturas superiores a 3,5 metros y ventilación cruzada; la suite principal incorpora sala de baño con tina exenta, doble vanitorio y piso radiante. El ala norte alberga un estudio con biblioteca empotrada, ideal para oficina o atelier. En el patio posterior se habilitó una galería techada para eventos, parrilla en obra y zona de fogón.`,
        bedrooms: 4,
        bathrooms: 3,
        builtSquareMeters: 260,
        landSquareMeters: 420,
        parkingSpaces: 2,
        price: 620000000,
        currencyPrice: CurrencyPriceEnum.CLP,
        state: RegionEnum.COQUIMBO,
        city: ComunaEnum.LA_SERENA,
        latitude: -29.9027,
        longitude: -71.2519,
        isFeatured: false,
        operationType: PropertyOperationType.SALE,
        propertyTypeName: 'Casa',
      },
      {
        title: 'Lodge turístico en Pucón',
        description: `A orillas del lago Villarrica y rodeado de bosque nativo, este lodge boutique combina cabañas independientes con áreas comunes de alto estándar orientadas a turistas nacionales e internacionales. El terreno de 2.000 m² alberga cuatro cabañas de 65 m² completamente equipadas, cada una con estufa a leña certificada, calefacción eléctrica de respaldo, cocina full, terraza privada y hot tub exterior con agua temperada alimentada por calderas a pellet. El edificio principal dispone de recepción, lounge con chimenea de doble combustión, cafetería con terraza panorámica, spa con sauna seco, sala de masajes, ducha escocesa y un circuito de relajación con aromaterapia. Caminos de maicillo iluminados conducen a un muelle exclusivo para huéspedes y a un deck flotante ideal para practicar yoga al amanecer o realizar ceremonias privadas. El proyecto cuenta con resolución sanitaria vigente, permisos turísticos y calificación en plataformas internacionales con altísima valoración, superando el 9,5 en Booking y Airbnb. Se entrega con equipamiento completo: lencería hotelera de 400 hilos, menaje importado, kayaks dobles, paddle boards, bicicletas y mobiliario exterior de teca tratada. Incluye bodega para equipos náuticos, lavandería industrial, planta de tratamiento de aguas grises, generador de respaldo, domótica para iluminación exterior y plataforma web propia con motor de reservas integrado.`,
        bedrooms: null,
        bathrooms: 10,
        builtSquareMeters: 520,
        landSquareMeters: 2000,
        parkingSpaces: 12,
        price: 890000000,
        currencyPrice: CurrencyPriceEnum.CLP,
        state: RegionEnum.ARAUCANIA,
        city: ComunaEnum.PUCON,
        latitude: -39.2829,
        longitude: -71.9520,
        isFeatured: true,
        operationType: PropertyOperationType.SALE,
        propertyTypeName: 'Comercial',
      },

      // 12 RENT properties
      {
        title: 'Oficina moderna en Providencia',
        description: `Planta completa de oficinas ubicada en un edificio de categoría A+ con certificación Edge, a pasos del metro Tobalaba. El espacio se entrega totalmente habilitado con recepción de doble altura, salas de reuniones modulares con paneles acústicos móviles, open space con capacidad para 40 puestos y tres directorios con cristales templados. La climatización VRV permite regular temperaturas por zona y la red de datos categoría 7 se encuentra entubada para optimizar la organización. El arriendo incluye servicios de aseo diario, conserjería 24/7, control de acceso con torniquetes biométricos y estacionamientos de visitas. Una cafetería interior, lockers inteligentes y duchas fomentan el bienestar del equipo.`,
        bedrooms: 0,
        bathrooms: 2,
        builtSquareMeters: 85,
        landSquareMeters: 0,
        parkingSpaces: 2,
        price: 850000,
        state: RegionEnum.METROPOLITANA,
        city: ComunaEnum.PROVIDENCIA,
        latitude: -33.4314,
        longitude: -70.6092,
        isFeatured: true,
        operationType: PropertyOperationType.RENT,
        propertyTypeName: 'Oficina',
      },
      {
        title: 'Apartamento amoblado en Las Condes',
        description: `Departamento amoblado de dos dormitorios en edificio con amenities premium, orientado al nororiente, lo que garantiza luminosidad permanente sin sobrecalentamiento. El living comedor se integra a una cocina americana equipada con encimera vitrocerámica, horno eléctrico, lavavajillas y refrigerador panelable. Los muebles fueron seleccionados por interioristas: sofá modular, mesa de centro de roble y comedor para cuatro personas. El dormitorio principal incluye cama king, blackout, baño en suite con ducha rain shower y walk-in closet. El segundo dormitorio puede operar como home office gracias a su escritorio ergonómico y amplia repisa. Terraza continua con cortinas de vidrio plegable permite disfrutar del exterior todo el año. El edificio ofrece piscina panorámica, gimnasio equipado, rooftop con quinchos, salas de cowork e internet en espacios comunes incluido en el arriendo.`,
        bedrooms: 2,
        bathrooms: 1,
        builtSquareMeters: 75,
        landSquareMeters: 0,
        parkingSpaces: 1,
        price: 650000,
        state: RegionEnum.METROPOLITANA,
        city: ComunaEnum.LAS_CONDES,
        latitude: -33.4155,
        longitude: -70.5831,
        isFeatured: false,
        operationType: PropertyOperationType.RENT,
        propertyTypeName: 'Apartamento',
      },
      {
        title: 'Casa para arriendo en Ñuñoa',
        description: `Casa en arriendo ubicada en un pasaje residencial cercano a colegios emblemáticos de Ñuñoa. El primer piso alberga living comedor con chimenea, cocina independiente recientemente remodelada con cubierta de cuarzo y comedor de diario, baño de visitas y dormitorio de servicio completo. En el segundo piso se distribuyen tres dormitorios más una sala de estar; la suite principal incluye baño con ventilación natural y closet de muro a muro. El jardín trasero ofrece terraza techada con quincho en obra, piscina mediana con bomba nueva y un árbol de palta que da sombra en verano. Estacionamiento interior para dos vehículos con portón automático.`,
        bedrooms: 3,
        bathrooms: 2,
        builtSquareMeters: 180,
        landSquareMeters: 300,
        parkingSpaces: 2,
        price: 950000,
        state: RegionEnum.METROPOLITANA,
        city: ComunaEnum.NUNOA,
        latitude: -33.4542,
        longitude: -70.6044,
        isFeatured: true,
        operationType: PropertyOperationType.RENT,
        propertyTypeName: 'Casa',
      },
      {
        title: 'Local comercial en Santiago Centro',
        description: `Local comercial ubicado en el eje más transitado de Santiago Centro, con más de 20.000 personas circulando diariamente frente a la vitrina. El espacio en primer piso ofrece 80 m² libres, altura interior de 4,5 metros, cortina metálica motorizada y fachada completamente vidriada con visibilidad desde la vereda opuesta. En el segundo nivel se dispone de bodega, kitchenette y baño para personal. Cuenta con sistema de iluminación LED, cableado eléctrico nuevo, ductos para aire acondicionado y salida de gases habilitada para giro gastronómico liviano.`,
        bedrooms: 0,
        bathrooms: 1,
        builtSquareMeters: 120,
        landSquareMeters: 0,
        parkingSpaces: 0,
        price: 450000,
        state: RegionEnum.METROPOLITANA,
        city: ComunaEnum.ESTACION_CENTRAL,
        latitude: -33.4378,
        longitude: -70.6504,
        isFeatured: false,
        operationType: PropertyOperationType.RENT,
        propertyTypeName: 'Comercial',
      },
      {
        title: 'Oficina ejecutiva en Vitacura',
        description: `Oficina ejecutiva en edificio corporativo de Nueva Costanera con vista despejada al Parque Bicentenario. Incluye recepción, cinco privados vidriados, sala de reuniones, open space para ocho estaciones y kitchenette. Se entrega amoblada con escritorios ergonómicos, sillas Herman Miller y mobiliario de guardado modular. El sistema de climatización se maneja mediante ductos independientes y termostatos digitales. Posee dos estacionamientos subterráneos, bodega y acceso a salas de directorio comunes previo agendamiento.`,
        bedrooms: 0,
        bathrooms: 3,
        builtSquareMeters: 150,
        landSquareMeters: 0,
        parkingSpaces: 3,
        price: 1200000,
        state: RegionEnum.METROPOLITANA,
        city: ComunaEnum.VITACURA,
        latitude: -33.3894,
        longitude: -70.5714,
        isFeatured: true,
        operationType: PropertyOperationType.RENT,
        propertyTypeName: 'Oficina',
      },
      {
        title: 'Apartamento moderno en Recoleta',
        description: `Departamento moderno en edificio reciente, ubicado a pasos del metro Cerro Blanco. El living comedor con piso flotante certificado se abre a un balcón ideal para instanciar un pequeño huerto urbano. Cocina integrada con cubierta de granito, encimera a gas de cuatro quemadores, horno empotrado y espacio para lavadora. Dos dormitorios cómodos, principal en suite, ambos con closets empotrados y ventanas termopanel. El edificio ofrece seguridad 24/7, bicicleteros, sala multiuso, quinchos y piscina.`,
        bedrooms: 2,
        bathrooms: 1,
        builtSquareMeters: 90,
        landSquareMeters: 0,
        parkingSpaces: 1,
        price: 550000,
        state: RegionEnum.METROPOLITANA,
        city: ComunaEnum.RECOLETA,
        latitude: -33.4250,
        longitude: -70.6500,
        isFeatured: false,
        operationType: PropertyOperationType.RENT,
        propertyTypeName: 'Apartamento',
      },
      {
        title: 'Departamento moderno en Arica',
        description: `Ubicado en la avenida principal de Arica, este departamento ofrece una vista directa al Morro y a la bahía. El interior fue decorado recientemente con un estilo fresco que mezcla tonos arena y turquesa para reflejar el entorno costero. El living comedor integra cocina americana con cubierta de cuarzo, refrigerador con dispensador de agua, microondas empotrado y barra para desayunos rápidos. Dormitorio principal con walk-in closet y blackouts; segundo dormitorio con clóset completo y escritorio plegable pensado para estudiar o teletrabajar. El edificio cuenta con piscina en azotea, sala de cowork con aire acondicionado, gimnasio y terrazas comunitarias para ver el atardecer.`,
        bedrooms: 2,
        bathrooms: 1,
        builtSquareMeters: 68,
        landSquareMeters: 0,
        parkingSpaces: 1,
        price: 460000,
        state: RegionEnum.ARICA_Y_PARINACOTA,
        city: ComunaEnum.ARICA,
        latitude: -18.4783,
        longitude: -70.3126,
        isFeatured: false,
        operationType: PropertyOperationType.RENT,
        propertyTypeName: 'Apartamento',
      },
      {
        title: 'Casa amoblada en Valdivia',
        description: `Esta casa amoblada se ubica en un condominio con acceso directo al río Calle-Calle y combina arquitectura sureña con un equipamiento muy completo para estadías largas. El living está revestido en madera nativa y cuenta con chimenea de combustión lenta que se complementa con calefacción central a gas y termostatos por ambiente. Una galería de ventanales abatibles rodea el comedor, permitiendo disfrutar de la vista al jardín incluso en días de lluvia gracias a los vidrios termopanel y cortinas térmicas. La cocina posee cubierta de granito, cocina encimera, horno empotrado, lavavajillas, refrigerador side-by-side y un skylight que aporta iluminación natural durante toda la jornada. El dormitorio principal, ubicado en primer piso, incorpora walking closet, baño en suite con shower door, tina profunda y salida directa a la terraza que mira al río. En el segundo nivel hay tres dormitorios adicionales, cada uno con closet empotrado y escritorio, además de una sala de estar con biblioteca empotrada y proyector para noches de cine. El equipamiento incluye vajilla completa para 12 personas, juego de dormitorio premium, sistema de sonido multiroom, televisores smart en cada habitación y red mesh Wi-Fi de alta velocidad. El jardín fue diseñado para soportar el clima valdiviano: deck techado con quincho y parrilla a gas, hot tub de madera, fogón, juegos infantiles, sistema de riego automatizado y un pequeño invernadero donde prosperan hierbas culinarias, tomates cherry y frutillas. Se arrienda con kayaks, bicicletas y una sala de secado para ropa técnica, ideal para quienes practican deportes al aire libre. Un muelle compartido permite embarcar kayaks o lanchas menores y se complementa con una bodega exterior para guardar equipos náuticos.`,
        bedrooms: 4,
        bathrooms: 3,
        builtSquareMeters: 190,
        landSquareMeters: 650,
        parkingSpaces: 2,
        price: 780000,
        state: RegionEnum.LOS_RIOS,
        city: ComunaEnum.VALDIVIA,
        latitude: -39.8173,
        longitude: -73.2453,
        isFeatured: true,
        operationType: PropertyOperationType.RENT,
        propertyTypeName: 'Casa',
      },
      {
        title: 'Cabaña frente al lago en Puerto Varas',
        description: `Cabaña completamente equipada situada en una pequeña bahía de Puerto Varas con acceso directo al lago Llanquihue. Construida en madera de lenga y tejuelas tratadas, ofrece interiores cálidos con vigas a la vista y amplios ventanales que enmarcan el volcán Osorno. El primer nivel reúne el living con estufa Bosca, comedor para seis personas, cocina americana con horno eléctrico y lavavajillas, además de un dormitorio matrimonial en suite. En la planta superior se ubican dos dormitorios adicionales y un baño completo. Una terraza envolvente conecta con un hot tub exterior, muelle privado y un deck flotante perfecto para descansar después de practicar deportes náuticos. Se arrienda con lencería, menaje completo, señal Wi-Fi satelital y sistema de seguridad con monitoreo remoto.`,
        bedrooms: 3,
        bathrooms: 2,
        builtSquareMeters: 140,
        landSquareMeters: 800,
        parkingSpaces: 2,
        price: 650000,
        state: RegionEnum.LOS_LAGOS,
        city: ComunaEnum.PUERTO_VARAS,
        latitude: -41.3175,
        longitude: -72.9817,
        isFeatured: true,
        operationType: PropertyOperationType.RENT,
        propertyTypeName: 'Casa',
      },
      {
        title: 'Local comercial en Temuco',
        description: `Local comercial situado en avenida Alemania, uno de los corredores comerciales más dinámicos de Temuco. El espacio en primer piso suma 110 m² útiles con planta rectangular, doble altura y climatización instalada. Posee dos baños habilitados, espacio para kitchenette y bodega cerrada. La fachada amplia permite instalar anuncios luminosos. Estacionamientos compartidos para clientes en el mismo strip center y seguridad nocturna. Se encuentra rodeado de clínicas, farmacias, cafés y oficinas, ideal para rubros de servicios, salud o tiendas especializadas.`,
        bedrooms: null,
        bathrooms: 2,
        builtSquareMeters: 110,
        landSquareMeters: 0,
        parkingSpaces: 1,
        price: 420000,
        state: RegionEnum.ARAUCANIA,
        city: ComunaEnum.TEMUCO,
        latitude: -38.7359,
        longitude: -72.5904,
        isFeatured: false,
        operationType: PropertyOperationType.RENT,
        propertyTypeName: 'Comercial',
      },
      {
        title: 'Oficina compartida en Iquique',
        description: `Espacio de cowork premium ubicado frente al paseo Baquedano, diseñado para empresas flexibles y equipos remotos que requieren infraestructura profesional. La planta de 95 m² está distribuida en estaciones de trabajo plug-and-play, cuatro oficinas privadas acristaladas, cabinas telefónicas para videollamadas y una sala de reuniones totalmente equipada con pantalla interactiva. Recepción con personal bilingüe, wifi de alta velocidad con redundancia, lockers, cafetería con snacks saludables y terraza para eventos. El arriendo incluye limpieza diaria, impresiones básicas, acceso 24/7 y agenda de networking mensual.`,
        bedrooms: null,
        bathrooms: 2,
        builtSquareMeters: 95,
        landSquareMeters: 0,
        parkingSpaces: 1,
        price: 510000,
        state: RegionEnum.TARAPACA,
        city: ComunaEnum.IQUIQUE,
        latitude: -20.2133,
        longitude: -70.1503,
        isFeatured: false,
        operationType: PropertyOperationType.RENT,
        propertyTypeName: 'Oficina',
      },
      {
        title: 'Departamento ejecutivo en Punta Arenas',
        description: `Departamento ejecutivo pensado para quienes se trasladan a Magallanes por proyectos temporales pero buscan confort de largo plazo. Ubicado en un condominio reciente con conserjería permanente, el inmueble cuenta con 115 m² distribuidos en living comedor con piso de ingeniería, cocina cerrada full equipada, logia independiente y dos dormitorios en suite. La calefacción se realiza mediante caldera central con radiadores regulables en cada ambiente y ventanas termopanel con doble sellado, esenciales para el clima austral. El equipamiento incluye muebles de líneas contemporáneas, smart TV de 65 pulgadas, escritorios ergonómicos, ropa de cama térmica y blackout total. Dos estacionamientos, bodega y servicio de housekeeping opcional.`,
        bedrooms: 2,
        bathrooms: 2,
        builtSquareMeters: 115,
        landSquareMeters: 0,
        parkingSpaces: 1,
        price: 720000,
        state: RegionEnum.MAGALLANES,
        city: ComunaEnum.PUNTA_ARENAS,
        latitude: -53.1638,
        longitude: -70.9171,
        isFeatured: true,
        operationType: PropertyOperationType.RENT,
        propertyTypeName: 'Apartamento',
      }
    ];

    const properties: Property[] = [];
    for (const data of propertiesData) {
      const propertyType = propertyTypeMap[data.propertyTypeName.toLowerCase()] ?? propertyTypes[0];
      const code = await generatePropertyCode(data.operationType);

      const propertyPayload: DeepPartial<Property> = {
        code,
        title: data.title,
        description: data.description,
        status: PropertyStatus.PUBLISHED,
        operationType: data.operationType,
        price: data.price,
        currencyPrice: data.currencyPrice ?? CurrencyPriceEnum.CLP,
        bathrooms: data.bathrooms ?? undefined,
        bedrooms: data.bedrooms ?? undefined,
        builtSquareMeters: data.builtSquareMeters ?? undefined,
        landSquareMeters: data.landSquareMeters ?? undefined,
        parkingSpaces: data.parkingSpaces ?? undefined,
        state: data.state,
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude,
        isFeatured: data.isFeatured,
        creatorUser: adminUser,
        propertyType,
        publicationDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const property = propertyRepository.create(propertyPayload);
      const savedProperty = await propertyRepository.save(property);
      properties.push(savedProperty);
    }
    
    console.log(`✓ Created ${properties.length} properties (${properties.filter(p => p.isFeatured).length} featured)`);

    // ===== STEP 3.5: CREATE SAMPLE CONTRACT WITH HISTORY =====
    console.log('Creating sample contract with change history...');
    const contractRepository = AppDataSource.getRepository(Contract);
    const paymentRepository = AppDataSource.getRepository(Payment);

    const primaryAgent = agents[0];
    const primaryAgentPerson = agentPersons[0];
    const selectedProperty = properties[0];

    const buyerPerson = await personRepository.save(
      personRepository.create({
        name: 'Lucía Hernández',
        email: 'lucia.hernandez@example.com',
        phone: '+56 9 5555 1111',
        verified: true,
      })
    );

    const contractAmount = 185000000;
    const commissionPercent = 3.5;
    const commissionAmount = Math.round(contractAmount * (commissionPercent / 100));
    const downPaymentAmount = 35000000;
    const contractCreationDate = new Date('2024-01-15T13:45:00.000Z');
    const downPaymentDate = new Date('2024-02-10T00:00:00.000Z');
    const paymentRecordedDate = new Date('2024-02-12T10:00:00.000Z');
    const contractCode = `CV-${new Date().getFullYear().toString().slice(-2)}-0000001`;

    const contract = contractRepository.create({
      code: contractCode,
      userId: primaryAgent.id,
      propertyId: selectedProperty.id,
      operation: ContractOperationType.COMPRAVENTA,
      status: ContractStatus.IN_PROCESS,
      amount: contractAmount,
      currency: ContractCurrency.CLP,
      commissionPercent,
      commissionAmount,
      description: 'Compra de vivienda con pie inicial y saldo en notaría.',
      people: [
        { personId: adminPerson.id, role: ContractRole.SELLER },
        { personId: buyerPerson.id, role: ContractRole.BUYER },
        { personId: primaryAgentPerson.id, role: ContractRole.AGENT },
      ],
      payments: [
        {
          amount: downPaymentAmount,
          date: downPaymentDate.toISOString(),
          description: 'Pago inicial del 20% contra firma de promesa.',
          type: ContractPaymentType.SALE_DOWN_PAYMENT,
        },
      ],
      changeHistory: [
        {
          id: randomUUID(),
          timestamp: contractCreationDate.toISOString(),
          userId: primaryAgent.id,
          action: 'CONTRACT_CREATED',
          changes: [
            {
              field: 'contract',
              previousValue: null,
              newValue: {
                code: contractCode,
                status: ContractStatus.IN_PROCESS,
                amount: contractAmount,
                currency: ContractCurrency.CLP,
                operation: ContractOperationType.COMPRAVENTA,
              },
            },
          ],
          metadata: {
            propertyId: selectedProperty.id,
            userId: primaryAgent.id,
          },
        },
        {
          id: randomUUID(),
          timestamp: paymentRecordedDate.toISOString(),
          userId: primaryAgent.id,
          action: 'CONTRACT_PAYMENT_ADDED',
          changes: [
            {
              field: 'payments',
              previousValue: 0,
              newValue: 1,
            },
          ],
          metadata: {
            payment: {
              amount: downPaymentAmount,
              date: downPaymentDate.toISOString(),
              description: 'Pago inicial del 20% contra firma de promesa.',
              type: ContractPaymentType.SALE_DOWN_PAYMENT,
            },
          },
        },
      ],
    });

    const savedContract = await contractRepository.save(contract);

    const savedPayment = await paymentRepository.save(
      paymentRepository.create({
        amount: downPaymentAmount,
        date: downPaymentDate,
        description: 'Pago inicial del 20% contra firma de promesa.',
        type: PaymentEntityType.SALE_DOWN_PAYMENT,
        status: PaymentStatus.PAID,
        contractId: savedContract.id,
      })
    );

    savedContract.payments = [
      {
        id: savedPayment.id,
        amount: downPaymentAmount,
        date: downPaymentDate.toISOString(),
        description: 'Pago inicial del 20% contra firma de promesa.',
        type: ContractPaymentType.SALE_DOWN_PAYMENT,
        status: savedPayment.status,
        documents: [],
      },
    ];

    await contractRepository.save(savedContract);

    console.log(`✓ Contract seeded with code ${savedContract.code}`);
    
    // ===== STEP 4: SEED 3 SLIDES IN SPANISH =====
    console.log('Seeding 3 slides in Spanish...');
    const slideRepository = AppDataSource.getRepository(Slide);
    
    const slides = await slideRepository.save([
      slideRepository.create({
        title: '¡Vende tu Propiedad con Nosotros!',
        description: 'Obtén la mejor valorización y vende rápido con nuestro equipo de expertos inmobiliarios.',
        linkUrl: '/portal/properties?operationType=SALE',
        duration: 5,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        order: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      slideRepository.create({
        title: 'Encuentra tu Hogar Ideal',
        description: 'Explora miles de propiedades disponibles en las mejores ubicaciones de Santiago.',
        linkUrl: '/portal/properties',
        duration: 4,
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        order: 2,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      slideRepository.create({
        title: 'Arriendo Seguro y Confiable',
        description: 'Propiedades verificadas con contratos seguros y asesoría legal completa.',
        linkUrl: '/portal/properties?operationType=RENT',
        duration: 3,
        startDate: new Date(),
        endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        order: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    ]);
    console.log(`✓ Created ${slides.length} slides`);
    
    // ===== STEP 5: SEED BLOG ARTICLES BY CATEGORY =====
    console.log('Seeding blog articles by category...');
    const articleRepository = AppDataSource.getRepository(Article);
    
    const articles = await articleRepository.save([
      // CONSEJOS category
      articleRepository.create({
        title: '5 Consejos para Comprar tu Primera Casa',
        subtitle: 'Guía práctica para compradores primerizos',
        text: 'Comprar una casa es una de las decisiones más importantes de tu vida. En este artículo te compartimos 5 consejos fundamentales para hacer una compra inteligente y segura. Desde evaluar tu presupuesto, revisar la ubicación, inspeccionar el estado de la propiedad, revisar documentos legales, y negociar el precio. Sigue estos pasos para tomar la mejor decisión.',
        category: ArticleCategory.COMPRAR,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      articleRepository.create({
        title: 'Cómo Preparar tu Casa para la Venta',
        subtitle: 'Estrategias para obtener el mejor precio',
        text: 'Si estás pensando en vender tu propiedad, preparación es la clave. Desde mejorar la presentación exterior, pintar las paredes, reparar detalles, limpiar profundamente, hasta organizar los espacios. Todas estas acciones pueden incrementar significativamente el valor percibido de tu propiedad y atraer compradores de calidad. Descubre cómo maximizar el potencial de venta de tu casa.',
        category: ArticleCategory.COMPRAR,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      
      // MERCADO category
      articleRepository.create({
        title: 'Análisis del Mercado Inmobiliario 2024',
        subtitle: 'Tendencias y proyecciones para el sector',
        text: 'El mercado inmobiliario chileno ha mostrado importante dinamismo en los últimos meses. Los precios han experimentado variaciones según zona y tipo de propiedad. Santiago concentra la mayor demanda, con zonas premium manteniendo estabilidad. El sector de departamentos pequeños ha visto crecimiento',
        category: ArticleCategory.MERCADO,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      articleRepository.create({
        title: 'Zonas con Mayor Potencial de Crecimiento en Santiago',
        subtitle: 'Dónde invertir en 2024 y 2025',
        text: 'Identificar zonas de crecimiento es crucial para inversiones inmobiliarias. Comunas como Colina, Lampa y Puente Alto muestran fuerte expansión residencial. Las nuevas conexiones viales y proyectos de transporte están impulsando valores. Analiza la infraestructura disponible, proyectos futuros y tendencias demográficas. La mejor inversión es aquella bien informada.',
        category: ArticleCategory.MERCADO,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      
      // DECORACION category
      articleRepository.create({
        title: 'Decoración Minimalista: Espacio Limpio y Moderno',
        subtitle: 'Cómo crear ambientes acogedores con menos',
        text: 'El minimalismo no significa vivir sin comodidad. Se trata de elegir cuidadosamente cada elemento, dejando de lado lo innecesario. Los colores neutros amplían visualmente los espacios. La iluminación natural es tu mejor aliada. Muebles funcionales y atemporales son inversiones inteligentes. Descubre cómo crear un hogar moderno, limpio y acogedor.',
        category: ArticleCategory.DECORACION,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      articleRepository.create({
        title: 'Colores que Transforman tus Ambientes',
        subtitle: 'Psicología del color en diseño de interiores',
        text: 'Cada color tiene un impacto psicológico diferente. Los azules transmiten calma, ideales para dormitorios. Los verdes conectan con la naturaleza. Los tonos cálidos crean intimidad. El blanco amplía espacios. La combinación correcta de colores puede transformar completamente la atmósfera de tu hogar. Aprende a usar el color a tu favor.',
        category: ArticleCategory.DECORACION,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      
      // INVERSION category
      articleRepository.create({
        title: 'Inversión Inmobiliaria: Rentabilidad a Largo Plazo',
        subtitle: 'Por qué el inmueble sigue siendo la mejor inversión',
        text: 'La inversión inmobiliaria ofrece múltiples ventajas: genera flujo de caja a través de arriendos, se aprecia con el tiempo, permite apalancamiento con hipotecas, y es tangible. Diferente a acciones o criptomonedas, la propiedad es un activo sólido. Analiza la ubicación, proyecciones de crecimiento, y potencial de arriendo.',
        category: ArticleCategory.INVERSION,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      articleRepository.create({
        title: 'Estrategias de Arriendo: Maximiza tus Ingresos',
        subtitle: 'Cómo arrendar inteligentemente y con seguridad',
        text: 'Si inviertes en propiedad para arriendo, la estrategia es fundamental. Evalúa el potencial de arrendamiento de la zona. Fija precios competitivos pero rentables. Selecciona arrendatarios cuidadosamente. Mantén la propiedad en excelente condición. Los gastos deben controlarse para maximizar ganancias. Un buen arrendamiento es un negocio ganador.',
        category: ArticleCategory.INVERSION,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    ]);
    console.log(`✓ Created ${articles.length} blog articles`);
    
    // ===== STEP 6: SEED 8 TESTIMONIES IN SPANISH =====
    console.log('Seeding 8 testimonies...');
    const testimonialRepository = AppDataSource.getRepository(Testimonial);
    
    const testimonials = await testimonialRepository.save([
      testimonialRepository.create({
        name: 'María García',
        content: 'Excelente servicio, profesionales de verdad. Encontré la casa de mis sueños en un tiempo récord. Muy recomendados.',
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      testimonialRepository.create({
        name: 'Carlos López',
        content: 'Vender mi propiedad fue fácil y sin estrés gracias al equipo. Obtuve el mejor precio del mercado. Confiable 100%.',
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      testimonialRepository.create({
        name: 'Ana Martínez',
        content: 'Asesoría profesional desde el inicio hasta el final. Me ayudaron a encontrar la mejor inversión inmobiliaria.',
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      testimonialRepository.create({
        name: 'Roberto Sánchez',
        content: 'Tremenda experiencia. El equipo es atento, puntual y muy conocedor del mercado inmobiliario.',
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      testimonialRepository.create({
        name: 'Laura Rodríguez',
        content: 'Arrendé mi propiedad sin problemas. Buena gestión y transparencia en todo el proceso. Recomendado.',
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      testimonialRepository.create({
        name: 'Diego Flores',
        content: 'Servicio de calidad a un precio justo. Se nota la experiencia del equipo en cada interacción.',
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      testimonialRepository.create({
        name: 'Patricia Alvarez',
        content: 'Hace 5 años que trabajo con ellos en mis inversiones inmobiliarias. Resultados consistentes y profesionales.',
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      testimonialRepository.create({
        name: 'Fernando González',
        content: 'El mejor equipo inmobiliario que he conocido. Honestidad y transparencia en cada operación. Muy satisfecho.',
        createdAt: new Date(),
        updatedAt: new Date()
      })
    ]);
    console.log(`✓ Created ${testimonials.length} testimonies`);
    
    // ===== STEP 7: CREATE BASIC IDENTITY =====
    console.log('Seeding identity...');
    const identityRepository = AppDataSource.getRepository(Identity);
    const identity = await identityRepository.save(
      identityRepository.create({
        name: 'Real Estate Platform Chile',
        address: 'Avenida Apoquindo 6000, Las Condes, Santiago',
        phone: '+56 9 1234 5678',
        mail: 'contacto@realestate.cl',
        businessHours: 'Lunes a Viernes: 9:00 - 18:00\nSábado: 10:00 - 14:00\nDomingo: Cerrado',
        urlLogo: undefined,
        socialMedia: {
          instagram: {
            url: 'https://instagram.com/realestatchile',
            available: true
          },
          facebook: {
            url: 'https://facebook.com/realestatchile',
            available: true
          },
          linkedin: {
            url: 'https://linkedin.com/company/realestatchile',
            available: true
          },
          youtube: {
            url: 'https://youtube.com/@realestatchile',
            available: true
          }
        },
        partnerships: [
          {
            name: 'Banco Santander',
            description: 'Soluciones de financiamiento hipotecario',
            logoUrl: 'https://example.com/logos/banco-santander.png'
          },
          {
            name: 'BancoEstado',
            description: 'Créditos hipotecarios y seguros de propiedad',
            logoUrl: 'https://example.com/logos/bancoestado.png'
          },
          {
            name: 'Seguros Generales de Chile',
            description: 'Seguros de propiedad y responsabilidad civil',
            logoUrl: 'https://example.com/logos/seguros-generales.png'
          },
          {
            name: 'NotariaPública',
            description: 'Servicios notariales y trámites legales',
            logoUrl: 'https://example.com/logos/notaria.png'
          }
        ],
        faqs: [
          {
            question: '¿Cuál es el proceso para vender una propiedad?',
            answer: 'El proceso comienza con la evaluación de tu propiedad, luego publicamos en nuestro portal, organizamos visitas, y manejamos todas las negociaciones hasta la firma de escrituras con asesoría legal.'
          },
          {
            question: '¿Cuánto cuesta publicar una propiedad?',
            answer: 'Publicar una propiedad es totalmente gratuito. Ganamos comisión solo cuando se concreta la venta o arriendo.'
          },
          {
            question: '¿Qué documentos necesito para comprar una propiedad?',
            answer: 'Necesitarás: Cédula de identidad, comprobante de ingresos, aprobación de hipoteca (si aplica), y asesoría legal. Nuestro equipo te guía en cada paso.'
          },
          {
            question: '¿Ofrecen servicios de arriendo?',
            answer: 'Sí, ofrecemos servicios completos de arriendo: publicación, búsqueda de arrendatarios, revisión de antecedentes, contratos y administración de la propiedad.'
          },
          {
            question: '¿Cómo puedo contactarlos fuera de horario?',
            answer: 'Puedes escribirnos por WhatsApp en cualquier momento y nos contactaremos dentro de 24 horas hábiles.'
          },
          {
            question: '¿Hacen tasaciones de propiedades?',
            answer: 'Sí, realizamos tasaciones de mercado gratuitas para determinar el valor justo de tu propiedad basado en comparables del mercado actual.'
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: undefined
      })
    );
    console.log(`✓ Identity created: Real Estate Platform Chile`);
    
    // ===== STEP 8: CREATE BASIC ABOUT US =====
    console.log('Seeding about us...');
    const aboutUsRepository = AppDataSource.getRepository(AboutUs);
    const aboutUs = await aboutUsRepository.save(
      aboutUsRepository.create({
        bio: 'Somos una plataforma inmobiliaria líder en Chile con más de 15 años de experiencia conectando compradores, vendedores e inversores. Nuestro equipo de profesionales se dedica a hacer del proceso inmobiliario algo transparente, seguro y eficiente.',
        mision: 'Facilitar transacciones inmobiliarias seguras, transparentes y accesibles para todos los chilenos, proporcionando información de calidad y asesoría profesional.',
        vision: 'Ser la plataforma inmobiliaria de referencia en Chile, transformando la manera en que las personas compran, venden y arriendan propiedades.',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: undefined
      })
    );
    console.log(`✓ About us created`);
    
    console.log('\n✅ Seeding completed successfully!');
    console.log(`\nResumen:`);
    console.log(`  • 1 admin user (${adminUser.email})`);
    console.log(`  • 3 agent users (agent1@re.cl, agent2@re.cl, agent3@re.cl)`);
    console.log(`  • 6 team members`);
    console.log(`  • ${propertyTypes.length} property types`);
    console.log(`  • ${documentTypes.length} document types`);
    console.log(`  • 12 published properties (6 sale, 6 rent)`);
    console.log(`  • 3 slides in Spanish`);
    console.log(`  • ${articles.length} blog articles by category`);
    console.log(`  • ${testimonials.length} testimonies`);
    
  } catch (error) {
    console.error('Error during seeding:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
  }
}

// Run the seeder
seedDatabase().then(() => {
  console.log('\nDatabase seeding completed');
  process.exit(0);
}).catch((error) => {
  console.error('Database seeding failed:', error);
  process.exit(1);
});