// Each attack runs against the rules as delivered (it must work, checked by its assertions)
// and against the fixed rules (the emulator must deny it).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertFails } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { start } from './helpers.js';

test('1 flawed: anyone, without signing in, reads every client\'s health notes and can rewrite them', async () => {
  const app = await start('flawed');
  const stranger = app.as(null);
  const notes = await getDocs(collection(stranger, 'healthNotes'));
  assert.deepEqual(notes.docs.map((d) => d.data().text), ['Knee surgery in March, on anticoagulants']);
  await updateDoc(doc(stranger, 'healthNotes/n1'), { text: 'deleted' });
  await app.close();
});

test('1 fixed: notes are private to their author, signed in or not', async () => {
  const app = await start('fixed');
  await assertFails(getDocs(collection(app.as(null), 'healthNotes')));
  await assertFails(getDoc(doc(app.as('ben'), 'healthNotes/n1')));
  await assertFails(updateDoc(doc(app.as('ben'), 'healthNotes/n1'), { text: 'deleted' }));
  await app.close();
});

test('2 flawed: any signed-in user reads every profile, emails and phone numbers included', async () => {
  const app = await start('flawed');
  const users = await getDocs(collection(app.as('ben'), 'users'));
  assert.ok(users.docs.some((d) => d.data().phone === '+33 6 00 00 00 01'));
  await app.close();
});

test('2 fixed: a user reads only his own profile', async () => {
  const app = await start('fixed');
  await assertFails(getDocs(collection(app.as('ben'), 'users')));
  await assertFails(getDoc(doc(app.as('ben'), 'users/ana')));
  await app.close();
});

test('3 flawed: a client gives himself the premium plan and the coach role, then opens premium workouts', async () => {
  const app = await start('flawed');
  const ben = app.as('ben');
  await updateDoc(doc(ben, 'users/ben'), { plan: 'premium', role: 'coach' });
  const workout = await getDoc(doc(ben, 'workouts/w-pro'));
  assert.equal(workout.data().title, '12-week strength plan');
  await app.close();
});

test('3 fixed: plan and role cannot be written by the app, and premium stays closed', async () => {
  const app = await start('fixed');
  const ben = app.as('ben');
  await assertFails(updateDoc(doc(ben, 'users/ben'), { plan: 'premium' }));
  await assertFails(updateDoc(doc(ben, 'users/ben'), { role: 'coach' }));
  await assertFails(setDoc(doc(app.as('dan'), 'users/dan'), { name: 'Dan', email: 'dan@example.test', role: 'client', plan: 'premium' }));
  await assertFails(getDoc(doc(ben, 'workouts/w-pro')));
  await app.close();
});

test('4 flawed: a client marks his own booking paid, books at 1 cent, and books in someone else\'s name', async () => {
  const app = await start('flawed');
  const ana = app.as('ana');
  const ben = app.as('ben');
  await updateDoc(doc(ana, 'bookings/b1'), { status: 'paid' });
  await setDoc(doc(ben, 'bookings/b2'), { clientId: 'ben', coachId: 'cora', slot: '2026-11-04T18:00', status: 'confirmed', priceCents: 1 });
  await setDoc(doc(ben, 'bookings/b3'), { clientId: 'ana', coachId: 'cora', slot: '2026-11-05T07:00', status: 'requested', priceCents: 6000 });
  const paid = await getDoc(doc(ana, 'bookings/b1'));
  assert.equal(paid.data().status, 'paid');
  await app.close();
});

test('4 fixed: status and price follow the booking rules', async () => {
  const app = await start('fixed');
  const ana = app.as('ana');
  const ben = app.as('ben');
  await assertFails(updateDoc(doc(ana, 'bookings/b1'), { status: 'paid' }));
  await assertFails(updateDoc(doc(ana, 'bookings/b1'), { status: 'confirmed' }));
  await assertFails(updateDoc(doc(ana, 'bookings/b1'), { priceCents: 1 }));
  await assertFails(setDoc(doc(ben, 'bookings/b2'), { clientId: 'ben', coachId: 'cora', slot: '2026-11-04T18:00', status: 'confirmed', priceCents: 6000 }));
  await assertFails(setDoc(doc(ben, 'bookings/b2'), { clientId: 'ben', coachId: 'cora', slot: '2026-11-04T18:00', status: 'requested', priceCents: 1 }));
  await assertFails(setDoc(doc(ben, 'bookings/b3'), { clientId: 'ana', coachId: 'cora', slot: '2026-11-05T07:00', status: 'requested', priceCents: 6000 }));
  await assertFails(setDoc(doc(ben, 'bookings/b4'), { clientId: 'ben', coachId: 'ana', slot: '2026-11-05T07:00', status: 'requested', priceCents: 6000 }));
  await app.close();
});
