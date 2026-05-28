-- Barangay Management System - PostgreSQL Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'secretary'
    CHECK (role IN ('admin', 'secretary', 'captain', 'treasurer')),
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Residents table
CREATE TABLE IF NOT EXISTS residents (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  gender VARCHAR(20) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  birth_date DATE NOT NULL,
  address VARCHAR(255) NOT NULL,
  civil_status VARCHAR(50) NOT NULL
    CHECK (civil_status IN ('single', 'married', 'divorced', 'widowed')),
  contact_number VARCHAR(20),
  occupation VARCHAR(100),
  voter_status BOOLEAN DEFAULT FALSE,
  senior_citizen BOOLEAN DEFAULT FALSE,
  household_id INTEGER,
  profile_image_url VARCHAR(255),
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_residents_name ON residents(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_residents_address ON residents(address);
CREATE INDEX IF NOT EXISTS idx_residents_voter ON residents(voter_status);
CREATE INDEX IF NOT EXISTS idx_residents_senior ON residents(senior_citizen);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  posted_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at);

-- Certificate templates table
CREATE TABLE IF NOT EXISTS certificate_templates (
  id SERIAL PRIMARY KEY,
  template_name VARCHAR(255) NOT NULL,
  certificate_type VARCHAR(50) NOT NULL
    CHECK (certificate_type IN ('barangay_clearance', 'indigency', 'residency', 'business_permit')),
  file_path VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  placeholders JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Certificates table
CREATE TABLE IF NOT EXISTS certificates (
  id SERIAL PRIMARY KEY,
  resident_id INTEGER NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  certificate_type VARCHAR(50) NOT NULL
    CHECK (certificate_type IN ('barangay_clearance', 'indigency', 'residency', 'business_permit')),
  template_id INTEGER REFERENCES certificate_templates(id),
  purpose VARCHAR(255),
  issue_date DATE NOT NULL,
  valid_until DATE,
  status VARCHAR(50) DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  approved_by INTEGER REFERENCES users(id),
  generated_file_path VARCHAR(255),
  qr_code_data VARCHAR(255),
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_certificates_resident ON certificates(resident_id);
CREATE INDEX IF NOT EXISTS idx_certificates_type ON certificates(certificate_type);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status);

-- Requests table
CREATE TABLE IF NOT EXISTS requests (
  id SERIAL PRIMARY KEY,
  control_number VARCHAR(50) UNIQUE NOT NULL,
  resident_id INTEGER NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  request_type VARCHAR(100) NOT NULL,
  purpose TEXT,
  remarks TEXT,
  status VARCHAR(50) DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed')),
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  requested_by INTEGER REFERENCES users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_requests_control ON requests(control_number);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_resident ON requests(resident_id);

-- Blotter records table
CREATE TABLE IF NOT EXISTS blotter_records (
  id SERIAL PRIMARY KEY,
  case_number VARCHAR(50) UNIQUE,
  complainant_id INTEGER REFERENCES residents(id),
  respondent_id INTEGER REFERENCES residents(id),
  incident_type VARCHAR(100) NOT NULL,
  incident_date DATE,
  incident_time TIME,
  incident_location VARCHAR(255),
  narrative TEXT,
  status VARCHAR(50) DEFAULT 'pending'
    CHECK (status IN ('pending', 'investigating', 'resolved', 'closed')),
  recorded_by INTEGER NOT NULL REFERENCES users(id),
  resolution TEXT,
  resolution_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_blotter_status ON blotter_records(status);
CREATE INDEX IF NOT EXISTS idx_blotter_date ON blotter_records(incident_date);

-- Finances table
CREATE TABLE IF NOT EXISTS finances (
  id SERIAL PRIMARY KEY,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category VARCHAR(100),
  payment_method VARCHAR(100),
  receipt_number VARCHAR(100),
  reference_id INTEGER,
  reference_type VARCHAR(50),
  recorded_by INTEGER NOT NULL REFERENCES users(id),
  transaction_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_finances_type ON finances(transaction_type);
CREATE INDEX IF NOT EXISTS idx_finances_date ON finances(transaction_date);
CREATE INDEX IF NOT EXISTS idx_finances_category ON finances(category);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  resident_id INTEGER REFERENCES residents(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_size INTEGER,
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_resident ON documents(resident_id);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  details TEXT,
  module VARCHAR(100),
  record_id INTEGER,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  barangay_name VARCHAR(255) DEFAULT 'Barangay Narra',
  address TEXT DEFAULT 'Narra, Palawan',
  captain VARCHAR(255) DEFAULT '',
  officials TEXT DEFAULT '[]',
  logo_url VARCHAR(255) DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default admin user (password: Admin@2024)
INSERT INTO users (full_name, email, password, role) VALUES
('System Administrator', 'admin@barangay.gov.ph',
 '$2a$10$8K1p/a0dUrpWMdKS.7Rr3.nFPKHiQ.NlFZd8tAiXmXbZIU8G5xOi',
 'admin')
ON CONFLICT (email) DO NOTHING;

-- Default system settings
INSERT INTO system_settings (barangay_name, address, captain)
VALUES ('Barangay Narra', 'Narra, Palawan', 'TBD')
ON CONFLICT DO NOTHING;