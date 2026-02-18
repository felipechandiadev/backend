import 'reflect-metadata';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePropertyDto } from '../../src/modules/property/dto/create-property.dto';

describe('CreatePropertyDto', () => {
  describe('Transform decorators', () => {
    it('should transform string numbers to numbers for numeric fields', async () => {
      const input = {
        title: 'Test Property',
        description: 'Test description',
        status: 1,
        operationType: 1,
        bedrooms: '3', // string
        bathrooms: '2', // string
        parkingSpaces: '1', // string
        floors: '2', // string
        builtSquareMeters: '150', // string
        landSquareMeters: '200', // string
        constructionYear: '2020', // string
        propertyTypeId: 'some-uuid',
        address: 'Test Address',
        location: { lat: -33.4489, lng: -70.6693 },
        state: { id: 'RM', label: 'Región Metropolitana' },
        city: { id: 'SCL', label: 'Santiago' },
      };

      const dto = plainToClass(CreatePropertyDto, input) as CreatePropertyDto;

      // Validate the DTO
      const errors = await validate(dto as object);

      // Should have no validation errors
      expect(errors.length).toBe(0);

      // Check that string numbers were transformed to numbers
      expect(typeof (dto as CreatePropertyDto).bedrooms).toBe('number');
      expect(typeof (dto as CreatePropertyDto).bathrooms).toBe('number');
      expect(typeof (dto as CreatePropertyDto).parkingSpaces).toBe('number');
      expect(typeof (dto as CreatePropertyDto).floors).toBe('number');
      expect(typeof (dto as CreatePropertyDto).builtSquareMeters).toBe('number');
      expect(typeof (dto as CreatePropertyDto).landSquareMeters).toBe('number');
      expect(typeof (dto as CreatePropertyDto).constructionYear).toBe('number');

      // Check actual values
      expect((dto as CreatePropertyDto).bedrooms).toBe(3);
      expect((dto as CreatePropertyDto).bathrooms).toBe(2);
      expect((dto as CreatePropertyDto).parkingSpaces).toBe(1);
      expect((dto as CreatePropertyDto).floors).toBe(2);
      expect((dto as CreatePropertyDto).builtSquareMeters).toBe(150);
      expect((dto as CreatePropertyDto).landSquareMeters).toBe(200);
      expect((dto as CreatePropertyDto).constructionYear).toBe(2020);
    });

    it('should handle number inputs correctly', async () => {
      const input = {
        title: 'Test Property',
        description: 'Test description',
        status: 1,
        operationType: 1,
        bedrooms: 3, // number
        bathrooms: 2, // number
        parkingSpaces: 1, // number
        floors: 2, // number
        builtSquareMeters: 150, // number
        landSquareMeters: 200, // number
        constructionYear: 2020, // number
        propertyTypeId: 'some-uuid',
        address: 'Test Address',
        location: { lat: -33.4489, lng: -70.6693 },
        state: { id: 'RM', label: 'Región Metropolitana' },
        city: { id: 'SCL', label: 'Santiago' },
      };

      const dto = plainToClass(CreatePropertyDto, input) as CreatePropertyDto;

      // Validate the DTO
      const errors = await validate(dto as object);

      // Should have no validation errors
      expect(errors.length).toBe(0);

      // Check that numbers remain numbers
      expect(typeof (dto as CreatePropertyDto).bedrooms).toBe('number');
      expect(typeof (dto as CreatePropertyDto).bathrooms).toBe('number');
      expect(typeof (dto as CreatePropertyDto).parkingSpaces).toBe('number');
      expect(typeof (dto as CreatePropertyDto).floors).toBe('number');
      expect(typeof (dto as CreatePropertyDto).builtSquareMeters).toBe('number');
      expect(typeof (dto as CreatePropertyDto).landSquareMeters).toBe('number');
      expect(typeof (dto as CreatePropertyDto).constructionYear).toBe('number');

      // Check actual values
      expect((dto as CreatePropertyDto).bedrooms).toBe(3);
      expect((dto as CreatePropertyDto).bathrooms).toBe(2);
      expect((dto as CreatePropertyDto).parkingSpaces).toBe(1);
      expect((dto as CreatePropertyDto).floors).toBe(2);
      expect((dto as CreatePropertyDto).builtSquareMeters).toBe(150);
      expect((dto as CreatePropertyDto).landSquareMeters).toBe(200);
      expect((dto as CreatePropertyDto).constructionYear).toBe(2020);
    });

    it('should handle invalid string numbers', async () => {
      const input = {
        title: 'Test Property',
        description: 'Test description',
        status: 1,
        operationType: 1,
        bedrooms: 'invalid', // invalid string
        bathrooms: '2',
        parkingSpaces: '1',
        floors: '2',
        builtSquareMeters: '150',
        landSquareMeters: '200',
        constructionYear: '2020',
        propertyTypeId: 'some-uuid',
        address: 'Test Address',
        location: { lat: -33.4489, lng: -70.6693 },
        state: { id: 'RM', label: 'Región Metropolitana' },
        city: { id: 'SCL', label: 'Santiago' },
      };

      const dto = plainToClass(CreatePropertyDto, input) as CreatePropertyDto;

      // Validate the DTO
      const errors = await validate(dto as object);

      // Should have validation errors for bedrooms (NaN)
      expect(errors.length).toBeGreaterThan(0);
      const bedroomErrors = errors.filter(error => error.property === 'bedrooms');
      expect(bedroomErrors.length).toBeGreaterThan(0);
    });
  });
});