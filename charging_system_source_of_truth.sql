-- ============================================================================
-- QR-Code & Coin-Based Mobile Phone Charging System
-- PostgreSQL Database Schema — Source of Truth
-- Schema version: 1.0.0
-- Generated: 2026-07-19
--
-- Purpose:
--   Administrative web application, embedded-device ingestion, dual payment,
--   timed charging, secure lockers, telemetry, alerts, reporting, and auditing.
--
-- Table inventory:
--   01 users
--   02 roles
--   03 permissions
--   04 stations
--   05 role_permissions
--   06 user_role_assignments
--   07 auth_sessions
--   08 devices
--   09 device_credentials
--   10 lockers
--   11 charging_ports
--   12 device_events
--   13 device_telemetry
--   14 device_commands
--   15 charging_packages
--   16 payments
--   17 coin_insertions
--   18 qr_payment_transactions
--   19 charging_sessions
--   20 charging_session_payments
--   21 alerts
--   22 system_settings
--   23 audit_logs
--
-- Deployment rules:
--   1. Apply this file to a new database or translate it into ordered migrations.
--   2. Do not edit an already-applied production schema manually.
--   3. Use migrations for every future change.
--   4. Store money as integer minor units. For TZS, one minor unit equals TZS 1.
--   5. Store all timestamps as TIMESTAMPTZ and send device times in UTC.
--   6. Never store plaintext passwords, refresh tokens, access codes, API keys,
--      or mobile-money customer secrets.
--   7. Financial, charging-session, device-event, and audit records are
--      historical records and must not be hard-deleted by the application.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE SCHEMA IF NOT EXISTS charging_system;
SET search_path TO charging_system, public;

-- ============================================================================
-- SHARED DATABASE FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_row_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION
        'Deletion from historical table "%" is not permitted',
        TG_TABLE_NAME
        USING ERRCODE = '55000';
END;
$$;

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION
        'Audit log records are append-only'
        USING ERRCODE = '55000';
END;
$$;

-- ============================================================================
-- SECTION A: IDENTITY, ACCESS CONTROL, AND STATIONS
-- ============================================================================

-- TABLE 1: users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    email CITEXT NOT NULL,
    phone_number VARCHAR(30),
    password_hash TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    failed_login_attempts SMALLINT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID,

    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_users_full_name_not_blank
        CHECK (btrim(full_name) <> ''),
    CONSTRAINT chk_users_email_not_blank
        CHECK (btrim(email::TEXT) <> ''),
    CONSTRAINT chk_users_status
        CHECK (status IN ('active', 'inactive', 'suspended', 'locked')),
    CONSTRAINT chk_users_failed_attempts
        CHECK (failed_login_attempts >= 0),
    CONSTRAINT fk_users_created_by
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

COMMENT ON TABLE users IS
    'Administrative users and charging-system operators.';
COMMENT ON COLUMN users.password_hash IS
    'One-way password hash only; plaintext passwords are forbidden.';

CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- TABLE 2: roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(60) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_roles_code UNIQUE (code),
    CONSTRAINT chk_roles_code_format
        CHECK (code ~ '^[a-z][a-z0-9_]*$'),
    CONSTRAINT chk_roles_name_not_blank
        CHECK (btrim(name) <> ''),
    CONSTRAINT chk_roles_status
        CHECK (status IN ('active', 'inactive'))
);

COMMENT ON TABLE roles IS
    'Role definitions used by dynamic role-based access control.';

CREATE INDEX idx_roles_status ON roles(status);

CREATE TRIGGER trg_roles_set_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- TABLE 3: permissions
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL,
    module VARCHAR(60) NOT NULL,
    action VARCHAR(60) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_permissions_code UNIQUE (code),
    CONSTRAINT uq_permissions_module_action UNIQUE (module, action),
    CONSTRAINT chk_permissions_module_format
        CHECK (module ~ '^[a-z][a-z0-9_-]*$'),
    CONSTRAINT chk_permissions_action_format
        CHECK (action ~ '^[a-z][a-z0-9_]*$'),
    CONSTRAINT chk_permissions_code_matches_parts
        CHECK (code = module || '.' || action)
);

COMMENT ON TABLE permissions IS
    'Atomic operations that may be assigned to roles.';

CREATE INDEX idx_permissions_module ON permissions(module);

-- TABLE 4: stations
CREATE TABLE stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(40) NOT NULL,
    name VARCHAR(150) NOT NULL,
    station_type VARCHAR(30) NOT NULL,
    description TEXT,
    region VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    ward VARCHAR(100),
    address TEXT,
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    timezone VARCHAR(50) NOT NULL DEFAULT 'Africa/Dar_es_Salaam',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    installed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID,

    CONSTRAINT uq_stations_code UNIQUE (code),
    CONSTRAINT chk_stations_code_not_blank
        CHECK (btrim(code) <> ''),
    CONSTRAINT chk_stations_name_not_blank
        CHECK (btrim(name) <> ''),
    CONSTRAINT chk_stations_region_not_blank
        CHECK (btrim(region) <> ''),
    CONSTRAINT chk_stations_type
        CHECK (
            station_type IN (
                'brt_station',
                'bus_terminal',
                'sgr_station',
                'railway_station',
                'airport',
                'shopping_centre',
                'other'
            )
        ),
    CONSTRAINT chk_stations_status
        CHECK (
            status IN (
                'planned',
                'active',
                'maintenance',
                'inactive',
                'decommissioned'
            )
        ),
    CONSTRAINT chk_stations_latitude
        CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
    CONSTRAINT chk_stations_longitude
        CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
    CONSTRAINT chk_stations_coordinates_pair
        CHECK (
            (latitude IS NULL AND longitude IS NULL)
            OR
            (latitude IS NOT NULL AND longitude IS NOT NULL)
        ),
    CONSTRAINT chk_stations_timezone_not_blank
        CHECK (btrim(timezone) <> ''),
    CONSTRAINT fk_stations_created_by
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

COMMENT ON TABLE stations IS
    'Physical locations where one or more charging devices are installed.';

CREATE INDEX idx_stations_status ON stations(status);
CREATE INDEX idx_stations_type ON stations(station_type);
CREATE INDEX idx_stations_region ON stations(region);

CREATE TRIGGER trg_stations_set_updated_at
BEFORE UPDATE ON stations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- TABLE 5: role_permissions
CREATE TABLE role_permissions (
    role_id UUID NOT NULL,
    permission_id UUID NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    granted_by_user_id UUID,

    CONSTRAINT pk_role_permissions
        PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role
        FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_role_permissions_permission
        FOREIGN KEY (permission_id)
        REFERENCES permissions(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_role_permissions_granted_by
        FOREIGN KEY (granted_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

COMMENT ON TABLE role_permissions IS
    'Many-to-many mapping between roles and atomic permissions.';

CREATE INDEX idx_role_permissions_permission
    ON role_permissions(permission_id);

-- TABLE 6: user_role_assignments
CREATE TABLE user_role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    station_id UUID,
    assigned_by_user_id UUID,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoked_by_user_id UUID,
    revocation_reason VARCHAR(255),

    CONSTRAINT fk_user_role_assignments_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_user_role_assignments_role
        FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_user_role_assignments_station
        FOREIGN KEY (station_id)
        REFERENCES stations(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_user_role_assignments_assigned_by
        FOREIGN KEY (assigned_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_user_role_assignments_revoked_by
        FOREIGN KEY (revoked_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT chk_user_role_assignments_expiry
        CHECK (expires_at IS NULL OR expires_at > assigned_at),
    CONSTRAINT chk_user_role_assignments_revocation
        CHECK (revoked_at IS NULL OR revoked_at >= assigned_at),
    CONSTRAINT chk_user_role_assignments_revoker
        CHECK (
            revoked_at IS NULL
            OR revoked_by_user_id IS NOT NULL
        )
);

COMMENT ON TABLE user_role_assignments IS
    'Global or station-scoped role assignments. NULL station_id means global.';

CREATE UNIQUE INDEX uq_user_role_assignments_global
    ON user_role_assignments(user_id, role_id)
    WHERE station_id IS NULL AND revoked_at IS NULL;

CREATE UNIQUE INDEX uq_user_role_assignments_station
    ON user_role_assignments(user_id, role_id, station_id)
    WHERE station_id IS NOT NULL AND revoked_at IS NULL;

CREATE INDEX idx_user_role_assignments_user
    ON user_role_assignments(user_id);

CREATE INDEX idx_user_role_assignments_station
    ON user_role_assignments(station_id)
    WHERE station_id IS NOT NULL;

CREATE INDEX idx_user_role_assignments_active
    ON user_role_assignments(user_id, expires_at)
    WHERE revoked_at IS NULL;

-- TABLE 7: auth_sessions
CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token_family_id UUID NOT NULL DEFAULT gen_random_uuid(),
    refresh_token_hash TEXT NOT NULL,
    rotated_from_session_id UUID,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoke_reason VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_auth_sessions_refresh_token_hash
        UNIQUE (refresh_token_hash),
    CONSTRAINT fk_auth_sessions_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_auth_sessions_rotated_from
        FOREIGN KEY (rotated_from_session_id)
        REFERENCES auth_sessions(id)
        ON DELETE SET NULL,
    CONSTRAINT chk_auth_sessions_expiry
        CHECK (expires_at > created_at),
    CONSTRAINT chk_auth_sessions_last_used
        CHECK (last_used_at IS NULL OR last_used_at >= created_at),
    CONSTRAINT chk_auth_sessions_revocation
        CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

COMMENT ON TABLE auth_sessions IS
    'Refresh-token sessions. Only one-way token hashes are stored.';

CREATE INDEX idx_auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_family ON auth_sessions(token_family_id);
CREATE INDEX idx_auth_sessions_expires_at ON auth_sessions(expires_at);
CREATE INDEX idx_auth_sessions_active
    ON auth_sessions(user_id, expires_at)
    WHERE revoked_at IS NULL;

-- ============================================================================
-- SECTION B: PHYSICAL DEVICES, CREDENTIALS, LOCKERS, AND PORTS
-- ============================================================================

-- TABLE 8: devices
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL,
    device_code VARCHAR(60) NOT NULL,
    serial_number VARCHAR(100) NOT NULL,
    name VARCHAR(120) NOT NULL,
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    firmware_version VARCHAR(50),
    hardware_version VARCHAR(50),
    lifecycle_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    connectivity_status VARCHAR(20) NOT NULL DEFAULT 'unknown',
    operational_status VARCHAR(30) NOT NULL DEFAULT 'idle',
    current_power_source VARCHAR(20) NOT NULL DEFAULT 'unknown',
    expected_heartbeat_interval_seconds INTEGER NOT NULL DEFAULT 60,
    last_seen_at TIMESTAMPTZ,
    last_ip_address INET,
    activated_at TIMESTAMPTZ,
    installed_at TIMESTAMPTZ,
    maintenance_started_at TIMESTAMPTZ,
    decommissioned_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID,

    CONSTRAINT uq_devices_code UNIQUE (device_code),
    CONSTRAINT uq_devices_serial_number UNIQUE (serial_number),
    CONSTRAINT uq_devices_id_station UNIQUE (id, station_id),
    CONSTRAINT fk_devices_station
        FOREIGN KEY (station_id)
        REFERENCES stations(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_devices_created_by
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT chk_devices_code_not_blank
        CHECK (btrim(device_code) <> ''),
    CONSTRAINT chk_devices_serial_not_blank
        CHECK (btrim(serial_number) <> ''),
    CONSTRAINT chk_devices_name_not_blank
        CHECK (btrim(name) <> ''),
    CONSTRAINT chk_devices_lifecycle_status
        CHECK (
            lifecycle_status IN (
                'pending',
                'active',
                'maintenance',
                'disabled',
                'decommissioned'
            )
        ),
    CONSTRAINT chk_devices_connectivity_status
        CHECK (connectivity_status IN ('online', 'offline', 'unknown')),
    CONSTRAINT chk_devices_operational_status
        CHECK (
            operational_status IN (
                'idle',
                'in_use',
                'partially_available',
                'fault',
                'maintenance',
                'offline'
            )
        ),
    CONSTRAINT chk_devices_power_source
        CHECK (
            current_power_source IN (
                'grid',
                'backup_battery',
                'none',
                'unknown'
            )
        ),
    CONSTRAINT chk_devices_heartbeat_interval
        CHECK (expected_heartbeat_interval_seconds BETWEEN 5 AND 86400),
    CONSTRAINT chk_devices_metadata_object
        CHECK (jsonb_typeof(metadata) = 'object')
);

COMMENT ON TABLE devices IS
    'Complete embedded charging machines installed at stations.';
COMMENT ON COLUMN devices.last_seen_at IS
    'Backend receipt time of the most recent valid heartbeat or device event.';

CREATE INDEX idx_devices_station ON devices(station_id);
CREATE INDEX idx_devices_connectivity ON devices(connectivity_status);
CREATE INDEX idx_devices_operational ON devices(operational_status);
CREATE INDEX idx_devices_last_seen ON devices(last_seen_at);
CREATE INDEX idx_devices_lifecycle ON devices(lifecycle_status);

CREATE TRIGGER trg_devices_set_updated_at
BEFORE UPDATE ON devices
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- TABLE 9: device_credentials
CREATE TABLE device_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL,
    key_id VARCHAR(100) NOT NULL,
    credential_type VARCHAR(30) NOT NULL,
    secret_hash TEXT,
    secret_encrypted TEXT,
    public_key_pem TEXT,
    certificate_fingerprint VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    valid_from TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoke_reason VARCHAR(255),
    rotated_from_credential_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID,
    revoked_by_user_id UUID,

    CONSTRAINT uq_device_credentials_key_id UNIQUE (key_id),
    CONSTRAINT fk_device_credentials_device
        FOREIGN KEY (device_id)
        REFERENCES devices(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_device_credentials_rotated_from
        FOREIGN KEY (rotated_from_credential_id)
        REFERENCES device_credentials(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_device_credentials_created_by
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_device_credentials_revoked_by
        FOREIGN KEY (revoked_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT chk_device_credentials_key_id
        CHECK (btrim(key_id) <> ''),
    CONSTRAINT chk_device_credentials_type
        CHECK (credential_type IN ('api_key', 'hmac', 'certificate')),
    CONSTRAINT chk_device_credentials_status
        CHECK (status IN ('active', 'expired', 'revoked')),
    CONSTRAINT chk_device_credentials_validity
        CHECK (expires_at IS NULL OR expires_at > valid_from),
    CONSTRAINT chk_device_credentials_revocation
        CHECK (revoked_at IS NULL OR revoked_at >= valid_from),
    CONSTRAINT chk_device_credentials_material
        CHECK (
            (
                credential_type = 'api_key'
                AND secret_hash IS NOT NULL
                AND secret_encrypted IS NULL
                AND public_key_pem IS NULL
                AND certificate_fingerprint IS NULL
            )
            OR
            (
                credential_type = 'hmac'
                AND secret_encrypted IS NOT NULL
                AND public_key_pem IS NULL
                AND certificate_fingerprint IS NULL
            )
            OR
            (
                credential_type = 'certificate'
                AND secret_hash IS NULL
                AND secret_encrypted IS NULL
                AND (
                    public_key_pem IS NOT NULL
                    OR certificate_fingerprint IS NOT NULL
                )
            )
        )
);

COMMENT ON TABLE device_credentials IS
    'Versioned credentials used to authenticate embedded devices.';
COMMENT ON COLUMN device_credentials.secret_hash IS
    'One-way hash for API-key verification.';
COMMENT ON COLUMN device_credentials.secret_encrypted IS
    'Application/KMS-encrypted HMAC secret; a hash alone cannot verify HMAC.';

CREATE INDEX idx_device_credentials_device
    ON device_credentials(device_id);

CREATE INDEX idx_device_credentials_active
    ON device_credentials(device_id, valid_from, expires_at)
    WHERE status = 'active' AND revoked_at IS NULL;

-- TABLE 10: lockers
CREATE TABLE lockers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL,
    locker_number SMALLINT NOT NULL,
    label VARCHAR(50),
    availability_status VARCHAR(20) NOT NULL DEFAULT 'available',
    door_status VARCHAR(20) NOT NULL DEFAULT 'unknown',
    lock_status VARCHAR(20) NOT NULL DEFAULT 'unknown',
    sensor_status VARCHAR(20) NOT NULL DEFAULT 'unknown',
    last_status_changed_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    maintenance_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_lockers_device_number
        UNIQUE (device_id, locker_number),
    CONSTRAINT uq_lockers_id_device
        UNIQUE (id, device_id),
    CONSTRAINT fk_lockers_device
        FOREIGN KEY (device_id)
        REFERENCES devices(id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_lockers_number
        CHECK (locker_number > 0),
    CONSTRAINT chk_lockers_availability_status
        CHECK (
            availability_status IN (
                'available',
                'reserved',
                'in_use',
                'maintenance',
                'disabled',
                'fault'
            )
        ),
    CONSTRAINT chk_lockers_door_status
        CHECK (door_status IN ('open', 'closed', 'unknown')),
    CONSTRAINT chk_lockers_lock_status
        CHECK (lock_status IN ('locked', 'unlocked', 'unknown', 'fault')),
    CONSTRAINT chk_lockers_sensor_status
        CHECK (sensor_status IN ('normal', 'fault', 'unknown'))
);

COMMENT ON TABLE lockers IS
    'Secure customer phone compartments inside a charging device.';
COMMENT ON COLUMN lockers.id IS
    'Locker access codes are never stored here; they belong to a session.';

CREATE INDEX idx_lockers_device ON lockers(device_id);
CREATE INDEX idx_lockers_availability ON lockers(availability_status);
CREATE INDEX idx_lockers_device_availability
    ON lockers(device_id, availability_status);

CREATE TRIGGER trg_lockers_set_updated_at
BEFORE UPDATE ON lockers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- TABLE 11: charging_ports
CREATE TABLE charging_ports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL,
    locker_id UUID NOT NULL,
    port_number SMALLINT NOT NULL,
    port_type VARCHAR(20) NOT NULL,
    hardware_channel VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    power_state VARCHAR(20) NOT NULL DEFAULT 'off',
    maximum_voltage NUMERIC(6, 2),
    maximum_current_ma INTEGER,
    maximum_power_watts NUMERIC(7, 2),
    last_status_changed_at TIMESTAMPTZ,
    maintenance_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_charging_ports_locker_number
        UNIQUE (locker_id, port_number),
    CONSTRAINT uq_charging_ports_id_hierarchy
        UNIQUE (id, locker_id, device_id),
    CONSTRAINT fk_charging_ports_device
        FOREIGN KEY (device_id)
        REFERENCES devices(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_charging_ports_locker_device
        FOREIGN KEY (locker_id, device_id)
        REFERENCES lockers(id, device_id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_charging_ports_number
        CHECK (port_number > 0),
    CONSTRAINT chk_charging_ports_type
        CHECK (port_type IN ('usb_a', 'usb_c', 'wireless', 'other')),
    CONSTRAINT chk_charging_ports_status
        CHECK (
            status IN (
                'available',
                'in_use',
                'maintenance',
                'disabled',
                'fault'
            )
        ),
    CONSTRAINT chk_charging_ports_power_state
        CHECK (power_state IN ('on', 'off', 'fault', 'unknown')),
    CONSTRAINT chk_charging_ports_max_voltage
        CHECK (maximum_voltage IS NULL OR maximum_voltage > 0),
    CONSTRAINT chk_charging_ports_max_current
        CHECK (maximum_current_ma IS NULL OR maximum_current_ma > 0),
    CONSTRAINT chk_charging_ports_max_power
        CHECK (maximum_power_watts IS NULL OR maximum_power_watts > 0)
);

COMMENT ON TABLE charging_ports IS
    'Physical USB-A, USB-C, wireless, or other charging outputs.';

CREATE UNIQUE INDEX uq_charging_ports_device_channel
    ON charging_ports(device_id, hardware_channel)
    WHERE hardware_channel IS NOT NULL;

CREATE INDEX idx_charging_ports_locker ON charging_ports(locker_id);
CREATE INDEX idx_charging_ports_device_status
    ON charging_ports(device_id, status);

CREATE TRIGGER trg_charging_ports_set_updated_at
BEFORE UPDATE ON charging_ports
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- SECTION C: EMBEDDED EVENT INGESTION AND TELEMETRY
-- ============================================================================

-- TABLE 12: device_events
CREATE TABLE device_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL,
    device_id UUID NOT NULL,
    external_event_id VARCHAR(120) NOT NULL,
    event_category VARCHAR(30) NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    sequence_number BIGINT,
    occurred_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    firmware_version VARCHAR(50),
    payload JSONB NOT NULL DEFAULT '{}'::JSONB,
    payload_sha256 CHAR(64),
    processing_status VARCHAR(20) NOT NULL DEFAULT 'received',
    processed_at TIMESTAMPTZ,
    failure_code VARCHAR(80),
    failure_reason TEXT,
    request_id VARCHAR(100),
    source_ip INET,

    CONSTRAINT uq_device_events_device_external
        UNIQUE (device_id, external_event_id),
    CONSTRAINT uq_device_events_id_device
        UNIQUE (id, device_id),
    CONSTRAINT fk_device_events_device_station
        FOREIGN KEY (device_id, station_id)
        REFERENCES devices(id, station_id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_device_events_external_id
        CHECK (btrim(external_event_id) <> ''),
    CONSTRAINT chk_device_events_category
        CHECK (
            event_category IN (
                'heartbeat',
                'telemetry',
                'payment',
                'session',
                'locker',
                'power',
                'alert',
                'command_ack',
                'system'
            )
        ),
    CONSTRAINT chk_device_events_type_format
        CHECK (event_type ~ '^[a-z][a-z0-9_.-]*$'),
    CONSTRAINT chk_device_events_sequence
        CHECK (sequence_number IS NULL OR sequence_number >= 0),
    CONSTRAINT chk_device_events_payload_object
        CHECK (jsonb_typeof(payload) = 'object'),
    CONSTRAINT chk_device_events_payload_hash
        CHECK (
            payload_sha256 IS NULL
            OR payload_sha256 ~ '^[0-9a-f]{64}$'
        ),
    CONSTRAINT chk_device_events_processing_status
        CHECK (
            processing_status IN (
                'received',
                'processing',
                'processed',
                'failed',
                'ignored'
            )
        ),
    CONSTRAINT chk_device_events_processed_time
        CHECK (
            processed_at IS NULL
            OR processed_at >= received_at
        )
);

COMMENT ON TABLE device_events IS
    'Immutable raw event envelope from an embedded device; used for idempotency.';
COMMENT ON COLUMN device_events.external_event_id IS
    'Firmware-generated event identifier, unique per device.';
COMMENT ON COLUMN device_events.payload IS
    'Validated raw device payload; must never contain secrets or phone files.';

CREATE UNIQUE INDEX uq_device_events_device_sequence
    ON device_events(device_id, sequence_number)
    WHERE sequence_number IS NOT NULL;

CREATE INDEX idx_device_events_device_received
    ON device_events(device_id, received_at DESC);

CREATE INDEX idx_device_events_station_received
    ON device_events(station_id, received_at DESC);

CREATE INDEX idx_device_events_type_received
    ON device_events(event_type, received_at DESC);

CREATE INDEX idx_device_events_processing
    ON device_events(processing_status, received_at);

CREATE INDEX idx_device_events_received_brin
    ON device_events USING BRIN(received_at);

CREATE OR REPLACE FUNCTION protect_device_event_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF
        OLD.station_id IS DISTINCT FROM NEW.station_id
        OR OLD.device_id IS DISTINCT FROM NEW.device_id
        OR OLD.external_event_id IS DISTINCT FROM NEW.external_event_id
        OR OLD.event_category IS DISTINCT FROM NEW.event_category
        OR OLD.event_type IS DISTINCT FROM NEW.event_type
        OR OLD.sequence_number IS DISTINCT FROM NEW.sequence_number
        OR OLD.occurred_at IS DISTINCT FROM NEW.occurred_at
        OR OLD.received_at IS DISTINCT FROM NEW.received_at
        OR OLD.firmware_version IS DISTINCT FROM NEW.firmware_version
        OR OLD.payload IS DISTINCT FROM NEW.payload
        OR OLD.payload_sha256 IS DISTINCT FROM NEW.payload_sha256
        OR OLD.request_id IS DISTINCT FROM NEW.request_id
        OR OLD.source_ip IS DISTINCT FROM NEW.source_ip
    THEN
        RAISE EXCEPTION
            'Device event identity and payload fields are immutable'
            USING ERRCODE = '55000';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_device_events_protect_identity
BEFORE UPDATE ON device_events
FOR EACH ROW EXECUTE FUNCTION protect_device_event_identity();

CREATE TRIGGER trg_device_events_prevent_delete
BEFORE DELETE ON device_events
FOR EACH ROW EXECUTE FUNCTION prevent_row_delete();

-- TABLE 13: device_telemetry
CREATE TABLE device_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_event_id UUID NOT NULL,
    station_id UUID NOT NULL,
    device_id UUID NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    power_source VARCHAR(20) NOT NULL DEFAULT 'unknown',
    grid_available BOOLEAN,
    input_voltage NUMERIC(8, 3),
    output_voltage NUMERIC(8, 3),
    output_current_ma INTEGER,
    output_power_watts NUMERIC(9, 3),
    battery_voltage NUMERIC(8, 3),
    battery_percentage NUMERIC(5, 2),
    temperature_celsius NUMERIC(6, 2),
    connectivity_signal_dbm INTEGER,
    active_session_count SMALLINT,
    available_locker_count SMALLINT,
    fault_code VARCHAR(80),
    metrics JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_device_telemetry_event UNIQUE (device_event_id),
    CONSTRAINT fk_device_telemetry_event_device
        FOREIGN KEY (device_event_id, device_id)
        REFERENCES device_events(id, device_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_device_telemetry_device_station
        FOREIGN KEY (device_id, station_id)
        REFERENCES devices(id, station_id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_device_telemetry_power_source
        CHECK (
            power_source IN (
                'grid',
                'backup_battery',
                'none',
                'unknown'
            )
        ),
    CONSTRAINT chk_device_telemetry_input_voltage
        CHECK (input_voltage IS NULL OR input_voltage >= 0),
    CONSTRAINT chk_device_telemetry_output_voltage
        CHECK (output_voltage IS NULL OR output_voltage >= 0),
    CONSTRAINT chk_device_telemetry_output_current
        CHECK (output_current_ma IS NULL OR output_current_ma >= 0),
    CONSTRAINT chk_device_telemetry_output_power
        CHECK (output_power_watts IS NULL OR output_power_watts >= 0),
    CONSTRAINT chk_device_telemetry_battery_voltage
        CHECK (battery_voltage IS NULL OR battery_voltage >= 0),
    CONSTRAINT chk_device_telemetry_battery_percentage
        CHECK (
            battery_percentage IS NULL
            OR battery_percentage BETWEEN 0 AND 100
        ),
    CONSTRAINT chk_device_telemetry_temperature
        CHECK (
            temperature_celsius IS NULL
            OR temperature_celsius BETWEEN -100 AND 200
        ),
    CONSTRAINT chk_device_telemetry_signal
        CHECK (
            connectivity_signal_dbm IS NULL
            OR connectivity_signal_dbm BETWEEN -200 AND 0
        ),
    CONSTRAINT chk_device_telemetry_active_sessions
        CHECK (active_session_count IS NULL OR active_session_count >= 0),
    CONSTRAINT chk_device_telemetry_available_lockers
        CHECK (available_locker_count IS NULL OR available_locker_count >= 0),
    CONSTRAINT chk_device_telemetry_metrics_object
        CHECK (jsonb_typeof(metrics) = 'object')
);

COMMENT ON TABLE device_telemetry IS
    'Structured time-series measurements extracted from telemetry events.';

CREATE INDEX idx_device_telemetry_device_observed
    ON device_telemetry(device_id, observed_at DESC);

CREATE INDEX idx_device_telemetry_station_observed
    ON device_telemetry(station_id, observed_at DESC);

CREATE INDEX idx_device_telemetry_observed_brin
    ON device_telemetry USING BRIN(observed_at);

-- TABLE 14: device_commands
CREATE TABLE device_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL,
    device_id UUID NOT NULL,
    command_type VARCHAR(80) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'queued',
    idempotency_key VARCHAR(120),
    requested_by_user_id UUID,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    available_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    failure_code VARCHAR(80),
    failure_reason TEXT,
    device_response JSONB,
    acknowledgement_event_id UUID,

    CONSTRAINT uq_device_commands_idempotency UNIQUE (idempotency_key),
    CONSTRAINT fk_device_commands_device_station
        FOREIGN KEY (device_id, station_id)
        REFERENCES devices(id, station_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_device_commands_requested_by
        FOREIGN KEY (requested_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_device_commands_ack_event
        FOREIGN KEY (acknowledgement_event_id)
        REFERENCES device_events(id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_device_commands_type
        CHECK (command_type ~ '^[a-z][a-z0-9_.-]*$'),
    CONSTRAINT chk_device_commands_payload_object
        CHECK (jsonb_typeof(payload) = 'object'),
    CONSTRAINT chk_device_commands_response_object
        CHECK (
            device_response IS NULL
            OR jsonb_typeof(device_response) = 'object'
        ),
    CONSTRAINT chk_device_commands_status
        CHECK (
            status IN (
                'queued',
                'sent',
                'acknowledged',
                'completed',
                'failed',
                'expired',
                'cancelled'
            )
        ),
    CONSTRAINT chk_device_commands_available_at
        CHECK (available_at >= requested_at),
    CONSTRAINT chk_device_commands_expiry
        CHECK (expires_at IS NULL OR expires_at > requested_at),
    CONSTRAINT chk_device_commands_sent_at
        CHECK (sent_at IS NULL OR sent_at >= requested_at),
    CONSTRAINT chk_device_commands_acknowledged_at
        CHECK (
            acknowledged_at IS NULL
            OR (
                sent_at IS NOT NULL
                AND acknowledged_at >= sent_at
            )
        ),
    CONSTRAINT chk_device_commands_completed_at
        CHECK (
            completed_at IS NULL
            OR completed_at >= requested_at
        )
);

COMMENT ON TABLE device_commands IS
    'Commands queued by the backend for delivery to embedded devices.';

CREATE INDEX idx_device_commands_pending
    ON device_commands(device_id, available_at)
    WHERE status = 'queued';

CREATE INDEX idx_device_commands_status_requested
    ON device_commands(status, requested_at DESC);

CREATE INDEX idx_device_commands_station
    ON device_commands(station_id, requested_at DESC);

-- ============================================================================
-- SECTION D: CHARGING PACKAGES, PAYMENTS, AND SESSIONS
-- ============================================================================

-- TABLE 15: charging_packages
CREATE TABLE charging_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    duration_seconds INTEGER NOT NULL,
    price_minor BIGINT NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'TZS',
    allow_coin BOOLEAN NOT NULL DEFAULT TRUE,
    allow_qr BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    valid_from TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMPTZ,
    display_order SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID,

    CONSTRAINT fk_charging_packages_station
        FOREIGN KEY (station_id)
        REFERENCES stations(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_charging_packages_created_by
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT chk_charging_packages_code
        CHECK (code ~ '^[A-Z0-9_-]+$'),
    CONSTRAINT chk_charging_packages_name
        CHECK (btrim(name) <> ''),
    CONSTRAINT chk_charging_packages_duration
        CHECK (duration_seconds > 0),
    CONSTRAINT chk_charging_packages_price
        CHECK (price_minor > 0),
    CONSTRAINT chk_charging_packages_currency
        CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT chk_charging_packages_payment_method
        CHECK (allow_coin OR allow_qr),
    CONSTRAINT chk_charging_packages_status
        CHECK (status IN ('active', 'inactive', 'retired')),
    CONSTRAINT chk_charging_packages_validity
        CHECK (valid_until IS NULL OR valid_until > valid_from),
    CONSTRAINT chk_charging_packages_display_order
        CHECK (display_order >= 0)
);

COMMENT ON TABLE charging_packages IS
    'Global or station-specific price and charging-duration packages.';

CREATE UNIQUE INDEX uq_charging_packages_global_code
    ON charging_packages(code)
    WHERE station_id IS NULL;

CREATE UNIQUE INDEX uq_charging_packages_station_code
    ON charging_packages(station_id, code)
    WHERE station_id IS NOT NULL;

CREATE INDEX idx_charging_packages_station_status
    ON charging_packages(station_id, status);

CREATE TRIGGER trg_charging_packages_set_updated_at
BEFORE UPDATE ON charging_packages
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- TABLE 16: payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_reference VARCHAR(80) NOT NULL,
    station_id UUID NOT NULL,
    device_id UUID NOT NULL,
    charging_package_id UUID NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    source VARCHAR(20) NOT NULL DEFAULT 'device',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    expected_amount_minor BIGINT NOT NULL,
    received_amount_minor BIGINT NOT NULL DEFAULT 0,
    currency CHAR(3) NOT NULL DEFAULT 'TZS',
    package_name_snapshot VARCHAR(100) NOT NULL,
    package_duration_seconds_snapshot INTEGER NOT NULL,
    idempotency_key VARCHAR(120),
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    expired_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    failure_code VARCHAR(80),
    failure_reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_payments_reference UNIQUE (payment_reference),
    CONSTRAINT uq_payments_idempotency UNIQUE (idempotency_key),
    CONSTRAINT uq_payments_id_device
        UNIQUE (id, device_id),
    CONSTRAINT uq_payments_id_hierarchy
        UNIQUE (id, device_id, station_id),
    CONSTRAINT fk_payments_device_station
        FOREIGN KEY (device_id, station_id)
        REFERENCES devices(id, station_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_payments_package
        FOREIGN KEY (charging_package_id)
        REFERENCES charging_packages(id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_payments_reference
        CHECK (btrim(payment_reference) <> ''),
    CONSTRAINT chk_payments_method
        CHECK (payment_method IN ('coin', 'qr')),
    CONSTRAINT chk_payments_source
        CHECK (source IN ('device', 'admin', 'mobile', 'system')),
    CONSTRAINT chk_payments_status
        CHECK (
            status IN (
                'pending',
                'processing',
                'confirmed',
                'failed',
                'expired',
                'cancelled',
                'refunded'
            )
        ),
    CONSTRAINT chk_payments_expected_amount
        CHECK (expected_amount_minor > 0),
    CONSTRAINT chk_payments_received_amount
        CHECK (received_amount_minor >= 0),
    CONSTRAINT chk_payments_currency
        CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT chk_payments_package_duration
        CHECK (package_duration_seconds_snapshot > 0),
    CONSTRAINT chk_payments_metadata_object
        CHECK (jsonb_typeof(metadata) = 'object'),
    CONSTRAINT chk_payments_confirmed_at
        CHECK (confirmed_at IS NULL OR confirmed_at >= initiated_at),
    CONSTRAINT chk_payments_failed_at
        CHECK (failed_at IS NULL OR failed_at >= initiated_at),
    CONSTRAINT chk_payments_expired_at
        CHECK (expired_at IS NULL OR expired_at >= initiated_at),
    CONSTRAINT chk_payments_cancelled_at
        CHECK (cancelled_at IS NULL OR cancelled_at >= initiated_at),
    CONSTRAINT chk_payments_refunded_at
        CHECK (
            refunded_at IS NULL
            OR (
                confirmed_at IS NOT NULL
                AND refunded_at >= confirmed_at
            )
        )
);

COMMENT ON TABLE payments IS
    'Payment aggregate for coin or QR payment attempts.';
COMMENT ON COLUMN payments.expected_amount_minor IS
    'Integer minor units; for TZS this equals whole shillings.';
COMMENT ON COLUMN payments.package_name_snapshot IS
    'Immutable package label captured when payment is created.';

CREATE INDEX idx_payments_station_initiated
    ON payments(station_id, initiated_at DESC);

CREATE INDEX idx_payments_device_initiated
    ON payments(device_id, initiated_at DESC);

CREATE INDEX idx_payments_status_initiated
    ON payments(status, initiated_at DESC);

CREATE INDEX idx_payments_method_initiated
    ON payments(payment_method, initiated_at DESC);

CREATE INDEX idx_payments_confirmed
    ON payments(confirmed_at DESC)
    WHERE status IN ('confirmed', 'refunded');

CREATE OR REPLACE FUNCTION populate_payment_package_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    package_record charging_packages%ROWTYPE;
BEGIN
    SELECT *
    INTO package_record
    FROM charging_packages
    WHERE id = NEW.charging_package_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Charging package does not exist';
    END IF;

    IF
        package_record.station_id IS NOT NULL
        AND package_record.station_id <> NEW.station_id
    THEN
        RAISE EXCEPTION
            'Charging package is not available for the selected station';
    END IF;

    IF package_record.status <> 'active' THEN
        RAISE EXCEPTION 'Charging package is not active';
    END IF;

    IF package_record.valid_from > NEW.initiated_at THEN
        RAISE EXCEPTION 'Charging package is not yet valid';
    END IF;

    IF
        package_record.valid_until IS NOT NULL
        AND package_record.valid_until <= NEW.initiated_at
    THEN
        RAISE EXCEPTION 'Charging package has expired';
    END IF;

    IF NEW.payment_method = 'coin' AND NOT package_record.allow_coin THEN
        RAISE EXCEPTION 'Charging package does not allow coin payment';
    END IF;

    IF NEW.payment_method = 'qr' AND NOT package_record.allow_qr THEN
        RAISE EXCEPTION 'Charging package does not allow QR payment';
    END IF;

    NEW.expected_amount_minor := package_record.price_minor;
    NEW.currency := package_record.currency;
    NEW.package_name_snapshot := package_record.name;
    NEW.package_duration_seconds_snapshot := package_record.duration_seconds;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payments_populate_package_snapshot
BEFORE INSERT ON payments
FOR EACH ROW EXECUTE FUNCTION populate_payment_package_snapshot();

CREATE OR REPLACE FUNCTION protect_payment_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF
        OLD.payment_reference IS DISTINCT FROM NEW.payment_reference
        OR OLD.station_id IS DISTINCT FROM NEW.station_id
        OR OLD.device_id IS DISTINCT FROM NEW.device_id
        OR OLD.charging_package_id IS DISTINCT FROM NEW.charging_package_id
        OR OLD.payment_method IS DISTINCT FROM NEW.payment_method
        OR OLD.source IS DISTINCT FROM NEW.source
        OR OLD.expected_amount_minor IS DISTINCT FROM NEW.expected_amount_minor
        OR OLD.currency IS DISTINCT FROM NEW.currency
        OR OLD.package_name_snapshot IS DISTINCT FROM NEW.package_name_snapshot
        OR OLD.package_duration_seconds_snapshot
            IS DISTINCT FROM NEW.package_duration_seconds_snapshot
        OR OLD.initiated_at IS DISTINCT FROM NEW.initiated_at
    THEN
        RAISE EXCEPTION
            'Payment identity, package snapshot, and initiation fields are immutable'
            USING ERRCODE = '55000';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payments_protect_identity
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION protect_payment_identity();

CREATE OR REPLACE FUNCTION validate_payment_state()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF
        NEW.status IN ('confirmed', 'refunded')
        AND (
            NEW.confirmed_at IS NULL
            OR NEW.received_amount_minor < NEW.expected_amount_minor
        )
    THEN
        RAISE EXCEPTION
            'Confirmed payments require confirmed_at and sufficient received amount';
    END IF;

    IF NEW.status = 'failed' AND NEW.failed_at IS NULL THEN
        RAISE EXCEPTION 'Failed payments require failed_at';
    END IF;

    IF NEW.status = 'expired' AND NEW.expired_at IS NULL THEN
        RAISE EXCEPTION 'Expired payments require expired_at';
    END IF;

    IF NEW.status = 'cancelled' AND NEW.cancelled_at IS NULL THEN
        RAISE EXCEPTION 'Cancelled payments require cancelled_at';
    END IF;

    IF NEW.status = 'refunded' AND NEW.refunded_at IS NULL THEN
        RAISE EXCEPTION 'Refunded payments require refunded_at';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payments_validate_state
BEFORE INSERT OR UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION validate_payment_state();

CREATE TRIGGER trg_payments_set_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_payments_prevent_delete
BEFORE DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION prevent_row_delete();

-- TABLE 17: coin_insertions
CREATE TABLE coin_insertions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL,
    device_id UUID NOT NULL,
    device_event_id UUID NOT NULL,
    denomination_minor BIGINT NOT NULL,
    credited_amount_minor BIGINT NOT NULL DEFAULT 0,
    currency CHAR(3) NOT NULL DEFAULT 'TZS',
    pulse_count SMALLINT NOT NULL DEFAULT 1,
    accepted BOOLEAN NOT NULL,
    reject_reason VARCHAR(120),
    inserted_at TIMESTAMPTZ NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_coin_insertions_event UNIQUE (device_event_id),
    CONSTRAINT fk_coin_insertions_payment_device
        FOREIGN KEY (payment_id, device_id)
        REFERENCES payments(id, device_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_coin_insertions_event_device
        FOREIGN KEY (device_event_id, device_id)
        REFERENCES device_events(id, device_id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_coin_insertions_denomination
        CHECK (denomination_minor > 0),
    CONSTRAINT chk_coin_insertions_credited
        CHECK (credited_amount_minor >= 0),
    CONSTRAINT chk_coin_insertions_currency
        CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT chk_coin_insertions_pulses
        CHECK (pulse_count > 0),
    CONSTRAINT chk_coin_insertions_acceptance
        CHECK (
            (
                accepted
                AND credited_amount_minor > 0
                AND reject_reason IS NULL
            )
            OR
            (
                NOT accepted
                AND credited_amount_minor = 0
                AND reject_reason IS NOT NULL
            )
        ),
    CONSTRAINT chk_coin_insertions_metadata_object
        CHECK (jsonb_typeof(metadata) = 'object')
);

COMMENT ON TABLE coin_insertions IS
    'One row per accepted or rejected physical coin event.';

CREATE OR REPLACE FUNCTION validate_coin_insertion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    payment_record payments%ROWTYPE;
    event_record device_events%ROWTYPE;
BEGIN
    SELECT *
    INTO payment_record
    FROM payments
    WHERE id = NEW.payment_id;

    SELECT *
    INTO event_record
    FROM device_events
    WHERE id = NEW.device_event_id;

    IF payment_record.payment_method <> 'coin' THEN
        RAISE EXCEPTION 'Coin insertion must reference a coin payment';
    END IF;

    IF payment_record.currency <> NEW.currency THEN
        RAISE EXCEPTION 'Coin currency must match payment currency';
    END IF;

    IF event_record.event_category <> 'payment' THEN
        RAISE EXCEPTION 'Coin insertion event must use payment category';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_coin_insertions_validate
BEFORE INSERT ON coin_insertions
FOR EACH ROW EXECUTE FUNCTION validate_coin_insertion();

CREATE INDEX idx_coin_insertions_payment
    ON coin_insertions(payment_id, inserted_at);

CREATE INDEX idx_coin_insertions_device_time
    ON coin_insertions(device_id, inserted_at DESC);

CREATE TRIGGER trg_coin_insertions_prevent_delete
BEFORE DELETE ON coin_insertions
FOR EACH ROW EXECUTE FUNCTION prevent_row_delete();

-- TABLE 18: qr_payment_transactions
CREATE TABLE qr_payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL,
    provider VARCHAR(50) NOT NULL,
    merchant_reference VARCHAR(120) NOT NULL,
    provider_transaction_id VARCHAR(150),
    qr_reference VARCHAR(180),
    provider_status VARCHAR(40) NOT NULL DEFAULT 'created',
    amount_minor BIGINT NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'TZS',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    qr_expires_at TIMESTAMPTZ,
    callback_received_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_code VARCHAR(80),
    failure_reason TEXT,
    raw_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_qr_payment_transactions_payment UNIQUE (payment_id),
    CONSTRAINT uq_qr_payment_transactions_merchant
        UNIQUE (provider, merchant_reference),
    CONSTRAINT fk_qr_payment_transactions_payment
        FOREIGN KEY (payment_id)
        REFERENCES payments(id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_qr_payment_transactions_provider
        CHECK (btrim(provider) <> ''),
    CONSTRAINT chk_qr_payment_transactions_merchant_reference
        CHECK (btrim(merchant_reference) <> ''),
    CONSTRAINT chk_qr_payment_transactions_amount
        CHECK (amount_minor > 0),
    CONSTRAINT chk_qr_payment_transactions_currency
        CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT chk_qr_payment_transactions_provider_status
        CHECK (
            provider_status IN (
                'created',
                'pending',
                'confirmed',
                'failed',
                'expired',
                'cancelled',
                'refunded'
            )
        ),
    CONSTRAINT chk_qr_payment_transactions_expiry
        CHECK (qr_expires_at IS NULL OR qr_expires_at > requested_at),
    CONSTRAINT chk_qr_payment_transactions_callback
        CHECK (
            callback_received_at IS NULL
            OR callback_received_at >= requested_at
        ),
    CONSTRAINT chk_qr_payment_transactions_confirmed
        CHECK (confirmed_at IS NULL OR confirmed_at >= requested_at),
    CONSTRAINT chk_qr_payment_transactions_failed
        CHECK (failed_at IS NULL OR failed_at >= requested_at),
    CONSTRAINT chk_qr_payment_transactions_raw_response
        CHECK (
            raw_response IS NULL
            OR jsonb_typeof(raw_response) = 'object'
        )
);

COMMENT ON TABLE qr_payment_transactions IS
    'Provider-specific QR/mobile-money transaction data without customer secrets.';

CREATE OR REPLACE FUNCTION validate_qr_payment_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    payment_record payments%ROWTYPE;
BEGIN
    SELECT *
    INTO payment_record
    FROM payments
    WHERE id = NEW.payment_id;

    IF payment_record.payment_method <> 'qr' THEN
        RAISE EXCEPTION 'QR transaction must reference a QR payment';
    END IF;

    IF
        payment_record.expected_amount_minor <> NEW.amount_minor
        OR payment_record.currency <> NEW.currency
    THEN
        RAISE EXCEPTION
            'QR amount and currency must match the payment package snapshot';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_qr_payment_transactions_validate
BEFORE INSERT ON qr_payment_transactions
FOR EACH ROW EXECUTE FUNCTION validate_qr_payment_transaction();

CREATE UNIQUE INDEX uq_qr_payment_transactions_provider_txn
    ON qr_payment_transactions(provider, provider_transaction_id)
    WHERE provider_transaction_id IS NOT NULL;

CREATE INDEX idx_qr_payment_transactions_status
    ON qr_payment_transactions(provider_status, requested_at DESC);

CREATE TRIGGER trg_qr_payment_transactions_set_updated_at
BEFORE UPDATE ON qr_payment_transactions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_qr_payment_transactions_prevent_delete
BEFORE DELETE ON qr_payment_transactions
FOR EACH ROW EXECUTE FUNCTION prevent_row_delete();

-- TABLE 19: charging_sessions
CREATE TABLE charging_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_reference VARCHAR(80) NOT NULL,
    station_id UUID NOT NULL,
    device_id UUID NOT NULL,
    locker_id UUID NOT NULL,
    charging_port_id UUID NOT NULL,
    status VARCHAR(25) NOT NULL DEFAULT 'pending',
    access_code_hash TEXT,
    access_code_expires_at TIMESTAMPTZ,
    access_code_failed_attempts SMALLINT NOT NULL DEFAULT 0,
    access_code_locked_until TIMESTAMPTZ,
    purchased_duration_seconds INTEGER NOT NULL DEFAULT 0,
    remaining_seconds INTEGER NOT NULL DEFAULT 0,
    total_paid_minor BIGINT NOT NULL DEFAULT 0,
    currency CHAR(3) NOT NULL DEFAULT 'TZS',
    extension_count SMALLINT NOT NULL DEFAULT 0,
    power_source_at_start VARCHAR(20),
    power_source_at_end VARCHAR(20),
    started_at TIMESTAMPTZ,
    expected_end_at TIMESTAMPTZ,
    last_progress_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    termination_reason VARCHAR(255),
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_charging_sessions_reference UNIQUE (session_reference),
    CONSTRAINT fk_charging_sessions_device_station
        FOREIGN KEY (device_id, station_id)
        REFERENCES devices(id, station_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_charging_sessions_locker_device
        FOREIGN KEY (locker_id, device_id)
        REFERENCES lockers(id, device_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_charging_sessions_port_hierarchy
        FOREIGN KEY (charging_port_id, locker_id, device_id)
        REFERENCES charging_ports(id, locker_id, device_id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_charging_sessions_reference
        CHECK (btrim(session_reference) <> ''),
    CONSTRAINT chk_charging_sessions_status
        CHECK (
            status IN (
                'pending',
                'awaiting_device',
                'active',
                'paused',
                'completed',
                'stopped',
                'failed',
                'cancelled',
                'expired'
            )
        ),
    CONSTRAINT chk_charging_sessions_access_attempts
        CHECK (access_code_failed_attempts >= 0),
    CONSTRAINT chk_charging_sessions_duration
        CHECK (purchased_duration_seconds >= 0),
    CONSTRAINT chk_charging_sessions_remaining
        CHECK (
            remaining_seconds >= 0
            AND remaining_seconds <= purchased_duration_seconds
        ),
    CONSTRAINT chk_charging_sessions_total_paid
        CHECK (total_paid_minor >= 0),
    CONSTRAINT chk_charging_sessions_currency
        CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT chk_charging_sessions_extension_count
        CHECK (extension_count >= 0),
    CONSTRAINT chk_charging_sessions_power_start
        CHECK (
            power_source_at_start IS NULL
            OR power_source_at_start IN (
                'grid',
                'backup_battery',
                'none',
                'unknown'
            )
        ),
    CONSTRAINT chk_charging_sessions_power_end
        CHECK (
            power_source_at_end IS NULL
            OR power_source_at_end IN (
                'grid',
                'backup_battery',
                'none',
                'unknown'
            )
        ),
    CONSTRAINT chk_charging_sessions_expected_end
        CHECK (
            expected_end_at IS NULL
            OR (
                started_at IS NOT NULL
                AND expected_end_at >= started_at
            )
        ),
    CONSTRAINT chk_charging_sessions_last_progress
        CHECK (
            last_progress_at IS NULL
            OR (
                started_at IS NOT NULL
                AND last_progress_at >= started_at
            )
        ),
    CONSTRAINT chk_charging_sessions_ended
        CHECK (
            ended_at IS NULL
            OR (
                started_at IS NOT NULL
                AND ended_at >= started_at
            )
        ),
    CONSTRAINT chk_charging_sessions_access_expiry
        CHECK (
            access_code_expires_at IS NULL
            OR access_code_expires_at > created_at
        ),
    CONSTRAINT chk_charging_sessions_metadata_object
        CHECK (jsonb_typeof(metadata) = 'object')
);

COMMENT ON TABLE charging_sessions IS
    'Paid charging lifecycle for one locker and one charging port.';
COMMENT ON COLUMN charging_sessions.access_code_hash IS
    'One-way hash of the temporary locker code; plaintext is forbidden.';

CREATE UNIQUE INDEX uq_charging_sessions_active_locker
    ON charging_sessions(locker_id)
    WHERE status IN ('pending', 'awaiting_device', 'active', 'paused');

CREATE UNIQUE INDEX uq_charging_sessions_active_port
    ON charging_sessions(charging_port_id)
    WHERE status IN ('pending', 'awaiting_device', 'active', 'paused');

CREATE INDEX idx_charging_sessions_station_created
    ON charging_sessions(station_id, created_at DESC);

CREATE INDEX idx_charging_sessions_device_created
    ON charging_sessions(device_id, created_at DESC);

CREATE INDEX idx_charging_sessions_status_created
    ON charging_sessions(status, created_at DESC);

CREATE INDEX idx_charging_sessions_active
    ON charging_sessions(device_id, expected_end_at)
    WHERE status IN ('active', 'paused');

CREATE OR REPLACE FUNCTION validate_charging_session_state()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF
        NEW.status IN (
            'awaiting_device',
            'active',
            'paused',
            'completed',
            'stopped',
            'failed'
        )
        AND (
            NEW.access_code_hash IS NULL
            OR NEW.purchased_duration_seconds <= 0
            OR NEW.total_paid_minor <= 0
        )
    THEN
        RAISE EXCEPTION
            'Paid session states require an access-code hash, duration, and payment';
    END IF;

    IF
        NEW.status IN ('active', 'paused', 'completed', 'stopped', 'failed')
        AND NEW.started_at IS NULL
    THEN
        RAISE EXCEPTION
            'Started session states require started_at';
    END IF;

    IF
        NEW.status IN ('completed', 'stopped', 'failed', 'cancelled', 'expired')
        AND NEW.ended_at IS NULL
    THEN
        RAISE EXCEPTION
            'Terminal session states require ended_at';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_charging_sessions_validate_state
BEFORE INSERT OR UPDATE ON charging_sessions
FOR EACH ROW EXECUTE FUNCTION validate_charging_session_state();

CREATE TRIGGER trg_charging_sessions_set_updated_at
BEFORE UPDATE ON charging_sessions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_charging_sessions_prevent_delete
BEFORE DELETE ON charging_sessions
FOR EACH ROW EXECUTE FUNCTION prevent_row_delete();

-- TABLE 20: charging_session_payments
CREATE TABLE charging_session_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    charging_session_id UUID NOT NULL,
    payment_id UUID NOT NULL,
    purpose VARCHAR(20) NOT NULL,
    duration_seconds_added INTEGER NOT NULL,
    amount_minor BIGINT NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'TZS',
    linked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_charging_session_payments_payment UNIQUE (payment_id),
    CONSTRAINT fk_charging_session_payments_session
        FOREIGN KEY (charging_session_id)
        REFERENCES charging_sessions(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_charging_session_payments_payment
        FOREIGN KEY (payment_id)
        REFERENCES payments(id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_charging_session_payments_purpose
        CHECK (purpose IN ('initial', 'extension')),
    CONSTRAINT chk_charging_session_payments_duration
        CHECK (duration_seconds_added > 0),
    CONSTRAINT chk_charging_session_payments_amount
        CHECK (amount_minor > 0),
    CONSTRAINT chk_charging_session_payments_currency
        CHECK (currency ~ '^[A-Z]{3}$')
);

COMMENT ON TABLE charging_session_payments IS
    'Links confirmed payments to a session and supports paid time extensions.';

CREATE UNIQUE INDEX uq_charging_session_payments_initial
    ON charging_session_payments(charging_session_id)
    WHERE purpose = 'initial';

CREATE INDEX idx_charging_session_payments_session
    ON charging_session_payments(charging_session_id, linked_at);

CREATE OR REPLACE FUNCTION validate_session_payment_link()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    payment_record payments%ROWTYPE;
    session_record charging_sessions%ROWTYPE;
BEGIN
    SELECT *
    INTO payment_record
    FROM payments
    WHERE id = NEW.payment_id;

    SELECT *
    INTO session_record
    FROM charging_sessions
    WHERE id = NEW.charging_session_id;

    IF payment_record.status <> 'confirmed' THEN
        RAISE EXCEPTION
            'Only confirmed payments can be linked to charging sessions';
    END IF;

    IF
        payment_record.station_id <> session_record.station_id
        OR payment_record.device_id <> session_record.device_id
    THEN
        RAISE EXCEPTION
            'Payment and charging session must belong to the same device and station';
    END IF;

    NEW.duration_seconds_added :=
        payment_record.package_duration_seconds_snapshot;
    NEW.amount_minor := payment_record.received_amount_minor;
    NEW.currency := payment_record.currency;

    IF NEW.amount_minor < payment_record.expected_amount_minor THEN
        RAISE EXCEPTION
            'Confirmed payment amount is below the expected package amount';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_charging_session_payments_validate
BEFORE INSERT ON charging_session_payments
FOR EACH ROW EXECUTE FUNCTION validate_session_payment_link();

CREATE OR REPLACE FUNCTION refresh_session_payment_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    target_session_id UUID;
BEGIN
    target_session_id := NEW.charging_session_id;

    UPDATE charging_sessions
    SET
        purchased_duration_seconds = totals.total_duration,
        remaining_seconds = remaining_seconds + NEW.duration_seconds_added,
        total_paid_minor = totals.total_amount,
        extension_count = totals.extension_count
    FROM (
        SELECT
            COALESCE(SUM(duration_seconds_added), 0)::INTEGER AS total_duration,
            COALESCE(SUM(amount_minor), 0)::BIGINT AS total_amount,
            COUNT(*) FILTER (WHERE purpose = 'extension')::SMALLINT
                AS extension_count
        FROM charging_session_payments
        WHERE charging_session_id = target_session_id
    ) AS totals
    WHERE charging_sessions.id = target_session_id;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_charging_session_payments_refresh_totals
AFTER INSERT ON charging_session_payments
FOR EACH ROW EXECUTE FUNCTION refresh_session_payment_totals();

CREATE TRIGGER trg_charging_session_payments_prevent_delete
BEFORE DELETE ON charging_session_payments
FOR EACH ROW EXECUTE FUNCTION prevent_row_delete();

-- ============================================================================
-- SECTION E: ALERTS, SETTINGS, AND AUDIT
-- ============================================================================

-- TABLE 21: alerts
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL,
    device_id UUID,
    locker_id UUID,
    charging_port_id UUID,
    charging_session_id UUID,
    device_event_id UUID,
    alert_code VARCHAR(80) NOT NULL,
    category VARCHAR(30) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(160) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    deduplication_key VARCHAR(180),
    detected_at TIMESTAMPTZ NOT NULL,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by_user_id UUID,
    resolved_at TIMESTAMPTZ,
    resolved_by_user_id UUID,
    resolution_notes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_alerts_station
        FOREIGN KEY (station_id)
        REFERENCES stations(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_alerts_device_station
        FOREIGN KEY (device_id, station_id)
        REFERENCES devices(id, station_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_alerts_locker_device
        FOREIGN KEY (locker_id, device_id)
        REFERENCES lockers(id, device_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_alerts_port_hierarchy
        FOREIGN KEY (charging_port_id, locker_id, device_id)
        REFERENCES charging_ports(id, locker_id, device_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_alerts_session
        FOREIGN KEY (charging_session_id)
        REFERENCES charging_sessions(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_alerts_device_event
        FOREIGN KEY (device_event_id)
        REFERENCES device_events(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_alerts_acknowledged_by
        FOREIGN KEY (acknowledged_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_alerts_resolved_by
        FOREIGN KEY (resolved_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT chk_alerts_code
        CHECK (alert_code ~ '^[A-Z][A-Z0-9_]*$'),
    CONSTRAINT chk_alerts_category
        CHECK (
            category IN (
                'power',
                'device',
                'locker',
                'charging_port',
                'payment',
                'session',
                'security',
                'connectivity',
                'system'
            )
        ),
    CONSTRAINT chk_alerts_severity
        CHECK (severity IN ('info', 'warning', 'critical')),
    CONSTRAINT chk_alerts_title
        CHECK (btrim(title) <> ''),
    CONSTRAINT chk_alerts_message
        CHECK (btrim(message) <> ''),
    CONSTRAINT chk_alerts_status
        CHECK (
            status IN (
                'open',
                'acknowledged',
                'resolved',
                'dismissed'
            )
        ),
    CONSTRAINT chk_alerts_hierarchy
        CHECK (
            (locker_id IS NULL OR device_id IS NOT NULL)
            AND
            (charging_port_id IS NULL OR locker_id IS NOT NULL)
        ),
    CONSTRAINT chk_alerts_acknowledgement
        CHECK (
            (
                acknowledged_at IS NULL
                AND acknowledged_by_user_id IS NULL
            )
            OR
            (
                acknowledged_at IS NOT NULL
                AND acknowledged_by_user_id IS NOT NULL
                AND acknowledged_at >= detected_at
            )
        ),
    CONSTRAINT chk_alerts_resolution
        CHECK (
            (
                resolved_at IS NULL
                AND resolved_by_user_id IS NULL
            )
            OR
            (
                resolved_at IS NOT NULL
                AND resolved_by_user_id IS NOT NULL
                AND resolved_at >= detected_at
            )
        ),
    CONSTRAINT chk_alerts_metadata_object
        CHECK (jsonb_typeof(metadata) = 'object')
);

COMMENT ON TABLE alerts IS
    'Operational, security, power, payment, and device alerts.';

CREATE UNIQUE INDEX uq_alerts_active_deduplication
    ON alerts(deduplication_key)
    WHERE
        deduplication_key IS NOT NULL
        AND status IN ('open', 'acknowledged');

CREATE INDEX idx_alerts_station_status
    ON alerts(station_id, status, detected_at DESC);

CREATE INDEX idx_alerts_device_status
    ON alerts(device_id, status, detected_at DESC)
    WHERE device_id IS NOT NULL;

CREATE INDEX idx_alerts_severity_open
    ON alerts(severity, detected_at DESC)
    WHERE status IN ('open', 'acknowledged');

CREATE TRIGGER trg_alerts_set_updated_at
BEFORE UPDATE ON alerts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- TABLE 22: system_settings
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) NOT NULL,
    scope_type VARCHAR(20) NOT NULL,
    station_id UUID,
    device_id UUID,
    value_type VARCHAR(20) NOT NULL,
    value_json JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    version INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID,
    updated_by_user_id UUID,

    CONSTRAINT fk_system_settings_station
        FOREIGN KEY (station_id)
        REFERENCES stations(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_system_settings_device_station
        FOREIGN KEY (device_id, station_id)
        REFERENCES devices(id, station_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_system_settings_created_by
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_system_settings_updated_by
        FOREIGN KEY (updated_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT chk_system_settings_key
        CHECK (setting_key ~ '^[a-z][a-z0-9_.-]*$'),
    CONSTRAINT chk_system_settings_scope
        CHECK (
            (
                scope_type = 'global'
                AND station_id IS NULL
                AND device_id IS NULL
            )
            OR
            (
                scope_type = 'station'
                AND station_id IS NOT NULL
                AND device_id IS NULL
            )
            OR
            (
                scope_type = 'device'
                AND station_id IS NOT NULL
                AND device_id IS NOT NULL
            )
        ),
    CONSTRAINT chk_system_settings_value_type
        CHECK (
            value_type IN (
                'string',
                'integer',
                'decimal',
                'boolean',
                'json'
            )
        ),
    CONSTRAINT chk_system_settings_status
        CHECK (status IN ('active', 'inactive')),
    CONSTRAINT chk_system_settings_version
        CHECK (version > 0)
);

COMMENT ON TABLE system_settings IS
    'Versioned non-secret operational configuration at global, station, or device scope.';
COMMENT ON COLUMN system_settings.value_json IS
    'Must not contain credentials, API secrets, passwords, or locker codes.';

CREATE UNIQUE INDEX uq_system_settings_global
    ON system_settings(setting_key)
    WHERE scope_type = 'global';

CREATE UNIQUE INDEX uq_system_settings_station
    ON system_settings(station_id, setting_key)
    WHERE scope_type = 'station';

CREATE UNIQUE INDEX uq_system_settings_device
    ON system_settings(device_id, setting_key)
    WHERE scope_type = 'device';

CREATE INDEX idx_system_settings_scope_status
    ON system_settings(scope_type, status);

CREATE TRIGGER trg_system_settings_set_updated_at
BEFORE UPDATE ON system_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- TABLE 23: audit_logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_type VARCHAR(20) NOT NULL,
    actor_user_id UUID,
    actor_device_id UUID,
    station_id UUID,
    action VARCHAR(120) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id UUID,
    request_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    reason TEXT,
    before_data JSONB,
    after_data JSONB,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_audit_logs_actor_user
        FOREIGN KEY (actor_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_audit_logs_actor_device
        FOREIGN KEY (actor_device_id)
        REFERENCES devices(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_audit_logs_station
        FOREIGN KEY (station_id)
        REFERENCES stations(id)
        ON DELETE SET NULL,
    CONSTRAINT chk_audit_logs_actor_type
        CHECK (actor_type IN ('user', 'device', 'system')),
    CONSTRAINT chk_audit_logs_actor_identity
        CHECK (
            (
                actor_type = 'user'
                AND actor_user_id IS NOT NULL
                AND actor_device_id IS NULL
            )
            OR
            (
                actor_type = 'device'
                AND actor_device_id IS NOT NULL
                AND actor_user_id IS NULL
            )
            OR
            (
                actor_type = 'system'
                AND actor_user_id IS NULL
                AND actor_device_id IS NULL
            )
        ),
    CONSTRAINT chk_audit_logs_action
        CHECK (action ~ '^[a-z][a-z0-9_.-]*$'),
    CONSTRAINT chk_audit_logs_entity_type
        CHECK (entity_type ~ '^[a-z][a-z0-9_-]*$'),
    CONSTRAINT chk_audit_logs_before_data
        CHECK (
            before_data IS NULL
            OR jsonb_typeof(before_data) = 'object'
        ),
    CONSTRAINT chk_audit_logs_after_data
        CHECK (
            after_data IS NULL
            OR jsonb_typeof(after_data) = 'object'
        ),
    CONSTRAINT chk_audit_logs_metadata_object
        CHECK (jsonb_typeof(metadata) = 'object')
);

COMMENT ON TABLE audit_logs IS
    'Append-only record of sensitive administrative, device, and system actions.';

CREATE INDEX idx_audit_logs_occurred
    ON audit_logs(occurred_at DESC);

CREATE INDEX idx_audit_logs_actor_user
    ON audit_logs(actor_user_id, occurred_at DESC)
    WHERE actor_user_id IS NOT NULL;

CREATE INDEX idx_audit_logs_actor_device
    ON audit_logs(actor_device_id, occurred_at DESC)
    WHERE actor_device_id IS NOT NULL;

CREATE INDEX idx_audit_logs_entity
    ON audit_logs(entity_type, entity_id, occurred_at DESC);

CREATE INDEX idx_audit_logs_station
    ON audit_logs(station_id, occurred_at DESC)
    WHERE station_id IS NOT NULL;

CREATE INDEX idx_audit_logs_occurred_brin
    ON audit_logs USING BRIN(occurred_at);

CREATE TRIGGER trg_audit_logs_prevent_update
BEFORE UPDATE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

CREATE TRIGGER trg_audit_logs_prevent_delete
BEFORE DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

-- ============================================================================
-- ADDITIONAL ADMINISTRATIVE INDEXES
-- ============================================================================

CREATE INDEX idx_payments_station_confirmed_revenue
    ON payments(station_id, confirmed_at DESC, received_amount_minor)
    WHERE status IN ('confirmed', 'refunded');

CREATE INDEX idx_sessions_station_completed
    ON charging_sessions(station_id, ended_at DESC)
    WHERE status IN ('completed', 'stopped', 'failed');

CREATE INDEX idx_sessions_device_port
    ON charging_sessions(device_id, charging_port_id, created_at DESC);

-- ============================================================================
-- SCHEMA COMMENTS AND OPERATIONAL RULES
-- ============================================================================

COMMENT ON SCHEMA charging_system IS
    'Source-of-truth schema for the QR-code and coin-based mobile charging system.';

-- The application must enforce these cross-cutting rules:
--   * Passwords: Argon2id or another approved adaptive password hash.
--   * Locker access codes: short-lived one-way hashes, rate-limited attempts.
--   * API keys: store one-way hashes.
--   * HMAC secrets: encrypt with an application/KMS-managed key; hashes cannot
--     be used to verify HMAC signatures.
--   * Device events: authenticate, validate, deduplicate, then process.
--   * Reports: derive from payments, sessions, telemetry, devices, and alerts.
--   * Customer privacy: do not store phone files, contacts, messages, or
--     unnecessary payer-identifying data.
--   * Decommissioning: use status fields rather than deleting stations,
--     devices, lockers, ports, users, or financial history.
--   * Retention: define controlled archival policies for telemetry and raw
--     events; audit and financial records require longer retention.
--   * Privileges: application roles should not receive DROP, TRUNCATE, or
--     unrestricted DELETE privileges on this schema.

COMMIT;
