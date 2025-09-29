import { DataSource } from 'typeorm';
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { dataSourceOptions } from './db/typeorm.config';
import { UnitOfWorkOrm } from './repositories/UnitOfWork.orm';
import { FixedPlusRateFeePolicy } from 'src/domain/services/FeePolicies';

@Global()
@Module({
  imports: [TypeOrmModule.forRoot(dataSourceOptions)],
  providers: [
    {
      provide: 'UnitOfWork',
      useFactory: (ds: DataSource) => UnitOfWorkOrm.fromDataSource(ds),
      inject: [DataSource],
    },
    { provide: 'FeePolicy', useClass: FixedPlusRateFeePolicy },
  ],
  exports: ['UnitOfWork', 'FeePolicy', TypeOrmModule],
})
export class InfrastructureModule {}
