# analizar_tallo.py
# Cuantificación de daño (lesiones) en un tallo de caña.
#
# Uso:
#   python analizar_tallo.py <ruta_imagen>
#hola
# Imprime un JSON en stdout que lee Laravel (app/Services/AnalizadorTallo.php):
#   - Éxito (código 0):
#       {"porcentaje": 12.34, "area_tallo_px": ..., "area_lesion_px": ..., "imagen_resaltada": "data:image/jpeg;base64,..."}
#   - Foto no válida (código 2), el mensaje se muestra al usuario:
#       {"error": "No se detectó el tallo, toma la foto de nuevo."}
#   - Cualquier otro código es un error interno (el detalle va a stderr).
#
# Basado en docs/lesiones3.py (script original del equipo):
#   1) Segmenta el tallo quitando el fondo blanco (S bajo y V alto) y respetando
#      la transparencia de PNG; se queda con el contorno principal.
#   2) Toma el color mediano de la muestra como "tejido sano" y marca como lesión lo que se
#      aleja de ese color siendo más oscuro o más rojizo (manchas café o rojizas, necrosis).
#   3) Reporta % de lesión relativo al área de la muestra y una imagen con las lesiones en rojo.
#
# Diferencia con lesiones3.py: ahí la lesión era "lo más oscuro según Otsu". Otsu siempre
# parte la muestra en dos grupos, así que una muestra sana salía con ~30-40 % de "daño".
# Supuesto: el tejido sano ocupa más de la mitad de la muestra (si no, la mediana es el daño).

import base64
import json
import sys

import cv2
import numpy as np

# ------------------ CONFIGURACIÓN ------------------
# Tamaño máximo (lado mayor) al que se reduce la imagen para analizar rápido
LADO_MAXIMO = 1280

# Fondo blanco ≈ saturación baja y brillo alto (lesiones3 usaba V_BG = 200;
# se baja para fotos de celular con luz de interior, donde el papel se ve gris)
S_BG = 35
V_BG = 160

# Distancia de color (en LAB) al tejido sano a partir de la cual hay lesión.
# Subirla = marca menos; bajarla = marca más.
DIFERENCIA_LESION = 25
# Peso del brillo (L) en esa distancia: < 1 para que las sombras suaves no cuenten
PESO_BRILLO = 0.5
# Una lesión además debe ser más oscura que el tejido sano, o más rojiza por al menos esto
# (excluye reflejos y la cera del tallo, que son más claros pero del mismo tono)
ROJIZO_MIN = 8

# Ignorar manchas que tocan la orilla de la muestra: suelen ser fondo (mesa, sombra) que
# quedó dentro del recorte. Desactivarlo si interesa medir daño en el margen del tallo.
IGNORAR_ORILLA = True

# Limpieza morfológica
K_TALLO = (7, 7)
K_LESION = (3, 3)

# Validación de la foto
BRILLO_MINIMO = 50  # promedio de gris; menos = foto muy oscura
NITIDEZ_MINIMA = 20  # varianza del Laplaciano; menos = foto desenfocada
AREA_TALLO_MIN = 0.03  # fracción de la imagen; menos = no hay tallo
AREA_TALLO_MAX = 0.97  # fracción de la imagen; más = no se separó del fondo
# ---------------------------------------------------


class FotoNoValida(Exception):
    """Problema con la foto que el usuario puede corregir tomándola de nuevo."""


def leer_imagen(ruta: str):
    """Lee la imagen. Devuelve (bgr, mascara_alpha) donde alpha 255 = válido, 0 = transparente.

    Se lee con np.fromfile para soportar rutas con acentos en Windows.
    """
    datos = np.fromfile(ruta, dtype=np.uint8)

    img = cv2.imdecode(datos, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise FotoNoValida("No se pudo leer la imagen. Usa una foto JPG, PNG o WEBP.")

    if img.ndim == 3 and img.shape[2] == 4:
        bgr = np.ascontiguousarray(img[:, :, :3])
        mascara_alpha = (img[:, :, 3] > 0).astype(np.uint8) * 255
        # Lo transparente se pinta de blanco para que no cuente como foto oscura
        bgr[mascara_alpha == 0] = 255
        return bgr, mascara_alpha

    # IMREAD_COLOR aplica la orientación EXIF de las fotos de celular
    bgr = cv2.imdecode(datos, cv2.IMREAD_COLOR)
    return bgr, np.full(bgr.shape[:2], 255, dtype=np.uint8)


def reducir(bgr, mascara_alpha):
    alto, ancho = bgr.shape[:2]
    escala = LADO_MAXIMO / max(alto, ancho)
    if escala >= 1:
        return bgr, mascara_alpha

    bgr = cv2.resize(bgr, None, fx=escala, fy=escala, interpolation=cv2.INTER_AREA)
    mascara_alpha = cv2.resize(mascara_alpha, (bgr.shape[1], bgr.shape[0]), interpolation=cv2.INTER_NEAREST)
    return bgr, mascara_alpha


def validar_calidad(bgr):
    gris = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    if gris.mean() < BRILLO_MINIMO:
        raise FotoNoValida("La foto está muy oscura. Tómala de nuevo con mejor iluminación.")
    if cv2.Laplacian(gris, cv2.CV_64F).var() < NITIDEZ_MINIMA:
        raise FotoNoValida("La foto está desenfocada. Mantén el celular quieto y tómala de nuevo.")


def segmentar_tallo(hsv, mascara_alpha):
    """Máscara del tallo (255) y su contorno principal."""
    _, s, v = cv2.split(hsv)

    fondo_blanco = (s <= S_BG) & (v >= V_BG)
    mascara = (~fondo_blanco).astype(np.uint8) * 255
    # Excluir transparencia (PNG) para que el "negro" no cuente como tallo
    mascara = cv2.bitwise_and(mascara, mascara_alpha)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, K_TALLO)
    mascara = cv2.morphologyEx(mascara, cv2.MORPH_OPEN, kernel, iterations=1)
    mascara = cv2.morphologyEx(mascara, cv2.MORPH_CLOSE, kernel, iterations=1)

    contornos, _ = cv2.findContours(mascara, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contornos:
        raise FotoNoValida("No se detectó el tallo, toma la foto de nuevo.")

    # Como en lesiones3: preferir contornos que no tocan el borde (sombras, orillas de la mesa).
    # Pero un tallo de caña es largo y casi siempre toca el borde, así que solo se descartan
    # si queda un contorno interior de tamaño razonable.
    alto, ancho = mascara.shape[:2]
    interiores = [c for c in contornos if not toca_borde(c, ancho, alto)]
    if interiores and cv2.contourArea(max(interiores, key=cv2.contourArea)) >= AREA_TALLO_MIN * alto * ancho:
        contornos = interiores

    contorno = max(contornos, key=cv2.contourArea)
    mascara_tallo = np.zeros_like(mascara)
    cv2.drawContours(mascara_tallo, [contorno], -1, 255, thickness=cv2.FILLED)

    fraccion = cv2.countNonZero(mascara_tallo) / (alto * ancho)
    if fraccion < AREA_TALLO_MIN:
        raise FotoNoValida("No se detectó el tallo, toma la foto de nuevo.")
    if fraccion > AREA_TALLO_MAX:
        raise FotoNoValida("No se pudo separar el tallo del fondo. Colócalo sobre un fondo blanco liso.")

    return mascara_tallo, contorno


def toca_borde(contorno, ancho, alto):
    x, y, w, h = cv2.boundingRect(contorno)
    return x <= 0 or y <= 0 or x + w >= ancho - 1 or y + h >= alto - 1


def segmentar_lesiones(bgr, mascara_tallo):
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    dentro = mascara_tallo > 0

    # Color del tejido sano = mediana de la muestra
    sano = np.median(lab[dentro], axis=0)
    dif = lab - sano

    distancia = np.sqrt((PESO_BRILLO * dif[:, :, 0]) ** 2 + dif[:, :, 1] ** 2 + dif[:, :, 2] ** 2)
    mas_oscuro_o_rojizo = (dif[:, :, 0] < 0) | (dif[:, :, 1] > ROJIZO_MIN)

    lesion = ((distancia > DIFERENCIA_LESION) & mas_oscuro_o_rojizo & dentro).astype(np.uint8) * 255

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, K_LESION)
    lesion = cv2.morphologyEx(lesion, cv2.MORPH_OPEN, kernel, iterations=1)

    if IGNORAR_ORILLA:
        lesion = quitar_manchas_en_orilla(lesion, mascara_tallo)

    return lesion


def quitar_manchas_en_orilla(lesion, mascara_tallo):
    """Quita las manchas conectadas con el contorno de la muestra (fondo dentro del recorte)."""
    orilla = mascara_tallo - cv2.erode(mascara_tallo, np.ones((5, 5), np.uint8))

    _, etiquetas = cv2.connectedComponents(lesion)
    en_orilla = np.unique(etiquetas[(orilla > 0) & (lesion > 0)])
    en_orilla = en_orilla[en_orilla > 0]

    lesion[np.isin(etiquetas, en_orilla)] = 0
    return lesion


def imagen_resaltada(bgr, mascara_lesion, contorno):
    overlay = bgr.copy()

    # Rojo donde hay lesión
    idx = mascara_lesion > 0
    overlay[idx] = (0.5 * overlay[idx] + 0.5 * np.array([0, 0, 255])).astype(np.uint8)

    # Contorno del tallo (verde)
    cv2.drawContours(overlay, [contorno], -1, (0, 255, 0), thickness=2)

    _, jpg = cv2.imencode(".jpg", overlay, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return "data:image/jpeg;base64," + base64.b64encode(jpg.tobytes()).decode()


def analizar(ruta: str) -> dict:
    bgr, mascara_alpha = reducir(*leer_imagen(ruta))
    validar_calidad(bgr)

    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    mascara_tallo, contorno = segmentar_tallo(hsv, mascara_alpha)
    mascara_lesion = segmentar_lesiones(bgr, mascara_tallo)

    area_tallo = int(cv2.countNonZero(mascara_tallo))
    area_lesion = int(cv2.countNonZero(mascara_lesion))

    return {
        "porcentaje": round(100 * area_lesion / area_tallo, 2),
        "area_tallo_px": area_tallo,
        "area_lesion_px": area_lesion,
        "imagen_resaltada": imagen_resaltada(bgr, mascara_lesion, contorno),
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
