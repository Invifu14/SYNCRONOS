const crypto = require('crypto');
const cors = require('cors');
const express = require('express');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { calcularCartaAstral, zodiacSigns } = require('./astrology');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

const zodiacElements = Object.fromEntries(zodiacSigns.map((sign) => [sign.name, sign.element]));
const compatibleElements = {
    Fuego: ['Aire', 'Fuego'],
    Aire: ['Fuego', 'Aire'],
    Tierra: ['Agua', 'Tierra'],
    Agua: ['Tierra', 'Agua'],
};
const ALLOWED_MODERATION_ACTIONS = new Set(['block', 'hide', 'report']);

let db;

const hasColumn = async (tableName, columnName) => {
    const columns = await db.all(`PRAGMA table_info(${tableName})`);
    return columns.some((column) => column.name === columnName);
};

const parseJsonArray = (value) => {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (e) {
        return [];
    }
};

const uniqueStrings = (values) => [...new Set((values || []).map((item) => `${item || ''}`.trim()).filter(Boolean))];

const calculateAge = (fechaStr) => {
    if (!fechaStr) return null;
    const birth = new Date(`${fechaStr}T12:00:00`);
    if (Number.isNaN(birth.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age -= 1;
    }
    return age;
};

const sanitizeInteger = (value, fallback) => {
    const numeric = Number.parseInt(value, 10);
    return Number.isFinite(numeric) ? numeric : fallback;
};

const sanitizeBoolean = (value, fallback = false) => {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return fallback;
};

const sanitizeDistance = (value, fallback = 50) => {
    const numeric = Number.parseInt(value, 10);
    if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
    return Math.min(Math.max(numeric, 1), 500);
};

const pairKey = (first, second) => [Number(first), Number(second)].sort((a, b) => a - b).join(':');

const normalizeInterestGender = (value) => {
    if (value === 'Hombres') return 'Hombre';
    if (value === 'Mujeres') return 'Mujer';
    return value;
};

const candidateAcceptsGender = (candidate, myGender) => {
    if (!candidate?.genero_interes || candidate.genero_interes === 'Todos') return true;
    return normalizeInterestGender(candidate.genero_interes) === myGender;
};

const requesterInterestedInCandidate = (requester, candidateGender) => {
    if (!requester?.genero_interes || requester.genero_interes === 'Todos') return true;
    return normalizeInterestGender(requester.genero_interes) === candidateGender;
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (![lat1, lon1, lat2, lon2].every((value) => Number.isFinite(Number(value)))) return null;

    const safeLat1 = Number(lat1);
    const safeLon1 = Number(lon1);
    const safeLat2 = Number(lat2);
    const safeLon2 = Number(lon2);
    const radius = 6371;
    const dLat = (safeLat2 - safeLat1) * Math.PI / 180;
    const dLon = (safeLon2 - safeLon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(safeLat1 * Math.PI / 180) * Math.cos(safeLat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return radius * c;
};

const obtenerSignoYFoto = (fechaStr) => {
    const fecha = new Date(`${fechaStr}T12:00:00`);
    const dia = fecha.getDate();
    const mes = fecha.getMonth() + 1;
    let signo = '';
    let fotoId = '';

    if ((mes === 3 && dia >= 21) || (mes === 4 && dia <= 19)) { signo = 'Aries'; fotoId = 'aries'; }
    else if ((mes === 4 && dia >= 20) || (mes === 5 && dia <= 20)) { signo = 'Tauro'; fotoId = 'taurus'; }
    else if ((mes === 5 && dia >= 21) || (mes === 6 && dia <= 20)) { signo = 'Geminis'; fotoId = 'gemini'; }
    else if ((mes === 6 && dia >= 21) || (mes === 7 && dia <= 22)) { signo = 'Cancer'; fotoId = 'cancer'; }
    else if ((mes === 7 && dia >= 23) || (mes === 8 && dia <= 22)) { signo = 'Leo'; fotoId = 'leo'; }
    else if ((mes === 8 && dia >= 23) || (mes === 9 && dia <= 22)) { signo = 'Virgo'; fotoId = 'virgo'; }
    else if ((mes === 9 && dia >= 23) || (mes === 10 && dia <= 22)) { signo = 'Libra'; fotoId = 'libra'; }
    else if ((mes === 10 && dia >= 23) || (mes === 11 && dia <= 21)) { signo = 'Escorpio'; fotoId = 'scorpio'; }
    else if ((mes === 11 && dia >= 22) || (mes === 12 && dia <= 21)) { signo = 'Sagitario'; fotoId = 'sagittarius'; }
    else if ((mes === 12 && dia >= 22) || (mes === 1 && dia <= 19)) { signo = 'Capricornio'; fotoId = 'capricorn'; }
    else if ((mes === 1 && dia >= 20) || (mes === 2 && dia <= 18)) { signo = 'Acuario'; fotoId = 'aquarius'; }
    else { signo = 'Piscis'; fotoId = 'pisces'; }

    return { signo, fotoFallback: `https://robohash.org/${fotoId}.png?set=set4` };
};

const obtenerGeneracion = (fechaStr) => {
    const year = new Date(`${fechaStr}T12:00:00`).getFullYear();
    if (year >= 2010) return 'Generacion Alpha';
    if (year >= 1997) return 'Generacion Z';
    if (year >= 1981) return 'Millennials';
    if (year >= 1965) return 'Generacion X';
    return 'Baby Boomers';
};

const getSignElement = (signName) => {
    const normalized = `${signName || ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const entry = Object.entries(zodiacElements).find(([name]) => {
        const cleanName = `${name}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return cleanName.toLowerCase() === normalized.toLowerCase();
    });
    return entry ? entry[1] : null;
};

const calculateCompatibility = (userA, userB) => {
    let score = 35;
    const reasons = [];
    const signA = userA.signo_zodiacal;
    const signB = userB.signo_zodiacal;
    const elementA = getSignElement(signA);
    const elementB = getSignElement(signB);

    if (signA && signB && signA === signB) {
        score += 18;
        reasons.push('Comparten el mismo signo solar');
    } else if (elementA && elementB && compatibleElements[elementA]?.includes(elementB)) {
        score += 12;
        reasons.push(`Sus elementos ${elementA.toLowerCase()} y ${elementB.toLowerCase()} fluyen bien`);
    }

    if (userA.luna && userB.luna && userA.luna === userB.luna && userA.luna !== 'Desconocido') {
        score += 12;
        reasons.push('La luna indica afinidad emocional');
    }

    if (userA.venus && userB.marte && userA.venus === userB.marte && userA.venus !== 'Desconocido') {
        score += 10;
        reasons.push('Tu Venus conecta con su Marte');
    }

    if (userA.marte && userB.venus && userA.marte === userB.venus && userA.marte !== 'Desconocido') {
        score += 10;
        reasons.push('Tu Marte conecta con su Venus');
    }

    if (userA.generacion && userA.generacion === userB.generacion) {
        score += 8;
        reasons.push('Comparten generacion');
    }

    const monthA = userA.fecha_nacimiento ? new Date(`${userA.fecha_nacimiento}T12:00:00`).getMonth() : null;
    const monthB = userB.fecha_nacimiento ? new Date(`${userB.fecha_nacimiento}T12:00:00`).getMonth() : null;
    if (monthA !== null && monthA === monthB) {
        score += 7;
        reasons.push('Nacieron en el mismo mes');
    }

    const ageA = calculateAge(userA.fecha_nacimiento);
    const ageB = calculateAge(userB.fecha_nacimiento);
    if (ageA !== null && ageB !== null) {
        const diff = Math.abs(ageA - ageB);
        if (diff <= 2) {
            score += 8;
            reasons.push('Tienen una etapa de vida muy similar');
        } else if (diff <= 5) {
            score += 4;
        }
    }

    return {
        score: Math.min(Math.max(score, 0), 99),
        reasons: reasons.slice(0, 3),
    };
};

const toPublicUser = (user, extras = {}) => {
    if (!user) return null;

    const photos = uniqueStrings(parseJsonArray(user.fotos));
    const publicPhotos = photos.length > 0 ? photos : [user.foto || null].filter(Boolean);
    const age = calculateAge(user.fecha_nacimiento);

    return {
        id: user.id,
        nombre: user.nombre,
        fecha_nacimiento: user.fecha_nacimiento,
        edad: age,
        generacion: user.generacion,
        signo_zodiacal: user.signo_zodiacal,
        foto: publicPhotos[0] || null,
        fotos: publicPhotos,
        ubicacion: user.ubicacion || '',
        gustos: user.gustos || '',
        metodo_registro: user.metodo_registro || '',
        correo: user.correo || '',
        telefono: user.telefono || '',
        intencion: user.intencion || '',
        genero: user.genero || '',
        genero_interes: user.genero_interes || '',
        hora_nacimiento: user.hora_nacimiento || '',
        lugar_nacimiento: user.lugar_nacimiento || '',
        luna: user.luna || 'Desconocido',
        ascendente: user.ascendente || 'Desconocido',
        venus: user.venus || 'Desconocido',
        marte: user.marte || 'Desconocido',
        bio: user.bio || '',
        ocupacion: user.ocupacion || '',
        educacion: user.educacion || '',
        edad_min_pref: sanitizeInteger(user.edad_min_pref, 18),
        edad_max_pref: sanitizeInteger(user.edad_max_pref, 99),
        distancia_max_km: sanitizeDistance(user.distancia_max_km, 50),
        mostrar_edad: sanitizeBoolean(user.mostrar_edad, true),
        mostrar_distancia: sanitizeBoolean(user.mostrar_distancia, true),
        consentimiento_ubicacion: sanitizeBoolean(user.consentimiento_ubicacion, false),
        perfil_activo: sanitizeBoolean(user.perfil_activo, true),
        compatibilidad: extras.compatibilidad ?? null,
        razon_compatibilidad: extras.razon_compatibilidad ?? [],
        distancia: extras.distancia ?? null,
    };
};

const buildProfilePayload = (body) => {
    const birthInfo = obtenerSignoYFoto(body.fecha_nacimiento);
    const generacion = obtenerGeneracion(body.fecha_nacimiento);
    const rawPhotos = uniqueStrings([
        ...(Array.isArray(body.fotos) ? body.fotos : []),
        body.foto,
        body.foto_1,
        body.foto_2,
        body.foto_3,
    ]);
    const fotos = rawPhotos.length > 0 ? rawPhotos : [birthInfo.fotoFallback];
    const consentimientoUbicacion = sanitizeBoolean(body.consentimiento_ubicacion, false);
    const latitud = consentimientoUbicacion && body.latitud !== null && body.latitud !== undefined ? Number(body.latitud) : null;
    const longitud = consentimientoUbicacion && body.longitud !== null && body.longitud !== undefined ? Number(body.longitud) : null;

    let luna = 'Desconocido';
    let ascendente = 'Desconocido';
    let venus = 'Desconocido';
    let marte = 'Desconocido';

    if (body.fecha_nacimiento && body.hora_nacimiento) {
        const carta = calcularCartaAstral(body.fecha_nacimiento, body.hora_nacimiento, latitud, longitud);
        luna = carta.luna;
        ascendente = carta.ascendente;
        venus = carta.venus;
        marte = carta.marte;
    }

    return {
        nombre: `${body.nombre || ''}`.trim(),
        fecha_nacimiento: body.fecha_nacimiento,
        generacion,
        signo_zodiacal: birthInfo.signo,
        foto: fotos[0],
        fotos: JSON.stringify(fotos),
        ubicacion: `${body.ubicacion || ''}`.trim(),
        gustos: `${body.gustos || ''}`.trim(),
        metodo_registro: `${body.metodo_registro || ''}`.trim(),
        correo: `${body.correo || ''}`.trim().toLowerCase(),
        telefono: `${body.telefono || ''}`.trim(),
        intencion: `${body.intencion || ''}`.trim(),
        genero: `${body.genero || ''}`.trim(),
        genero_interes: `${body.genero_interes || ''}`.trim(),
        latitud,
        longitud,
        hora_nacimiento: `${body.hora_nacimiento || ''}`.trim(),
        lugar_nacimiento: `${body.lugar_nacimiento || ''}`.trim(),
        luna,
        ascendente,
        venus,
        marte,
        bio: `${body.bio || ''}`.trim(),
        ocupacion: `${body.ocupacion || ''}`.trim(),
        educacion: `${body.educacion || ''}`.trim(),
        edad_min_pref: sanitizeInteger(body.edad_min_pref, 18),
        edad_max_pref: sanitizeInteger(body.edad_max_pref, 99),
        distancia_max_km: sanitizeDistance(body.distancia_max_km, 50),
        mostrar_edad: sanitizeBoolean(body.mostrar_edad, true) ? 1 : 0,
        mostrar_distancia: sanitizeBoolean(body.mostrar_distancia, true) ? 1 : 0,
        consentimiento_ubicacion: consentimientoUbicacion ? 1 : 0,
        perfil_activo: sanitizeBoolean(body.perfil_activo, true) ? 1 : 0,
    };
};

const withSession = async (user) => {
    const token = crypto.randomUUID();
    await db.run(
        `INSERT INTO sesiones (token, usuario_id, created_at, last_seen_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [token, user.id]
    );
    return { token, usuario: toPublicUser(user) };
};

const ensureAdult = (fechaNacimiento) => {
    const age = calculateAge(fechaNacimiento);
    return age !== null && age >= 18;
};

(async () => {
    db = await open({
        filename: './database.db',
        driver: sqlite3.Database,
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT,
            fecha_nacimiento TEXT,
            generacion TEXT,
            signo_zodiacal TEXT,
            foto TEXT,
            fotos TEXT DEFAULT '[]',
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
            hora_nacimiento TEXT,
            lugar_nacimiento TEXT,
            luna TEXT,
            ascendente TEXT,
            venus TEXT,
            marte TEXT,
            bio TEXT DEFAULT '',
            ocupacion TEXT DEFAULT '',
            educacion TEXT DEFAULT '',
            edad_min_pref INTEGER DEFAULT 18,
            edad_max_pref INTEGER DEFAULT 99,
            distancia_max_km INTEGER DEFAULT 50,
            mostrar_edad INTEGER DEFAULT 1,
            mostrar_distancia INTEGER DEFAULT 1,
            consentimiento_ubicacion INTEGER DEFAULT 0,
            perfil_activo INTEGER DEFAULT 1,
            ultima_sesion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sincronias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_origen INTEGER,
            usuario_destino INTEGER,
            tipo TEXT DEFAULT 'like',
            fecha_sincronia TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS moderacion (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_origen INTEGER,
            usuario_destino INTEGER,
            accion TEXT,
            motivo TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS mensajes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_key TEXT,
            emisor_id INTEGER,
            receptor_id INTEGER,
            contenido TEXT,
            leido INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sesiones (
            token TEXT PRIMARY KEY,
            usuario_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    const alterations = [
        "ALTER TABLE usuarios ADD COLUMN fotos TEXT DEFAULT '[]';",
        "ALTER TABLE usuarios ADD COLUMN bio TEXT DEFAULT '';",
        "ALTER TABLE usuarios ADD COLUMN ocupacion TEXT DEFAULT '';",
        "ALTER TABLE usuarios ADD COLUMN educacion TEXT DEFAULT '';",
        "ALTER TABLE usuarios ADD COLUMN edad_min_pref INTEGER DEFAULT 18;",
        "ALTER TABLE usuarios ADD COLUMN edad_max_pref INTEGER DEFAULT 99;",
        "ALTER TABLE usuarios ADD COLUMN distancia_max_km INTEGER DEFAULT 50;",
        "ALTER TABLE usuarios ADD COLUMN mostrar_edad INTEGER DEFAULT 1;",
        "ALTER TABLE usuarios ADD COLUMN mostrar_distancia INTEGER DEFAULT 1;",
        "ALTER TABLE usuarios ADD COLUMN consentimiento_ubicacion INTEGER DEFAULT 0;",
        "ALTER TABLE usuarios ADD COLUMN perfil_activo INTEGER DEFAULT 1;",
        "ALTER TABLE sincronias ADD COLUMN tipo TEXT DEFAULT 'like';",
    ];

    for (const query of alterations) {
        try {
            await db.run(query);
        } catch (e) {
            // Ignore upgraded databases.
        }
    }

    if (!(await hasColumn('usuarios', 'ultima_sesion'))) {
        await db.run(`ALTER TABLE usuarios ADD COLUMN ultima_sesion TIMESTAMP`);
        await db.run(`UPDATE usuarios SET ultima_sesion = CURRENT_TIMESTAMP WHERE ultima_sesion IS NULL`);
    }

    console.log('Base de datos lista.');
})();

app.post('/registrar-cronos', async (req, res) => {
    try {
        const {
            nombre,
            fecha_nacimiento: fechaNacimiento,
            correo,
            telefono,
            genero,
            genero_interes: generoInteres,
            intencion,
        } = req.body;

        if (!nombre || !fechaNacimiento || !genero || !generoInteres || !intencion) {
            return res.status(400).json({ mensaje: 'Faltan datos obligatorios' });
        }

        if (!correo && !telefono) {
            return res.status(400).json({ mensaje: 'Debes registrarte con correo o telefono' });
        }

        if (!ensureAdult(fechaNacimiento)) {
            return res.status(400).json({ mensaje: 'La app solo esta disponible para mayores de 18 anos' });
        }

        const profile = buildProfilePayload(req.body);
        if (profile.edad_min_pref > profile.edad_max_pref) {
            return res.status(400).json({ mensaje: 'El rango de edad no es valido' });
        }

        let existing = null;
        if (profile.correo) {
            existing = await db.get(`SELECT * FROM usuarios WHERE correo = ?`, [profile.correo]);
        }
        if (!existing && profile.telefono) {
            existing = await db.get(`SELECT * FROM usuarios WHERE telefono = ?`, [profile.telefono]);
        }

        if (existing) {
            await db.run(
                `UPDATE usuarios
                 SET nombre = ?, fecha_nacimiento = ?, generacion = ?, signo_zodiacal = ?, foto = ?, fotos = ?, ubicacion = ?, gustos = ?,
                     metodo_registro = ?, correo = ?, telefono = ?, intencion = ?, genero = ?, genero_interes = ?, latitud = ?, longitud = ?,
                     hora_nacimiento = ?, lugar_nacimiento = ?, luna = ?, ascendente = ?, venus = ?, marte = ?, bio = ?, ocupacion = ?,
                     educacion = ?, edad_min_pref = ?, edad_max_pref = ?, distancia_max_km = ?, mostrar_edad = ?, mostrar_distancia = ?,
                     consentimiento_ubicacion = ?, perfil_activo = ?, ultima_sesion = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [
                    profile.nombre, profile.fecha_nacimiento, profile.generacion, profile.signo_zodiacal, profile.foto, profile.fotos,
                    profile.ubicacion, profile.gustos, profile.metodo_registro, profile.correo, profile.telefono, profile.intencion,
                    profile.genero, profile.genero_interes, profile.latitud, profile.longitud, profile.hora_nacimiento, profile.lugar_nacimiento,
                    profile.luna, profile.ascendente, profile.venus, profile.marte, profile.bio, profile.ocupacion, profile.educacion,
                    profile.edad_min_pref, profile.edad_max_pref, profile.distancia_max_km, profile.mostrar_edad, profile.mostrar_distancia,
                    profile.consentimiento_ubicacion, profile.perfil_activo, existing.id,
                ]
            );
            existing = await db.get(`SELECT * FROM usuarios WHERE id = ?`, [existing.id]);
            const session = await withSession(existing);
            return res.json({ mensaje: 'Login OK', ...session });
        }

        const insertResult = await db.run(
            `INSERT INTO usuarios (
                nombre, fecha_nacimiento, generacion, signo_zodiacal, foto, fotos, ubicacion, gustos, metodo_registro, correo, telefono,
                intencion, genero, genero_interes, latitud, longitud, hora_nacimiento, lugar_nacimiento, luna, ascendente, venus, marte,
                bio, ocupacion, educacion, edad_min_pref, edad_max_pref, distancia_max_km, mostrar_edad, mostrar_distancia,
                consentimiento_ubicacion, perfil_activo, ultima_sesion
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [
                profile.nombre, profile.fecha_nacimiento, profile.generacion, profile.signo_zodiacal, profile.foto, profile.fotos,
                profile.ubicacion, profile.gustos, profile.metodo_registro, profile.correo, profile.telefono, profile.intencion,
                profile.genero, profile.genero_interes, profile.latitud, profile.longitud, profile.hora_nacimiento, profile.lugar_nacimiento,
                profile.luna, profile.ascendente, profile.venus, profile.marte, profile.bio, profile.ocupacion, profile.educacion,
                profile.edad_min_pref, profile.edad_max_pref, profile.distancia_max_km, profile.mostrar_edad, profile.mostrar_distancia,
                profile.consentimiento_ubicacion, profile.perfil_activo,
            ]
        );

        const nuevoUsuario = await db.get(`SELECT * FROM usuarios WHERE id = ?`, [insertResult.lastID]);
        const session = await withSession(nuevoUsuario);
        res.json({ mensaje: 'OK', ...session });
    } catch (e) {
        console.error('Error en registro/login:', e);
        res.status(500).json({ mensaje: 'No se pudo registrar el usuario' });
    }
});

app.get('/sesion/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const session = await db.get(
            `SELECT s.token, u.* FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id WHERE s.token = ?`,
            [token]
        );

        if (!session) {
            return res.status(404).json({ mensaje: 'Sesion no encontrada' });
        }

        await db.run(`UPDATE sesiones SET last_seen_at = CURRENT_TIMESTAMP WHERE token = ?`, [token]);
        await db.run(`UPDATE usuarios SET ultima_sesion = CURRENT_TIMESTAMP WHERE id = ?`, [session.id]);
        res.json({ usuario: toPublicUser(session), token });
    } catch (e) {
        console.error('Error recuperando sesion:', e);
        res.status(500).json({ mensaje: 'No se pudo recuperar la sesion' });
    }
});

app.delete('/sesion/:token', async (req, res) => {
    await db.run(`DELETE FROM sesiones WHERE token = ?`, [req.params.token]);
    res.json({ mensaje: 'OK' });
});

app.get('/perfil/:id', async (req, res) => {
    const user = await db.get(`SELECT * FROM usuarios WHERE id = ?`, [req.params.id]);
    if (!user) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    res.json(toPublicUser(user));
});

app.put('/perfil/:id', async (req, res) => {
    try {
        const current = await db.get(`SELECT * FROM usuarios WHERE id = ?`, [req.params.id]);
        if (!current) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const mergedBody = {
            ...current,
            ...req.body,
            fecha_nacimiento: req.body.fecha_nacimiento || current.fecha_nacimiento,
        };

        if (!ensureAdult(mergedBody.fecha_nacimiento)) {
            return res.status(400).json({ mensaje: 'La app solo esta disponible para mayores de 18 anos' });
        }

        const profile = buildProfilePayload(mergedBody);
        if (profile.edad_min_pref > profile.edad_max_pref) {
            return res.status(400).json({ mensaje: 'El rango de edad no es valido' });
        }

        await db.run(
            `UPDATE usuarios
             SET nombre = ?, fecha_nacimiento = ?, generacion = ?, signo_zodiacal = ?, foto = ?, fotos = ?, ubicacion = ?, gustos = ?,
                 metodo_registro = ?, correo = ?, telefono = ?, intencion = ?, genero = ?, genero_interes = ?, latitud = ?, longitud = ?,
                 hora_nacimiento = ?, lugar_nacimiento = ?, luna = ?, ascendente = ?, venus = ?, marte = ?, bio = ?, ocupacion = ?,
                 educacion = ?, edad_min_pref = ?, edad_max_pref = ?, distancia_max_km = ?, mostrar_edad = ?, mostrar_distancia = ?,
                 consentimiento_ubicacion = ?, perfil_activo = ?, ultima_sesion = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                profile.nombre, profile.fecha_nacimiento, profile.generacion, profile.signo_zodiacal, profile.foto, profile.fotos,
                profile.ubicacion, profile.gustos, profile.metodo_registro, profile.correo, profile.telefono, profile.intencion,
                profile.genero, profile.genero_interes, profile.latitud, profile.longitud, profile.hora_nacimiento, profile.lugar_nacimiento,
                profile.luna, profile.ascendente, profile.venus, profile.marte, profile.bio, profile.ocupacion, profile.educacion,
                profile.edad_min_pref, profile.edad_max_pref, profile.distancia_max_km, profile.mostrar_edad, profile.mostrar_distancia,
                profile.consentimiento_ubicacion, profile.perfil_activo, req.params.id,
            ]
        );

        const updated = await db.get(`SELECT * FROM usuarios WHERE id = ?`, [req.params.id]);
        res.json({ mensaje: 'OK', usuario: toPublicUser(updated) });
    } catch (e) {
        console.error('Error actualizando perfil:', e);
        res.status(500).json({ mensaje: 'No se pudo actualizar el perfil' });
    }
});

app.get('/feed/:id', async (req, res) => {
    try {
        const currentUser = await db.get(`SELECT * FROM usuarios WHERE id = ?`, [req.params.id]);
        if (!currentUser) return res.json([]);

        const mode = req.query.mode === 'affinity' ? 'affinity' : 'radar';
        const candidates = await db.all(
            `SELECT * FROM usuarios c
             WHERE c.id != ?
             AND COALESCE(c.perfil_activo, 1) = 1
             AND NOT EXISTS (
                SELECT 1 FROM sincronias s
                WHERE s.usuario_origen = ? AND s.usuario_destino = c.id
             )
             AND NOT EXISTS (
                SELECT 1 FROM moderacion m
                WHERE m.usuario_origen = ? AND m.usuario_destino = c.id AND m.accion IN ('block', 'hide', 'report')
             )
             AND NOT EXISTS (
                SELECT 1 FROM moderacion m2
                WHERE m2.usuario_origen = c.id AND m2.usuario_destino = ? AND m2.accion = 'block'
             )`,
            [currentUser.id, currentUser.id, currentUser.id, currentUser.id]
        );

        const filtered = candidates
            .map((candidate) => {
                if (!requesterInterestedInCandidate(currentUser, candidate.genero)) return null;
                if (!candidateAcceptsGender(candidate, currentUser.genero)) return null;

                const currentAge = calculateAge(currentUser.fecha_nacimiento);
                const candidateAge = calculateAge(candidate.fecha_nacimiento);
                const currentMin = sanitizeInteger(currentUser.edad_min_pref, 18);
                const currentMax = sanitizeInteger(currentUser.edad_max_pref, 99);
                const candidateMin = sanitizeInteger(candidate.edad_min_pref, 18);
                const candidateMax = sanitizeInteger(candidate.edad_max_pref, 99);

                if (candidateAge === null || candidateAge < currentMin || candidateAge > currentMax) return null;
                if (currentAge === null || currentAge < candidateMin || currentAge > candidateMax) return null;

                let roundedDistance = null;
                const distance = calculateDistance(currentUser.latitud, currentUser.longitud, candidate.latitud, candidate.longitud);
                if (distance !== null) {
                    roundedDistance = Math.round(distance);
                    const maxDistance = Math.min(
                        sanitizeDistance(currentUser.distancia_max_km, 50),
                        sanitizeDistance(candidate.distancia_max_km, 50)
                    );
                    if (roundedDistance > maxDistance) return null;
                }

                const compatibility = calculateCompatibility(currentUser, candidate);
                if (mode === 'affinity' && compatibility.score < 40) return null;

                return toPublicUser(candidate, {
                    compatibilidad: compatibility.score,
                    razon_compatibilidad: compatibility.reasons,
                    distancia: sanitizeBoolean(candidate.mostrar_distancia, true) ? roundedDistance : null,
                });
            })
            .filter(Boolean)
            .sort((left, right) => {
                if (mode === 'affinity') return (right.compatibilidad || 0) - (left.compatibilidad || 0);
                const leftDistance = left.distancia ?? Number.MAX_SAFE_INTEGER;
                const rightDistance = right.distancia ?? Number.MAX_SAFE_INTEGER;
                if (leftDistance !== rightDistance) return leftDistance - rightDistance;
                return (right.compatibilidad || 0) - (left.compatibilidad || 0);
            });

        res.json(filtered);
    } catch (e) {
        console.error('Error obteniendo feed:', e);
        res.status(500).json({ mensaje: 'No se pudo obtener el feed' });
    }
});

app.post('/swipe', async (req, res) => {
    try {
        const { mi_id: myId, destino_id: targetId, tipo } = req.body;
        if (!myId || !targetId || !tipo) {
            return res.status(400).json({ mensaje: 'Solicitud incompleta' });
        }

        const existing = await db.get(
            `SELECT * FROM sincronias WHERE usuario_origen = ? AND usuario_destino = ?`,
            [myId, targetId]
        );

        if (existing) {
            await db.run(
                `UPDATE sincronias SET tipo = ?, fecha_sincronia = CURRENT_TIMESTAMP WHERE id = ?`,
                [tipo, existing.id]
            );
        } else {
            await db.run(
                `INSERT INTO sincronias (usuario_origen, usuario_destino, tipo) VALUES (?, ?, ?)`,
                [myId, targetId, tipo]
            );
        }

        let isMatch = false;
        if (tipo === 'like') {
            const reverseLike = await db.get(
                `SELECT * FROM sincronias WHERE usuario_origen = ? AND usuario_destino = ? AND tipo IN ('like', 'match')`,
                [targetId, myId]
            );
            if (reverseLike) {
                isMatch = true;
                await db.run(
                    `UPDATE sincronias SET tipo = 'match' WHERE (usuario_origen = ? AND usuario_destino = ?) OR (usuario_origen = ? AND usuario_destino = ?)`,
                    [myId, targetId, targetId, myId]
                );
            }
        }

        res.json({ mensaje: 'OK', match: isMatch });
    } catch (e) {
        console.error('Error registrando swipe:', e);
        res.status(500).json({ mensaje: 'No se pudo guardar la accion' });
    }
});

app.get('/connections/:id', async (req, res) => {
    try {
        const userId = Number(req.params.id);

        const likesSentRows = await db.all(
            `SELECT u.*, s.fecha_sincronia
             FROM sincronias s
             JOIN usuarios u ON u.id = s.usuario_destino
             WHERE s.usuario_origen = ? AND s.tipo = 'like'`,
            [userId]
        );

        const likesReceivedRows = await db.all(
            `SELECT u.*, s.fecha_sincronia
             FROM sincronias s
             JOIN usuarios u ON u.id = s.usuario_origen
             WHERE s.usuario_destino = ? AND s.tipo = 'like'
             AND NOT EXISTS (
                SELECT 1 FROM sincronias mine
                WHERE mine.usuario_origen = ? AND mine.usuario_destino = s.usuario_origen AND mine.tipo IN ('like', 'match')
             )`,
            [userId, userId]
        );

        const matchRows = await db.all(
            `SELECT DISTINCT
                CASE
                    WHEN s.usuario_origen = ? THEN s.usuario_destino
                    ELSE s.usuario_origen
                END AS other_id,
                MAX(s.fecha_sincronia) AS fecha_sincronia
             FROM sincronias s
             WHERE (s.usuario_origen = ? OR s.usuario_destino = ?) AND s.tipo = 'match'
             GROUP BY other_id`,
            [userId, userId, userId]
        );

        const matches = [];
        for (const row of matchRows) {
            const otherUser = await db.get(`SELECT * FROM usuarios WHERE id = ?`, [row.other_id]);
            if (!otherUser) continue;
            const lastMessage = await db.get(
                `SELECT contenido, created_at FROM mensajes WHERE chat_key = ? ORDER BY created_at DESC LIMIT 1`,
                [pairKey(userId, row.other_id)]
            );
            const unread = await db.get(
                `SELECT COUNT(*) AS total FROM mensajes WHERE chat_key = ? AND receptor_id = ? AND leido = 0`,
                [pairKey(userId, row.other_id), userId]
            );
            matches.push({
                ...toPublicUser(otherUser),
                fecha_sincronia: row.fecha_sincronia,
                ultimo_mensaje: lastMessage?.contenido || '',
                ultimo_mensaje_fecha: lastMessage?.created_at || row.fecha_sincronia,
                mensajes_no_leidos: unread?.total || 0,
            });
        }

        res.json({
            likes_enviados: likesSentRows.map((row) => ({ ...toPublicUser(row), fecha_sincronia: row.fecha_sincronia })),
            likes_recibidos: likesReceivedRows.map((row) => ({ ...toPublicUser(row), fecha_sincronia: row.fecha_sincronia })),
            matches,
        });
    } catch (e) {
        console.error('Error obteniendo conexiones:', e);
        res.status(500).json({ mensaje: 'No se pudieron obtener las conexiones' });
    }
});

app.get('/matches/:userId/messages/:otherId', async (req, res) => {
    try {
        const userId = Number(req.params.userId);
        const otherId = Number(req.params.otherId);
        const hasMatch = await db.get(
            `SELECT 1 FROM sincronias
             WHERE ((usuario_origen = ? AND usuario_destino = ?) OR (usuario_origen = ? AND usuario_destino = ?))
             AND tipo = 'match'
             LIMIT 1`,
            [userId, otherId, otherId, userId]
        );

        if (!hasMatch) {
            return res.status(403).json({ mensaje: 'Solo puedes escribir a tus matches' });
        }

        await db.run(
            `UPDATE mensajes SET leido = 1 WHERE chat_key = ? AND receptor_id = ?`,
            [pairKey(userId, otherId), userId]
        );

        const messages = await db.all(
            `SELECT id, emisor_id, receptor_id, contenido, leido, created_at
             FROM mensajes
             WHERE chat_key = ?
             ORDER BY created_at ASC, id ASC`,
            [pairKey(userId, otherId)]
        );

        res.json(messages);
    } catch (e) {
        console.error('Error obteniendo mensajes:', e);
        res.status(500).json({ mensaje: 'No se pudieron obtener los mensajes' });
    }
});

app.post('/matches/:userId/messages', async (req, res) => {
    try {
        const userId = Number(req.params.userId);
        const { destino_id: targetId, contenido } = req.body;
        const trimmed = `${contenido || ''}`.trim();
        if (!targetId || !trimmed) {
            return res.status(400).json({ mensaje: 'Mensaje invalido' });
        }

        const hasMatch = await db.get(
            `SELECT 1 FROM sincronias
             WHERE ((usuario_origen = ? AND usuario_destino = ?) OR (usuario_origen = ? AND usuario_destino = ?))
             AND tipo = 'match'
             LIMIT 1`,
            [userId, targetId, targetId, userId]
        );

        if (!hasMatch) {
            return res.status(403).json({ mensaje: 'Solo puedes escribir a tus matches' });
        }

        const chatKey = pairKey(userId, targetId);
        const insert = await db.run(
            `INSERT INTO mensajes (chat_key, emisor_id, receptor_id, contenido, leido) VALUES (?, ?, ?, ?, 0)`,
            [chatKey, userId, targetId, trimmed]
        );
        const message = await db.get(`SELECT * FROM mensajes WHERE id = ?`, [insert.lastID]);
        res.json({ mensaje: 'OK', item: message });
    } catch (e) {
        console.error('Error enviando mensaje:', e);
        res.status(500).json({ mensaje: 'No se pudo enviar el mensaje' });
    }
});

app.post('/moderacion', async (req, res) => {
    try {
        const { mi_id: myId, destino_id: targetId, accion, motivo } = req.body;
        if (!myId || !targetId || !ALLOWED_MODERATION_ACTIONS.has(accion)) {
            return res.status(400).json({ mensaje: 'Accion de moderacion invalida' });
        }

        const existing = await db.get(
            `SELECT * FROM moderacion WHERE usuario_origen = ? AND usuario_destino = ? AND accion = ?`,
            [myId, targetId, accion]
        );
        if (!existing) {
            await db.run(
                `INSERT INTO moderacion (usuario_origen, usuario_destino, accion, motivo) VALUES (?, ?, ?, ?)`,
                [myId, targetId, accion, `${motivo || ''}`.trim()]
            );
        }

        res.json({ mensaje: 'OK' });
    } catch (e) {
        console.error('Error en moderacion:', e);
        res.status(500).json({ mensaje: 'No se pudo guardar la accion de moderacion' });
    }
});

app.listen(PORT, () => console.log(`SYNCRONOS en puerto ${PORT}`));
