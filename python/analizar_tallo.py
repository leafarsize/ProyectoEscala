# analizar_tallo.py
# Cuantificación de daño (lesiones) en el corte longitudinal de un entrenudo de caña.
#
# Uso:
#   python analizar_tallo.py <ruta_imagen>
#
# Imprime un JSON en stdout que lee Laravel (app/Services/AnalizadorTallo.php):
#   - Éxito (código 0):
#       {"porcentaje": 12.34, "area_tallo_px": ..., "area_lesion_px": ..., "imagen_resaltada": "data:image/jpeg;base64,..."}
#   - Foto no válida (código 2), el mensaje se muestra al usuario:
#       {"error": "No se detectó el tallo, toma la foto de nuevo."}
#   - Cualquier otro código es un error interno (el detalle va a stderr).
#
# Criterio (tesis de Natalia Tapia, ITTepic 2026): los entrenudos se cortan longitudinalmente
# y se fotografían a 15 cm; las lesiones necróticas y los halos rojos/marrones son tejido
# enfermo, y la severidad es el % de área afectada.
#
# Método (solo OpenCV):
#   1) Segmenta el tallo: con la transparencia del PNG si la tiene (así vienen las imágenes
#      de referencia de Natalia) o, si no, separándolo del color del fondo, que se estima en
#      la orilla de la foto (sirve para fondo blanco, negro o de cualquier color liso).
#   2) Toma como referencia el tejido sano de ESA foto (percentil alto de L* y mediana de a*)
#      y marca como lesión lo que es claramente más oscuro (necrosis) o más rojizo (halo).
#      Al ser relativo, no depende de la iluminación de la foto.
#
# Por qué no Otsu (docs/lesiones3.py): Otsu siempre parte la muestra en dos grupos, así que un
# tallo sano o con una lesión diminuta sale con mucho "daño" (la imagen 0 de la escala da
# 14.86 % y tallos casi sanos llegan a 85 %). Comparación completa: python/evaluacion/.

import base64
import json
import sys

import cv2
import numpy as np

# ------------------ CONFIGURACIÓN ------------------
# Tamaño máximo (lado mayor) al que se reduce la imagen para analizar rápido
LADO_MAXIMO = 1280

# Distancia de color (LAB) al fondo a partir de la cual un píxel es tallo
DISTANCIA_FONDO = 18
# Ancho de la orilla de la foto (fracción del lado menor) usada para estimar el color del fondo
ORILLA_FONDO = 0.03

# Referencia de tejido sano: percentil de L* dentro del tallo (la mayor parte del corte está sana)
PERCENTIL_SANO = 85
# Lesión = L* al menos esto por debajo del tejido sano (necrosis, manchas oscuras)
OSCURO_MIN = 20
# ... o a* al menos esto por encima del tejido sano (halo rojo / marrón)
ROJIZO_MIN = 8
# Manchas más pequeñas que esto (px, ya reducida la imagen) se consideran ruido
AREA_LESION_MIN = 40

# Píxeles de la orilla del tallo que no se analizan (borde suavizado o sombra del recorte)
MARGEN_TALLO = 2

# Limpieza morfológica
K_TALLO = (15, 15)
K_LESION = (3, 3)

# Validación de la foto (se mide solo dentro del tallo)
BRILLO_MINIMO = 50  # promedio de gris dentro del tallo; menos = foto muy oscura
# Varianza del Laplaciano en la franja del contorno del tallo; menos = foto desenfocada.
# Se mide en el borde porque el tejido sano es liso y ahí no se distingue el desenfoque.
# Con las 56 imágenes de Natalia: nítidas 406 – 13 032; desenfocadas (Gauss σ=3) 1.9 – 8.4.
NITIDEZ_MINIMA = 30
FRANJA_NITIDEZ = 9  # px de la franja alrededor del contorno
AREA_TALLO_MIN = 0.03  # fracción de la imagen; menos = no hay tallo
AREA_TALLO_MAX = 0.97  # fracción de la imagen; más = no se separó del fondo
# ---------------------------------------------------


class FotoNoValida(Exception):
    """Problema con la foto que el usuario puede corregir tomándola de nuevo."""


def leer_imagen(ruta: str):
    """Lee la imagen. Devuelve (bgr, mascara_alpha) donde alpha 255 = visible, 0 = transparente.

    mascara_alpha es None si la imagen no tiene transparencia. Se lee con np.fromfile para
    soportar rutas con acentos en Windows.
    """
    datos = np.fromfile(ruta, dtype=np.uint8)

    img = cv2.imdecode(datos, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise FotoNoValida("No se pudo leer la imagen. Usa una foto JPG, PNG o WEBP.")

    if img.ndim == 3 and img.shape[2] == 4:
        if img.dtype != np.uint8:
            img = cv2.convertScaleAbs(img, alpha=255.0 / np.iinfo(img.dtype).max)
        alpha = img[:, :, 3]
        if alpha.min() < 255:
            return np.ascontiguousarray(img[:, :, :3]), (alpha > 127).astype(np.uint8) * 255

    # IMREAD_COLOR aplica la orientación EXIF de las fotos de celular
    return cv2.imdecode(datos, cv2.IMREAD_COLOR), None


def reducir(bgr, mascara_alpha):
    alto, ancho = bgr.shape[:2]
    escala = LADO_MAXIMO / max(alto, ancho)
    if escala >= 1:
        return bgr, mascara_alpha

    bgr = cv2.resize(bgr, None, fx=escala, fy=escala, interpolation=cv2.INTER_AREA)
    if mascara_alpha is not None:
        mascara_alpha = cv2.resize(mascara_alpha, (bgr.shape[1], bgr.shape[0]), interpolation=cv2.INTER_NEAREST)
    return bgr, mascara_alpha


def lab_real(bgr):
    """LAB en unidades reales: L* 0-100, a* y b* centrados en 0."""
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    lab[:, :, 0] *= 100.0 / 255.0
    lab[:, :, 1:] -= 128.0
    return lab


def mascara_sin_fondo(lab):
    """Lo que difiere del color del fondo, estimado con la mediana de la orilla de la foto."""
    alto, ancho = lab.shape[:2]
    b = max(3, int(ORILLA_FONDO * min(alto, ancho)))
    orilla = np.concatenate([
        lab[:b].reshape(-1, 3), lab[-b:].reshape(-1, 3),
        lab[:, :b].reshape(-1, 3), lab[:, -b:].reshape(-1, 3),
    ])
    distancia = np.linalg.norm(lab - np.median(orilla, axis=0), axis=2)
    return (distancia > DISTANCIA_FONDO).astype(np.uint8) * 255


def segmentar_tallo(lab, mascara_alpha):
    """Máscara del tallo (255) y su contorno principal."""
    mascara = mascara_alpha if mascara_alpha is not None else mascara_sin_fondo(lab)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, K_TALLO)
    mascara = cv2.morphologyEx(mascara, cv2.MORPH_CLOSE, kernel)
    mascara = cv2.morphologyEx(mascara, cv2.MORPH_OPEN, kernel)

    contornos, _ = cv2.findContours(mascara, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contornos:
        raise FotoNoValida("No se detectó el tallo, toma la foto de nuevo.")

    contorno = max(contornos, key=cv2.contourArea)
    mascara_tallo = np.zeros(mascara.shape, np.uint8)
    # Relleno: los huecos internos (p. ej. la perforación de la inoculación) cuentan como tallo
    cv2.drawContours(mascara_tallo, [contorno], -1, 255, thickness=cv2.FILLED)

    alto, ancho = mascara.shape
    fraccion = cv2.countNonZero(mascara_tallo) / (alto * ancho)
    if fraccion < AREA_TALLO_MIN:
        raise FotoNoValida("No se detectó el tallo, toma la foto de nuevo.")
    if fraccion > AREA_TALLO_MAX:
        raise FotoNoValida("No se pudo separar el tallo del fondo. Colócalo sobre un fondo liso.")

    if MARGEN_TALLO > 0:
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * MARGEN_TALLO + 1, 2 * MARGEN_TALLO + 1))
        mascara_tallo = cv2.erode(mascara_tallo, k)

    return mascara_tallo, contorno


def validar_calidad(bgr, mascara_tallo):
    """Brillo dentro del tallo y nitidez en su contorno (el fondo liso no cuenta como desenfoque)."""
    gris = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    if gris[mascara_tallo > 0].mean() < BRILLO_MINIMO:
        raise FotoNoValida("La foto está muy oscura. Tómala de nuevo con mejor iluminación.")

    k = np.ones((FRANJA_NITIDEZ, FRANJA_NITIDEZ), np.uint8)
    franja = (cv2.dilate(mascara_tallo, k) > 0) & ~(cv2.erode(mascara_tallo, k) > 0)
    if cv2.Laplacian(gris, cv2.CV_64F)[franja].var() < NITIDEZ_MINIMA:
        raise FotoNoValida("La foto está desenfocada. Mantén el celular quieto y tómala de nuevo.")


def segmentar_lesiones(lab, mascara_tallo):
    dentro = mascara_tallo > 0
    l_sano = np.percentile(lab[:, :, 0][dentro], PERCENTIL_SANO)
    a_sano = np.median(lab[:, :, 1][dentro])

    oscuro = lab[:, :, 0] <= l_sano - OSCURO_MIN
    rojizo = lab[:, :, 1] >= a_sano + ROJIZO_MIN
    lesion = ((oscuro | rojizo) & dentro).astype(np.uint8) * 255

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, K_LESION)
    lesion = cv2.morphologyEx(lesion, cv2.MORPH_OPEN, kernel)
    return quitar_manchas_pequenas(lesion)


def quitar_manchas_pequenas(lesion):
    n, etiquetas, stats, _ = cv2.connectedComponentsWithStats(lesion, connectivity=8)
    conservar = np.zeros(n, np.uint8)
    conservar[1:][stats[1:, cv2.CC_STAT_AREA] >= AREA_LESION_MIN] = 255
    return conservar[etiquetas]


def imagen_resaltada(bgr, mascara_lesion, contorno):
    overlay = bgr.copy()

    # Rojo donde hay lesión
    idx = mascara_lesion > 0
    overlay[idx] = (0.5 * overlay[idx] + 0.5 * np.array([0, 0, 255])).astype(np.uint8)

    # Contorno del tallo (verde)
    cv2.drawContours(overlay, [contorno], -1, (0, 255, 0), thickness=2)

    _, jpg = cv2.imencode(".jpg", overlay, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return "data:image/jpeg;base64," + base64.b64encode(jpg.tobytes()).decode()


def medir(ruta: str) -> dict:
    """Análisis completo; devuelve también las máscaras (las usa python/evaluacion)."""
    bgr, mascara_alpha = reducir(*leer_imagen(ruta))
    if mascara_alpha is not None:
        # Lo transparente se pinta de blanco para que no se vea negro en la imagen resaltada
        bgr = bgr.copy()
        bgr[mascara_alpha == 0] = 255

    lab = lab_real(bgr)
    mascara_tallo, contorno = segmentar_tallo(lab, mascara_alpha)
    validar_calidad(bgr, mascara_tallo)
    mascara_lesion = segmentar_lesiones(lab, mascara_tallo)

    area_tallo = int(cv2.countNonZero(mascara_tallo))
    area_lesion = int(cv2.countNonZero(mascara_lesion))

    return {
        "porcentaje": round(100 * area_lesion / area_tallo, 2),
        "area_tallo_px": area_tallo,
        "area_lesion_px": area_lesion,
        "bgr": bgr,
        "mascara_tallo": mascara_tallo,
        "mascara_lesion": mascara_lesion,
        "contorno": contorno,
    }


def analizar(ruta: str) -> dict:
    r = medir(ruta)
    return {
        "porcentaje": r["porcentaje"],
        "area_tallo_px": r["area_tallo_px"],
        "area_lesion_px": r["area_lesion_px"],
        "imagen_resaltada": imagen_resaltada(r["bgr"], r["mascara_lesion"], r["contorno"]),
    }


def main() -> int:
    if len(sys.argv) != 2:
        print("Uso: python analizar_tallo.py <ruta_imagen>", file=sys.stderr)
        return 1

    try:
        resultado = analizar(sys.argv[1])
    except FotoNoValida as e:
        # ensure_ascii (por defecto) escapa los acentos; así no dependen de la codificación de la consola
        print(json.dumps({"error": str(e)}))
        return 2

    print(json.dumps(resultado))
    return 0


if __name__ == "__main__":
    sys.exit(main())
