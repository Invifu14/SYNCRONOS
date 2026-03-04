const cors = require('cors');
﻿const express = require('express');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

// Asegurar que la carpeta uploads exista
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

// Configurar multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });

let db;
(async () => {
    db = await open({
        filename: './database.db',
        driver: sqlite3.Database
    });
    // Se agregan los campos metodo_registro, correo, telefono e intencion
    await db.exec(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT,
            fecha_nacimiento TEXT,
            generacion TEXT,
            signo_zodiacal TEXT,
            foto TEXT,
            ubicacion TEXT,
            gustos TEXT,
            metodo_registro TEXT,
            correo TEXT,
            telefono TEXT,
            intencion TEXT,
            genero TEXT,
            genero_interes TEXT,
            latitud REAL,
            longitud REAL,
            fotos TEXT
        );
        CREATE TABLE IF NOT EXISTS sincronias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_origen TEXT,
            usuario_destino TEXT,
            tipo TEXT DEFAULT 'like',
            fecha_sincronia TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    
    // Si la tabla ya existía de antes, agregamos las columnas manualmente para que no falle.
    try { await db.run("ALTER TABLE usuarios ADD COLUMN intencion TEXT;"); } catch(e) { /* Ya existe, ignorar */ }
    try { await db.run("ALTER TABLE usuarios ADD COLUMN genero TEXT;"); } catch(e) { /* Ya existe, ignorar */ }
    try { await db.run("ALTER TABLE usuarios ADD COLUMN genero_interes TEXT;"); } catch(e) { /* Ya existe, ignorar */ }
    try { await db.run("ALTER TABLE usuarios ADD COLUMN latitud REAL;"); } catch(e) { /* Ya existe, ignorar */ }
    try { await db.run("ALTER TABLE usuarios ADD COLUMN longitud REAL;"); } catch(e) { /* Ya existe, ignorar */ }
    try { await db.run("ALTER TABLE usuarios ADD COLUMN fotos TEXT;"); } catch(e) { /* Ya existe, ignorar */ }
    try { await db.run("ALTER TABLE sincronias ADD COLUMN tipo TEXT DEFAULT 'like';"); } catch(e) { /* Ya existe, ignorar */ }
    
    console.log("🗄️ Base de datos lista.");
})();

// Lógica de Signos y Fotos
const obtenerSignoYFoto = (fechaStr) => {
    const fecha = new Date(fechaStr + "T12:00:00"); 
    const dia = fecha.getDate();
    const mes = fecha.getMonth() + 1;
    let signo = ""; let fotoId = "";
    if ((mes == 3 && dia >= 21) || (mes == 4 && dia <= 19)) { signo = "Aries ♈"; fotoId = "aries"; }
    else if ((mes == 4 && dia >= 20) || (mes == 5 && dia <= 20)) { signo = "Tauro ♉"; fotoId = "taurus"; }
    else if ((mes == 5 && dia >= 21) || (mes == 6 && dia <= 20)) { signo = "Géminis ♊"; fotoId = "gemini"; }
    else if ((mes == 6 && dia >= 21) || (mes == 7 && dia <= 22)) { signo = "Cáncer ♋"; fotoId = "cancer"; }
    else if ((mes == 7 && dia >= 23) || (mes == 8 && dia <= 22)) { signo = "Leo ♌"; fotoId = "leo"; }
    else if ((mes == 8 && dia >= 23) || (mes == 9 && dia <= 22)) { signo = "Virgo ♍"; fotoId = "virgo"; }
    else if ((mes == 9 && dia >= 23) || (mes == 10 && dia <= 22)) { signo = "Libra ♎"; fotoId = "libra"; }
    else if ((mes == 10 && dia >= 23) || (mes == 11 && dia <= 21)) { signo = "Escorpio ♏"; fotoId = "scorpio"; }
    else if ((mes == 11 && dia >= 22) || (mes == 12 && dia <= 21)) { signo = "Sagitario ♐"; fotoId = "sagittarius"; }
    else if ((mes == 12 && dia >= 22) || (mes == 1 && dia <= 19)) { signo = "Capricornio ♑"; fotoId = "capricorn"; }
    else if ((mes == 1 && dia >= 20) || (mes == 2 && dia <= 18)) { signo = "Acuario ♒"; fotoId = "aquarius"; }
    else { signo = "Piscis ♓"; fotoId = "pisces"; }
    return { signo, foto: `https://robohash.org/${fotoId}.png?set=set4` };
};

const obtenerElemento = (signo) => {
    if (!signo) return "";
    const name = signo.split(" ")[0]; // Quitar emoji
    if (["Aries", "Leo", "Sagitario"].includes(name)) return "Fuego";
    if (["Tauro", "Virgo", "Capricornio"].includes(name)) return "Tierra";
    if (["Géminis", "Libra", "Acuario"].includes(name)) return "Aire";
    if (["Cáncer", "Escorpio", "Piscis"].includes(name)) return "Agua";
    return "";
};

const calcularCompatibilidad = (signo1, signo2) => {
    const el1 = obtenerElemento(signo1);
    const el2 = obtenerElemento(signo2);

    // Matriz de compatibilidad simple
    const matrix = {
        "Fuego-Fuego": { porc: 85, txt: "Mucha pasión y energía, pero cuidado con el ego." },
        "Tierra-Tierra": { porc: 90, txt: "Estabilidad pura y objetivos en común." },
        "Aire-Aire": { porc: 85, txt: "Sintonía mental perfecta, nunca faltará tema." },
        "Agua-Agua": { porc: 80, txt: "Conexión emocional profunda y empática." },

        "Fuego-Aire": { porc: 95, txt: "El aire aviva el fuego. Inspiración mutua." },
        "Aire-Fuego": { porc: 95, txt: "El aire aviva el fuego. Inspiración mutua." },

        "Tierra-Agua": { porc: 95, txt: "El agua nutre la tierra. Relación sólida y fértil." },
        "Agua-Tierra": { porc: 95, txt: "El agua nutre la tierra. Relación sólida y fértil." },

        "Fuego-Tierra": { porc: 60, txt: "Ritmos diferentes: impulso vs. constancia." },
        "Tierra-Fuego": { porc: 60, txt: "Ritmos diferentes: impulso vs. constancia." },

        "Fuego-Agua": { porc: 50, txt: "Vapor. Apasionado pero puede ser volátil." },
        "Agua-Fuego": { porc: 50, txt: "Vapor. Apasionado pero puede ser volátil." },

        "Aire-Tierra": { porc: 55, txt: "Ideas vs. Realidad. Requiere esfuerzo para anclar." },
        "Tierra-Aire": { porc: 55, txt: "Ideas vs. Realidad. Requiere esfuerzo para anclar." },

        "Aire-Agua": { porc: 65, txt: "Razón vs. Emoción. Se complementan si se escuchan." },
        "Agua-Aire": { porc: 65, txt: "Razón vs. Emoción. Se complementan si se escuchan." },
    };

    const key = `${el1}-${el2}`;
    return matrix[key] || { porc: 50, txt: "Misterio astrológico. ¡Descúbranlo juntos!" };
};

const obtenerGeneracion = (fechaStr) => {
    const año = new Date(fechaStr + "T12:00:00").getFullYear();
    if (año >= 2010) return "Generación Alpha";
    if (año >= 1997) return "Generación Z";
    if (año >= 1981) return "Millennials";
    if (año >= 1965) return "Generación X";
    return "Baby Boomers";
};

// --- RUTAS ---

// Función para calcular distancia (Haversine) en Kilómetros
const calcularDistancia = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distancia en km
};

app.post('/registrar-cronos', upload.array('fotos', 6), async (req, res) => {
    // Se añade intención en la recepción
    const { nombre, fecha_nacimiento, ubicacion, gustos, metodo_registro, correo, telefono, intencion, genero, genero_interes, latitud, longitud } = req.body;
    const generacion = obtenerGeneracion(fecha_nacimiento);
    const astros = obtenerSignoYFoto(fecha_nacimiento);
    let signo = astros.signo;

    // Procesar imágenes subidas o usar el fallback de robohash
    let fotosArray = [];
    let fotoPrincipal = astros.foto;

    if (req.files && req.files.length > 0) {
        fotosArray = req.files.map(f => `/uploads/${f.filename}`);
        fotoPrincipal = fotosArray[0];
    }
    
    const fotosJson = JSON.stringify(fotosArray);

    const existing = await db.get(`SELECT * FROM usuarios WHERE nombre = ?`, [nombre]);
    if (existing) {
        return res.json({ mensaje: "Login OK", usuario: existing });
    }

    await db.run(
        `INSERT INTO usuarios (nombre, fecha_nacimiento, generacion, signo_zodiacal, foto, ubicacion, gustos, metodo_registro, correo, telefono, intencion, genero, genero_interes, latitud, longitud, fotos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [nombre, fecha_nacimiento, generacion, signo, fotoPrincipal, ubicacion || "", gustos || "", metodo_registro || "", correo || "", telefono || "", intencion || "", genero || "", genero_interes || "", latitud || null, longitud || null, fotosJson]
    );
    const nuevoUsuario = await db.get(`SELECT * FROM usuarios WHERE nombre = ?`, [nombre]);
    res.json({ mensaje: "OK", usuario: nuevoUsuario });
});

app.get('/usuarios/:nombre', async (req, res) => {
    const { nombre } = req.params;
    const usuarioActual = await db.get("SELECT * FROM usuarios WHERE nombre = ?", [nombre]);

    if (!usuarioActual) {
        return res.json([]);
    }

    // Mapear el género de interés para la consulta
    let miInteresMapeado = usuarioActual.genero_interes;
    if (miInteresMapeado === 'Hombres') miInteresMapeado = 'Hombre';
    if (miInteresMapeado === 'Mujeres') miInteresMapeado = 'Mujer';

    // Para el otro usuario, debemos ver si su interés nos incluye
    let miGeneroMapeado = usuarioActual.genero;
    if (miGeneroMapeado === 'Hombre') miGeneroMapeado = 'Hombres';
    if (miGeneroMapeado === 'Mujer') miGeneroMapeado = 'Mujeres';

    // Filtrar: El género del otro debe estar en mi interes (o me interesa Todo),
    // y mi género debe estar en el interés del otro (o le interesa Todo).
    const resultados = await db.all(`
        SELECT * FROM usuarios
        WHERE nombre != ?
        AND (genero = ? OR ? = 'Todos')
        AND (? = genero_interes OR genero_interes = 'Todos')
    `, [nombre, miInteresMapeado, usuarioActual.genero_interes, miGeneroMapeado]);

    // Filtrar por distancia (50km máximo, o incluir si no hay datos de geolocalización)
    const resultadosFiltrados = resultados.filter(u => {
        if (!usuarioActual.latitud || !u.latitud) return true; // Incluir si alguno no tiene ubicación para no romper perfiles viejos
        const dist = calcularDistancia(usuarioActual.latitud, usuarioActual.longitud, u.latitud, u.longitud);
        u.distancia = Math.round(dist); // Agregamos la distancia para poder mostrarla si queremos
        return dist <= 50;
    }).map(u => {
        const comp = calcularCompatibilidad(usuarioActual.signo_zodiacal, u.signo_zodiacal);
        u.compatibilidad_porcentaje = comp.porc;
        u.compatibilidad_texto = comp.txt;
        return u;
    });

    res.json(resultadosFiltrados);
});

app.get('/sugerencias/:nombre', async (req, res) => {
    const { nombre } = req.params;
    const usuarioActual = await db.get("SELECT * FROM usuarios WHERE nombre = ?", [nombre]);
    if (!usuarioActual) return res.json([]);

    // Mapear el género de interés para la consulta
    let miInteresMapeado = usuarioActual.genero_interes;
    if (miInteresMapeado === 'Hombres') miInteresMapeado = 'Hombre';
    if (miInteresMapeado === 'Mujeres') miInteresMapeado = 'Mujer';

    // Para el otro usuario, debemos ver si su interés nos incluye
    let miGeneroMapeado = usuarioActual.genero;
    if (miGeneroMapeado === 'Hombre') miGeneroMapeado = 'Hombres';
    if (miGeneroMapeado === 'Mujer') miGeneroMapeado = 'Mujeres';

    const resultados = await db.all(`
        SELECT * FROM usuarios
        WHERE nombre != ?
        AND generacion = ?
        AND (genero = ? OR ? = 'Todos')
        AND (? = genero_interes OR genero_interes = 'Todos')
    `, [nombre, usuarioActual.generacion, miInteresMapeado, usuarioActual.genero_interes, miGeneroMapeado]);

    // Filtrar por distancia (50km máximo)
    const resultadosFiltrados = resultados.filter(u => {
        if (!usuarioActual.latitud || !u.latitud) return true;
        const dist = calcularDistancia(usuarioActual.latitud, usuarioActual.longitud, u.latitud, u.longitud);
        u.distancia = Math.round(dist);
        return dist <= 50;
    }).map(u => {
        const comp = calcularCompatibilidad(usuarioActual.signo_zodiacal, u.signo_zodiacal);
        u.compatibilidad_porcentaje = comp.porc;
        u.compatibilidad_texto = comp.txt;
        return u;
    });

    res.json(resultadosFiltrados);
});

app.post('/radar-cronos', async (req, res) => {
    const { fecha_inicio, fecha_fin } = req.body;
    const resultados = await db.all("SELECT * FROM usuarios WHERE fecha_nacimiento BETWEEN ? AND ?", [fecha_inicio, fecha_fin]);
    res.json(resultados);
});

app.post('/swipe', async (req, res) => {
    const { mi_nombre, destino_nombre, tipo } = req.body;

    // Solo registramos el evento, ya sea 'like' o 'dislike'
    await db.run(
        `INSERT INTO sincronias (usuario_origen, usuario_destino, tipo) VALUES (?, ?, ?)`,
        [mi_nombre, destino_nombre, tipo]
    );

    let isMatch = false;

    // Si es un like, verificamos si el destino ya nos dio like
    if (tipo === 'like') {
        const reverseLike = await db.get(
            `SELECT * FROM sincronias WHERE usuario_origen = ? AND usuario_destino = ? AND tipo IN ('like', 'match')`,
            [destino_nombre, mi_nombre]
        );

        if (reverseLike) {
            // ¡Es un Match!
            isMatch = true;
            // Actualizamos ambos registros a 'match'
            await db.run(
                `UPDATE sincronias SET tipo = 'match' WHERE (usuario_origen = ? AND usuario_destino = ?) OR (usuario_origen = ? AND usuario_destino = ?)`,
                [mi_nombre, destino_nombre, destino_nombre, mi_nombre]
            );
        }
    }

    res.json({ mensaje: "OK", match: isMatch });
});

app.get('/mis-sincronias/:nombre', async (req, res) => {
    const { nombre } = req.params;
    const lista = await db.all("SELECT usuario_destino, fecha_sincronia, tipo FROM sincronias WHERE usuario_origen = ? AND tipo IN ('like', 'match')", [nombre]);
    res.json(lista);
});

app.listen(PORT, () => console.log(`🚀 SYNCRONOS en puerto ${PORT}`));