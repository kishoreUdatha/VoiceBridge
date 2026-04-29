/**
 * Dedupe TelecallerCall rows created by the recording-upload race
 *
 * Background: before the fix to /telecaller/assigned-data/:id/recording, the
 * fallback lookup required status='INITIATED'. If /assigned-data/:id/status
 * had already flipped the row to COMPLETED, the recording handler couldn't
 * find it and created a second row. Result: pairs with the same
 * (telecallerId, phoneNumber, notes) within ~1 minute of each other.
 *
 * This script finds such pairs and deletes the older row of each pair,
 * keeping the newer row (which typically has the recordingUrl populated).
 *
 * Usage:
 *   Dry run (default):  DATABASE_URL=<url> npx ts-node scripts/dedupe-telecaller-calls.ts
 *   Apply deletes:      DATABASE_URL=<url> npx ts-node scripts/dedupe-telecaller-calls.ts --apply
 *
 * Window: pairs are considered duplicates only if createdAt is within
 * WINDOW_SECONDS of each other.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const WINDOW_SECONDS = 300;
const APPLY = process.argv.includes('--apply');

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY (deletes will run)' : 'DRY RUN (no changes)'}`);
  console.log(`Pair window: ${WINDOW_SECONDS}s\n`);

  const calls = await prisma.telecallerCall.findMany({
    where: {
      notes: { contains: 'Raw Import Record:' },
    },
    select: {
      id: true,
      telecallerId: true,
      phoneNumber: true,
      notes: true,
      createdAt: true,
      recordingUrl: true,
      duration: true,
      outcome: true,
      status: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Scanning ${calls.length} calls tied to raw import records...\n`);

  type Row = (typeof calls)[number];
  const groups = new Map<string, Row[]>();
  for (const c of calls) {
    if (!c.telecallerId || !c.phoneNumber || !c.notes) continue;
    const key = `${c.telecallerId}|${c.phoneNumber}|${c.notes}`;
    const arr = groups.get(key) ?? [];
    arr.push(c);
    groups.set(key, arr);
  }

  const toDelete: Row[] = [];
  for (const [, rows] of groups) {
    if (rows.length < 2) continue;
    // rows already sorted by createdAt asc. Walk pairs within window;
    // keep the newest row of each cluster, delete earlier rows in cluster.
    let i = 0;
    while (i < rows.length) {
      const cluster: Row[] = [rows[i]];
      let j = i + 1;
      while (
        j < rows.length &&
        rows[j].createdAt.getTime() - cluster[cluster.length - 1].createdAt.getTime() <=
          WINDOW_SECONDS * 1000
      ) {
        cluster.push(rows[j]);
        j++;
      }
      if (cluster.length > 1) {
        // Keep newest (last); delete the rest. Prefer keeping a row that has
        // a recordingUrl if the newest doesn't, since that's the more useful row.
        const withRecording = cluster.filter((c) => c.recordingUrl);
        const keep = withRecording.length > 0
          ? withRecording[withRecording.length - 1]
          : cluster[cluster.length - 1];
        for (const c of cluster) {
          if (c.id !== keep.id) toDelete.push(c);
        }
      }
      i = j;
    }
  }

  console.log(`Found ${toDelete.length} duplicate row(s) to delete.\n`);

  if (toDelete.length > 0) {
    console.log('Sample (first 10):');
    for (const c of toDelete.slice(0, 10)) {
      console.log(
        `  - ${c.id}  ${c.phoneNumber}  ${c.createdAt.toISOString()}  ` +
        `outcome=${c.outcome ?? 'null'}  duration=${c.duration ?? 0}  ` +
        `recordingUrl=${c.recordingUrl ? 'yes' : 'no'}`
      );
    }
    if (toDelete.length > 10) console.log(`  ... and ${toDelete.length - 10} more`);
  }

  if (!APPLY) {
    console.log('\nDry run complete. Re-run with --apply to delete the rows above.');
    return;
  }

  if (toDelete.length === 0) return;

  console.log('\nDeleting...');
  const ids = toDelete.map((c) => c.id);
  const result = await prisma.telecallerCall.deleteMany({ where: { id: { in: ids } } });
  console.log(`Deleted ${result.count} row(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
