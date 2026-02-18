import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { TeamMember } from '../../entities/team-member.entity';
import {
  CreateTeamMemberDto,
  UpdateTeamMemberDto,
} from './dto/team-member.dto';

@Injectable()
export class TeamMembersService {
  constructor(
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
  ) {}

  async create(createTeamMemberDto: CreateTeamMemberDto): Promise<TeamMember> {
    // Check if email already exists
    if (createTeamMemberDto.mail) {
      const existingMember = await this.teamMemberRepository.findOne({
        where: { mail: createTeamMemberDto.mail },
      });
      if (existingMember) {
        throw new ConflictException('El correo ya está registrado.');
      }
    }

    const teamMember = this.teamMemberRepository.create(createTeamMemberDto);
    return await this.teamMemberRepository.save(teamMember);
  }

  async findAll(search?: string): Promise<TeamMember[]> {
    const query = this.teamMemberRepository.createQueryBuilder('team_member')
      .where('team_member.deletedAt IS NULL');

    if (search) {
      const searchTerm = `%${search}%`;
      query.andWhere(
        '(team_member.name LIKE :search OR team_member.position LIKE :search OR team_member.mail LIKE :search)',
        { search: searchTerm },
      );
    }

    return await query.getMany();
  }

  async findOne(id: string): Promise<TeamMember> {
    const teamMember = await this.teamMemberRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!teamMember) {
      throw new NotFoundException('Miembro del equipo no encontrado.');
    }

    return teamMember;
  }

  async update(
    id: string,
    updateTeamMemberDto: UpdateTeamMemberDto,
  ): Promise<TeamMember> {
    const teamMember = await this.findOne(id);

    // Check if email is being updated and already exists
    if (
      updateTeamMemberDto.mail &&
      updateTeamMemberDto.mail !== teamMember.mail
    ) {
      const existingMember = await this.teamMemberRepository.findOne({
        where: { mail: updateTeamMemberDto.mail },
      });
      if (existingMember) {
        throw new ConflictException('El correo ya está registrado.');
      }
    }

    Object.assign(teamMember, updateTeamMemberDto);
    return await this.teamMemberRepository.save(teamMember);
  }

  async softDelete(id: string): Promise<void> {
    const teamMember = await this.findOne(id);
    await this.teamMemberRepository.softDelete(id);
  }
}
