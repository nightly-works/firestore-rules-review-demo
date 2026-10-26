// What clients and coaches do every day must keep working under both sets of rules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { start } from './helpers.js';

for (const version of ['flawed', 'fixed']) {
  test(`${version}: a client manages his profile and notes, browses coaches and free workouts`, async () => {
    const app = await start(version);
    const ana = app.as('ana');
    assert.equal((await assertSucceeds(getDoc(doc(ana, 'users/ana')))).data().email, 'ana@example.test');
    await assertSucceeds(updateDoc(doc(ana, 'users/ana'), { phone: '+33 6 99 99 99 99' }));
    const mine = await assertSucceeds(getDocs(query(collection(ana, 'healthNotes'), where('ownerId', '==', 'ana'))));
    assert.equal(mine.size, 1);
    await assertSucceeds(setDoc(doc(ana, 'healthNotes/n2'), { ownerId: 'ana', text: 'Back pain after deadlifts' }));
    await assertSucceeds(updateDoc(doc(ana, 'healthNotes/n2'), { text: 'Back pain gone' }));
    await assertSucceeds(deleteDoc(doc(ana, 'healthNotes/n2')));
    assert.equal((await assertSucceeds(getDoc(doc(ana, 'coachProfiles/cora')))).data().rateCents, 6000);
    await assertSucceeds(getDoc(doc(ana, 'workouts/w-free')));
    await app.close();
  });

  test(`${version}: a new user signs up as a free client`, async () => {
    const app = await start(version);
    await assertSucceeds(setDoc(doc(app.as('dan'), 'users/dan'), { name: 'Dan', email: 'dan@example.test', phone: '', role: 'client', plan: 'free' }));
    await app.close();
  });

  test(`${version}: a client books at the coach's rate, the coach confirms, the client cancels`, async () => {
    const app = await start(version);
    const ben = app.as('ben');
    const cora = app.as('cora');
    await assertSucceeds(setDoc(doc(ben, 'bookings/b2'), { clientId: 'ben', coachId: 'cora', slot: '2026-11-04T18:00', status: 'requested', priceCents: 6000 }));
    const coachView = await assertSucceeds(getDocs(query(collection(cora, 'bookings'), where('coachId', '==', 'cora'))));
    assert.equal(coachView.size, 2);
    await assertSucceeds(updateDoc(doc(cora, 'bookings/b2'), { status: 'confirmed' }));
    await assertSucceeds(updateDoc(doc(ben, 'bookings/b2'), { status: 'cancelled' }));
    await app.close();
  });

  test(`${version}: a premium client opens premium workouts`, async () => {
    const app = await start(version);
    await app.env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), 'users/ana'), { plan: 'premium' }));
    await assertSucceeds(getDoc(doc(app.as('ana'), 'workouts/w-pro')));
    await app.close();
  });

  test(`${version}: a coach edits his public card`, async () => {
    const app = await start(version);
    await assertSucceeds(updateDoc(doc(app.as('cora'), 'coachProfiles/cora'), { bio: 'Strength and mobility coach' }));
    await app.close();
  });
}
