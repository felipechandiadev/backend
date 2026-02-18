import { ApiProperty } from '@nestjs/swagger';

export class GeographicEfficiencyDto {
  @ApiProperty({ description: 'Region name' })
  region: string;

  @ApiProperty({ description: 'Commune name' })
  commune: string;

  @ApiProperty({ description: 'Number of properties assigned in this location' })
  assignedProperties: number;

  @ApiProperty({ description: 'Number of closed contracts in this location' })
  closedContracts: number;

  @ApiProperty({ description: 'Conversion rate for this location' })
  conversionRate: number;

  @ApiProperty({ description: 'Average closure days for this location' })
  avgClosureDays: number;

  @ApiProperty({ description: 'Total contract value for this location' })
  totalContractValue: number;

  @ApiProperty({ description: 'Properties by status in this location' })
  propertiesByStatus: {
    REQUEST: number;
    PRE_APPROVED: number;
    PUBLISHED: number;
    INACTIVE: number;
    SOLD: number;
    RENTED: number;
  };
}

export class GeographicAnalyticsDto {
  @ApiProperty({ description: 'Analysis period' })
  period: string;

  @ApiProperty({ description: 'Total number of regions with data' })
  totalRegions: number;

  @ApiProperty({ description: 'Total number of communes with data' })
  totalCommunes: number;

  @ApiProperty({ description: 'Efficiency metrics grouped by region' })
  efficiencyByRegion: GeographicEfficiencyDto[];

  @ApiProperty({ description: 'Efficiency metrics grouped by commune' })
  efficiencyByCommune: GeographicEfficiencyDto[];

  @ApiProperty({ description: 'Top 5 performing regions by conversion rate' })
  topPerformingRegions: GeographicEfficiencyDto[];

  @ApiProperty({ description: 'Bottom 5 performing regions by conversion rate' })
  lowestPerformingRegions: GeographicEfficiencyDto[];
}