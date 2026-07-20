// Maps every protected route to its allowed roles.
// Keep in sync with App.jsx RoleBasedRoute definitions.
export const ROUTE_ROLES = {
  // Records
  '/residents':     ['admin', 'secretary'],
  '/certificates':  ['admin', 'secretary'],
  '/blotter':       ['admin', 'captain', 'secretary'],

  // Finance — top-level
  '/finance':       ['admin', 'treasurer'],
  '/cheque-print':  ['admin', 'treasurer'],
  '/reports':       ['admin', 'treasurer', 'secretary', 'captain'],

  // Finance — forms accessible to secretary + treasurer
  '/finance/brgy-id':     ['admin', 'treasurer', 'secretary'],
  '/finance/kidlat':      ['admin', 'treasurer', 'secretary'],
  '/finance/trip':        ['admin', 'treasurer', 'secretary'],
  '/finance/pr':          ['admin', 'treasurer', 'secretary'],
  '/finance/ris':         ['admin', 'treasurer', 'secretary'],
  '/finance/transmittal': ['admin', 'treasurer', 'secretary'],

  // Finance — treasurer-only forms
  '/finance/pcf':         ['admin', 'treasurer'],
  '/finance/sppcv':       ['admin', 'treasurer'],
  '/finance/rao':         ['admin', 'treasurer'],
  '/finance/obr':         ['admin', 'treasurer'],
  '/finance/po':          ['admin', 'treasurer'],
  '/finance/iar':         ['admin', 'treasurer'],
  '/finance/dv':          ['admin', 'treasurer'],
  '/finance/crdr':        ['admin', 'treasurer'],
  '/finance/chbr':        ['admin', 'treasurer'],
  '/finance/checks':      ['admin', 'treasurer'],
  '/finance/collections': ['admin', 'treasurer'],

  // Infrastructure
  '/officials':     ['admin', 'secretary', 'captain', 'treasurer'],
  '/projects':      ['admin', 'secretary'],
  '/assets':        ['admin', 'secretary'],

  // Social
  '/social':        ['admin', 'secretary'],
  '/drrm':          ['admin', 'captain', 'secretary'],

  // Communication
  '/announcements': ['admin', 'secretary', 'captain', 'treasurer'],
  '/documents':     ['admin', 'secretary'],

  // Admin
  '/users':         ['admin'],
  '/settings':      ['admin'],
};

// Human-readable label for each route (used in the NoAccess popup)
export const ROUTE_LABELS = {
  '/residents':     'Resident Management',
  '/certificates':  'Certificate Issuance',
  '/blotter':       'Blotter Records',

  '/finance':             'Finance & Collections',
  '/cheque-print':        'Cheque Printing',
  '/reports':             'Reports Generator',
  '/finance/brgy-id':     'Barangay ID',
  '/finance/kidlat':      'KIDLAT Members',
  '/finance/trip':        'Trip Ticket',
  '/finance/pcf':         'Petty Cash Fund',
  '/finance/sppcv':       'Petty Cash Vouchers',
  '/finance/rao':         'RAO (Obligations)',
  '/finance/obr':         'Obligation Request',
  '/finance/pr':          'Purchase Request',
  '/finance/po':          'Purchase Order',
  '/finance/iar':         'Inspection & Acceptance',
  '/finance/ris':         'Requisition & Issue',
  '/finance/dv':          'Disbursement Voucher',
  '/finance/crdr':        'CRDR (Cashbook)',
  '/finance/chbr':        'Cash in Bank (CHBR)',
  '/finance/checks':      'Checks Issued (SCkI)',
  '/finance/collections': 'Itemized Collections',
  '/finance/transmittal': 'Transmittal Letter',

  '/officials':     'Barangay Officials',
  '/projects':      'Projects & Programs',
  '/assets':        'Assets & Inventory',
  '/social':        'Social Programs',
  '/drrm':          'BDRRM / Incidents',
  '/announcements': 'Announcements',
  '/documents':     'Documents',
  '/users':         'User Management',
  '/settings':      'System Settings',
};