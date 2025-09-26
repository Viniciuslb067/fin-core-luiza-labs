import { setSeederFactory } from 'typeorm-extension';
import { AccountOrm } from '../entities/Account.orm';

export default setSeederFactory(AccountOrm, async () => {
  const { faker } = await import('@faker-js/faker');

  const e = new AccountOrm();
  e.number = `ACC-${faker.number.int({ min: 100, max: 999 })}`;
  e.balance = '0.00';
  e.credit_limit = faker.number.int({ min: 50, max: 200 }).toFixed(2);
  return e;
});
