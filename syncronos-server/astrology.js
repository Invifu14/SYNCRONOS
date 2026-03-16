const ephemeris = require('ephemeris');
const { DateTime } = require('luxon');

// Signos y elementos astrológicos
const zodiacSigns = [
    { name: 'Aries', element: 'Fuego', start: 0, end: 30 },
    { name: 'Tauro', element: 'Tierra', start: 30, end: 60 },
    { name: 'Géminis', element: 'Aire', start: 60, end: 90 },
    { name: 'Cáncer', element: 'Agua', start: 90, end: 120 },
    { name: 'Leo', element: 'Fuego', start: 120, end: 150 },
    { name: 'Virgo', element: 'Tierra', start: 150, end: 180 },
    { name: 'Libra', element: 'Aire', start: 180, end: 210 },
    { name: 'Escorpio', element: 'Agua', start: 210, end: 240 },
    { name: 'Sagitario', element: 'Fuego', start: 240, end: 270 },
    { name: 'Capricornio', element: 'Tierra', start: 270, end: 300 },
    { name: 'Acuario', element: 'Aire', start: 300, end: 330 },
    { name: 'Piscis', element: 'Agua', start: 330, end: 360 }
];

// Obtener signo zodiacal por grado (0 a 360)
function getSignByDegree(degree) {
    const normalizedDegree = ((degree % 360) + 360) % 360;
    for (const sign of zodiacSigns) {
        if (normalizedDegree >= sign.start && normalizedDegree < sign.end) {
            return sign.name;
        }
    }
    return 'Aries'; // Fallback
}

// Calcular la Hora Sideral Local (LST) para el Ascendente
function calculateLST(date, longitude) {
    const dt = DateTime.fromJSDate(date, { zone: 'utc' });
    const jd = dt.toMillis() / 86400000 + 2440587.5; // Fecha Juliana
    const d = jd - 2451545.0; // Días desde J2000.0

    // Hora Sideral de Greenwich (GMST) en horas
    let gmst = 18.697374558 + 24.06570982441908 * d;
    gmst = ((gmst % 24) + 24) % 24;

    // LST = GMST + Longitud(horas)
    const longitudeInHours = longitude / 15.0;
    let lst = gmst + longitudeInHours;
    lst = ((lst % 24) + 24) % 24;

    return lst;
}

// Calcular el Ascendente (Aproximación matemática)
// RAMC = LST en grados (LST * 15)
// Ascendant = arctan(cos(RAMC) / (-sin(RAMC) * cos(obliquity) - tan(latitude) * sin(obliquity)))
function calculateAscendant(date, lat, lon) {
    const lstHours = calculateLST(date, lon);
    const ramc = lstHours * 15; // LST a grados
    const eps = 23.4392911; // Oblicuidad de la eclíptica (aproximación actual)

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

    // Ajustar cuadrante basado en el medio cielo
    if (ascDeg < 0) {
        ascDeg += 180;
    }
    // Asegurar 0-360
    ascDeg = ((ascDeg % 360) + 360) % 360;

    return getSignByDegree(ascDeg);
}

// Función principal para calcular la carta astral
function calcularCartaAstral(fechaStr, horaStr, latitud, longitud) {
    try {
        // Parsear fecha y hora local asumiendo que el usuario ingresó hora en su zona horaria
        // Para simplificar, asumiremos UTC si no se provee zona, pero el usuario provee Lat/Lon
        // Usaremos la latitud y longitud si existen para los cálculos del ascendente
        const isoString = `${fechaStr}T${horaStr}:00.000Z`;
        const birthDate = new Date(isoString);

        if (isNaN(birthDate.getTime())) {
            throw new Error("Fecha u hora inválida");
        }

        // Usamos ephemeris de Moshier para obtener la posición de los astros (longitud aparente en grados)
        // La librería ephemeris usa UTC.
        const ephData = ephemeris.getAllPlanets(birthDate, 0, 0, 0);

        const lunaDegree = ephData.observed.moon.apparentLongitudeDd;
        const venusDegree = ephData.observed.venus.apparentLongitudeDd;
        const marteDegree = ephData.observed.mars.apparentLongitudeDd;

        const luna = getSignByDegree(lunaDegree);
        const venus = getSignByDegree(venusDegree);
        const marte = getSignByDegree(marteDegree);

        let ascendente = "Desconocido";
        if (latitud && longitud) {
            ascendente = calculateAscendant(birthDate, parseFloat(latitud), parseFloat(longitud));
        }

        return { luna, ascendente, venus, marte };
    } catch (e) {
        console.error("Error calculando carta astral:", e);
        return { luna: "Desconocido", ascendente: "Desconocido", venus: "Desconocido", marte: "Desconocido" };
    }
}

module.exports = {
    calcularCartaAstral,
    zodiacSigns,
    getSignByDegree
};
