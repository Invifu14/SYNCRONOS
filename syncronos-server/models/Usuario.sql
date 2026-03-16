CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    
    -- Datos para el cálculo Matemático y Místico
    fecha_nacimiento DATE NOT NULL,
    hora_nacimiento TIME NOT NULL,
    ciudad_nacimiento VARCHAR(100),
    pais_nacimiento VARCHAR(100),
    
    -- Metadatos para el algoritmo
    signo_zodiacal VARCHAR(20),
    generacion VARCHAR(50), -- Gen Z, Millennial, Alpha, etc.
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);