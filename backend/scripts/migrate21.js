const db = require('../config/db');

const CERTIFICATE_TYPES = [
  'barangay_clearance', 'residency', 'indigency', 'business_permit',
  'good_moral', 'ftjs', 'no_income', 'senior_citizen_cert', 'pwd_cert',
  'cohabitation', 'guardianship', 'travel_permit',
  'cert_ftj', 'affidavit_of_loss', 'bail_bond', 'clearance_thumbmark',
  'residency_thumbmark', 'cert_death', 'solo_parent', 'cert_appearance',
  'business_closure', 'cert_loan', 'no_fixed_income', 'cohabitation_dswd',
  'tanod_death_claim', 'delayed_registration', 'cert_employment',
  'residency_simple', 'permit_to_transfer', 'endorsement_letter',
];

async function migrate() {
  console.log('Running migration 21 — Expand certificate_type constraints + add custom_fields column...');
  try {
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

    await db.query(`ALTER TABLE certificates ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb`);

    console.log('Migration 21 complete.');
  } catch (err) {
    console.error('Migration 21 error:', err.message);
  } finally {
    process.exit(0);
  }
}
migrate();
