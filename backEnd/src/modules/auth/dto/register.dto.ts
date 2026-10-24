import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterClientDto {
  @IsString({ message: 'Full name must be a valid string' })
  @IsNotEmpty({ message: 'Full name is required' })
  @MinLength(2, { message: 'Full name must be at least 2 characters long' })
  @MaxLength(80, { message: 'Full name must not exceed 80 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email address (e.g. abduselamibrahim85@gmail.com)' })
  @IsNotEmpty({ message: 'Email address is required' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  email: string;

  @IsString({ message: 'Password must be a valid string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and at least one number',
  })
  password: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\+251|0)9[0-9]{8}$/, {
    message:
      'Phone must be a valid Ethiopian mobile number (e.g., 0900572995 or +251900572995)',
  })
  phone?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
  referral_code?: string;
}

export class RefreshTokenDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class RegisterInitiateDto {
  @IsString({ message: 'Full name must be a valid string' })
  @IsNotEmpty({ message: 'Full name is required' })
  @MinLength(2, { message: 'Full name must be at least 2 characters long' })
  @MaxLength(80, { message: 'Full name must not exceed 80 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email address (e.g. abduselamibrahim85@gmail.com)' })
  @IsNotEmpty({ message: 'Email address is required' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  email: string;

  @IsString({ message: 'Password must be a valid string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and at least one number',
  })
  password: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\+251|0)9[0-9]{8}$/, {
    message:
      'Phone must be a valid Ethiopian mobile number (e.g., 0900572995 or +251900572995)',
  })
  phone?: string;

  @IsOptional()
  @IsString()
  role?: 'CLIENT' | 'AGENT';

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
  referral_code?: string;

  @IsOptional()
  @IsString()
  payout_details?: string;
}

export class RegisterConfirmDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email address is required' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  email: string;

  @IsString({ message: 'Referral code must be a valid string' })
  @IsNotEmpty({ message: 'Referral code is required' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
  code: string;
}

export class ResendCodeDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email address is required' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  email: string;
}

