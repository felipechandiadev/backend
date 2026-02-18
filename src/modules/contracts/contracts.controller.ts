import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ContractsService } from './contracts.service';
import {
  CreateContractDto,
  UpdateContractDto,
  AddPaymentDto,
  AddPersonDto,
  CloseContractDto,
  UploadContractDocumentDto,
  UpdateContractStatusDto,
  UpdatePaymentStatusDto,
  UploadPaymentDocumentDto,
  UpdateContractAgentDto,
} from './dto/contract.dto';
import { ContractRole, PaymentType } from '../../entities/contract.entity';
import type { Express, Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

type AuthenticatedRequest = Request & { user?: { id?: string; sub?: string } };

@ApiTags('Contracts')
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  private resolveActorId(req?: AuthenticatedRequest): string | undefined {
    if (!req?.user) {
      return undefined;
    }

    return req.user.id ?? (typeof req.user.sub === 'string' ? req.user.sub : undefined);
  }

  /**
   * Create a new contract
   */
  @Post()
  @ApiOperation({ summary: 'Create new contract' })
  @ApiResponse({
    status: 201,
    description: 'Contract created successfully',
  })
  @ApiBody({ type: CreateContractDto })
  create(
    @Body(ValidationPipe) createContractDto: CreateContractDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.contractsService.create(
      createContractDto,
      this.resolveActorId(req),
    );
  }

  /**
   * Get all contracts
   */
  @Get()
  @ApiOperation({ summary: 'Get all contracts' })
  @ApiResponse({
    status: 200,
    description: 'List of all contracts',
  })
  @ApiQuery({ name: 'operation', required: false, enum: ['COMPRAVENTA', 'ARRIENDO'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sort', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'sortField', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'filters', required: false })
  @ApiQuery({ name: 'pagination', required: false, type: Boolean })
  findAll(@Query() query: any) {
    return this.contractsService.findAll(query);
  }

  /**
   * Get contracts for a specific user
   */
  @Get('user/:userId')
  @ApiOperation({ summary: 'Get contracts for a specific user' })
  @ApiResponse({
    status: 200,
    description: 'List of contracts for the user',
  })
  findAllByUser(@Param('userId') userId: string, @Query() query: any) {
    return this.contractsService.findAll({ ...query, userId });
  }

  /**
   * Get contract by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get contract by ID' })
  @ApiResponse({
    status: 200,
    description: 'Contract details',
  })
  @ApiResponse({
    status: 404,
    description: 'Contract not found',
  })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id') id: string) {
    return this.contractsService.findOne(id);
  }

  /**
   * Update contract
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update contract' })
  @ApiResponse({
    status: 200,
    description: 'Contract updated successfully',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateContractDto })
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateContractDto: UpdateContractDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.contractsService.update(
      id,
      updateContractDto,
      this.resolveActorId(req),
    );
  }

  /**
   * Delete contract (soft delete)
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete contract' })
  @ApiResponse({
    status: 200,
    description: 'Contract deleted successfully',
  })
  @ApiParam({ name: 'id', type: String })
  softDelete(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.contractsService.softDelete(id, this.resolveActorId(req));
  }

  /**
   * Close a contract with settlement details
   */
  @Post(':id/close')
  @ApiOperation({ summary: 'Close contract' })
  @ApiResponse({
    status: 200,
    description: 'Contract closed successfully',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: CloseContractDto })
  close(
    @Param('id') id: string,
    @Body() closeContractDto: CloseContractDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.contractsService.close(
      id,
      closeContractDto,
      this.resolveActorId(req),
    );
  }

  /**
   * Mark contract as failed
   */
  @Post(':id/fail')
  @ApiOperation({ summary: 'Mark contract as failed' })
  @ApiResponse({
    status: 200,
    description: 'Contract marked as failed',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({
    schema: {
      example: { endDate: '2024-01-01' },
    },
  })
  fail(
    @Param('id') id: string,
    @Body('endDate') endDate: Date,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.contractsService.fail(id, endDate, this.resolveActorId(req));
  }

  /**
   * Add payment to contract
   */
  @Post(':id/payments')
  @ApiOperation({ summary: 'Add payment to contract' })
  @ApiResponse({
    status: 201,
    description: 'Payment added successfully',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: AddPaymentDto })
  addPayment(
    @Param('id') id: string,
    @Body(ValidationPipe) addPaymentDto: AddPaymentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.contractsService.addPayment(
      id,
      addPaymentDto,
      this.resolveActorId(req),
    );
  }

  /**
   * Add person to contract with role
   */
  @Post(':id/people')
  @ApiOperation({ summary: 'Add person to contract' })
  @ApiResponse({
    status: 201,
    description: 'Person added to contract',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: AddPersonDto })
  addPerson(
    @Param('id') id: string,
    @Body(ValidationPipe) addPersonDto: AddPersonDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.contractsService.addPerson(
      id,
      addPersonDto,
      this.resolveActorId(req),
    );
  }

  /**
   * Get people in contract by role
   */
  @Get(':id/people')
  @ApiOperation({ summary: 'Get contract people by role' })
  @ApiResponse({
    status: 200,
    description: 'List of people in contract',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'role', required: false })
  getPeopleByRole(@Param('id') id: string, @Query('role') role: ContractRole) {
    return this.contractsService.getPeopleByRole(id, role);
  }

  /**
   * Validate required roles in contract
   */
  @Post(':id/validate-roles')
  @ApiOperation({ summary: 'Validate contract required roles' })
  @ApiResponse({
    status: 200,
    description: 'Validation result',
  })
  @ApiParam({ name: 'id', type: String })
  async validateRequiredRoles(@Param('id') id: string) {
    const contract = await this.contractsService.findOne(id);
    return this.contractsService.validateRequiredRoles(contract);
  }

  /**
   * Upload contract document
   */
  @Post('upload-document')
  @ApiOperation({ summary: 'Upload contract document' })
  @ApiResponse({
    status: 201,
    description: 'Document uploaded successfully',
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        title: {
          type: 'string',
        },
        documentTypeId: {
          type: 'string',
          format: 'uuid',
        },
        contractId: {
          type: 'string',
          format: 'uuid',
        },
        uploadedById: {
          type: 'string',
          format: 'uuid',
        },
        notes: {
          type: 'string',
        },
        seoTitle: {
          type: 'string',
        },
      },
    },
  })
  uploadContractDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadContractDocumentDto: UploadContractDocumentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.contractsService.uploadContractDocument(
      file,
      uploadContractDocumentDto,
      this.resolveActorId(req),
    );
  }

  /**
   * Associate document to payment
   */
  @Post('payments/:paymentId/documents/:documentId/associate')
  @ApiOperation({ summary: 'Associate document to payment' })
  @ApiResponse({
    status: 200,
    description: 'Document associated successfully',
  })
  @ApiParam({ name: 'paymentId', type: String })
  @ApiParam({ name: 'documentId', type: String })
  associateDocumentToPayment(
    @Param('paymentId') paymentId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.contractsService.associateDocumentToPayment(paymentId, documentId);
  }

  /**
   * Get payment documents
   */
  @Get('payments/:paymentId/documents')
  @ApiOperation({ summary: 'Get payment documents' })
  @ApiResponse({
    status: 200,
    description: 'List of payment documents',
  })
  @ApiParam({ name: 'paymentId', type: String })
  getPaymentDocuments(@Param('paymentId') paymentId: string) {
    return this.contractsService.getPaymentDocuments(paymentId);
  }

  /**
   * Validate payment with documents
   */
  @Get('payments/:paymentId/validate')
  @ApiOperation({ summary: 'Validate payment with documents' })
  @ApiResponse({
    status: 200,
    description: 'Payment validation result',
  })
  @ApiParam({ name: 'paymentId', type: String })
  validatePaymentWithDocuments(@Param('paymentId') paymentId: string) {
    return this.contractsService.validatePaymentWithDocuments(paymentId);
  }

  /**
   * Get payments by type for a specific contract
   */
  @Get(':id/payments/:type')
  @ApiOperation({ summary: 'Get payments by type for a contract' })
  @ApiResponse({
    status: 200,
    description: 'Payments retrieved successfully',
  })
  @ApiParam({ name: 'id', type: String, description: 'Contract ID' })
  @ApiParam({ name: 'type', type: String, description: 'Payment type' })
  getPaymentsByType(
    @Param('id') id: string,
    @Param('type') type: string,
  ) {
    return this.contractsService.getPaymentsByType(id, type as any);
  }

  /**
   * Get all commission payments (company income)
   */
  @Get('payments/commissions')
  @ApiOperation({ summary: 'Get all commission payments' })
  @ApiResponse({
    status: 200,
    description: 'Commission payments retrieved successfully',
  })
  getCommissionPayments() {
    return this.contractsService.getCommissionPayments();
  }

  /**
   * Get rent payments (optionally filtered by contract)
   */
  @Get('payments/rent')
  @ApiOperation({ summary: 'Get all rent payments' })
  @ApiResponse({
    status: 200,
    description: 'Rent payments retrieved successfully',
  })
  getRentPayments() {
    return this.contractsService.getRentPayments();
  }

  /**
   * Upload payment proof for a specific payment in a contract
   */
  @Post(':id/payments/:paymentId/proof')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload payment proof' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  uploadPaymentProof(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.contractsService.uploadPaymentProof(file, id, paymentId, userId);
  }

  /**
   * Update payment status
   */
  @Patch(':id/payments/:paymentId/status')
  @ApiOperation({ summary: 'Update payment status' })
  @ApiResponse({
    status: 200,
    description: 'Payment status updated successfully',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'paymentId', type: String })
  @ApiBody({ type: UpdatePaymentStatusDto })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  updatePaymentStatus(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
    @Body(ValidationPipe) updatePaymentStatusDto: UpdatePaymentStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.contractsService.updatePaymentStatus(
      paymentId,
      updatePaymentStatusDto.status as any,
      this.resolveActorId(req),
    );
  }
}
