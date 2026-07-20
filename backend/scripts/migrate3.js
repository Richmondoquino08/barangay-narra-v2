const { Pool } = require('pg');
require('dotenv').config({ path: '/home/enovo/barangay-narra/barangay-system/backend/.env' });

const pool = new Pool({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME, port: process.env.DB_PORT
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Residents: add new fields ──────────────────────────────────────────
    await client.query("ALTER TABLE residents ADD COLUMN IF NOT EXISTS purok VARCHAR(100)");
    await client.query("ALTER TABLE residents ADD COLUMN IF NOT EXISTS is_pwd BOOLEAN DEFAULT FALSE");
    await client.query("ALTER TABLE residents ADD COLUMN IF NOT EXISTS is_4ps BOOLEAN DEFAULT FALSE");
    await client.query("ALTER TABLE residents ADD COLUMN IF NOT EXISTS philhealth_number VARCHAR(50)");
    await client.query("ALTER TABLE residents ADD COLUMN IF NOT EXISTS email VARCHAR(100)");
    await client.query("ALTER TABLE residents ADD COLUMN IF NOT EXISTS nationality VARCHAR(50) DEFAULT 'Filipino'");
    await client.query("ALTER TABLE residents ADD COLUMN IF NOT EXISTS religion VARCHAR(100)");
    await client.query("ALTER TABLE residents ADD COLUMN IF NOT EXISTS educational_attainment VARCHAR(100)");
    console.log('✓ residents table updated');

    // ── Households table ───────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS households (
        id SERIAL PRIMARY KEY,
        household_number VARCHAR(50) UNIQUE,
        purok VARCHAR(100),
        head_resident_id INTEGER REFERENCES residents(id) ON DELETE SET NULL,
        address TEXT,
        total_members INTEGER DEFAULT 0,
        is_4ps BOOLEAN DEFAULT FALSE,
        is_indigenous BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query("CREATE INDEX IF NOT EXISTS idx_households_purok ON households(purok)");
    console.log('✓ households table created');

    // ── Certificates: expand type constraint & add fee/OR columns ──────────
    await client.query("ALTER TABLE certificates DROP CONSTRAINT IF EXISTS certificates_certificate_type_check");
    await client.query(`
      ALTER TABLE certificates ADD CONSTRAINT certificates_certificate_type_check
      CHECK (certificate_type IN (
        'barangay_clearance','residency','indigency','business_permit',
        'good_moral','ftjs','no_income','senior_citizen_cert','pwd_cert',
        'cohabitation','guardianship','travel_permit'
      ))
    `);
    await client.query("ALTER TABLE certificates ADD COLUMN IF NOT EXISTS or_number VARCHAR(50)");
    await client.query("ALTER TABLE certificates ADD COLUMN IF NOT EXISTS fee DECIMAL(10,2) DEFAULT 0");
    await client.query("ALTER TABLE certificates ADD COLUMN IF NOT EXISTS or_date DATE");
    await client.query("ALTER TABLE certificate_templates DROP CONSTRAINT IF EXISTS certificate_templates_certificate_type_check");
    await client.query(`
      ALTER TABLE certificate_templates ADD CONSTRAINT certificate_templates_certificate_type_check
      CHECK (certificate_type IN (
        'barangay_clearance','residency','indigency','business_permit',
        'good_moral','ftjs','no_income','senior_citizen_cert','pwd_cert',
        'cohabitation','guardianship','travel_permit'
      ))
    `);
    console.log('✓ certificates updated');

    // ── Blotter: new fields + expanded statuses ────────────────────────────
    await client.query("ALTER TABLE blotter_records DROP CONSTRAINT IF EXISTS blotter_records_status_check");
    await client.query(`
      ALTER TABLE blotter_records ADD CONSTRAINT blotter_records_status_check
      CHECK (status IN ('pending','mediation','settled','referred_pnp','referred_court','closed'))
    `);
    await client.query("ALTER TABLE blotter_records ADD COLUMN IF NOT EXISTS hearing_date DATE");
    await client.query("ALTER TABLE blotter_records ADD COLUMN IF NOT EXISTS kagawad_assigned VARCHAR(255)");
    await client.query("ALTER TABLE blotter_records ADD COLUMN IF NOT EXISTS complainant_name_manual VARCHAR(255)");
    await client.query("ALTER TABLE blotter_records ADD COLUMN IF NOT EXISTS respondent_name_manual VARCHAR(255)");
    console.log('✓ blotter_records updated');

    // ── Barangay Officials ─────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS barangay_officials (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        position VARCHAR(100) NOT NULL,
        committee TEXT,
        contact_number VARCHAR(20),
        term_start DATE,
        term_end DATE,
        photo_url VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INTEGER DEFAULT 99,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ barangay_officials table created');

    // ── Barangay Projects ─────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS barangay_projects (
        id SERIAL PRIMARY KEY,
        project_name VARCHAR(255) NOT NULL,
        description TEXT,
        project_type VARCHAR(100),
        budget DECIMAL(15,2) DEFAULT 0,
        amount_spent DECIMAL(15,2) DEFAULT 0,
        contractor VARCHAR(255),
        start_date DATE,
        end_date DATE,
        status VARCHAR(50) DEFAULT 'planning'
          CHECK (status IN ('planning','ongoing','completed','suspended')),
        progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
        fund_source VARCHAR(100),
        location VARCHAR(255),
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ barangay_projects table created');

    // ── Assets & Inventory ─────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS assets_inventory (
        id SERIAL PRIMARY KEY,
        item_name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        quantity INTEGER DEFAULT 1,
        unit VARCHAR(50),
        condition VARCHAR(50) DEFAULT 'Good'
          CHECK (condition IN ('Good','Fair','Poor','Condemned')),
        property_number VARCHAR(100),
        acquisition_date DATE,
        acquisition_cost DECIMAL(10,2),
        location VARCHAR(255),
        assigned_to VARCHAR(255),
        notes TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ assets_inventory table created');

    // ── 4Ps Beneficiaries ─────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS four_ps_beneficiaries (
        id SERIAL PRIMARY KEY,
        resident_id INTEGER REFERENCES residents(id) ON DELETE CASCADE,
        beneficiary_number VARCHAR(50),
        household_id INTEGER REFERENCES households(id) ON DELETE SET NULL,
        date_registered DATE,
        compliance_status VARCHAR(50) DEFAULT 'compliant'
          CHECK (compliance_status IN ('compliant','non_compliant','conditionally_compliant')),
        last_benefit_date DATE,
        dswd_referral BOOLEAN DEFAULT FALSE,
        dswd_referral_date DATE,
        notes TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ four_ps_beneficiaries table created');

    // ── PWD Registry ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS pwd_registry (
        id SERIAL PRIMARY KEY,
        resident_id INTEGER REFERENCES residents(id) ON DELETE CASCADE,
        disability_type VARCHAR(100),
        pwd_id_number VARCHAR(100),
        pwd_id_status VARCHAR(50) DEFAULT 'active'
          CHECK (pwd_id_status IN ('active','expired','pending','no_id')),
        date_registered DATE,
        id_expiry_date DATE,
        notes TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ pwd_registry table created');

    // ── OSCA / Senior Citizens Registry ───────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS osca_registry (
        id SERIAL PRIMARY KEY,
        resident_id INTEGER REFERENCES residents(id) ON DELETE CASCADE,
        osca_number VARCHAR(100),
        date_registered DATE,
        monthly_stipend DECIMAL(10,2) DEFAULT 0,
        last_stipend_date DATE,
        discount_card_status VARCHAR(50) DEFAULT 'active'
          CHECK (discount_card_status IN ('active','expired','pending')),
        is_active BOOLEAN DEFAULT TRUE,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ osca_registry table created');

    // ── BHW Roster ────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS bhw_roster (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        purok VARCHAR(100),
        contact_number VARCHAR(20),
        date_assigned DATE,
        training_date DATE,
        status VARCHAR(50) DEFAULT 'active'
          CHECK (status IN ('active','inactive')),
        area_covered TEXT,
        specialization VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ bhw_roster table created');

    // ── SK Officials ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sk_officials (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        position VARCHAR(100),
        age INTEGER,
        contact_number VARCHAR(20),
        term_start DATE,
        term_end DATE,
        is_oesy BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ sk_officials table created');

    // ── DRRM Incidents ────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS drrm_incidents (
        id SERIAL PRIMARY KEY,
        incident_title VARCHAR(255) NOT NULL,
        incident_type VARCHAR(100),
        incident_date TIMESTAMPTZ,
        location VARCHAR(255),
        alert_level VARCHAR(20) DEFAULT 'green'
          CHECK (alert_level IN ('green','yellow','orange','red')),
        status VARCHAR(50) DEFAULT 'active'
          CHECK (status IN ('active','monitoring','resolved')),
        affected_families INTEGER DEFAULT 0,
        affected_persons INTEGER DEFAULT 0,
        description TEXT,
        response_actions TEXT,
        reported_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ drrm_incidents table created');

    // ── System settings: certificate signatory + finance target ───────────
    await client.query("ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS signatory_name VARCHAR(255) DEFAULT ''");
    await client.query("ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS signatory_title VARCHAR(255) DEFAULT 'Punong Barangay'");
    await client.query("ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS monthly_collection_target DECIMAL(12,2) DEFAULT 0");

    await client.query('COMMIT');
    console.log('\n✅ Migration 3 completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => { console.error(e.message); process.exit(1); });