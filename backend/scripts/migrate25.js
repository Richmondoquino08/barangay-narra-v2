const db = require('../config/db');

// Real resident IDs confirmed by name match against the residents table
// (see docs/CHANGELOG.md for the lookup). 1202 was picked over its
// duplicate (1870, same person, imported ~2s apart) as the canonical row.
const OFFICIAL_LINKS = [
  { userEmail: 'captain@barangay.gov.ph',   fullName: 'ERNESTO DUMALAON DONCILLO', residentId: 1202 },
  { userEmail: 'treasurer@barangay.gov.ph', fullName: 'FELIX TAN BALDAD JR.',      residentId: 180 },
  { userEmail: 'secretary@barangay.gov.ph', fullName: 'MARYROSE BAYRON OQUIÑO',    residentId: 459 },
];

async function migrate() {
  console.log('Running migration 25 — resident-linked user accounts, intern role...');
  try {
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS resident_id INTEGER REFERENCES residents(id)`);
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_resident_id ON users(resident_id) WHERE resident_id IS NOT NULL`);

    await db.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
    await db.query(`ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role::text = ANY (ARRAY['admin','secretary','captain','treasurer','intern']::text[]))`);

    await db.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS intern_write_access BOOLEAN DEFAULT FALSE`);

    for (const o of OFFICIAL_LINKS) {
      const [rows] = await db.query('SELECT id FROM users WHERE email = ?', [o.userEmail]);
      if (rows.length === 0) { console.log(`  skip (not found): ${o.userEmail}`); continue; }
      await db.query('UPDATE users SET full_name = ?, resident_id = ? WHERE email = ?',
        [o.fullName, o.residentId, o.userEmail]);
      console.log(`  linked ${o.userEmail} -> resident #${o.residentId} (${o.fullName})`);
    }

    console.log('Migration 25 complete.');
  } catch (err) {
    console.error('Migration 25 error:', err.message);
  } finally {
    process.exit(0);
  }
}
migrate();
