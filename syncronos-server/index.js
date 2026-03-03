const cors = require('cors');
﻿const express = require('express');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

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
            genero_interes TEXT
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

const obtenerGeneracion = (fechaStr) => {
    const año = new Date(fechaStr + "T12:00:00").getFullYear();
    if (año >= 2010) return "Generación Alpha";
    if (año >= 1997) return "Generación Z";
    if (año >= 1981) return "Millennials";
    if (año >= 1965) return "Generación X";
    return "Baby Boomers";
};

// --- RUTAS ---

app.post('/registrar-cronos', async (req, res) => {
    // Se añade intención en la recepción
    const { nombre, fecha_nacimiento, ubicacion, gustos, metodo_registro, correo, telefono, intencion, genero, genero_interes } = req.body;
    const generacion = obtenerGeneracion(fecha_nacimiento);
    const { signo, foto } = obtenerSignoYFoto(fecha_nacimiento);
    
    const existing = await db.get(`SELECT * FROM usuarios WHERE nombre = ?`, [nombre]);
    if (existing) {
        return res.json({ mensaje: "Login OK", usuario: existing });
    }

    await db.run(
        `INSERT INTO usuarios (nombre, fecha_nacimiento, generacion, signo_zodiacal, foto, ubicacion, gustos, metodo_registro, correo, telefono, intencion, genero, genero_interes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [nombre, fecha_nacimiento, generacion, signo, foto, ubicacion || "", gustos || "", metodo_registro || "", correo || "", telefono || "", intencion || "", genero || "", genero_interes || ""]
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

    res.json(resultados);
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

    res.json(resultados);
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