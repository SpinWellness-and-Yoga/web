import assert from 'node:assert/strict';
import { test } from 'node:test';
import { capacityError } from './event-validation';
test('unlimited capacity remains valid with existing registrations', () => { assert.equal(capacityError(0, 12), null); });
test('fixed capacity cannot remove existing places', () => { assert.ok(capacityError(11, 12)); assert.equal(capacityError(12, 12), null); });
test('capacity rejects negative and fractional values', () => { assert.ok(capacityError(-1, 0)); assert.ok(capacityError(1.5, 0)); });
