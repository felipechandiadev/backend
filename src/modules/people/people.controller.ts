import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { PeopleService } from './people.service';
import {
  CreatePersonDto,
  UpdatePersonDto,
  LinkUserDto,
} from './dto/person.dto';

@Controller('people')
@ApiTags('People')
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  /**
   * Create a new person record
   */
  @Post()
  @ApiOperation({ summary: 'Create new person' })
  @ApiResponse({
    status: 201,
    description: 'Person created successfully',
  })
  @ApiBody({ type: CreatePersonDto })
  create(@Body() createPersonDto: CreatePersonDto) {
    return this.peopleService.create(createPersonDto);
  }

  /**
   * Search people for autocomplete
   */
  @Get('search')
  @ApiOperation({ summary: 'Search people for autocomplete' })
  @ApiResponse({
    status: 200,
    description: 'List of people for autocomplete',
  })
  searchPersons() {
    return this.peopleService.getPersonsForSearch();
  }

  /**
   * Get all people
   */
  @Get()
  @ApiOperation({ summary: 'Get all people' })
  @ApiResponse({
    status: 200,
    description: 'List of all people',
  })
  findAll() {
    return this.peopleService.findAll();
  }

  /**
   * Get all people including users without person records
   */
  @Get('all')
  @ApiOperation({ summary: 'Get all people including users' })
  @ApiResponse({
    status: 200,
    description: 'List of all people and users',
  })
  findAllIncludingUsers() {
    return this.peopleService.findAllIncludingUsers();
  }

  /**
   * Get person by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get person by ID' })
  @ApiResponse({
    status: 200,
    description: 'Person details',
  })
  @ApiResponse({
    status: 404,
    description: 'Person not found',
  })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id') id: string) {
    return this.peopleService.findOne(id);
  }

  /**
   * Update person information
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update person' })
  @ApiResponse({
    status: 200,
    description: 'Person updated successfully',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdatePersonDto })
  update(@Param('id') id: string, @Body() updatePersonDto: UpdatePersonDto) {
    return this.peopleService.update(id, updatePersonDto);
  }

  /**
   * Delete person (soft delete)
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete person' })
  @ApiResponse({
    status: 200,
    description: 'Person deleted successfully',
  })
  @ApiParam({ name: 'id', type: String })
  softDelete(@Param('id') id: string) {
    return this.peopleService.softDelete(id);
  }

  /**
   * Verify a person
   */
  @Post(':id/verify')
  @ApiOperation({ summary: 'Verify person' })
  @ApiResponse({
    status: 200,
    description: 'Person verified successfully',
  })
  @ApiParam({ name: 'id', type: String })
  verify(@Param('id') id: string) {
    return this.peopleService.verify(id);
  }

  /**
   * Unverify a person
   */
  @Post(':id/unverify')
  @ApiOperation({ summary: 'Unverify person' })
  @ApiResponse({
    status: 200,
    description: 'Person unverified successfully',
  })
  @ApiParam({ name: 'id', type: String })
  unverify(@Param('id') id: string) {
    return this.peopleService.unverify(id);
  }

  /**
   * Request verification for a person
   */
  @Post(':id/request-verification')
  @ApiOperation({ summary: 'Request person verification' })
  @ApiResponse({
    status: 200,
    description: 'Verification request submitted',
  })
  @ApiParam({ name: 'id', type: String })
  requestVerification(@Param('id') id: string) {
    return this.peopleService.requestVerification(id);
  }

  /**
   * Link a person to a user account
   */
  @Post(':id/link-user')
  @ApiOperation({ summary: 'Link person to user account' })
  @ApiResponse({
    status: 200,
    description: 'Person linked to user successfully',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: LinkUserDto })
  linkUser(@Param('id') id: string, @Body() linkUserDto: LinkUserDto) {
    return this.peopleService.linkUser(id, linkUserDto);
  }

  /**
   * Unlink person from user account
   */
  @Post(':id/unlink-user')
  @ApiOperation({ summary: 'Unlink person from user account' })
  @ApiResponse({
    status: 200,
    description: 'Person unlinked from user successfully',
  })
  @ApiParam({ name: 'id', type: String })
  unlinkUser(@Param('id') id: string) {
    return this.peopleService.unlinkUser(id);
  }
}
