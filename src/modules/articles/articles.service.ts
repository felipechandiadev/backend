import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Article } from '../../entities/article.entity';
import { CreateArticleDto, UpdateArticleDto } from './dto/article.dto';
import { MultimediaService } from '../multimedia/services/multimedia.service';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    private readonly multimediaService: MultimediaService,
  ) {}

  async create(
    createArticleDto: CreateArticleDto,
    file?: Express.Multer.File,
  ): Promise<Article> {
    // Check if title already exists
    const existingArticle = await this.articleRepository.findOne({
      where: { title: createArticleDto.title },
    });
    if (existingArticle) {
      throw new ConflictException('Ya existe un artículo con este título.');
    }

    let multimediaUrl: string | undefined;

    if (file) {
      // uploadFileToPath ya devuelve la URL correcta (R2 o local según configuración)
      multimediaUrl = await this.multimediaService.uploadFileToPath(file, 'web/articles');
    }

    const article = this.articleRepository.create({
      ...createArticleDto,
      multimediaUrl,
    });
    return await this.articleRepository.save(article);
  }

  async findAll(search?: string, category?: string): Promise<Article[]> {
    try {
      const query = this.articleRepository.createQueryBuilder('article')
        .where('article.deletedAt IS NULL')
        .andWhere('article.isActive = :isActive', { isActive: true })
        .orderBy('article.createdAt', 'DESC');

      if (search) {
        query.andWhere('(article.title LIKE :search OR article.subtitle LIKE :search OR article.text LIKE :search)', {
          search: `%${search}%`,
        });
      }

      if (category) {
        query.andWhere('article.category LIKE :category', {
          category: `%${category}%`,
        });
      }

      const results = await query.getMany();
      console.log(`[DEBUG] ArticlesService.findAll - found ${results.length} articles`);
      return results;
    } catch (error) {
      console.error('Error in ArticlesService.findAll:', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<Article> {
    const article = await this.articleRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!article) {
      throw new NotFoundException('Artículo no encontrado.');
    }

    return article;
  }

  async update(
    id: string,
    updateArticleDto: UpdateArticleDto,
    file?: Express.Multer.File,
  ): Promise<Article> {
    const article = await this.findOne(id);

    // Check if title is being updated and already exists
    if (updateArticleDto.title && updateArticleDto.title !== article.title) {
      const existingArticle = await this.articleRepository.findOne({
        where: { title: updateArticleDto.title },
      });
      if (existingArticle) {
        throw new ConflictException('Ya existe un artículo con este título.');
      }
    }

    let multimediaUrl = article.multimediaUrl;

    if (file) {
      // uploadFileToPath ya devuelve la URL correcta (R2 o local según configuración)
      multimediaUrl = await this.multimediaService.uploadFileToPath(file, 'web/articles');
    }

    Object.assign(article, updateArticleDto, { multimediaUrl });
    return await this.articleRepository.save(article);
  }

  async softDelete(id: string): Promise<void> {
    const article = await this.findOne(id);
    await this.articleRepository.softDelete(id);
  }

  async toggleActive(id: string, isActive: boolean): Promise<Article> {
    const article = await this.findOne(id);
    article.isActive = isActive;
    return await this.articleRepository.save(article);
  }

  /**
   * Encuentra artículos relacionados basado en múltiples criterios (estrategia robusta)
   * Criterios: categoría (100), palabras clave (75), fecha cercana (50), reciente (10)
   */
  async findRelated(currentArticleId: string, limit: number = 4): Promise<Article[]> {
    const current = await this.articleRepository.findOne({
      where: { id: currentArticleId, deletedAt: IsNull() },
    });

    if (!current) return [];

    // Obtener todos los artículos activos excepto el actual
    const candidates = await this.articleRepository.find({
      where: {
        isActive: true,
        deletedAt: IsNull(),
      },
    });

    // Filtrar el artículo actual
    const filtered = candidates.filter(a => a.id !== currentArticleId);

    if (filtered.length === 0) return [];

    // Calcular score para cada candidato
    const scored = filtered.map(candidate => {
      let score = 0;

      // 1. Categoría exacta (peso: 100)
      if (candidate.category === current.category) {
        score += 100;
      }

      // 2. Palabras clave comunes en título (peso: 75)
      const commonWords = this.countCommonWords(current.title, candidate.title);
      score += commonWords * 75;

      // 3. Palabras clave comunes en subtítulo (peso: 50)
      if (current.subtitle && candidate.subtitle) {
        const subtitleCommonWords = this.countCommonWords(
          current.subtitle,
          candidate.subtitle,
        );
        score += subtitleCommonWords * 50;
      }

      // 4. Fecha cercana ±30 días (peso: 50)
      const daysDiff =
        Math.abs(
          new Date(current.createdAt).getTime() -
            new Date(candidate.createdAt).getTime(),
        ) /
        (1000 * 60 * 60 * 24);
      if (daysDiff <= 30) {
        score += 50;
      }

      // 5. Reciente (últimos 90 días) (peso: 10)
      const daysSinceCreation =
        (new Date().getTime() - new Date(candidate.createdAt).getTime()) /
        (1000 * 60 * 60 * 24);
      if (daysSinceCreation <= 90) {
        score += 10;
      }

      return { ...candidate, _score: score };
    });

    // Ordenar por score descendente
    scored.sort((a, b) => (b._score || 0) - (a._score || 0));

    // Retornar: mínimo 1 artículo si existen candidatos, máximo `limit`
    const result = scored
      .slice(0, Math.max(1, limit))
      .map(({ _score, ...rest }: any) => rest);

    return result;
  }

  /**
   * Cuenta palabras comunes entre dos strings (palabras > 3 caracteres)
   */
  private countCommonWords(str1: string, str2: string): number {
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 3);

    const words1 = normalize(str1);
    const words2 = normalize(str2);

    const set2 = new Set(words2);
    return words1.filter(w => set2.has(w)).length;
  }
}
