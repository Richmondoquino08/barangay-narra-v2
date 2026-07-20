const db = require('../config/db');

// ── Auto reference number: PREFIX-YYYY-MM-NNN ──
async function nextRef(table, prefix) {
  const ym = new Date().toISOString().slice(0, 7); // YYYY-MM
  const [rows] = await db.query(
    `SELECT COUNT(*)::int AS n FROM ${table} WHERE ref_no LIKE ?`,
    [`${prefix}-${ym}-%`]
  );
  const n = String((rows[0]?.n || 0) + 1).padStart(3, '0');
  return `${prefix}-${ym}-${n}`;
}

/* ═══════════════ MODULE 1 — BARANGAY ID ═══════════════ */
const brgyId = {
  async list(req, res, next) {
    try {
      const [rows] = await db.query('SELECT * FROM brgy_id_applications ORDER BY created_at DESC');
      res.json({ applications: rows });
    } catch (e) { next(e); }
  },
  async create(req, res, next) {
    try {
      const b = req.body;
      if (!b.first_name || !b.surname) return res.status(400).json({ message: 'First name and surname required' });
      const ref = await nextRef('brgy_id_applications', 'BID');
      const [r] = await db.query(
        `INSERT INTO brgy_id_applications
         (ref_no, first_name, middle_name, surname, house_no, street, barangay, city, province,
          date_of_birth, gender, emergency_name, emergency_contact, emergency_address, status, date_applied)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [ref, b.first_name, b.middle_name||'', b.surname, b.house_no||'', b.street||'',
         b.barangay||'Narra', b.city||'San Pedro', b.province||'Laguna',
         b.date_of_birth||null, b.gender||'', b.emergency_name||'', b.emergency_contact||'',
         b.emergency_address||'', b.status||'pending', b.date_applied||new Date()]
      );
      res.status(201).json({ message: 'ID application saved', id: r.insertId, ref_no: ref });
    } catch (e) { next(e); }
  },
  async update(req, res, next) {
    try {
      const b = req.body;
      await db.query(
        `UPDATE brgy_id_applications SET first_name=?, middle_name=?, surname=?, house_no=?, street=?,
         barangay=?, city=?, province=?, date_of_birth=?, gender=?, emergency_name=?, emergency_contact=?,
         emergency_address=?, status=? WHERE id=?`,
        [b.first_name, b.middle_name||'', b.surname, b.house_no||'', b.street||'',
         b.barangay||'Narra', b.city||'San Pedro', b.province||'Laguna', b.date_of_birth||null,
         b.gender||'', b.emergency_name||'', b.emergency_contact||'', b.emergency_address||'',
         b.status||'pending', req.params.id]
      );
      res.json({ message: 'ID application updated' });
    } catch (e) { next(e); }
  },
  async remove(req, res, next) {
    try { await db.query('DELETE FROM brgy_id_applications WHERE id=?', [req.params.id]); res.json({ message: 'Deleted' }); }
    catch (e) { next(e); }
  },
};

/* ═══════════════ MODULE 2 — KIDLAT ═══════════════ */
const kidlat = {
  async list(req, res, next) {
    try {
      const [rows] = await db.query('SELECT * FROM kidlat_members ORDER BY created_at DESC');
      res.json({ members: rows });
    } catch (e) { next(e); }
  },
  async create(req, res, next) {
    try {
      const b = req.body;
      if (!b.given_name || !b.last_name) return res.status(400).json({ message: 'Name required' });
      const ref = await nextRef('kidlat_members', 'KID');
      const [r] = await db.query(
        `INSERT INTO kidlat_members
         (ref_no, given_name, last_name, middle_name, address, date_of_birth, place_of_birth,
          phone, email, marital_status, gender, nationality, emergency_name, emergency_address,
          emergency_contact, emergency_relationship, date_registered)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [ref, b.given_name, b.last_name, b.middle_name||'', b.address||'', b.date_of_birth||null,
         b.place_of_birth||'', b.phone||'', b.email||'', b.marital_status||'Single', b.gender||'',
         b.nationality||'Filipino', b.emergency_name||'', b.emergency_address||'', b.emergency_contact||'',
         b.emergency_relationship||'', b.date_registered||new Date()]
      );
      res.status(201).json({ message: 'KIDLAT member registered', id: r.insertId, ref_no: ref });
    } catch (e) { next(e); }
  },
  async update(req, res, next) {
    try {
      const b = req.body;
      await db.query(
        `UPDATE kidlat_members SET given_name=?, last_name=?, middle_name=?, address=?, date_of_birth=?,
         place_of_birth=?, phone=?, email=?, marital_status=?, gender=?, nationality=?, emergency_name=?,
         emergency_address=?, emergency_contact=?, emergency_relationship=?, date_registered=? WHERE id=?`,
        [b.given_name, b.last_name, b.middle_name||'', b.address||'', b.date_of_birth||null,
         b.place_of_birth||'', b.phone||'', b.email||'', b.marital_status||'Single', b.gender||'',
         b.nationality||'Filipino', b.emergency_name||'', b.emergency_address||'', b.emergency_contact||'',
         b.emergency_relationship||'', b.date_registered||null, req.params.id]
      );
      res.json({ message: 'Member updated' });
    } catch (e) { next(e); }
  },
  async remove(req, res, next) {
    try { await db.query('DELETE FROM kidlat_members WHERE id=?', [req.params.id]); res.json({ message: 'Deleted' }); }
    catch (e) { next(e); }
  },
};

/* ═══════════════ MODULE 3 — TRIP TICKET ═══════════════ */
const trip = {
  async list(req, res, next) {
    try {
      const [rows] = await db.query('SELECT * FROM trip_tickets ORDER BY created_at DESC');
      res.json({ tickets: rows });
    } catch (e) { next(e); }
  },
  async create(req, res, next) {
    try {
      const b = req.body;
      if (!b.driver_name) return res.status(400).json({ message: 'Driver name required' });
      const ref = await nextRef('trip_tickets', 'TT');
      const total = Number(b.gas_balance_start||0) + Number(b.gas_purchased||0);
      const endBal = total - Number(b.gas_consumed||0);
      const [r] = await db.query(
        `INSERT INTO trip_tickets
         (ref_no, trip_date, driver_name, plate_no, places_visited, purpose, time_departure, time_arrival,
          distance_km, gas_balance_start, gas_purchased, gas_total, gas_consumed, gas_balance_end,
          gear_oil, lubricating_oil, grease_oil, speedometer, remarks)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [ref, b.trip_date||null, b.driver_name, b.plate_no||'', b.places_visited||'', b.purpose||'',
         b.time_departure||'', b.time_arrival||'', b.distance_km||0, b.gas_balance_start||0,
         b.gas_purchased||0, total, b.gas_consumed||0, endBal, b.gear_oil||'', b.lubricating_oil||'',
         b.grease_oil||'', b.speedometer||0, b.remarks||'']
      );
      res.status(201).json({ message: 'Trip ticket saved', id: r.insertId, ref_no: ref });
    } catch (e) { next(e); }
  },
  async update(req, res, next) {
    try {
      const b = req.body;
      const total = Number(b.gas_balance_start||0) + Number(b.gas_purchased||0);
      const endBal = total - Number(b.gas_consumed||0);
      await db.query(
        `UPDATE trip_tickets SET trip_date=?, driver_name=?, plate_no=?, places_visited=?, purpose=?,
         time_departure=?, time_arrival=?, distance_km=?, gas_balance_start=?, gas_purchased=?, gas_total=?,
         gas_consumed=?, gas_balance_end=?, gear_oil=?, lubricating_oil=?, grease_oil=?, speedometer=?, remarks=?
         WHERE id=?`,
        [b.trip_date||null, b.driver_name, b.plate_no||'', b.places_visited||'', b.purpose||'',
         b.time_departure||'', b.time_arrival||'', b.distance_km||0, b.gas_balance_start||0, b.gas_purchased||0,
         total, b.gas_consumed||0, endBal, b.gear_oil||'', b.lubricating_oil||'', b.grease_oil||'',
         b.speedometer||0, b.remarks||'', req.params.id]
      );
      res.json({ message: 'Trip ticket updated' });
    } catch (e) { next(e); }
  },
  async remove(req, res, next) {
    try { await db.query('DELETE FROM trip_tickets WHERE id=?', [req.params.id]); res.json({ message: 'Deleted' }); }
    catch (e) { next(e); }
  },
};

/* ═══════════════ MODULE 4 — PETTY CASH FUND (PCF) ═══════════════ */
const pcf = {
  async list(req, res, next) {
    try {
      const [rows] = await db.query('SELECT * FROM petty_cash_funds ORDER BY created_at DESC');
      res.json({ funds: rows });
    } catch (e) { next(e); }
  },
  async create(req, res, next) {
    try {
      const b = req.body;
      if (!b.custodian_name || !b.fund_amount) return res.status(400).json({ message: 'Custodian and fund amount required' });
      const ref = await nextRef('petty_cash_funds', 'PCF');
      const amount = Number(b.fund_amount || 0);
      const [r] = await db.query(
        `INSERT INTO petty_cash_funds (ref_no, custodian_name, date_established, fund_amount, current_balance, status, remarks)
         VALUES (?,?,?,?,?,?,?)`,
        [ref, b.custodian_name, b.date_established || new Date(), amount, amount, b.status || 'active', b.remarks || '']
      );
      res.status(201).json({ message: 'Petty cash fund established', id: r.insertId, ref_no: ref });
    } catch (e) { next(e); }
  },
  async update(req, res, next) {
    try {
      const b = req.body;
      await db.query(
        `UPDATE petty_cash_funds SET custodian_name=?, date_established=?, fund_amount=?, status=?, remarks=? WHERE id=?`,
        [b.custodian_name, b.date_established || null, b.fund_amount || 0, b.status || 'active', b.remarks || '', req.params.id]
      );
      res.json({ message: 'Fund updated' });
    } catch (e) { next(e); }
  },
  async remove(req, res, next) {
    try { await db.query('DELETE FROM petty_cash_funds WHERE id=?', [req.params.id]); res.json({ message: 'Deleted' }); }
    catch (e) { next(e); }
  },
};

/* ═══════════════ MODULE 5 — SPPCV (Summary of Paid Petty Cash Vouchers) ═══════════════
   Automation: every voucher posted against a PCF automatically deducts from that
   fund's current_balance, and the running balance_after is stamped on the voucher. */
const sppcv = {
  async list(req, res, next) {
    try {
      const where = req.query.pcf_id ? 'WHERE v.pcf_id = ?' : '';
      const params = req.query.pcf_id ? [req.query.pcf_id] : [];
      const [rows] = await db.query(
        `SELECT v.*, f.custodian_name, f.ref_no AS pcf_ref_no
         FROM petty_cash_vouchers v
         JOIN petty_cash_funds f ON f.id = v.pcf_id
         ${where}
         ORDER BY v.created_at DESC`, params
      );
      res.json({ vouchers: rows });
    } catch (e) { next(e); }
  },
  async create(req, res, next) {
    try {
      const b = req.body;
      if (!b.pcf_id || !b.payee || !b.amount) return res.status(400).json({ message: 'Fund, payee and amount required' });
      const [fundRows] = await db.query('SELECT * FROM petty_cash_funds WHERE id=?', [b.pcf_id]);
      const fund = fundRows[0];
      if (!fund) return res.status(404).json({ message: 'Petty cash fund not found' });
      const amount = Number(b.amount || 0);
      if (amount > Number(fund.current_balance)) {
        return res.status(400).json({ message: `Insufficient PCF balance. Available: ${fund.current_balance}` });
      }
      const newBalance = Number(fund.current_balance) - amount;
      const ref = await nextRef('petty_cash_vouchers', 'PCV');
      const [r] = await db.query(
        `INSERT INTO petty_cash_vouchers (ref_no, pcf_id, pcv_date, payee, particulars, account_code, amount, balance_after)
         VALUES (?,?,?,?,?,?,?,?)`,
        [ref, b.pcf_id, b.pcv_date || new Date(), b.payee, b.particulars || '', b.account_code || '', amount, newBalance]
      );
      // Auto-link: deduct from PCF running balance
      await db.query('UPDATE petty_cash_funds SET current_balance=? WHERE id=?', [newBalance, b.pcf_id]);
      res.status(201).json({ message: 'Voucher posted', id: r.insertId, ref_no: ref, balance_after: newBalance });
    } catch (e) { next(e); }
  },
  async update(req, res, next) {
    try {
      const b = req.body;
      const [voucherRows] = await db.query('SELECT * FROM petty_cash_vouchers WHERE id=?', [req.params.id]);
      const voucher = voucherRows[0];
      if (!voucher) return res.status(404).json({ message: 'Voucher not found' });
      const [fundRows] = await db.query('SELECT * FROM petty_cash_funds WHERE id=?', [voucher.pcf_id]);
      const fund = fundRows[0];
      // Restore old amount, then deduct new amount
      const restored = Number(fund.current_balance) + Number(voucher.amount);
      const newAmount = Number(b.amount || 0);
      if (newAmount > restored) {
        return res.status(400).json({ message: `Insufficient PCF balance. Available: ${restored}` });
      }
      const newBalance = restored - newAmount;
      await db.query(
        `UPDATE petty_cash_vouchers SET pcv_date=?, payee=?, particulars=?, account_code=?, amount=?, balance_after=? WHERE id=?`,
        [b.pcv_date || null, b.payee, b.particulars || '', b.account_code || '', newAmount, newBalance, req.params.id]
      );
      await db.query('UPDATE petty_cash_funds SET current_balance=? WHERE id=?', [newBalance, voucher.pcf_id]);
      res.json({ message: 'Voucher updated' });
    } catch (e) { next(e); }
  },
  async remove(req, res, next) {
    try {
      const [voucherRows] = await db.query('SELECT * FROM petty_cash_vouchers WHERE id=?', [req.params.id]);
      const voucher = voucherRows[0];
      if (voucher) {
        // Auto-link: restore amount back to PCF balance on delete
        await db.query('UPDATE petty_cash_funds SET current_balance = current_balance + ? WHERE id=?', [voucher.amount, voucher.pcf_id]);
      }
      await db.query('DELETE FROM petty_cash_vouchers WHERE id=?', [req.params.id]);
      res.json({ message: 'Deleted' });
    } catch (e) { next(e); }
  },
};

// ── Finance dashboard stats ──
async function stats(req, res, next) {
  try {
    const [idRows]  = await db.query(`SELECT COUNT(*)::int AS c FROM brgy_id_applications WHERE status='pending'`);
    const [kidRows] = await db.query(`SELECT COUNT(*)::int AS c FROM kidlat_members`);
    const [tripRows]= await db.query(`SELECT COUNT(*)::int AS c FROM trip_tickets`);
    const [pcfRows] = await db.query(`SELECT COALESCE(SUM(current_balance),0)::float AS total FROM petty_cash_funds WHERE status='active'`);
    const [pcvRows] = await db.query(`SELECT COUNT(*)::int AS c FROM petty_cash_vouchers`);
    res.json({
      pending_id_applications: idRows[0].c,
      kidlat_members:          kidRows[0].c,
      trip_tickets:            tripRows[0].c,
      pcf_total_balance:       pcfRows[0].total,
      pcv_count:               pcvRows[0].c,
    });
  } catch (e) { next(e); }
}

module.exports = { brgyId, kidlat, trip, pcf, sppcv, stats };
