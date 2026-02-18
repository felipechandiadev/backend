import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamMember } from '../../entities/team-member.entity';
import { TeamMembersService } from './team-members.service';
import { TeamMembersController } from './team-members.controller';
import { MultimediaModule } from '../multimedia/multimedia.module';

@Module({
  imports: [TypeOrmModule.forFeature([TeamMember]), MultimediaModule],
  controllers: [TeamMembersController],
  providers: [TeamMembersService],
  exports: [TeamMembersService],
})
export class TeamMembersModule {}
