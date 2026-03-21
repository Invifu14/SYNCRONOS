const ephemeris = require('ephemeris');
const { DateTime, IANAZone } = require('luxon');

const zodiacSigns = [
    { name: 'Aries', element: 'Fuego', start: 0, end: 30 },
    { name: 'Tauro', element: 'Tierra', start: 30, end: 60 },
    { name: 'Geminis', element: 'Aire', start: 60, end: 90 },
    { name: 'Cancer', element: 'Agua', start: 90, end: 120 },
    { name: 'Leo', element: 'Fuego', start: 120, end: 150 },
    { name: 'Virgo', element: 'Tierra', start: 150, end: 180 },
    { name: 'Libra', element: 'Aire', start: 180, end: 210 },
    { name: 'Escorpio', element: 'Agua', start: 210, end: 240 },
    { name: 'Sagitario', element: 'Fuego', start: 240, end: 270 },
    { name: 'Capricornio', element: 'Tierra', start: 270, end: 300 },
    { name: 'Acuario', element: 'Aire', start: 300, end: 330 },
    { name: 'Piscis', element: 'Agua', start: 330, end: 360 },
];

function getSignByDegree(degree) {
    const normalizedDegree = ((degree % 360) + 360) % 360;
    for (const sign of zodiacSigns) {
        if (normalizedDegree >= sign.start && normalizedDegree < sign.end) {
            return sign.name;
        }
    }
    return 'Aries';
}

function calculateLST(date, longitude) {
    const dt = DateTime.fromJSDate(date, { zone: 'utc' });
    const jd = dt.toMillis() / 86400000 + 2440587.5;
    const d = jd - 2451545.0;

    let gmst = 18.697374558 + 24.06570982441908 * d;
    gmst = ((gmst % 24) + 24) % 24;

    const longitudeInHours = longitude / 15.0;
    let lst = gmst + longitudeInHours;
    lst = ((lst % 24) + 24) % 24;

    return lst;
}

function calculateAscendant(date, lat, lon) {
    const lstHours = calculateLST(date, lon);
    const ramc = lstHours * 15;
    const eps = 23.4392911;

    const ramcRad = ramc * (Math.PI / 180);
    const epsRad = eps * (Math.PI / 180);
    const latRad = lat * (Math.PI / 180);

    const sinRamc = Math.sin(ramcRad);
    const cosRamc = Math.cos(ramcRad);
    const sinEps = Math.sin(epsRad);
    const cosEps = Math.cos(epsRad);
    const tanLat = Math.tan(latRad);

    const numerator = cosRamc;
    const denominator = -(sinRamc * cosEps + tanLat * sinEps);

    let ascRad = Math.atan2(numerator, denominator);
    let ascDeg = ascRad * (180 / Math.PI);

    if (ascDeg < 0) {
        ascDeg += 180;
    }
    ascDeg = ((ascDeg % 360) + 360) % 360;

    return getSignByDegree(ascDeg);
}

function sanitizeBirthTimezone(timezone) {
    const candidate = `${timezone || ''}`.trim();
    return IANAZone.isValidZone(candidate) ? candidate : 'UTC';
}

function calcularCartaAstral(fechaStr, horaStr, latitud, longitud, timezone) {
    try {
        const safeTimezone = sanitizeBirthTimezone(timezone);
        const birthMoment = DateTime.fromISO(`${fechaStr}T${horaStr}`, { zone: safeTimezone });

        if (!birthMoment.isValid) {
            throw new Error('Fecha u hora invalida');
        }

        const birthDate = birthMoment.toUTC().toJSDate();
        const ephData = ephemeris.getAllPlanets(birthDate, 0, 0, 0);

        const lunaDegree = ephData.observed.moon.apparentLongitudeDd;
        const venusDegree = ephData.observed.venus.apparentLongitudeDd;
        const marteDegree = ephData.observed.mars.apparentLongitudeDd;

        const luna = getSignByDegree(lunaDegree);
        const venus = getSignByDegree(venusDegree);
        const marte = getSignByDegree(marteDegree);

        let ascendente = 'Desconocido';
        if (Number.isFinite(Number(latitud)) && Number.isFinite(Number(longitud))) {
            ascendente = calculateAscendant(birthDate, parseFloat(latitud), parseFloat(longitud));
        }

        return { luna, ascendente, venus, marte };
    } catch (error) {
        console.error('Error calculando carta astral:', error);
        return { luna: 'Desconocido', ascendente: 'Desconocido', venus: 'Desconocido', marte: 'Desconocido' };
    }
}

module.exports = {
    calcularCartaAstral,
    zodiacSigns,
    getSignByDegree,
};
