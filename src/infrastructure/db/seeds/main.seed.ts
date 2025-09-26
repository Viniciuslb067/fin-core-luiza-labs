import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { AccountOrm } from '../entities/Account.orm';

export default class MainSeeder implements Seeder {
  public async run(
    ds: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<void> {
    const repo = ds.getRepository(AccountOrm);

    const fixed = [
      { number: 'ACC-001', balance: '0.00', credit_limit: '100.00' },
      { number: 'ACC-002', balance: '0.00', credit_limit: '50.00' },
      { number: 'ACC-003', balance: '50.00', credit_limit: '150.00' },
    ];

    for (const row of fixed) {
      const exists = await repo.findOne({ where: { number: row.number } });
      if (!exists) {
        await repo.save(repo.create(row));
      }
    }

    const accountFactory = factoryManager.get(AccountOrm);
    await accountFactory.saveMany(7);
  }
}
