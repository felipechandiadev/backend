import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Person } from '../../entities/person.entity';
import { User } from '../../entities/user.entity';
import { CreatePersonDto, UpdatePersonDto } from './dto/person.dto';

@Injectable()
export class PersonService {
  constructor(
    @InjectRepository(Person)
    private personRepository: Repository<Person>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createPersonDto: CreatePersonDto): Promise<Person> {
    if (createPersonDto.dni) {
      const existingPerson = await this.personRepository.findOne({
        where: { dni: createPersonDto.dni },
      });
      if (existingPerson) {
        throw new ConflictException('Ya existe una persona con ese DNI');
      }
    }

    const person = this.personRepository.create(createPersonDto);
    return await this.personRepository.save(person);
  }

  async findAll(): Promise<Person[]> {
    return await this.personRepository.find({
      relations: ['user', 'dniCardFront', 'dniCardRear'],
    });
  }

  async findAllIncludingUsers(): Promise<any[]> {
    // Get all persons with their relations
    const persons = await this.personRepository.find({
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

  async findOne(id: string): Promise<Person> {
    const person = await this.personRepository.findOne({
      where: { id },
      relations: ['user', 'dniCardFront', 'dniCardRear'],
    });

    if (!person) {
      throw new NotFoundException('Persona no encontrada');
    }

    return person;
  }

  async update(id: string, updatePersonDto: UpdatePersonDto): Promise<Person> {
    const person = await this.findOne(id);

    // Si se está actualizando el DNI, verificar que no exista
    if (updatePersonDto.dni && updatePersonDto.dni !== person.dni) {
      const existingPerson = await this.personRepository.findOne({
        where: { dni: updatePersonDto.dni },
      });
      if (existingPerson) {
        throw new ConflictException('Ya existe una persona con ese DNI');
      }
    }
    Object.assign(person, updatePersonDto);
    return await this.personRepository.save(person);
  }

  async remove(id: string): Promise<void> {
    const person = await this.findOne(id);
    await this.personRepository.softRemove(person);
  }

  async getPersonsForSearch(): Promise<Array<{ id: string; name: string; dni: string }>> {
    const persons = await this.personRepository.find({
      select: ['id', 'name', 'dni'],
      where: { deletedAt: IsNull() },
    });

    return persons.map(person => ({
      id: person.id,
      name: person.name || 'Sin nombre',
      dni: person.dni || 'Sin RUT',
    }));
  }
}
