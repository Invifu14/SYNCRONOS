import React, { useEffect, useState, useContext } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Alert, Dimensions } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { AppContext } from '../context/AppContext';

const { height } = Dimensions.get('window');

const calcularEdad = (fecha) => {
    const hoy = new Date();
    const nacimiento = new Date(fecha);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
    }
    return edad;
};

export default function MainScreen() {
    const [usuarios, setUsuarios] = useState([]);
    const { user, MI_IP } = useContext(AppContext);

    const baseUrl = MI_IP === 'localhost' ? 'http://localhost:3000' : `http://${MI_IP}:3000`;

    const obtenerUrlImagen = (ruta) => {
        if (!ruta) return 'https://robohash.org/default.png';
        if (ruta.startsWith('http')) return ruta; // Ya es una URL completa (ej. robohash)
        return `${baseUrl}${ruta}`; // Es una ruta relativa de multer
    };

    useEffect(() => {
        const fetchUsuarios = async () => {
            try {
                const response = await fetch(`${baseUrl}/usuarios/${user.nombre}`);
                const data = await response.json();
                setUsuarios(data);
            } catch (e) {
                console.error("Error al obtener usuarios", e);
            }
        };
        fetchUsuarios();
    }, []);

    const handleSwipe = async (index, tipo) => {
        const destino = usuarios[index];
        if (!destino) return;

        try {
            const response = await fetch(`${baseUrl}/swipe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mi_nombre: user.nombre, destino_nombre: destino.nombre, tipo }),
            });
            const data = await response.json();

            if (data.match) {
                Alert.alert("🎉 ¡IT'S A MATCH! 🎉", `Tú y ${destino.nombre} se han gustado mutuamente. Revisa tu bóveda.`);
            }
        } catch(e) {
            console.error("Error al registrar swipe:", e);
        }
    };

    return (
        <View style={styles.container}>
            {usuarios.length === 0 ? (
                <Text style={styles.emptyText}>No hay usuarios cerca por ahora.</Text>
            ) : (
                <Swiper
                    cards={usuarios}
                    renderCard={(card) => {
                        if (!card) return null;
                        return (
                            <View style={styles.card}>
                                <Image source={{ uri: obtenerUrlImagen(card.foto) }} style={styles.cardImage} />
                                <View style={styles.cardInfo}>
                                    <Text style={styles.cardTitle}>{card.nombre}, {calcularEdad(card.fecha_nacimiento)}</Text>
                                    <Text style={styles.cardSubtitle}>{card.ubicacion || 'Ubicación desconocida'}</Text>
                                    <Text style={styles.cardSigno}>{card.signo_zodiacal} - {card.generacion}</Text>
                                    {card.gustos ? <Text style={styles.cardGustos}>🎭 {card.gustos}</Text> : null}

                                    {card.compatibilidad_porcentaje && (
                                        <View style={styles.compatibilidadContainer}>
                                            <Text style={styles.compatibilidadTitle}>✨ {card.compatibilidad_porcentaje}% de Compatibilidad</Text>
                                            <Text style={styles.compatibilidadText}>{card.compatibilidad_texto}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        );
                    }}
                    onSwipedRight={(index) => handleSwipe(index, 'like')}
                    onSwipedLeft={(index) => handleSwipe(index, 'dislike')}
                    onSwipedAll={() => setUsuarios([])}
                    cardIndex={0}
                    backgroundColor={'transparent'}
                    stackSize={3}
                    disableBottomSwipe
                    disableTopSwipe
                    overlayLabels={{
                        left: {
                            title: 'NO',
                            style: { label: { backgroundColor: '#FF3B30', color: '#fff', fontSize: 32 }, wrapper: { flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start', marginTop: 30, marginLeft: -30 } }
                        },
                        right: {
                            title: 'LIKE',
                            style: { label: { backgroundColor: '#34C759', color: '#fff', fontSize: 32 }, wrapper: { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', marginTop: 30, marginLeft: 30 } }
                        }
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050510' },
    emptyText: { color: '#666', textAlign: 'center', marginTop: 100, fontSize: 16 },
    card: {
        flex: 1,
        borderRadius: 20,
        backgroundColor: '#11112e',
        borderColor: '#D4AF37',
        borderWidth: 1,
        justifyContent: 'flex-end',
        overflow: 'hidden',
        height: height * 0.7,
    },
    cardImage: {
        width: '100%',
        height: '100%',
        position: 'absolute'
    },
    cardInfo: {
        padding: 20,
        backgroundColor: 'rgba(5, 5, 16, 0.8)',
    },
    cardTitle: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
    cardSubtitle: { color: '#ccc', fontSize: 16, marginTop: 4 },
    cardSigno: { color: '#D4AF37', fontSize: 16, fontWeight: 'bold', marginTop: 4 },
    cardGustos: { color: '#bbb', fontSize: 14, fontStyle: 'italic', marginTop: 8 },
    compatibilidadContainer: {
        marginTop: 12,
        padding: 10,
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        borderColor: '#D4AF37',
        borderWidth: 1,
        borderRadius: 8
    },
    compatibilidadTitle: { color: '#D4AF37', fontWeight: 'bold', fontSize: 14 },
    compatibilidadText: { color: '#ddd', fontSize: 12, marginTop: 4 }
});