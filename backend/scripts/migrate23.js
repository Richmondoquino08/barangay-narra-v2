const db = require('../config/db');

// 'residency_simple' was a duplicate of 'residency' (both meant "proof of
// residency" — the only difference was a broken literal placeholder in
// 'residency', now fixed). Confirmed unused (0 certificates, 0 templates)
// before removal.
const CERTIFICATE_TYPES = [
  'barangay_clearance', 'residency', 'indigency', 'business_permit',
  'good_moral', 'ftjs', 'no_income', 'senior_citizen_cert', 'pwd_cert',
  'cohabitation', 'guardianship', 'travel_permit',
  'cert_ftj', 'affidavit_of_loss', 'bail_bond', 'clearance_thumbmark',
  'residency_thumbmark', 'cert_death', 'solo_parent', 'cert_appearance',
  'business_closure', 'cert_loan', 'no_fixed_income', 'cohabitation_dswd',
  'tanod_death_claim', 'delayed_registration', 'cert_employment',
  'permit_to_transfer', 'endorsement_letter',
];

async function migrate() {
  console.log("Running migration 23 — Remove duplicate 'residency_simple' certificate type...");
  try {
    const [check] = await db.query(`SELECT COUNT(*)::int AS n FROM certificates WHERE certificate_type = 'residency_simple'`);
    if (check[0].n > 0) {
      console.error(`Aborting: ${check[0].n} certificate(s) still use 'residency_simple'.`);
      process.exit(1);
    }

    const typeList = CERTIFICATE_TYPES.map(t => `'${t}'`).join(',');

    await db.query(`ALTER TABLE certificates DROP CONSTRAINT IF EXISTS certificates_certificate_type_check`);
    await db.query(`
      ALTER TABLE certificates ADD CONSTRAINT certificates_certificate_type_check
      CHECK (certificate_type IN (${typeList}))
    `);

    await db.query(`ALTER TABLE certificate_templates DROP CONSTRAINT IF EXISTS certificate_templates_certificate_type_check`);
    await db.query(`
      ALTER TABLE certificate_templates ADD CONSTRAINT certificate_templates_certificate_type_check
      CHECK (certificate_type IN (${typeList}))
    `);

    console.log('Migration 23 complete.');
  } catch (err) {
    console.error('Migration 23 error:', err.message);
  } finally {
    process.exit(0);
  }
}
migrate();
