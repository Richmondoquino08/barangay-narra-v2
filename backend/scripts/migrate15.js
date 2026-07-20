const db = require('../config/db');

async function migrate() {
  console.log('Running migration 15 — Finance Phase 1 (Barangay ID, KIDLAT, Trip Ticket)...');
  try {
    // ── Module 1: Barangay ID applications ──
    await db.query(`
      CREATE TABLE IF NOT EXISTS brgy_id_applications (
        id              SERIAL PRIMARY KEY,
        ref_no          VARCHAR(30),
        first_name      VARCHAR(120) NOT NULL,
        middle_name     VARCHAR(120) DEFAULT '',
        surname         VARCHAR(120) NOT NULL,
        house_no        VARCHAR(60)  DEFAULT '',
        street          VARCHAR(120) DEFAULT '',
        barangay        VARCHAR(120) DEFAULT 'Narra',
        city            VARCHAR(120) DEFAULT 'San Pedro',
        province        VARCHAR(120) DEFAULT 'Laguna',
        date_of_birth   DATE,
        gender          VARCHAR(20)  DEFAULT '',
        emergency_name     VARCHAR(160) DEFAULT '',
        emergency_contact  VARCHAR(60)  DEFAULT '',
        emergency_address  VARCHAR(255) DEFAULT '',
        status          VARCHAR(20)  DEFAULT 'pending',
        date_applied    DATE DEFAULT CURRENT_DATE,
        created_at      TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── Module 2: KIDLAT members ──
    await db.query(`
      CREATE TABLE IF NOT EXISTS kidlat_members (
        id              SERIAL PRIMARY KEY,
        ref_no          VARCHAR(30),
        given_name      VARCHAR(120) NOT NULL,
        last_name       VARCHAR(120) NOT NULL,
        middle_name     VARCHAR(120) DEFAULT '',
        address         VARCHAR(255) DEFAULT '',
        date_of_birth   DATE,
        place_of_birth  VARCHAR(160) DEFAULT '',
        phone           VARCHAR(60)  DEFAULT '',
        email           VARCHAR(160) DEFAULT '',
        marital_status  VARCHAR(20)  DEFAULT 'Single',
        gender          VARCHAR(20)  DEFAULT '',
        nationality     VARCHAR(60)  DEFAULT 'Filipino',
        emergency_name        VARCHAR(160) DEFAULT '',
        emergency_address     VARCHAR(255) DEFAULT '',
        emergency_contact     VARCHAR(60)  DEFAULT '',
        emergency_relationship VARCHAR(80) DEFAULT '',
        date_registered DATE DEFAULT CURRENT_DATE,
        created_at      TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── Module 3: Driver's Trip Tickets ──
    await db.query(`
      CREATE TABLE IF NOT EXISTS trip_tickets (
        id              SERIAL PRIMARY KEY,
        ref_no          VARCHAR(30),
        trip_date       DATE,
        driver_name     VARCHAR(160) NOT NULL,
        plate_no        VARCHAR(60)  DEFAULT '',
        places_visited  TEXT DEFAULT '',
        purpose         TEXT DEFAULT '',
        time_departure  VARCHAR(40)  DEFAULT '',
        time_arrival    VARCHAR(40)  DEFAULT '',
        distance_km     NUMERIC(10,2) DEFAULT 0,
        gas_balance_start  NUMERIC(10,2) DEFAULT 0,
        gas_purchased      NUMERIC(10,2) DEFAULT 0,
        gas_total          NUMERIC(10,2) DEFAULT 0,
        gas_consumed       NUMERIC(10,2) DEFAULT 0,
        gas_balance_end    NUMERIC(10,2) DEFAULT 0,
        gear_oil        VARCHAR(60) DEFAULT '',
        lubricating_oil VARCHAR(60) DEFAULT '',
        grease_oil      VARCHAR(60) DEFAULT '',
        speedometer     NUMERIC(12,2) DEFAULT 0,
        remarks         TEXT DEFAULT '',
        created_at      TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Migration 15 complete.');
  } catch (err) {
    console.error('Migration 15 error:', err.message);
  } finally {
    process.exit(0);
  }
}

migrate();
