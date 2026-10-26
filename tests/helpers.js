import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';

const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8181').split(':');

// One emulator, two projects: demo-flawed runs the rules as delivered, demo-fixed the rules
// after the review. Each test gets fresh data.
export async function start(version) {
  const env = await initializeTestEnvironment({
    projectId: `demo-${version}`,
    firestore: { host, port: Number(port), rules: readFileSync(new URL(`../rules/${version}.rules`, import.meta.url), 'utf8') },
  });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/ana'), { name: 'Ana', email: 'ana@example.test', phone: '+33 6 00 00 00 01', role: 'client', plan: 'free' });
    await setDoc(doc(db, 'users/ben'), { name: 'Ben', email: 'ben@example.test', phone: '+33 6 00 00 00 02', role: 'client', plan: 'free' });
    await setDoc(doc(db, 'users/cora'), { name: 'Cora', email: 'cora@example.test', phone: '+33 6 00 00 00 03', role: 'coach', plan: 'free' });
    await setDoc(doc(db, 'coachProfiles/cora'), { name: 'Cora', bio: 'Strength coach', rateCents: 6000 });
    await setDoc(doc(db, 'workouts/w-free'), { title: 'Mobility basics', premium: false });
    await setDoc(doc(db, 'workouts/w-pro'), { title: '12-week strength plan', premium: true });
    await setDoc(doc(db, 'bookings/b1'), { clientId: 'ana', coachId: 'cora', slot: '2026-11-03T18:00', status: 'requested', priceCents: 6000 });
    await setDoc(doc(db, 'healthNotes/n1'), { ownerId: 'ana', text: 'Knee surgery in March, on anticoagulants' });
  });
  return {
    env,
    as: (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore(),
    close: () => env.cleanup(),
  };
}
