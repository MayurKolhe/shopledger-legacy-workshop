/opt/homebrew/Library/Homebrew/cmd/shellenv.sh: line 27: /bin/ps: Operation not permitted
const test = require('node:test');
const assert = require('node:assert/strict');

const orders = require('../lib/orders');
const ledger = require('../lib/ledger');

function order(id, date) {
  return { id, date, customer: 'Test Customer', status: 'completed' };
}

test('order history sorts DD/MM/YYYY dates chronologically, newest first', () => {
  const db = {
    orders: [
      order(1, '02/01/2025'),
      order(2, '31/12/2024'),
      order(3, '02/01/2025')
    ]
  };

  assert.deepEqual(orders.list(db).map((item) => item.id), [3, 1, 2]);
});

test('from date filter includes dates on or after the requested day', () => {
  const db = {
    orders: [
      order(1, '20/12/2024'),
      order(2, '10/01/2025'),
      order(3, '11/01/2025'),
      order(4, '09/02/2025')
    ]
  };

  assert.deepEqual(
    orders.list(db, { from: '2025-01-10' }).map((item) => item.id),
    [4, 3, 2]
  );
});

test('to date filter includes dates on or before the requested day', () => {
  const db = {
    orders: [
      order(1, '20/12/2024'),
      order(2, '10/01/2025'),
      order(3, '09/02/2025')
    ]
  };

  assert.deepEqual(
    orders.list(db, { to: '2025-01-10' }).map((item) => item.id),
    [2, 1]
  );
});

test('string settlement amount is added numerically and keeps the customer balance accurate', () => {
  const customer = {
    id: 7,
    name: 'Test Customer',
    openingBalance: 100,
    totalBilled: 500,
    totalSettled: 20,
    creditLimit: 1000
  };
  const db = {
    customers: [customer],
    nextSettlementId: 1,
    settlements: []
  };

  const result = ledger.recordSettlement(db, 7, '30', 'cash', 'Payment');

  assert.equal(result.ok, true);
  assert.equal(customer.totalSettled, 50);
  assert.equal(customer.balance, 550);
  assert.equal(result.settlement.amount, 30);
  assert.equal(db.settlements.length, 1);
});

test('settlement entry and customer ledger use the same two-decimal amount', () => {
  const customer = {
    id: 7,
    name: 'Test Customer',
    openingBalance: 0,
    totalBilled: 10,
    totalSettled: 0,
    creditLimit: 1000
  };
  const db = { customers: [customer], nextSettlementId: 1, settlements: [] };

  const result = ledger.recordSettlement(db, 7, '1.005', 'cash', 'Payment');

  assert.equal(result.settlement.amount, 1.01);
  assert.equal(customer.totalSettled, 1.01);
  assert.equal(customer.balance, 8.99);
});
