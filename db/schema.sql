CREATE TABLE IF NOT EXISTS facilities (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  short_name VARCHAR(100) NOT NULL,
  type VARCHAR(100) NOT NULL,
  building VARCHAR(100) NOT NULL,
  room VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  position_json TEXT NOT NULL,
  size_json TEXT NOT NULL,
  accent VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  status_label VARCHAR(40) NOT NULL,
  status_reason VARCHAR(255) NOT NULL,
  energy_threshold DECIMAL(10,2) NOT NULL,
  water_threshold DECIMAL(10,2) NOT NULL,
  demo_data BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS uploaded_images (
  id VARCHAR(64) PRIMARY KEY,
  facility_id VARCHAR(64) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(80) NOT NULL,
  file_size INT NOT NULL,
  image_data LONGTEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_uploaded_facility (facility_id),
  FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS image_analyses (
  id VARCHAR(64) PRIMARY KEY,
  facility_id VARCHAR(64) NOT NULL,
  uploaded_image_id VARCHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL,
  summary TEXT NOT NULL,
  limitations_json TEXT NOT NULL,
  issues_json LONGTEXT NOT NULL,
  model VARCHAR(120) NOT NULL,
  analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_analysis_facility (facility_id),
  FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sensor_readings (
  id VARCHAR(64) PRIMARY KEY,
  facility_id VARCHAR(64) NOT NULL,
  recorded_at TIMESTAMP NOT NULL,
  energy_kwh DECIMAL(10,2) NOT NULL,
  water_litres DECIMAL(10,2) NOT NULL,
  occupancy INT NULL,
  temperature_c DECIMAL(5,2) NULL,
  source VARCHAR(20) NOT NULL,
  INDEX idx_sensor_facility_time (facility_id, recorded_at),
  FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sustainability_alerts (
  id VARCHAR(64) PRIMARY KEY,
  facility_id VARCHAR(64) NOT NULL,
  category VARCHAR(80) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  description TEXT NOT NULL,
  evidence_source VARCHAR(40) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  recommended_action TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,
  analysis_id VARCHAR(64) NULL,
  INDEX idx_alert_facility_status (facility_id, status),
  FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recommendations (
  id VARCHAR(64) PRIMARY KEY,
  facility_id VARCHAR(64) NOT NULL,
  analysis_id VARCHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  title VARCHAR(180) NOT NULL,
  detail TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL,
  source VARCHAR(20) NOT NULL,
  FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sustainability_reports (
  id VARCHAR(64) PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  title VARCHAR(180) NOT NULL,
  body LONGTEXT NOT NULL,
  source VARCHAR(20) NOT NULL
);
