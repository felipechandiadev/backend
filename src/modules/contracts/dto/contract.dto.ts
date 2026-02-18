import {
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsUUID,
  IsNumber,
  IsPositive,
  IsArray,
  IsObject,
  IsString,
  IsDateString,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  ContractOperationType,
  ContractStatus,
  ContractRole,
  ContractPerson,
  ContractCurrency,
  PaymentType,
} from '../../../entities/contract.entity';
import { PaymentStatus } from '../../../entities/payment.entity';

export class UpdateContractAgentDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;
}

export class ContractPersonDto {
  @IsUUID()
  @IsNotEmpty()
  personId: string;

  @IsEnum(ContractRole)
  @IsNotEmpty()
  role: ContractRole;
}

export class ContractPaymentDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsDateString()
  date: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(PaymentType)
  @IsNotEmpty()
  type: PaymentType;

  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @IsDateString()
  @IsOptional()
  paidAt?: string;

  @IsBoolean()
  @IsOptional()
  isAgencyRevenue?: boolean;
}

export class ContractDocumentDto {
  @IsUUID()
  @IsNotEmpty()
  documentTypeId: string;

  @IsUUID()
  @IsOptional()
  documentId?: string;

  @IsBoolean()
  required: boolean;

  @IsBoolean()
  uploaded: boolean;
}

export class CreateContractDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsUUID()
  @IsNotEmpty()
  propertyId: string;

  @IsEnum(ContractOperationType)
  @IsNotEmpty()
  operation: ContractOperationType;

  @IsEnum(ContractStatus)
  @IsOptional()
  status?: ContractStatus;

  @IsNumber()
  @IsPositive()
  amount: number; // Monto total en la moneda especificada

  @IsEnum(ContractCurrency)
  @IsOptional()
  currency?: ContractCurrency; // Moneda del monto (CLP o UF)

  @IsNumber()
  @IsPositive()
  @IsOptional()
  ufValue?: number; // Valor de la UF al momento de crear el contrato (requerido si currency es UF)

  @IsNumber()
  @IsPositive()
  commissionPercent: number; // Porcentaje de comisión

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractPersonDto)
  people: ContractPersonDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractPaymentDto)
  @IsOptional()
  payments?: ContractPaymentDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractDocumentDto)
  @IsOptional()
  documents?: ContractDocumentDto[];
}

export class UpdateContractDto {
  @IsNumber()
  @IsPositive()
  @IsOptional()
  amount?: number;

  @IsEnum(ContractCurrency)
  @IsOptional()
  currency?: ContractCurrency;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  ufValue?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  commissionPercent?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  commissionAmount?: number;

  @IsEnum(ContractStatus)
  @IsOptional()
  status?: ContractStatus;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractPersonDto)
  @IsOptional()
  people?: ContractPersonDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractPaymentDto)
  @IsOptional()
  payments?: ContractPaymentDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractDocumentDto)
  @IsOptional()
  documents?: ContractDocumentDto[];
}

export class AddPaymentDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsDateString()
  date: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(PaymentType)
  @IsNotEmpty()
  type: PaymentType;

  @IsBoolean()
  @IsOptional()
  isAgencyRevenue?: boolean;
}

export class AddPersonDto {
  @IsUUID()
  @IsNotEmpty()
  personId: string;

  @IsEnum(ContractRole)
  @IsNotEmpty()
  role: ContractRole;
}

export class CloseContractDto {
  @IsDateString()
  endDate: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractDocumentDto)
  documents: ContractDocumentDto[];
}

export class UploadContractDocumentDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsUUID()
  documentTypeId: string;

  @IsNotEmpty()
  @IsUUID()
  contractId: string;

  @IsNotEmpty()
  @IsUUID()
  uploadedById: string;

  @IsOptional()
  @IsUUID()
  documentId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') {
        return true;
      }
      if (normalized === 'false' || normalized === '0') {
        return false;
      }
    }
    if (typeof value === 'number') {
      return value === 1;
    }
    return value;
  })
  @IsBoolean()
  required?: boolean;
}

export class UpdateContractStatusDto {
  @IsEnum(ContractStatus)
  @IsNotEmpty()
  status: ContractStatus;
}

export class UpdatePaymentStatusDto {
  @IsEnum(PaymentStatus)
  @IsNotEmpty()
  status: PaymentStatus;
}

export class UploadPaymentDocumentDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsUUID()
  documentTypeId: string;

  @IsNotEmpty()
  @IsUUID()
  paymentId: string;

  @IsNotEmpty()
  @IsUUID()
  uploadedById: string;

  @IsUUID()
  @IsOptional()
  personId?: string;

  @IsUUID()
  @IsOptional()
  contractId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  seoTitle?: string;
}
