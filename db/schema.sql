-- Script para crear la base de datos y tabla vehicles
-- Ejecutar este script en PostgreSQL

-- Crear la base de datos (opcional si ya existe)
-- CREATE DATABASE taller_control;

-- Conectar a la base de datos
-- \c taller_control;

-- Crear extensión para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear enum para status
CREATE TYPE vehicle_status AS ENUM (
    'EN_REVISION',
    'ESPERANDO_PIEZA', 
    'PRESUPUESTO_PENDIENTE',
    'LISTO'
);

-- Crear tabla vehicles
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plate VARCHAR(20) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    status vehicle_status NOT NULL DEFAULT 'EN_REVISION',
    last_event TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true
);

-- Crear índice en plate para consultas rápidas
CREATE INDEX idx_vehicles_plate ON vehicles(plate);

-- Crear índice en phone para consultas rápidas  
CREATE INDEX idx_vehicles_phone ON vehicles(phone);

-- Crear índice en active para filtrar vehículos activos
CREATE INDEX idx_vehicles_active ON vehicles(active);

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();