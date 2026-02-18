import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { REGION_COMMUNES } from '../regions/regions.data';
import { RegionEnum } from '../regions/regions.enum';

export function IsValidRegionCommune(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidRegionCommune',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return true; // allow empty, use @IsNotEmpty if required
          const { region, commune } = value as {
            region?: RegionEnum;
            commune?: string;
          };
          if (!region || !commune) return false;
          const communes = REGION_COMMUNES[region];
          if (!communes) return false;
          return communes.includes(commune);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid { region, commune } pair`;
        },
      },
    });
  };
}
