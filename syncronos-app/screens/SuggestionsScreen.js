import React, { useEffect, useState, useContext } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Alert, Dimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
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

export default function SuggestionsScreen() {
    const [sugerencias, setSugerencias] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const { user, MI_IP } = useContext(AppContext);

    const baseUrl = MI_IP === 'localhost' ? 'http://localhost:3000' : `http://${MI_IP}:3000`;

    useEffect(() => {
        const fetchSugerencias = async () => {
            try {
                const response = await fetch(`${baseUrl}/sugerencias/${user.nombre}`);
                const data = await response.json();
                setSugerencias(data);
            } catch (e) {
                console.error("Error al obtener sugerencias", e);
            }
        };
        fetchSugerencias();
    }, []);

    const handleAction = async (tipo) => {
        const destino = sugerencias[currentIndex];
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
            console.error("Error al registrar accion:", e);
        }

        setCurrentIndex(prev => prev + 1);
        setCurrentPhotoIndex(0);
    };

    const handleTapLeft = () => {
        if (currentPhotoIndex > 0) {
            setCurrentPhotoIndex(prev => prev - 1);
        }
    };

    const handleTapRight = (fotosLength) => {
        if (currentPhotoIndex < fotosLength - 1) {
            setCurrentPhotoIndex(prev => prev + 1);
        }
    };

    if (sugerencias.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Almas de tu misma Generación</Text>
                <Text style={styles.emptyText}>Buscando sugerencias...</Text>
            </View>
        );
    }

    if (currentIndex >= sugerencias.length) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Almas de tu misma Generación</Text>
                <Text style={styles.emptyText}>No hay más sugerencias en este momento.</Text>
            </View>
        );
    }

    const card = sugerencias[currentIndex];
    const fotos = card.fotos ? JSON.parse(card.fotos) : [card.foto];

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Almas de tu misma Generación</Text>

            <View style={styles.cardContainer}>
                <View style={styles.card}>
                    <Image source={{ uri: fotos[currentPhotoIndex] }} style={styles.cardImage} />

                    <View style={styles.tapZones}>
                        <TouchableOpacity style={styles.tapZone} onPress={handleTapLeft} />
                        <TouchableOpacity style={styles.tapZone} onPress={() => handleTapRight(fotos.length)} />
                    </View>

                    {fotos.length > 1 && (
                        <View style={styles.photoIndicators}>
                            {fotos.map((_, i) => (
                                <View key={i} style={[styles.indicator, i === currentPhotoIndex && styles.indicatorActive]} />
                            ))}
                        </View>
                    )}

                    <View style={styles.cardInfo}>
                        <Text style={styles.cardTitle}>{card.nombre}, {calcularEdad(card.fecha_nacimiento)}</Text>
                        <Text style={styles.cardSigno}>Sol: {card.signo_zodiacal} • Luna: {card.luna}</Text>
                        <Text style={styles.cardText}>Asc: {card.ascendente} • Venus: {card.venus} • Marte: {card.marte}</Text>
                        <Text style={styles.cardGeneracion}>{card.generacion} - A {card.distancia || '?'} km</Text>
                    </View>
                </View>
            </View>

            <View style={styles.actionButtons}>
                <TouchableOpacity style={[styles.actionButton, styles.dislikeButton]} onPress={() => handleAction('dislike')} testID="dislike-button">
                    <Ionicons name="close" size={40} color="#FF3B30" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.likeButton]} onPress={() => handleAction('like')} testID="like-button">
                    <Ionicons name="heart" size={40} color="#34C759" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050510', paddingTop: 20 },
    title: { color: '#D4AF37', fontSize: 18, fontWeight: 'bold', marginBottom: 0, textAlign: 'center' },
    emptyText: { color: '#666', textAlign: 'center', marginTop: 100, fontSize: 16 },
    cardContainer: {
        flex: 1,
        padding: 10,
        paddingTop: 10,
    },
    card: {
        flex: 1,
        borderRadius: 20,
        backgroundColor: '#11112e',
        borderColor: '#D4AF37',
        borderWidth: 1,
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    cardImage: {
        width: '100%',
        height: '100%',
        position: 'absolute'
    },
    tapZones: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        zIndex: 1,
    },
    tapZone: {
        flex: 1,
    },
    photoIndicators: {
        position: 'absolute',
        top: 10,
        left: 10,
        right: 10,
        flexDirection: 'row',
        zIndex: 2,
    },
    indicator: {
        flex: 1,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.4)',
        marginHorizontal: 2,
        borderRadius: 2,
    },
    indicatorActive: {
        backgroundColor: '#fff',
    },
    cardInfo: {
        padding: 20,
        backgroundColor: 'rgba(5, 5, 16, 0.8)',
        zIndex: 2,
    },
    cardTitle: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
    cardSigno: { color: '#D4AF37', fontSize: 16, fontWeight: 'bold', marginTop: 4 },
    cardText: { color: '#ccc', fontSize: 14, marginTop: 4 },
    cardGeneracion: { color: '#999', fontSize: 12, marginTop: 4 },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        paddingVertical: 20,
        paddingBottom: 30,
    },
    actionButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#11112e',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
        elevation: 5,
        borderWidth: 1,
    },
    dislikeButton: {
        borderColor: '#FF3B30',
    },
    likeButton: {
        borderColor: '#34C759',
    },
});