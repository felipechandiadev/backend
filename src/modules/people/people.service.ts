import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Person } from '../../entities/person.entity';
import { User } from '../../entities/user.entity';
import {
  CreatePersonDto,
  UpdatePersonDto,
  LinkUserDto,
} from './dto/person.dto';

@Injectable()
export class PeopleService {
  constructor(
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createPersonDto: CreatePersonDto): Promise<Person> {
    // Check if DNI already exists
    if (createPersonDto.dni) {
      const existingPerson = await this.personRepository.findOne({
        where: { dni: createPersonDto.dni, deletedAt: IsNull() },
      });
      if (existingPerson) {
        throw new ConflictException('El DNI ya está registrado');
      }
    }

    const person = this.personRepository.create(createPersonDto);
    return await this.personRepository.save(person);
  }

  async findAll(): Promise<Person[]> {
    return await this.personRepository.find({
      where: { deletedAt: IsNull() },
      relations: ['user'],
    });
  }

  async findAllIncludingUsers(): Promise<any[]> {
    // Get all persons with their relations
    const persons = await this.personRepository.find({
      where: { deletedAt: IsNull() },
      relations: ['user', 'dniCardFront', 'dniCardRear'],
    });

    // Get all users that don't have an associated person
    const usersWithoutPerson = await this.userRepository.find({
      where: { personId: IsNull() },
      relations: ['person'], // This should be empty but just in case
    });

    // Convert users without person to person-like objects
    const usersAsPersons = usersWithoutPerson.map(user => ({
      id: user.id,
      name: user.personalInfo?.firstName && user.personalInfo?.lastName
        ? `${user.personalInfo.firstName} ${user.personalInfo.lastName}`
        : user.username,
      email: user.email,
      phone: user.personalInfo?.phone,
      address: user.personalInfo?.address,
      city: user.personalInfo?.city,
      state: user.personalInfo?.state,
      verified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
      user: user, // Include the user object for reference
      userRole: user.role, // Add user role for filtering
      userStatus: user.status, // Add user status
      isFromUser: true, // Flag to identify this came from a user record
    }));

    // Combine persons and users
    return [...persons, ...usersAsPersons];
  }

  async getPersonsForSearch(): Promise<Array<{ id: string; name: string; dni: string }>> {
    const persons = await this.personRepository.find({
      where: { deletedAt: IsNull() },
      select: ['id', 'name', 'dni'],
    });
    
    return persons.map(person => ({
      id: person.id,
      name: person.name,
      dni: person.dni || '',
    }));
  }

  async findOne(id: string): Promise<Person> {
    const person = await this.personRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['user', 'dniCardFront', 'dniCardRear'],
    });

    if (!person) {
      throw new NotFoundException('Persona no encontrada');
    }

    return person;
  }

  async update(id: string, updatePersonDto: UpdatePersonDto): Promise<Person> {
    const person = await this.findOne(id);

    // Check if DNI already exists (if being updated)
    if (updatePersonDto.dni && updatePersonDto.dni !== person.dni) {
      const existingPerson = await this.personRepository.findOne({
        where: { dni: updatePersonDto.dni, deletedAt: IsNull() },
      });
      if (existingPerson) {
        throw new ConflictException('El DNI ya está registrado');
      }
    }

    Object.assign(person, updatePersonDto);
    return await this.personRepository.save(person);
  }

  async softDelete(id: string): Promise<void> {
    const person = await this.findOne(id);
    await this.personRepository.softDelete(id);
  }

  async verify(id: string): Promise<Person> {
    const person = await this.findOne(id);

    if (person.verified) {
      throw new BadRequestException('La persona ya está verificada');
    }

    person.verified = true;
    return await this.personRepository.save(person);
  }

  async unverify(id: string): Promise<Person> {
    const person = await this.findOne(id);

    if (!person.verified) {
      throw new BadRequestException('La persona no está verificada');
    }

    person.verified = false;
    return await this.personRepository.save(person);
  }

  async requestVerification(id: string): Promise<Person> {
    const person = await this.findOne(id);

    if (person.verificationRequest) {
      throw new BadRequestException(
        'Ya existe una solicitud de verificación pendiente',
      );
    }

    person.verificationRequest = new Date();
    return await this.personRepository.save(person);
  }

  async linkUser(id: string, linkUserDto: LinkUserDto): Promise<Person> {
    const person = await this.findOne(id);

    if (person.user) {
      throw new BadRequestException('La persona ya tiene un usuario vinculado');
    }

    // TODO: Validate that user exists and is not already linked
    person.user = { id: linkUserDto.userId } as User;
    return await this.personRepository.save(person);
  }

  async unlinkUser(id: string): Promise<Person> {
    const person = await this.findOne(id);

    if (!person.user) {
      throw new BadRequestException(
        'No existe usuario vinculado a esta persona',
      );
    }

    person.user = undefined as any;
    return await this.personRepository.save(person);
  }
}
