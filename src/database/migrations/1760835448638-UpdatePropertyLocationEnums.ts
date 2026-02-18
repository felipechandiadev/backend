import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class UpdatePropertyLocationEnums1760835448638 implements MigrationInterface {
    name = 'UpdatePropertyLocationEnums1760835448638';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if state column exists
        const table = await queryRunner.getTable('properties');
        const hasStateColumn = table ? table.columns.some(col => col.name === 'state') : false;

        if (!hasStateColumn) {
            await queryRunner.addColumn('properties', new TableColumn({
                name: 'state',
                type: 'enum',
                enum: [
                    'Arica y Parinacota',
                    'Tarapacá',
                    'Antofagasta',
                    'Atacama',
                    'Coquimbo',
                    'Valparaíso',
                    'Metropolitana de Santiago',
                    "O'Higgins",
                    'Maule',
                    'Ñuble',
                    'Biobío',
                    'La Araucanía',
                    'Los Ríos',
                    'Los Lagos',
                    'Aysén',
                    'Magallanes'
                ],
                isNullable: true,
            }));
        } else {
            // If column exists, change it to enum
            await queryRunner.query(`
                ALTER TABLE properties
                MODIFY COLUMN state ENUM(
                    'Arica y Parinacota',
                    'Tarapacá',
                    'Antofagasta',
                    'Atacama',
                    'Coquimbo',
                    'Valparaíso',
                    'Metropolitana de Santiago',
                    'O''Higgins',
                    'Maule',
                    'Ñuble',
                    'Biobío',
                    'La Araucanía',
                    'Los Ríos',
                    'Los Lagos',
                    'Aysén',
                    'Magallanes'
                ) NULL
            `);
        }

        // Change city column to use ComunaEnum
        await queryRunner.query(`
            ALTER TABLE properties
            MODIFY COLUMN city ENUM(
                'ARICA', 'CAMARONES', 'PUTRE', 'GENERAL_LAGOS',
                'IQUIQUE', 'ALTO_HOSPICIO', 'POZO_ALMONTE', 'CAMINA', 'COLCHANE', 'HUARA', 'PICA',
                'ANTOFAGASTA', 'MEJILLONES', 'SIERRA_GORDA', 'TALTAL', 'CALAMA', 'OLLAGUE', 'SAN_PEDRO_DE_ATACAMA', 'MARIA_ELENA', 'TOCOPILLA',
                'CHAÑARAL', 'DIEGO_DE_ALMAGRO', 'CALDERA', 'COPIAPO', 'TIERRA_AMARILLA', 'VALLENAR', 'ALTO_DEL_CARMEN', 'FREIRINA', 'HUASCO',
                'LA_SERENA', 'COQUIMBO', 'ANDACOLLO', 'LA_HIGUERA', 'PAIGUANO', 'VICUÑA', 'ILLAPEL', 'CANELA', 'LOS_VILOS', 'SALAMANCA', 'OVALLE', 'MONTE_PATRIA', 'PUNITAQUI', 'RIO_HURTADO', 'COMBARBALA', 'MINCHA',
                'VALPARAISO', 'CASABLANCA', 'CONCON', 'JUAN_FERNANDEZ', 'PUCHUNCAVI', 'QUINTERO', 'VIÑA_DEL_MAR', 'ISLA_DE_PASCUA', 'LOS_ANDES', 'CALLE_LARGA', 'RINCONADA', 'SAN_ESTEBAN', 'LA_LIGUA', 'PETORCA', 'ZAPALLAR', 'QUILLOTA', 'CALERA', 'HIJUELAS', 'LA_CRUZ', 'NOGALES', 'SAN_ANTONIO', 'ALGARROBO', 'CARTAGENA', 'EL_QUISCO', 'EL_TABO', 'SANTO_DOMINGO', 'SAN_FELIPE', 'CATEMU', 'LLAILLAY', 'PANQUEHUE', 'PUTAENDO', 'SANTA_MARIA',
                'SANTIAGO', 'CERRILLOS', 'CERRO_NAVIA', 'CONCHALI', 'EL_BOSQUE', 'ESTACION_CENTRAL', 'HUECHURABA', 'INDEPENDENCIA', 'LA_CISTERNA', 'LA_FLORIDA', 'LA_GRANJA', 'LA_PINTANA', 'LA_REINA', 'LAS_CONDES', 'LO_BARNECHEA', 'LO_ESPEJO', 'LO_PRADO', 'MACUL', 'MAIPU', 'ÑUÑOA', 'PEDRO_AGUIRRE_CERDA', 'PEÑALOLEN', 'PROVIDENCIA', 'PUDAHUEL', 'QUILICURA', 'QUINTA_NORMAL', 'RECOLETA', 'RENCA', 'SAN_JOAQUIN', 'SAN_MIGUEL', 'SAN_RAMON', 'VITACURA',
                'RANCAGUA', 'CODEGUA', 'COINCO', 'COLTAUCO', 'DOÑIHUE', 'GRANEROS', 'LAS_CABRAS', 'MACHALI', 'MALLOA', 'MOSTAZAL', 'OLIVAR', 'PEUMO', 'PICHIDEGUA', 'QUINTA_DE_TILCOCO', 'RENGO', 'REQUINOA', 'SAN_VICENTE', 'PICHILEMU', 'LA_ESTRELLA', 'LITUECHE', 'MARCHIHUE', 'NAVIDAD', 'PAREDONES', 'SAN_FERNANDO', 'CHEPICA', 'CHIMBARONGO', 'LOLOL', 'NANCAGUA', 'PALMILLA', 'PERALILLO', 'PLACILLA', 'PUMANQUE', 'SANTA_CRUZ',
                'TALCA', 'CONSTITUCION', 'CUREPTO', 'EMPEDRADO', 'MAULE', 'PELARCO', 'PENCAHUE', 'RAUCO', 'RICARDO_VILLAS', 'SAN_RAFAEL', 'TORRES_DEL_PAINE', 'LINARES', 'COLBUN', 'LONGAVI', 'PARRAL', 'RETIRO', 'SAN_JAVIER', 'VILLA_ALEGRE', 'YERBAS_BUENAS', 'CAUQUENES', 'CHANCO', 'PELLUHUE', 'CURICO', 'HUALAÑE', 'LICANTEN', 'MOLINA', 'RAUCO', 'ROMERAL', 'SAGRADA_FAMILIA', 'TENO', 'VICHUQUEN', 'TALCAHUANO', 'ANTUCO', 'CABRERO', 'LAJA', 'LOS_ANGELES', 'MULCHEN', 'NACIMIENTO', 'NEGRETE', 'QUILACO', 'QUILLECO', 'SAN_ROSENDO', 'SANTA_BARBARA', 'TUCAPEL', 'YUMBEL', 'CHIGUAYANTE', 'CONCEPCION', 'CORONEL', 'CHILLAN', 'BULNES', 'COBQUECURA', 'COELEMU', 'COIHUECO', 'CHILLAN_VIEJO', 'EL_CARMEN', 'NINHUE', 'ÑIQUEN', 'PEMUCO', 'PINTO', 'PORTEZUELO', 'QUILLON', 'QUIRIHUE', 'Ranquil', 'SAN_CARLOS', 'SAN_FABIAN', 'SAN_IGNACIO', 'SAN_NICOLAS', 'TREGUACO', 'YUNGAY',
                'TEMUCO', 'CARAHUE', 'CHOLCHOL', 'CUNCO', 'CURARREHUE', 'FREIRE', 'GALVARINO', 'GORBEA', 'LAUTARO', 'LONCOCHE', 'MELIPEUCO', 'NUEVA_IMPERIAL', 'PADRE_LAS_CASAS', 'PERQUENCO', 'PITRUFQUEN', 'PUCON', 'SAAVEDRA', 'TEODORO_SCHMIDT', 'TOLTEN', 'VILCUN', 'VILLARRICA', 'ANGOL', 'COLLIPULLI', 'CURACAUTIN', 'ERCILLA', 'LONQUIMAY', 'LOS_SAUCES', 'LUMACO', 'PUREN', 'RENAICO', 'TRAIGUEN', 'VICTORIA',
                'VALDIVIA', 'CORRAL', 'LANCO', 'LOS_LAGOS', 'MAFIL', 'MARIQUINA', 'PAILLACO', 'PANGUIPULLI', 'LA_UNION', 'FUTRONO', 'LAGO_RANCO', 'RIO_BUENO',
                'PUERTO_MONTT', 'CALBUCO', 'COCHAMO', 'FRESHWATER', 'FRUTILLAR', 'LOS_MUERMOS', 'LLANQUIHUE', 'MAULLIN', 'PUERTO_VARAS', 'CASTRO', 'ANCUD', 'CHONCHI', 'CURACO_DE_VELEZ', 'DALCAHUE', 'PUQUELDON', 'QUEILEN', 'QUELLON', 'QUEMCHI', 'QUINCHAO', 'CHAITEN', 'FUTALEUFU', 'HOUTEN', 'PALENA', 'PUYUHUAPI',
                'COYHAIQUE', 'LAGO_VERDE', 'AYSEN', 'CISNES', 'GUAITECAS', 'COCHRANE', 'OHIGGINS', 'TORTEL',
                'PUNTA_ARENAS', 'LAGUNA_BLANCA', 'RIO_VERDE', 'SAN_GREGORIO', 'CABO_DE_HORNOS', 'ANTARTICA', 'PORVENIR', 'PRIMAVERA', 'TIMAUKEL', 'TORRES_DEL_PAINE'
            ) NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert city column to varchar
        await queryRunner.query(`
            ALTER TABLE properties
            MODIFY COLUMN city VARCHAR(255) NULL
        `);

        // Revert state column to varchar
        await queryRunner.query(`
            ALTER TABLE properties
            MODIFY COLUMN state VARCHAR(255) NULL
        `);
    }

}
