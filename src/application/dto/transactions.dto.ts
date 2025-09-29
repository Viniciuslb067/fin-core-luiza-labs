import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsOptional,
  IsIn,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OperationType } from '../../domain/enums/OperationType';

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
  @IsIn([OperationType.DEPOSIT])
  @IsString()
  type!: typeof OperationType.DEPOSIT;

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
  @IsIn([OperationType.WITHDRAW])
  @IsString()
  type!: typeof OperationType.WITHDRAW;

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
  @IsIn([OperationType.TRANSFER])
  @IsString()
  type!: typeof OperationType.TRANSFER;

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
  @Type(() => Object, {
    discriminator: {
      property: 'type',
      subTypes: [
        { value: BatchDepositItem, name: OperationType.DEPOSIT },
        { value: BatchWithdrawItem, name: OperationType.WITHDRAW },
        { value: BatchTransferItem, name: OperationType.TRANSFER },
      ],
    },
    keepDiscriminatorProperty: true,
  })
  @ArrayMinSize(1)
  items!: BatchItemDto[];
}
