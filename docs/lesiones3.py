# analizar_lesion_fruto.py
# Cuantificación de lesión (manchas oscuras) en rebanadas de fruto
# 1) Segmenta el fruto (elimina fondo claro + respeta alpha si PNG)
# 2) Dentro del fruto, segmenta zonas oscuras como lesión (Otsu solo en fruto)
# 3) Reporta %lesión relativo al área del fruto

import os
import cv2
import numpy as np
import pandas as pd

# ------------------ CONFIGURACIÓN ------------------
INPUT_DIR = "imagenes"            # carpeta con tus imágenes
OUTPUT_DIR = "resultados_lesion"  # carpeta de salida

# Ajuste fino para la severidad: resta (0–30) endurece la máscara de lesión
DELTA_LESION = 10

# Filtros para eliminar fondo blanco: “blanco ≈ V alto y S bajo”
# píxeles “muy blancos” (posible fondo) si S <= S_BG y V >= V_BG
S_BG = 35
V_BG = 200

# Limpieza morfológica
K_FRUTO = (7, 7)
K_LESION = (5, 5)

# Si tu objeto (fruto) nunca toca bordes, filtrar contornos pegados al borde ayuda
FILTRAR_CONTORNOS_BORDE = True
# ---------------------------------------------------

os.makedirs(OUTPUT_DIR, exist_ok=True)

if not os.path.isdir(INPUT_DIR):
    raise FileNotFoundError(f"No existe la carpeta: {os.path.abspath(INPUT_DIR)}")

exts = (".jpg", ".jpeg", ".png", ".tif", ".tiff")
files = [f for f in os.listdir(INPUT_DIR) if f.lower().endswith(exts)]
if not files:
    raise FileNotFoundError(f"No hay imágenes en: {os.path.abspath(INPUT_DIR)}")

res = []

def leer_con_alpha(path: str):
    """Lee imagen. Si tiene alpha, devuelve bgr y mask_alpha (255 válido, 0 transparente)."""
    img = cv2.imread(path, cv2.IMREAD_UNCHANGED)
    if img is None:
        return None, None

    if img.ndim == 3 and img.shape[2] == 4:
        bgr = img[:, :, :3]
        alpha = img[:, :, 3]
        mask_alpha = (alpha > 0).astype(np.uint8) * 255
        return bgr, mask_alpha

    # sin alpha
    bgr = img if img.ndim == 3 else cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    mask_alpha = np.ones(bgr.shape[:2], dtype=np.uint8) * 255
    return bgr, mask_alpha

for fname in files:
    try:
        path = os.path.join(INPUT_DIR, fname)

        # --- 0) Lectura robusta (respeta alpha en PNG) ---
        bgr, mask_alpha = leer_con_alpha(path)
        if bgr is None:
            raise FileNotFoundError(f"No pude leer la imagen: {path}")

        # --- 1) Aislar fruto (quitar fondo) ---
        hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
        h, s, v = cv2.split(hsv)

        # Fondo blanco ~ s bajo y v alto -> lo descartamos
        fondo_blanco = (s <= S_BG) & (v >= V_BG)
        mask_no_fondo = (~fondo_blanco).astype(np.uint8) * 255

        # IMPORTANTÍSIMO: excluir transparencia (PNG) para que el "negro" no cuente
        mask_no_fondo = cv2.bitwise_and(mask_no_fondo, mask_alpha)

        # Limpieza morfológica
        kernel_fruto = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, K_FRUTO)
        mask_nf = cv2.morphologyEx(mask_no_fondo, cv2.MORPH_OPEN, kernel_fruto, iterations=1)

        # Contornos
        contours, _ = cv2.findContours(mask_nf, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            raise RuntimeError("No se detectó fruto (contornos vacíos). Ajusta S_BG/V_BG o revisa alpha.")

        # Opcional: filtrar contornos pegados al borde
        if FILTRAR_CONTORNOS_BORDE:
            H, W = mask_nf.shape[:2]
            good = []
            for c in contours:
                x, y, w, h0 = cv2.boundingRect(c)
                touches = (x <= 0) or (y <= 0) or (x + w >= W - 1) or (y + h0 >= H - 1)
                if not touches:
                    good.append(c)
            if good:
                contours = good

        # Contorno mayor área
        cnt = max(contours, key=cv2.contourArea)

        # Máscara FINAL del fruto (solo el contorno principal relleno)
        mask_fruto = np.zeros_like(mask_nf)
        cv2.drawContours(mask_fruto, [cnt], -1, 255, thickness=cv2.FILLED)

        # --- 2) Lesión: zonas oscuras dentro del fruto ---
        lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
        L, A, B = cv2.split(lab)

        # Normalizamos iluminación con CLAHE sobre L
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        L_eq = clahe.apply(L)

        # Otsu SOLO con pixeles del fruto (sin meter ceros del fondo)
        L_fruto = L_eq[mask_fruto > 0]
        if L_fruto.size < 50:
            raise RuntimeError("Muy pocos píxeles de fruto; revisa segmentación del fondo.")

        # cv2.threshold requiere array 2D/3D; lo reshapeamos
        L_fruto_2d = L_fruto.reshape(-1, 1)
        otsu_val, _ = cv2.threshold(L_fruto_2d, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        lesion_thresh = max(0, int(otsu_val - DELTA_LESION))
        lesion_mask = (L_eq < lesion_thresh).astype(np.uint8) * 255
        lesion_mask = cv2.bitwise_and(lesion_mask, mask_fruto)  # solo dentro del fruto

        # Limpieza ligera (quita ruido)
        kernel_lesion = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, K_LESION)
        lesion_mask = cv2.morphologyEx(lesion_mask, cv2.MORPH_OPEN, kernel_lesion, iterations=1)

        # --- 3) Métricas ---
        area_fruto = int((mask_fruto > 0).sum())
        area_lesion = int((lesion_mask > 0).sum())
        pct_lesion = 100 * area_lesion / area_fruto if area_fruto > 0 else 0.0

        # --- 4) Guardados (overlays y máscaras) ---
        overlay = bgr.copy()

        # rojo donde hay lesión
        rojo = np.array([0, 0, 255], dtype=np.uint8)
        idx = lesion_mask > 0
        overlay[idx] = (0.5 * overlay[idx] + 0.5 * rojo).astype(np.uint8)

        # contorno del fruto (verde)
        cv2.drawContours(overlay, [cnt], -1, (0, 255, 0), thickness=2)

        cv2.imwrite(os.path.join(OUTPUT_DIR, f"mask_fruto_{fname}"), mask_fruto)
        cv2.imwrite(os.path.join(OUTPUT_DIR, f"mask_lesion_{fname}"), lesion_mask)
        cv2.imwrite(os.path.join(OUTPUT_DIR, f"overlay_{fname}"), overlay)

        res.append({
            "archivo": fname,
            "pixeles_fruto": area_fruto,
            "pixeles_lesion": area_lesion,
            "%_lesion_rel_fruto": pct_lesion,
            "umbral_otsu_L": int(otsu_val),
            "delta_usado": DELTA_LESION
        })

    except Exception as e:
        print(f"[Aviso] {fname}: {e}")

# CSV
df = pd.DataFrame(res)
csv_path = os.path.join(OUTPUT_DIR, "resumen_lesion.csv")
df.to_csv(csv_path, index=False)

print(f"✅ Listo. Resultados en: {os.path.abspath(OUTPUT_DIR)}")
print(f"📄 CSV: {csv_path}")
print("ℹ️ Si aún se cuelan fondos, sube V_BG o baja S_BG; si marca demasiado interior, sube DELTA_LESION.")
