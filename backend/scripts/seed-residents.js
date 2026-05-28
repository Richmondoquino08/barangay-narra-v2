#!/usr/bin/env node
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'barangay_user',
  password: process.env.DB_PASSWORD || 'BarangayPass2024!',
  database: process.env.DB_NAME || 'barangay_system',
  port: parseInt(process.env.DB_PORT || '5432'),
});

const firstNames = {
  male:   ['Juan', 'Jose', 'Manuel', 'Ricardo', 'Eduardo', 'Roberto', 'Antonio', 'Carlos', 'Fernando', 'Miguel',
           'Ramon', 'Rodrigo', 'Ernesto', 'Alfredo', 'Danilo', 'Rolando', 'Nestor', 'Victorino', 'Renato', 'Jaime',
           'Marlon', 'Arnel', 'Dennis', 'Jeffrey', 'Mark', 'Christian', 'Ryan', 'John', 'Michael', 'Kenneth'],
  female: ['Maria', 'Ana', 'Luz', 'Rosa', 'Elena', 'Carmen', 'Lourdes', 'Corazon', 'Rosario', 'Teresita',
           'Gloria', 'Josefina', 'Marilou', 'Natividad', 'Adoracion', 'Erlinda', 'Remedios', 'Imelda', 'Felicitas', 'Norma',
           'Maricel', 'Jennifer', 'Christine', 'Kristine', 'Mary Grace', 'Lovely', 'Hazel', 'Erica', 'Joanna', 'Patricia']
};

const middleNames = ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Ocampo', 'Garcia', 'Mendoza', 'Torres', 'Flores', 'Aquino',
                     'Dela Cruz', 'Villanueva', 'Gonzales', 'Ramos', 'Castillo', 'Morales', 'Aguilar', 'Lim', 'Tan', 'Chan'];

const lastNames  = ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Ocampo', 'Garcia', 'Mendoza', 'Torres', 'Flores', 'Aquino',
                    'Dela Cruz', 'Villanueva', 'Gonzales', 'Ramos', 'Castillo', 'Morales', 'Aguilar', 'Ferrer', 'Pascual',
                    'Navarro', 'Guevara', 'Salazar', 'Diaz', 'Ortiz', 'Magno', 'Padilla', 'Vega', 'Soriano', 'Enriquez', 'Magsino'];

const puroks    = ['Purok 1 - Sampaguita', 'Purok 2 - Rosal', 'Purok 3 - Ilang-Ilang', 'Purok 4 - Gumamela',
                   'Purok 5 - Camia', 'Purok 6 - Dahlia', 'Purok 7 - Jasmine', 'Purok 8 - Adelfa'];

const occupations = ['Farmer', 'Fisherman', 'Teacher', 'Nurse', 'Driver', 'Carpenter', 'Vendor', 'Housewife',
                     'Government Employee', 'OFW', 'Student', 'Engineer', 'Mechanic', 'Laundrywoman', 'Security Guard',
                     'Barangay Tanod', 'Store Owner', 'Electrician', 'Plumber', 'Tricycle Driver'];

const civilStatuses = ['single', 'married', 'widowed', 'divorced'];
const genders       = ['male', 'female'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function randomBirthDate(minAge, maxAge) {
  const now   = new Date();
  const year  = now.getFullYear() - rand(minAge, maxAge);
  const month = String(rand(1, 12)).padStart(2, '0');
  const day   = String(rand(1, 28)).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function randomPhone() {
  return `09${rand(10, 99)}${rand(1000000, 9999999)}`;
}

async function main() {
  // Get admin user id
  const { rows: admins } = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (!admins.length) { console.error('No admin user found. Run create-users.js first.'); process.exit(1); }
  const adminId = admins[0].id;

  console.log('Inserting 100 residents into Barangay Narra...\n');

  for (let i = 1; i <= 100; i++) {
    const gender     = pick(genders);
    const firstName  = pick(firstNames[gender]);
    const middleName = pick(middleNames);
    const lastName   = pick(lastNames);
    const age        = rand(5, 85);
    const birthDate  = randomBirthDate(age, age);
    const purok      = pick(puroks);
    const address    = `${rand(1, 999)} ${purok}, Barangay Narra, Narra, Palawan`;
    const civilStatus = age < 18 ? 'single' : pick(civilStatuses);
    const voter      = age >= 18 && Math.random() > 0.25;
    const senior     = age >= 60;
    const occupation = age < 7 ? null : pick(occupations);
    const contact    = Math.random() > 0.2 ? randomPhone() : null;
    const household  = rand(1, 30);

    await pool.query(`
      INSERT INTO residents
        (first_name, middle_name, last_name, gender, birth_date, address,
         civil_status, contact_number, occupation, voter_status, senior_citizen,
         household_id, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    `, [firstName, middleName, lastName, gender, birthDate, address,
        civilStatus, contact, occupation, voter, senior, household, adminId]);

    const fullName = `${firstName} ${middleName} ${lastName}`;
    process.stdout.write(`  [${String(i).padStart(3, '0')}] ${fullName.padEnd(35)} ${gender.padEnd(7)} Age:${String(age).padStart(2)} ${voter ? '🗳️' : '  '} ${senior ? '👴' : ''}\n`);
  }

  await pool.end();
  console.log('\n✅ 100 residents inserted successfully!');
  console.log('   Go to Residents page to view them.\n');
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });