const crypto = require('crypto');
const cors = require('cors');
const express = require('express');
const fs = require('fs');
const http = require('http');
const multer = require('multer');
const path = require('path');
const sqlite3 = require('sqlite3');
const { IANAZone } = require('luxon');
const { Expo } = require('expo-server-sdk');
const { Server } = require('socket.io');
const { open } = require('sqlite');
const { calcularCartaAstral, zodiacSigns } = require('./astrology');
const { inferBirthTimeZone } = require('./birthTimezones');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
});
const expo = new Expo();
const PORT = 3000;
const MAX_PHOTOS_PER_PROFILE = 3;
const MAX_PROFILE_PROMPTS = 3;
const MAX_PHOTO_SIZE_BYTES = 8 * 1024 * 1024;
const PHOTO_REPORT_HIDE_THRESHOLD = 3;
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PROFILE_UPLOADS_DIR = path.join(UPLOADS_DIR, 'profile-photos');

fs.mkdirSync(PROFILE_UPLOADS_DIR, { recursive: true });

app.use(express.json({ limit: '2mb' }));
app.use(cors());
app.use('/uploads', express.static(UPLOADS_DIR));

const zodiacElements = Object.fromEntries(zodiacSigns.map((sign) => [sign.name, sign.element]));
const compatibleElements = {
    Fuego: ['Aire', 'Fuego'],
    Aire: ['Fuego', 'Aire'],
    Tierra: ['Agua', 'Tierra'],
    Agua: ['Tierra', 'Agua'],
};
const ALLOWED_MODERATION_ACTIONS = new Set(['block', 'hide', 'report']);
const ALLOWED_PHOTO_MIME_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
]);
const connectedUserSockets = new Map();
const activeChatsBySocket = new Map();

let db;

const photoStorage = multer.diskStorage({
    destination: (_req, _file, callback) => {
        callback(null, PROFILE_UPLOADS_DIR);
    },
    filename: (_req, file, callback) => {
        const extension = path.extname(file.originalname || '').toLowerCase() || '.jpg';
        callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
    },
});

const photoUpload = multer({
    storage: photoStorage,
    limits: {
        fileSize: MAX_PHOTO_SIZE_BYTES,
    },
    fileFilter: (_req, file, callback) => {
        if (!ALLOWED_PHOTO_MIME_TYPES.has(file.mimetype)) {
            callback(new Error('PHOTO_TYPE_INVALID'));
            return;
        }
        callback(null, true);
    },
});

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

const parsePromptInput = (value) => {
    if (!value) return [];

    const rawItems = Array.isArray(value) ? value : parseJsonArray(value);
    return rawItems
        .map((item, index) => {
            if (!item || typeof item !== 'object') return null;

            const answer = `${item.answer || item.respuesta || ''}`.trim();
            if (!answer) return null;

            return {
                id: `${item.id || `prompt_${index + 1}`}`.trim(),
                question: `${item.question || item.pregunta || ''}`.trim(),
                answer: answer.slice(0, 240),
            };
        })
        .filter(Boolean)
        .slice(0, MAX_PROFILE_PROMPTS);
};

const resolveBirthTimezone = (body) => {
    const explicitTimezone = `${body.timezone_nacimiento || ''}`.trim();
    if (IANAZone.isValidZone(explicitTimezone)) return explicitTimezone;

    const inferredTimezone = inferBirthTimeZone(body.lugar_nacimiento || body.ubicacion || '');
    return IANAZone.isValidZone(inferredTimezone) ? inferredTimezone : 'UTC';
};

const buildCompatibilityInterpretation = (score, reasons, userA, userB) => {
    const mainReason = reasons[0] || 'Hay curiosidad mutua para descubrirse mejor';
    const sameGeneration = userA.generacion && userA.generacion === userB.generacion;
    const sameMoon = userA.luna && userB.luna && userA.luna === userB.luna && userA.luna !== 'Desconocido';

    let title = 'Conexion por explorar';
    let summary = `Su punto mas fuerte ahora mismo es que ${mainReason.toLowerCase()}.`;
    let nextStep = 'Empiecen con una conversacion ligera y vean si la quimica aterriza.';

    if (score >= 80) {
        title = 'Sincronia muy alta';
        summary = `Hay una mezcla poco comun de atraccion y afinidad: ${mainReason.toLowerCase()}.`;
        nextStep = sameMoon
            ? 'Vayan a una charla mas emocional desde el inicio; es probable que se entiendan rapido.'
            : 'Una cita corta y con plan claro puede convertir la atraccion en match serio.';
    } else if (score >= 65) {
        title = 'Potencial romantico alto';
        summary = `Hay bases solidas para una conexion real, especialmente porque ${mainReason.toLowerCase()}.`;
        nextStep = sameGeneration
            ? 'Aprovechen referencias y planes en comun para romper el hielo con naturalidad.'
            : 'Busquen puntos compartidos antes de ir a lo profundo; el puente esta, solo hay que abrirlo.';
    } else if (score >= 50) {
        title = 'Buena chispa inicial';
        summary = `La compatibilidad no es perfecta, pero si prometedora: ${mainReason.toLowerCase()}.`;
        nextStep = 'Una conversacion con humor y curiosidad puede mostrar si esto crece o se queda corto.';
    }

    return { title, summary, next_step: nextStep };
};

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
    if (typeof value === 'number') return value === 1;
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return fallback;
};

const sanitizeDistance = (value, fallback = 50) => {
    const numeric = Number.parseInt(value, 10);
    if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
    return Math.min(Math.max(numeric, 1), 500);
};

const pairKey = (first, second) => [Number(first), Number(second)].sort((a, b) => a - b).join(':');

const ALL_FEED_GENDER_BUCKETS = ['Hombre', 'Mujer', 'Otro'];

const getInterestGenderBuckets = (value) => {
    if (!value || value === 'Todos') return ALL_FEED_GENDER_BUCKETS;
    if (value === 'Hombres') return ['Hombre'];
    if (value === 'Mujeres') return ['Mujer'];
    if (value === 'Otros') return ['Otro'];
    return [`${value}`.trim()].filter(Boolean);
};

const getOtherGenderOrientationBuckets = (profile) => {
    const orientation = `${profile?.orientacion_sexual || ''}`.trim();
    const interest = `${profile?.genero_interes || ''}`.trim();

    if (orientation === 'Lesbiana') return ['Mujer'];
    if (orientation === 'Gay') return ['Hombre'];

    if (orientation === 'Heterosexual') {
        if (interest === 'Hombres') return ['Mujer'];
        if (interest === 'Mujeres') return ['Hombre'];
        return ['Hombre', 'Mujer'];
    }

    if ([
        'Bisexual',
        'Asexual',
        'Demisexual',
        'Pansexual',
        'Queer',
        'En exploracion',
    ].includes(orientation)) {
        return ['Hombre', 'Mujer'];
    }

    return [];
};

// For profiles marked as "Otro", orientation plus stated interest helps us
// decide if they should also appear in binary feeds such as mujeres u hombres.
const getFeedGenderBuckets = (profile) => {
    const gender = `${profile?.genero || ''}`.trim();

    if (!gender) return [];
    if (gender === 'Hombre' || gender === 'Mujer') return [gender];
    if (gender !== 'Otro') return [gender];

    return uniqueStrings(['Otro', ...getOtherGenderOrientationBuckets(profile)]);
};

const profileMatchesInterest = (interestValue, otherProfile) => {
    const desiredBuckets = getInterestGenderBuckets(interestValue);
    const candidateBuckets = getFeedGenderBuckets(otherProfile);
    return desiredBuckets.some((bucket) => candidateBuckets.includes(bucket));
};

const candidateAcceptsGender = (candidate, otherProfile) => profileMatchesInterest(candidate?.genero_interes, otherProfile);

const requesterInterestedInCandidate = (requester, candidateProfile) => profileMatchesInterest(requester?.genero_interes, candidateProfile);

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

    const normalizedScore = Math.min(Math.max(score, 0), 99);
    const topReasons = reasons.slice(0, 3);

    return {
        score: normalizedScore,
        reasons: topReasons,
        interpretation: buildCompatibilityInterpretation(normalizedScore, topReasons, userA, userB),
    };
};

const normalizePhotoInput = (body) => {
    const arrayPhotos = Array.isArray(body.fotos) ? body.fotos : parseJsonArray(body.fotos);
    return uniqueStrings([
        ...arrayPhotos,
        body.foto,
        body.foto_1,
        body.foto_2,
        body.foto_3,
    ]).slice(0, MAX_PHOTOS_PER_PROFILE);
};

const getModeratedPhotoList = (user) => uniqueStrings(parseJsonArray(user?.fotos_moderadas));

const buildUserPayload = (
    user,
    extras = {},
    {
        includePrivateContact = false,
        includeModeratedPhotos = false,
    } = {}
) => {
    if (!user) return null;

    const allPhotos = uniqueStrings(parseJsonArray(user.fotos));
    const moderatedPhotos = getModeratedPhotoList(user);
    const visiblePhotos = allPhotos.filter((photo) => !moderatedPhotos.includes(photo));
    const selectedPhotos = includeModeratedPhotos ? allPhotos : visiblePhotos;
    const age = calculateAge(user.fecha_nacimiento);

    return {
        id: user.id,
        nombre: user.nombre,
        fecha_nacimiento: user.fecha_nacimiento,
        edad: age,
        generacion: user.generacion,
        signo_zodiacal: user.signo_zodiacal,
        foto: selectedPhotos[0] || visiblePhotos[0] || null,
        fotos: selectedPhotos,
        fotos_visibles: visiblePhotos,
        fotos_moderadas: includeModeratedPhotos ? moderatedPhotos : [],
        ubicacion: user.ubicacion || '',
        gustos: user.gustos || '',
        metodo_registro: user.metodo_registro || '',
        correo: includePrivateContact ? user.correo || '' : '',
        telefono: includePrivateContact ? user.telefono || '' : '',
        intencion: user.intencion || '',
        genero: user.genero || '',
        genero_interes: user.genero_interes || '',
        orientacion_sexual: user.orientacion_sexual || '',
        hora_nacimiento: user.hora_nacimiento || '',
        lugar_nacimiento: user.lugar_nacimiento || '',
        timezone_nacimiento: user.timezone_nacimiento || '',
        luna: user.luna || 'Desconocido',
        ascendente: user.ascendente || 'Desconocido',
        venus: user.venus || 'Desconocido',
        marte: user.marte || 'Desconocido',
        bio: user.bio || '',
        ocupacion: user.ocupacion || '',
        educacion: user.educacion || '',
        prompts: parsePromptInput(user.prompts),
        edad_min_pref: sanitizeInteger(user.edad_min_pref, 18),
        edad_max_pref: sanitizeInteger(user.edad_max_pref, 99),
        distancia_max_km: sanitizeDistance(user.distancia_max_km, 50),
        mostrar_edad: sanitizeBoolean(user.mostrar_edad, true),
        mostrar_distancia: sanitizeBoolean(user.mostrar_distancia, true),
        consentimiento_ubicacion: sanitizeBoolean(user.consentimiento_ubicacion, false),
        perfil_activo: sanitizeBoolean(user.perfil_activo, true),
        push_token: includePrivateContact ? user.push_token || '' : '',
        compatibilidad: extras.compatibilidad ?? null,
        razon_compatibilidad: extras.razon_compatibilidad ?? [],
        interpretacion_compatibilidad: extras.interpretacion_compatibilidad ?? null,
        distancia: extras.distancia ?? null,
    };
};

const toPublicUser = (user, extras = {}) => buildUserPayload(user, extras);
const toOwnUser = (user, extras = {}) => buildUserPayload(user, extras, { includePrivateContact: true, includeModeratedPhotos: true });

const buildProfilePayload = (body) => {
    const birthInfo = obtenerSignoYFoto(body.fecha_nacimiento);
    const generacion = obtenerGeneracion(body.fecha_nacimiento);
    const rawPhotos = normalizePhotoInput(body);
    const prompts = parsePromptInput(body.prompts);
    const fotos = rawPhotos.length > 0 ? rawPhotos : [birthInfo.fotoFallback];
    const consentimientoUbicacion = sanitizeBoolean(body.consentimiento_ubicacion, false);
    const latitud = consentimientoUbicacion && body.latitud !== null && body.latitud !== undefined ? Number(body.latitud) : null;
    const longitud = consentimientoUbicacion && body.longitud !== null && body.longitud !== undefined ? Number(body.longitud) : null;
    const latitudNacimiento = body.latitud_nacimiento !== null && body.latitud_nacimiento !== undefined ? Number(body.latitud_nacimiento) : null;
    const longitudNacimiento = body.longitud_nacimiento !== null && body.longitud_nacimiento !== undefined ? Number(body.longitud_nacimiento) : null;
    const timezoneNacimiento = resolveBirthTimezone(body);
    const cartaLatitud = Number.isFinite(latitudNacimiento) ? latitudNacimiento : latitud;
    const cartaLongitud = Number.isFinite(longitudNacimiento) ? longitudNacimiento : longitud;

    let luna = 'Desconocido';
    let ascendente = 'Desconocido';
    let venus = 'Desconocido';
    let marte = 'Desconocido';

    if (body.fecha_nacimiento && body.hora_nacimiento) {
        const carta = calcularCartaAstral(body.fecha_nacimiento, body.hora_nacimiento, cartaLatitud, cartaLongitud, timezoneNacimiento);
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
        orientacion_sexual: `${body.genero || ''}`.trim() === 'Otro' ? `${body.orientacion_sexual || ''}`.trim() : '',
        latitud,
        longitud,
        hora_nacimiento: `${body.hora_nacimiento || ''}`.trim(),
        lugar_nacimiento: `${body.lugar_nacimiento || ''}`.trim(),
        timezone_nacimiento: timezoneNacimiento,
        latitud_nacimiento: Number.isFinite(latitudNacimiento) ? latitudNacimiento : null,
        longitud_nacimiento: Number.isFinite(longitudNacimiento) ? longitudNacimiento : null,
        luna,
        ascendente,
        venus,
        marte,
        bio: `${body.bio || ''}`.trim(),
        ocupacion: `${body.ocupacion || ''}`.trim(),
        educacion: `${body.educacion || ''}`.trim(),
        prompts: JSON.stringify(prompts),
        edad_min_pref: sanitizeInteger(body.edad_min_pref, 18),
        edad_max_pref: sanitizeInteger(body.edad_max_pref, 99),
        distancia_max_km: sanitizeDistance(body.distancia_max_km, 50),
        mostrar_edad: sanitizeBoolean(body.mostrar_edad, true) ? 1 : 0,
        mostrar_distancia: sanitizeBoolean(body.mostrar_distancia, true) ? 1 : 0,
        consentimiento_ubicacion: consentimientoUbicacion ? 1 : 0,
        perfil_activo: sanitizeBoolean(body.perfil_activo, true) ? 1 : 0,
    };
};

const getRetainedModeratedPhotos = (currentUser, nextPhotos) => {
    const retained = getModeratedPhotoList(currentUser).filter((photo) => nextPhotos.includes(photo));
    return JSON.stringify(retained);
};

const withSession = async (user) => {
    const token = crypto.randomUUID();
    await db.run(
        `INSERT INTO sesiones (token, usuario_id, created_at, last_seen_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [token, user.id]
    );
    return { token, usuario: toOwnUser(user) };
};

const findUserByContact = async ({ correo, telefono }) => {
    let existing = null;
    const normalizedEmail = `${correo || ''}`.trim().toLowerCase();
    const normalizedPhone = `${telefono || ''}`.trim();

    if (normalizedEmail) {
        existing = await db.get(`SELECT * FROM usuarios WHERE correo = ?`, [normalizedEmail]);
    }
    if (!existing && normalizedPhone) {
        existing = await db.get(`SELECT * FROM usuarios WHERE telefono = ?`, [normalizedPhone]);
    }

    return existing;
};

const ensureAdult = (fechaNacimiento) => {
    const age = calculateAge(fechaNacimiento);
    return age !== null && age >= 18;
};

const getBaseUrlForRequest = (req) => `${req.protocol}://${req.get('host')}`;

const createUploadUrl = (req, filename) => `${getBaseUrlForRequest(req)}/uploads/profile-photos/${filename}`;

const getAuthTokenFromRequest = (req) => {
    const headerToken = req.get('x-session-token');
    if (headerToken) return headerToken;

    const authorization = req.get('authorization');
    if (!authorization) return null;

    const [scheme, token] = authorization.split(' ');
    if (scheme?.toLowerCase() === 'bearer' && token) return token;
    return null;
};

const getSessionRecord = async (token) => {
    if (!token) return null;
    return db.get(
        `SELECT s.token, u.* FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id WHERE s.token = ?`,
        [token]
    );
};

const maybeAttachSessionUser = async (req) => {
    const token = getAuthTokenFromRequest(req);
    if (!token) return null;
    const sessionUser = await getSessionRecord(token);
    if (sessionUser) {
        req.sessionToken = token;
        req.sessionUser = sessionUser;
    }
    return sessionUser;
};

const requireSession = async (req, res, next) => {
    try {
        const sessionUser = await maybeAttachSessionUser(req);
        if (!sessionUser) {
            return res.status(401).json({ mensaje: 'Sesion invalida o expirada' });
        }
        next();
    } catch (error) {
        next(error);
    }
};

const requireOwnUser = (req, res, next) => {
    const expectedId = Number(req.params.id);
    if (!req.sessionUser || req.sessionUser.id !== expectedId) {
        return res.status(403).json({ mensaje: 'No puedes modificar este recurso' });
    }
    next();
};

const registerConnectedSocket = (userId, socketId) => {
    const currentSet = connectedUserSockets.get(userId) ?? new Set();
    currentSet.add(socketId);
    connectedUserSockets.set(userId, currentSet);
};

const unregisterConnectedSocket = (userId, socketId) => {
    const currentSet = connectedUserSockets.get(userId);
    if (!currentSet) return;
    currentSet.delete(socketId);
    if (currentSet.size === 0) {
        connectedUserSockets.delete(userId);
    }
};

const isUserActiveInChat = (userId, otherUserId) => {
    for (const [socketId, activity] of activeChatsBySocket.entries()) {
        if (activity.userId === userId && activity.otherUserId === otherUserId) {
            const sockets = connectedUserSockets.get(userId);
            if (sockets?.has(socketId)) {
                return true;
            }
        }
    }
    return false;
};

const canUsersChat = async (userId, otherUserId) => {
    const hasMatch = await db.get(
        `SELECT 1 FROM sincronias
         WHERE ((usuario_origen = ? AND usuario_destino = ?) OR (usuario_origen = ? AND usuario_destino = ?))
         AND tipo = 'match'
         LIMIT 1`,
        [userId, otherUserId, otherUserId, userId]
    );
    return Boolean(hasMatch);
};

const emitConnectionsRefresh = (firstUserId, secondUserId) => {
    io.to(`user:${firstUserId}`).emit('connections:refresh', { userId: firstUserId, otherUserId: secondUserId });
    io.to(`user:${secondUserId}`).emit('connections:refresh', { userId: secondUserId, otherUserId: firstUserId });
};

const markConversationAsRead = async (userId, otherUserId) => {
    const chatKey = pairKey(userId, otherUserId);
    await db.run(
        `UPDATE mensajes SET leido = 1 WHERE chat_key = ? AND receptor_id = ?`,
        [chatKey, userId]
    );
    io.to(`chat:${chatKey}`).emit('chat:read', { chatKey, readerId: userId, otherUserId });
    emitConnectionsRefresh(userId, otherUserId);
};

const emitMessageRealtime = async (message) => {
    io.to(`chat:${message.chat_key}`).emit('chat:message', message);
    emitConnectionsRefresh(message.emisor_id, message.receptor_id);
};

const sendPushToUser = async ({ pushToken, title, body, data }) => {
    if (!pushToken || !Expo.isExpoPushToken(pushToken)) return;

    const chunks = expo.chunkPushNotifications([{
        to: pushToken,
        sound: 'default',
        title,
        body,
        data,
        channelId: 'messages',
    }]);

    for (const chunk of chunks) {
        try {
            await expo.sendPushNotificationsAsync(chunk);
        } catch (error) {
            console.error('No se pudo enviar la notificacion push:', error);
        }
    }
};

const notifyRecipientIfNeeded = async (message) => {
    if (isUserActiveInChat(message.receptor_id, message.emisor_id)) return;

    const [sender, receiver] = await Promise.all([
        db.get(`SELECT nombre FROM usuarios WHERE id = ?`, [message.emisor_id]),
        db.get(`SELECT push_token FROM usuarios WHERE id = ?`, [message.receptor_id]),
    ]);

    await sendPushToUser({
        pushToken: receiver?.push_token,
        title: sender?.nombre ? `Nuevo mensaje de ${sender.nombre}` : 'Nuevo mensaje en SYNCRONOS',
        body: `${message.contenido}`.slice(0, 140),
        data: {
            screen: 'Chat',
            otherUserId: message.emisor_id,
            nombre: sender?.nombre || 'Chat',
        },
    });
};

(async () => {
    db = await open({
        filename: path.join(__dirname, 'database.db'),
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
            fotos_moderadas TEXT DEFAULT '[]',
            ubicacion TEXT,
            gustos TEXT,
            metodo_registro TEXT,
            correo TEXT,
            telefono TEXT,
            intencion TEXT,
            genero TEXT,
            genero_interes TEXT,
            orientacion_sexual TEXT DEFAULT '',
            latitud REAL,
            longitud REAL,
            hora_nacimiento TEXT,
            lugar_nacimiento TEXT,
            timezone_nacimiento TEXT DEFAULT '',
            latitud_nacimiento REAL,
            longitud_nacimiento REAL,
            luna TEXT,
            ascendente TEXT,
            venus TEXT,
            marte TEXT,
            bio TEXT DEFAULT '',
            ocupacion TEXT DEFAULT '',
            educacion TEXT DEFAULT '',
            prompts TEXT DEFAULT '[]',
            edad_min_pref INTEGER DEFAULT 18,
            edad_max_pref INTEGER DEFAULT 99,
            distancia_max_km INTEGER DEFAULT 50,
            mostrar_edad INTEGER DEFAULT 1,
            mostrar_distancia INTEGER DEFAULT 1,
            consentimiento_ubicacion INTEGER DEFAULT 0,
            perfil_activo INTEGER DEFAULT 1,
            push_token TEXT DEFAULT '',
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

        CREATE TABLE IF NOT EXISTS reportes_fotos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_origen INTEGER,
            usuario_destino INTEGER,
            foto_url TEXT,
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
        "ALTER TABLE usuarios ADD COLUMN fotos_moderadas TEXT DEFAULT '[]';",
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
        "ALTER TABLE usuarios ADD COLUMN latitud_nacimiento REAL;",
        "ALTER TABLE usuarios ADD COLUMN longitud_nacimiento REAL;",
        "ALTER TABLE usuarios ADD COLUMN timezone_nacimiento TEXT DEFAULT '';",
        "ALTER TABLE usuarios ADD COLUMN push_token TEXT DEFAULT '';",
        "ALTER TABLE usuarios ADD COLUMN prompts TEXT DEFAULT '[]';",
        "ALTER TABLE usuarios ADD COLUMN orientacion_sexual TEXT DEFAULT '';",
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

io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        const sessionUser = await getSessionRecord(token);
        if (!sessionUser) {
            next(new Error('Sesion invalida'));
            return;
        }

        socket.data.userId = sessionUser.id;
        next();
    } catch (error) {
        next(error);
    }
});

io.on('connection', (socket) => {
    const userId = socket.data.userId;
    registerConnectedSocket(userId, socket.id);
    socket.join(`user:${userId}`);

    socket.on('chat:join', async (payload = {}, ack) => {
        try {
            const otherUserId = Number(payload.otherUserId);
            if (!Number.isFinite(otherUserId)) {
                ack?.({ ok: false, mensaje: 'Chat invalido' });
                return;
            }

            const allowed = await canUsersChat(userId, otherUserId);
            if (!allowed) {
                ack?.({ ok: false, mensaje: 'Solo puedes entrar a chats con matches' });
                return;
            }

            activeChatsBySocket.set(socket.id, { userId, otherUserId });
            socket.join(`chat:${pairKey(userId, otherUserId)}`);
            await markConversationAsRead(userId, otherUserId);
            ack?.({ ok: true });
        } catch (error) {
            console.error('Error entrando al chat realtime:', error);
            ack?.({ ok: false, mensaje: 'No se pudo abrir el chat en tiempo real' });
        }
    });

    socket.on('chat:leave', (payload = {}) => {
        const otherUserId = Number(payload.otherUserId);
        if (!Number.isFinite(otherUserId)) return;
        activeChatsBySocket.delete(socket.id);
        socket.leave(`chat:${pairKey(userId, otherUserId)}`);
    });

    socket.on('chat:read', async (payload = {}, ack) => {
        try {
            const otherUserId = Number(payload.otherUserId);
            if (!Number.isFinite(otherUserId)) {
                ack?.({ ok: false, mensaje: 'Chat invalido' });
                return;
            }
            await markConversationAsRead(userId, otherUserId);
            ack?.({ ok: true });
        } catch (error) {
            console.error('Error marcando mensajes como leidos:', error);
            ack?.({ ok: false, mensaje: 'No se pudieron marcar los mensajes' });
        }
    });

    socket.on('disconnect', () => {
        activeChatsBySocket.delete(socket.id);
        unregisterConnectedSocket(userId, socket.id);
    });
});

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

        if (`${genero || ''}`.trim() === 'Otro' && !`${req.body.orientacion_sexual || ''}`.trim()) {
            return res.status(400).json({ mensaje: 'Debes definir tu orientacion si eliges la opcion Otro' });
        }

        let existing = await findUserByContact({ correo, telefono });

        const sourceBody = existing
            ? {
                ...existing,
                ...req.body,
                fotos: req.body.fotos ?? parseJsonArray(existing.fotos),
                foto: req.body.foto ?? existing.foto,
                fecha_nacimiento: req.body.fecha_nacimiento || existing.fecha_nacimiento,
            }
            : req.body;

        const profile = buildProfilePayload(sourceBody);
        if (profile.edad_min_pref > profile.edad_max_pref) {
            return res.status(400).json({ mensaje: 'El rango de edad no es valido' });
        }

        if (existing) {
            await db.run(
                `UPDATE usuarios
                 SET nombre = ?, fecha_nacimiento = ?, generacion = ?, signo_zodiacal = ?, foto = ?, fotos = ?, fotos_moderadas = ?, ubicacion = ?, gustos = ?,
                     metodo_registro = ?, correo = ?, telefono = ?, intencion = ?, genero = ?, genero_interes = ?, orientacion_sexual = ?, latitud = ?, longitud = ?,
                     hora_nacimiento = ?, lugar_nacimiento = ?, timezone_nacimiento = ?, latitud_nacimiento = ?, longitud_nacimiento = ?, luna = ?, ascendente = ?, venus = ?, marte = ?, bio = ?, ocupacion = ?,
                     educacion = ?, prompts = ?, edad_min_pref = ?, edad_max_pref = ?, distancia_max_km = ?, mostrar_edad = ?, mostrar_distancia = ?,
                     consentimiento_ubicacion = ?, perfil_activo = ?, ultima_sesion = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [
                    profile.nombre, profile.fecha_nacimiento, profile.generacion, profile.signo_zodiacal, profile.foto, profile.fotos,
                    getRetainedModeratedPhotos(existing, parseJsonArray(profile.fotos)),
                    profile.ubicacion, profile.gustos, profile.metodo_registro, profile.correo, profile.telefono, profile.intencion,
                    profile.genero, profile.genero_interes, profile.orientacion_sexual, profile.latitud, profile.longitud, profile.hora_nacimiento, profile.lugar_nacimiento, profile.timezone_nacimiento,
                    profile.latitud_nacimiento, profile.longitud_nacimiento,
                    profile.luna, profile.ascendente, profile.venus, profile.marte, profile.bio, profile.ocupacion, profile.educacion, profile.prompts,
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
                nombre, fecha_nacimiento, generacion, signo_zodiacal, foto, fotos, fotos_moderadas, ubicacion, gustos, metodo_registro, correo, telefono,
                intencion, genero, genero_interes, orientacion_sexual, latitud, longitud, hora_nacimiento, lugar_nacimiento, timezone_nacimiento, latitud_nacimiento, longitud_nacimiento, luna, ascendente, venus, marte,
                bio, ocupacion, educacion, prompts, edad_min_pref, edad_max_pref, distancia_max_km, mostrar_edad, mostrar_distancia,
                consentimiento_ubicacion, perfil_activo, push_token, ultima_sesion
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [
                profile.nombre, profile.fecha_nacimiento, profile.generacion, profile.signo_zodiacal, profile.foto, profile.fotos, '[]',
                profile.ubicacion, profile.gustos, profile.metodo_registro, profile.correo, profile.telefono, profile.intencion,
                profile.genero, profile.genero_interes, profile.orientacion_sexual, profile.latitud, profile.longitud, profile.hora_nacimiento, profile.lugar_nacimiento, profile.timezone_nacimiento,
                profile.latitud_nacimiento, profile.longitud_nacimiento,
                profile.luna, profile.ascendente, profile.venus, profile.marte, profile.bio, profile.ocupacion, profile.educacion, profile.prompts,
                profile.edad_min_pref, profile.edad_max_pref, profile.distancia_max_km, profile.mostrar_edad, profile.mostrar_distancia,
                profile.consentimiento_ubicacion, profile.perfil_activo, '',
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

app.post('/login-cronos', async (req, res) => {
    try {
        const { correo, telefono } = req.body;

        if (!`${correo || ''}`.trim() && !`${telefono || ''}`.trim()) {
            return res.status(400).json({ mensaje: 'Debes ingresar correo o telefono' });
        }

        const existing = await findUserByContact({ correo, telefono });
        if (!existing) {
            return res.status(404).json({ mensaje: 'No encontramos una cuenta con esos datos' });
        }

        await db.run(`UPDATE usuarios SET ultima_sesion = CURRENT_TIMESTAMP WHERE id = ?`, [existing.id]);
        const refreshedUser = await db.get(`SELECT * FROM usuarios WHERE id = ?`, [existing.id]);
        const session = await withSession(refreshedUser);
        res.json({ mensaje: 'Login OK', ...session });
    } catch (error) {
        console.error('Error iniciando sesion:', error);
        res.status(500).json({ mensaje: 'No se pudo iniciar sesion' });
    }
});

app.get('/sesion/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const session = await getSessionRecord(token);

        if (!session) {
            return res.status(404).json({ mensaje: 'Sesion no encontrada' });
        }

        await db.run(`UPDATE sesiones SET last_seen_at = CURRENT_TIMESTAMP WHERE token = ?`, [token]);
        await db.run(`UPDATE usuarios SET ultima_sesion = CURRENT_TIMESTAMP WHERE id = ?`, [session.id]);
        res.json({ usuario: toOwnUser(session), token });
    } catch (e) {
        console.error('Error recuperando sesion:', e);
        res.status(500).json({ mensaje: 'No se pudo recuperar la sesion' });
    }
});

app.delete('/sesion/:token', async (req, res) => {
    await db.run(`DELETE FROM sesiones WHERE token = ?`, [req.params.token]);
    res.json({ mensaje: 'OK' });
});

app.put('/usuarios/:id/push-token', requireSession, requireOwnUser, async (req, res) => {
    try {
        const pushToken = `${req.body.push_token || ''}`.trim();
        await db.run(`UPDATE usuarios SET push_token = ? WHERE id = ?`, [pushToken, req.params.id]);
        res.json({ mensaje: 'OK' });
    } catch (error) {
        console.error('Error guardando push token:', error);
        res.status(500).json({ mensaje: 'No se pudo guardar el token de notificaciones' });
    }
});

app.post('/usuarios/:id/fotos', requireSession, requireOwnUser, photoUpload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ mensaje: 'Debes enviar una imagen' });
        }

        res.json({
            mensaje: 'OK',
            url: createUploadUrl(req, req.file.filename),
            fileName: req.file.filename,
            mimeType: req.file.mimetype,
            moderation_status: 'visible',
        });
    } catch (error) {
        console.error('Error subiendo foto:', error);
        res.status(500).json({ mensaje: 'No se pudo subir la foto' });
    }
});

app.get('/perfil/:id', async (req, res) => {
    try {
        const user = await db.get(`SELECT * FROM usuarios WHERE id = ?`, [req.params.id]);
        if (!user) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const sessionUser = await maybeAttachSessionUser(req);
        const ownProfile = sessionUser && sessionUser.id === user.id;
        res.json(ownProfile ? toOwnUser(user) : toPublicUser(user));
    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({ mensaje: 'No se pudo obtener el perfil' });
    }
});

app.put('/perfil/:id', async (req, res) => {
    try {
        const current = await db.get(`SELECT * FROM usuarios WHERE id = ?`, [req.params.id]);
        if (!current) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const mergedBody = {
            ...current,
            ...req.body,
            fotos: req.body.fotos ?? parseJsonArray(current.fotos),
            fecha_nacimiento: req.body.fecha_nacimiento || current.fecha_nacimiento,
        };

        if (!ensureAdult(mergedBody.fecha_nacimiento)) {
            return res.status(400).json({ mensaje: 'La app solo esta disponible para mayores de 18 anos' });
        }

        if (`${mergedBody.genero || ''}`.trim() === 'Otro' && !`${mergedBody.orientacion_sexual || ''}`.trim()) {
            return res.status(400).json({ mensaje: 'Debes definir tu orientacion si eliges la opcion Otro' });
        }

        const profile = buildProfilePayload(mergedBody);
        if (profile.edad_min_pref > profile.edad_max_pref) {
            return res.status(400).json({ mensaje: 'El rango de edad no es valido' });
        }

        await db.run(
            `UPDATE usuarios
             SET nombre = ?, fecha_nacimiento = ?, generacion = ?, signo_zodiacal = ?, foto = ?, fotos = ?, fotos_moderadas = ?, ubicacion = ?, gustos = ?,
                 metodo_registro = ?, correo = ?, telefono = ?, intencion = ?, genero = ?, genero_interes = ?, orientacion_sexual = ?, latitud = ?, longitud = ?,
                 hora_nacimiento = ?, lugar_nacimiento = ?, timezone_nacimiento = ?, latitud_nacimiento = ?, longitud_nacimiento = ?, luna = ?, ascendente = ?, venus = ?, marte = ?, bio = ?, ocupacion = ?,
                 educacion = ?, prompts = ?, edad_min_pref = ?, edad_max_pref = ?, distancia_max_km = ?, mostrar_edad = ?, mostrar_distancia = ?,
                 consentimiento_ubicacion = ?, perfil_activo = ?, ultima_sesion = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                profile.nombre, profile.fecha_nacimiento, profile.generacion, profile.signo_zodiacal, profile.foto, profile.fotos,
                getRetainedModeratedPhotos(current, parseJsonArray(profile.fotos)),
                profile.ubicacion, profile.gustos, profile.metodo_registro, profile.correo, profile.telefono, profile.intencion,
                profile.genero, profile.genero_interes, profile.orientacion_sexual, profile.latitud, profile.longitud, profile.hora_nacimiento, profile.lugar_nacimiento, profile.timezone_nacimiento,
                profile.latitud_nacimiento, profile.longitud_nacimiento,
                profile.luna, profile.ascendente, profile.venus, profile.marte, profile.bio, profile.ocupacion, profile.educacion, profile.prompts,
                profile.edad_min_pref, profile.edad_max_pref, profile.distancia_max_km, profile.mostrar_edad, profile.mostrar_distancia,
                profile.consentimiento_ubicacion, profile.perfil_activo, req.params.id,
            ]
        );

        const updated = await db.get(`SELECT * FROM usuarios WHERE id = ?`, [req.params.id]);
        res.json({ mensaje: 'OK', usuario: toOwnUser(updated) });
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
                if (!requesterInterestedInCandidate(currentUser, candidate)) return null;
                if (!candidateAcceptsGender(candidate, currentUser)) return null;

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
                    interpretacion_compatibilidad: compatibility.interpretation,
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
                emitConnectionsRefresh(Number(myId), Number(targetId));
                io.to(`user:${myId}`).emit('match:created', { otherUserId: Number(targetId) });
                io.to(`user:${targetId}`).emit('match:created', { otherUserId: Number(myId) });
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
        const hasMatch = await canUsersChat(userId, otherId);
        if (!hasMatch) {
            return res.status(403).json({ mensaje: 'Solo puedes escribir a tus matches' });
        }

        await markConversationAsRead(userId, otherId);

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
        const { destino_id: rawTargetId, contenido } = req.body;
        const targetId = Number(rawTargetId);
        const trimmed = `${contenido || ''}`.trim();
        if (!targetId || !trimmed) {
            return res.status(400).json({ mensaje: 'Mensaje invalido' });
        }

        const hasMatch = await canUsersChat(userId, targetId);
        if (!hasMatch) {
            return res.status(403).json({ mensaje: 'Solo puedes escribir a tus matches' });
        }

        const chatKey = pairKey(userId, targetId);
        const insert = await db.run(
            `INSERT INTO mensajes (chat_key, emisor_id, receptor_id, contenido, leido) VALUES (?, ?, ?, ?, 0)`,
            [chatKey, userId, targetId, trimmed]
        );
        const message = await db.get(`SELECT * FROM mensajes WHERE id = ?`, [insert.lastID]);
        await emitMessageRealtime(message);
        await notifyRecipientIfNeeded(message);
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

app.post('/moderacion/foto', async (req, res) => {
    try {
        const { mi_id: myId, destino_id: targetId, foto_url: photoUrl, motivo } = req.body;
        if (!myId || !targetId || !photoUrl) {
            return res.status(400).json({ mensaje: 'Debes indicar la foto a reportar' });
        }

        const targetUser = await db.get(`SELECT * FROM usuarios WHERE id = ?`, [targetId]);
        if (!targetUser) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        const targetPhotos = uniqueStrings(parseJsonArray(targetUser.fotos));
        if (!targetPhotos.includes(photoUrl)) {
            return res.status(400).json({ mensaje: 'La foto ya no esta disponible' });
        }

        const existing = await db.get(
            `SELECT * FROM reportes_fotos WHERE usuario_origen = ? AND usuario_destino = ? AND foto_url = ?`,
            [myId, targetId, photoUrl]
        );

        if (!existing) {
            await db.run(
                `INSERT INTO reportes_fotos (usuario_origen, usuario_destino, foto_url, motivo) VALUES (?, ?, ?, ?)`,
                [myId, targetId, photoUrl, `${motivo || ''}`.trim()]
            );
        }

        const reportCount = await db.get(
            `SELECT COUNT(*) AS total FROM reportes_fotos WHERE usuario_destino = ? AND foto_url = ?`,
            [targetId, photoUrl]
        );

        let ocultaPorModeracion = false;
        if ((reportCount?.total || 0) >= PHOTO_REPORT_HIDE_THRESHOLD) {
            const moderatedPhotos = getModeratedPhotoList(targetUser);
            if (!moderatedPhotos.includes(photoUrl)) {
                moderatedPhotos.push(photoUrl);
                await db.run(
                    `UPDATE usuarios SET fotos_moderadas = ? WHERE id = ?`,
                    [JSON.stringify(uniqueStrings(moderatedPhotos)), targetId]
                );
            }
            ocultaPorModeracion = true;
        }

        res.json({
            mensaje: 'OK',
            reportes: reportCount?.total || 1,
            oculta_por_moderacion: ocultaPorModeracion,
        });
    } catch (e) {
        console.error('Error reportando foto:', e);
        res.status(500).json({ mensaje: 'No se pudo reportar la foto' });
    }
});

app.use((error, _req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ mensaje: 'La foto supera el limite permitido de 8 MB' });
        }
        return res.status(400).json({ mensaje: 'No se pudo procesar la imagen' });
    }

    if (error?.message === 'PHOTO_TYPE_INVALID') {
        return res.status(400).json({ mensaje: 'Solo se permiten imagenes JPG, PNG, WEBP o HEIC' });
    }

    next(error);
});

server.listen(PORT, () => console.log(`SYNCRONOS en puerto ${PORT}`));
