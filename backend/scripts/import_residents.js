/**
 * Resident Import Script
 * Usage: node scripts/import_residents.js <path-to-csv>
 * Options:
 *   --delete-all   Delete ALL existing residents first
 *   --delete-test  Delete only rows where notes contains 'test' or full_name contains 'Test'
 *   --dry-run      Parse CSV and show preview without inserting
 */

const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'barangay_user',
  password: process.env.DB_PASSWORD || 'BarangayPass2024!',
  database: process.env.DB_NAME     || 'barangay_system',
  port:     parseInt(process.env.DB_PORT || '5432'),
});

// ── CSV parser (handles quoted fields with commas inside) ─────────────────
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const rows  = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i+1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (c === ',' && !inQ) {
        cols.push(cur.trim()); cur = '';
      } else {
        cur += c;
      }
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

// ── Column name normalizer ────────────────────────────────────────────────
function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ── Map raw header → system field ─────────────────────────────────────────
function mapHeader(h) {
  const n = norm(h);
  const MAP = {
    // Last name
    lastname: 'last_name', familyname: 'last_name', surname: 'last_name',
    // First name
    firstname: 'first_name', givenname: 'first_name',
    // Middle name
    middlename: 'middle_name', mn: 'middle_name',
    // Gender / sex
    gender: 'gender', sex: 'gender',
    // Birth date
    dateofbirth: 'birth_date', birthday: 'birth_date', dob: 'birth_date', birthdate: 'birth_date',
    // Civil status
    civilstatus: 'civil_status', status: 'civil_status', maritalstatus: 'civil_status',
    // Address
    address: 'address', streetaddress: 'address',
    // Purok / sitio
    purok: 'purok', sitio: 'purok', zone: 'purok',
    // Contact
    contact: 'contact_number', contactnumber: 'contact_number', mobilenumber: 'contact_number',
    mobileno: 'contact_number', cellphone: 'contact_number', phone: 'contact_number',
    // Occupation
    occupation: 'occupation', work: 'occupation', employment: 'occupation',
    // Education
    educationalattainment: 'educational_attainment', education: 'educational_attainment',
    highesteducation: 'educational_attainment',
    // Nationality
    nationality: 'nationality',
    // Religion
    religion: 'religion',
    // Email
    email: 'email', emailaddress: 'email',
    // PhilHealth
    philhealthnumber: 'philhealth_number', philhealth: 'philhealth_number',
    // Voter
    voterstatus: 'voter_status', voter: 'voter_status', registered: 'voter_status',
    // Senior citizen
    seniorcitizen: 'senior_citizen', senior: 'senior_citizen',
    // PWD
    pwd: 'is_pwd', personwithdisability: 'is_pwd',
    // 4Ps
    '4ps': 'is_4ps', fourps: 'is_4ps', beneficiary: 'is_4ps',
  };
  return MAP[n] || null;
}

// ── Gender normalizer ─────────────────────────────────────────────────────
function parseGender(v) {
  const s = norm(v);
  if (['male','m','lalaki'].includes(s))   return 'male';
  if (['female','f','babae'].includes(s))  return 'female';
  return 'other';
}

// ── Civil status normalizer ───────────────────────────────────────────────
function parseCivil(v) {
  const s = norm(v);
  if (s.includes('single'))   return 'single';
  if (s.includes('married'))  return 'married';
  if (s.includes('widow'))    return 'widowed';
  if (s.includes('divorce'))  return 'divorced';
  return 'single';
}

// ── Date normalizer ───────────────────────────────────────────────────────
function parseDate(v) {
  if (!v || !v.trim()) return null;
  const s = v.trim();
  // Already ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // MM/DD/YYYY or DD/MM/YYYY
  const parts = s.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number);
    if (c > 1900) return `${c}-${String(a).padStart(2,'0')}-${String(b).padStart(2,'0')}`;
    if (a > 1900) return `${a}-${String(b).padStart(2,'0')}-${String(c).padStart(2,'0')}`;
  }
  // Month name: "January 15, 1990" or "15-Jan-90"
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString().split('T')[0];
  return null;
}

function parseBool(v) {
  return ['yes','true','1','oo'].includes(norm(v));
}

async function main() {
  const args    = process.argv.slice(2);
  const csvFile = args.find(a => !a.startsWith('--'));
  const delAll  = args.includes('--delete-all');
  const delTest = args.includes('--delete-test');
  const dryRun  = args.includes('--dry-run');

  if (!csvFile && !delAll && !delTest) {
    console.log('Usage: node scripts/import_residents.js <file.csv> [--delete-all|--delete-test] [--dry-run]');
    console.log('       node scripts/import_residents.js --delete-all   (delete all residents, no CSV needed)');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    // ── Delete existing residents ────────────────────────────────────────
    if (delAll) {
      if (!dryRun) {
        const { rowCount } = await client.query('DELETE FROM residents');
        console.log(`✓ Deleted ${rowCount} existing residents.`);
      } else {
        const { rows } = await client.query('SELECT COUNT(*) FROM residents');
        console.log(`[DRY RUN] Would delete ${rows[0].count} residents.`);
      }
    } else if (delTest) {
      if (!dryRun) {
        const { rowCount } = await client.query(
          `DELETE FROM residents WHERE LOWER(first_name) LIKE '%test%' OR LOWER(last_name) LIKE '%test%'
           OR LOWER(first_name) LIKE '%sample%' OR LOWER(last_name) LIKE '%dela cruz%'
           AND LOWER(first_name) IN ('juan','maria','jose','pedro','antonio')`
        );
        console.log(`✓ Deleted ${rowCount} test residents.`);
      }
    }

    if (!csvFile) { console.log('Done.'); return; }

    // ── Parse CSV ────────────────────────────────────────────────────────
    const filePath = path.resolve(csvFile);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`); process.exit(1);
    }

    const text = fs.readFileSync(filePath, 'utf8');
    const rows = parseCSV(text);
    if (rows.length < 2) { console.error('CSV has no data rows'); process.exit(1); }

    const rawHeaders = rows[0];
    const headers    = rawHeaders.map(mapHeader);

    console.log('\n── Column mapping ──────────────────────────────────────');
    rawHeaders.forEach((h, i) => {
      console.log(`  "${h}" → ${headers[i] || '(skipped)'}`);
    });
    console.log('────────────────────────────────────────────────────────\n');

    const hasFirst = headers.includes('first_name');
    const hasLast  = headers.includes('last_name');
    if (!hasFirst && !hasLast) {
      console.error('ERROR: Cannot find first_name or last_name columns. Check your CSV headers.');
      process.exit(1);
    }

    const dataRows = rows.slice(1);
    let imported = 0, skipped = 0;
    const errors = [];

    for (let i = 0; i < dataRows.length; i++) {
      const cols = dataRows[i];
      if (cols.every(c => !c)) continue; // blank line

      // Build record from column mapping
      const raw = {};
      headers.forEach((field, idx) => {
        if (field) raw[field] = cols[idx] || '';
      });

      const firstName = (raw.first_name || '').trim();
      const lastName  = (raw.last_name  || '').trim();

      if (!firstName && !lastName) { skipped++; continue; }

      const record = {
        first_name:              firstName,
        middle_name:             (raw.middle_name || '').trim(),
        last_name:               lastName,
        gender:                  parseGender(raw.gender || raw.sex || 'male'),
        birth_date:              parseDate(raw.birth_date),
        address:                 (raw.address || 'Barangay Narra, Narra, Palawan').trim(),
        purok:                   (raw.purok || '').trim(),
        civil_status:            parseCivil(raw.civil_status || 'single'),
        contact_number:          (raw.contact_number || '').trim(),
        occupation:              (raw.occupation || '').trim(),
        email:                   (raw.email || '').trim() || null,
        nationality:             (raw.nationality || 'Filipino').trim(),
        religion:                (raw.religion || '').trim(),
        educational_attainment:  (raw.educational_attainment || '').trim(),
        philhealth_number:       (raw.philhealth_number || '').trim() || null,
        voter_status:            parseBool(raw.voter_status) ? 'registered' : 'unregistered',
        senior_citizen:          parseBool(raw.senior_citizen),
        is_pwd:                  parseBool(raw.is_pwd),
        is_4ps:                  parseBool(raw.is_4ps),
      };

      if (dryRun) {
        if (i < 5) console.log(`  [Row ${i+2}]`, record.last_name + ', ' + record.first_name, '| DOB:', record.birth_date, '| Purok:', record.purok);
        imported++;
        continue;
      }

      try {
        await client.query(
          `INSERT INTO residents
            (first_name, middle_name, last_name, gender, birth_date, address, purok,
             civil_status, contact_number, occupation, email, nationality, religion,
             educational_attainment, philhealth_number, voter_status, senior_citizen, is_pwd, is_4ps)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
          [
            record.first_name, record.middle_name, record.last_name,
            record.gender, record.birth_date, record.address, record.purok,
            record.civil_status, record.contact_number, record.occupation,
            record.email, record.nationality, record.religion,
            record.educational_attainment, record.philhealth_number,
            record.voter_status, record.senior_citizen, record.is_pwd, record.is_4ps,
          ]
        );
        imported++;
        if (imported % 50 === 0) process.stdout.write(`  Imported ${imported}...\r`);
      } catch (err) {
        errors.push({ row: i + 2, name: `${firstName} ${lastName}`, error: err.message });
      }
    }

    console.log(`\n✓ Import complete:`);
    console.log(`  Imported : ${imported}`);
    console.log(`  Skipped  : ${skipped}`);
    console.log(`  Errors   : ${errors.length}`);
    if (errors.length) {
      console.log('\nErrors:');
      errors.slice(0, 20).forEach(e => console.log(`  Row ${e.row} – ${e.name}: ${e.error}`));
    }

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
