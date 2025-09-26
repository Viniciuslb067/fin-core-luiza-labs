import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsOptional,
  Matches,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DepositDto {
  @IsString()
  @IsNotEmpty()
  accountNumber!: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount!: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class WithdrawDto {
  @IsString()
  @IsNotEmpty()
  accountNumber!: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount!: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class TransferDto {
  @IsString()
  @IsNotEmpty()
  from!: string;

  @IsString()
  @IsNotEmpty()
  to!: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount!: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class BatchDepositItem {
  @Matches(/^DEPOSIT$/)
  type!: 'DEPOSIT';

  @IsString()
  @IsNotEmpty()
  accountNumber!: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount!: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class BatchWithdrawItem {
  @Matches(/^WITHDRAW$/)
  type!: 'WITHDRAW';

  @IsString()
  @IsNotEmpty()
  accountNumber!: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount!: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class BatchTransferItem {
  @Matches(/^TRANSFER$/)
  type!: 'TRANSFER';

  @IsString()
  @IsNotEmpty()
  from!: string;

  @IsString()
  @IsNotEmpty()
  to!: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount!: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export type BatchItemDto =
  | BatchDepositItem
  | BatchWithdrawItem
  | BatchTransferItem;

export class ProcessBatchDto {
  @ValidateNested({ each: true })
  @Type(() => Object)
  @ArrayMinSize(1)
  items!: BatchItemDto[];
}
