# evaluar.py
# Evalúa python/analizar_tallo.py con las imágenes de referencia de Natalia y lo compara contra
# su método original (docs/lesiones3.py: CLAHE + Otsu sobre L*).
#
# Uso (desde la carpeta python/):
#   .venv/Scripts/python evaluacion/evaluar.py <carpeta_imagenes> [--referencia <carpeta_mascaras>]
#
# <carpeta_imagenes>: 1.png … 50.png y "0 escala.png" … "5 escala.png" (tal como vienen del Drive).
#   Las fotos son de Natalia: NO se suben al repositorio.
# --referencia: máscaras marcadas a mano, <nombre>_tallo.png y <nombre>_lesion.png (blanco = zona).
#   Con ellas se calcula el error real (MAE, concordancia de Lin, regresión y acierto de nivel).
#
# Salidas en evaluacion/resultados/ (ignorada por git):
#   comparacion.csv  y  hoja_*.jpg (por imagen: Otsu de Natalia a la izquierda y el nuevo a la derecha)

import argparse
import csv
import re
import sys
import time
from pathlib import Path

import cv2
import numpy as np

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI.parent))
import analizar_tallo  # noqa: E402

RESULTADOS = AQUI / "resultados"
CSV_NATALIA = AQUI / "resumen_natalia.csv"

# Escala diagramática de la tesis (Figura 7.1): nivel -> % representativo
ESCALA = {0: 0.0, 1: 7.0, 2: 11.0, 3: 18.0, 4: 28.0, 5: 44.0}
# Mismos cortes que config/escala.php
CORTES = [3.5, 9.0, 14.5, 23.0, 36.0]


def nivel(porcentaje):
    return sum(porcentaje >= c for c in CORTES)


def leer(ruta):
    return cv2.imdecode(np.fromfile(str(ruta), np.uint8), cv2.IMREAD_UNCHANGED)


def metodo_natalia(ruta, delta=10):
    """Réplica fiel de docs/lesiones3.py; reproduce exactamente el % de su CSV."""
    img = leer(ruta)
    if img.ndim == 3 and img.shape[2] == 4:
        bgr, alpha = img[:, :, :3], (img[:, :, 3] > 0).astype(np.uint8) * 255
    else:
        bgr, alpha = img, np.full(img.shape[:2], 255, np.uint8)
    _, s, v = cv2.split(cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV))
    m = cv2.bitwise_and((~((s <= 35) & (v >= 200))).astype(np.uint8) * 255, alpha)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    contornos, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    alto, ancho = m.shape

    def toca_borde(c):
        x, y, w, h = cv2.boundingRect(c)
        return x <= 0 or y <= 0 or x + w >= ancho - 1 or y + h >= alto - 1

    contornos = [c for c in contornos if not toca_borde(c)] or contornos
    tallo = np.zeros_like(m)
    cv2.drawContours(tallo, [max(contornos, key=cv2.contourArea)], -1, 255, cv2.FILLED)
    l_eq = cv2.createCLAHE(2.0, (8, 8)).apply(cv2.split(cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB))[0])
    otsu, _ = cv2.threshold(l_eq[tallo > 0].reshape(-1, 1), 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    lesion = cv2.bitwise_and((l_eq < max(0, int(otsu - delta))).astype(np.uint8) * 255, tallo)
    lesion = cv2.morphologyEx(lesion, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    return round(100 * cv2.countNonZero(lesion) / cv2.countNonZero(tallo), 2), bgr, tallo, lesion


def lin_ccc(x, y):
    """Coeficiente de correlación de concordancia de Lin (el que usa la tesis)."""
    x, y = np.asarray(x, float), np.asarray(y, float)
    cov = np.mean((x - x.mean()) * (y - y.mean()))
    return 2 * cov / (x.var() + y.var() + (x.mean() - y.mean()) ** 2)


def resumen(referencia, medido):
    ref, med = np.asarray(referencia, float), np.asarray(medido, float)
    b1, b0 = np.polyfit(ref, med, 1)
    niv_ref, niv_med = np.array([nivel(v) for v in ref]), np.array([nivel(v) for v in med])
    return (f"MAE {np.mean(np.abs(med - ref)):.2f} pts | error máx {np.max(np.abs(med - ref)):.2f} | "
            f"Lin ρc {lin_ccc(ref, med):.3f} | b0 {b0:.2f} b1 {b1:.3f} | "
            f"nivel exacto {np.mean(niv_ref == niv_med) * 100:.0f} % | ±1 nivel {np.mean(abs(niv_ref - niv_med) <= 1) * 100:.0f} %")


def nombre_corto(ruta):
    m = re.fullmatch(r"(\d) escala", ruta.stem)
    return f"escala_{m.group(1)}" if m else ruta.stem


def leer_csv_natalia():
    valores = {}
    with open(CSV_NATALIA, encoding="utf-8-sig") as f:
        for fila in csv.DictReader(f):
            nombre = fila["Imagen"].strip()
            nombre = f"escala_{nombre.split()[0]}" if nombre.endswith("escala.png") else nombre
            valores[nombre] = float(fila["%_lesion_rel_fruto"])
    return valores


def porcentaje_referencia(carpeta, nombre, forma):
    tallo, lesion = carpeta / f"{nombre}_tallo.png", carpeta / f"{nombre}_lesion.png"
    if not (tallo.exists() and lesion.exists()):
        return None
    t = cv2.resize(leer(tallo)[..., 0] if leer(tallo).ndim == 3 else leer(tallo), forma[::-1], interpolation=cv2.INTER_NEAREST) > 127
    l = cv2.resize(leer(lesion)[..., 0] if leer(lesion).ndim == 3 else leer(lesion), forma[::-1], interpolation=cv2.INTER_NEAREST) > 127
    return round(100 * np.count_nonzero(l & t) / max(np.count_nonzero(t), 1), 2)


def miniatura(bgr, tallo, lesion, texto, alto=420):
    vista = bgr.copy()
    vista[lesion > 0] = (0.5 * vista[lesion > 0] + 0.5 * np.array([0, 0, 255])).astype(np.uint8)
    contornos, _ = cv2.findContours(tallo, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(vista, contornos, -1, (0, 200, 0), 2)
    vista = cv2.resize(vista, (int(vista.shape[1] * alto / vista.shape[0]), alto))
    cv2.putText(vista, texto, (4, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 3)
    cv2.putText(vista, texto, (4, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    return vista


def guardar_hojas(pares):
    for i in range(0, len(pares), 8):
        grupo = pares[i:i + 8]
        ancho = max(p.shape[1] for p in grupo)
        grupo = [cv2.copyMakeBorder(p, 0, 0, 0, ancho - p.shape[1], cv2.BORDER_CONSTANT, value=(40, 40, 40)) for p in grupo]
        filas = [np.hstack(grupo[j:j + 4]) for j in range(0, len(grupo), 4)]
        ancho = max(f.shape[1] for f in filas)
        filas = [cv2.copyMakeBorder(f, 0, 0, 0, ancho - f.shape[1], cv2.BORDER_CONSTANT, value=(40, 40, 40)) for f in filas]
        cv2.imwrite(str(RESULTADOS / f"hoja_{i // 8 + 1}.jpg"), np.vstack(filas))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("imagenes", type=Path)
    parser.add_argument("--referencia", type=Path)
    args = parser.parse_args()

    rutas = sorted((p for p in args.imagenes.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}),
                   key=lambda p: (nombre_corto(p).startswith("escala"), int(re.sub(r"\D", "", nombre_corto(p)) or 0)))
    csv_natalia = leer_csv_natalia() if CSV_NATALIA.exists() else {}
    RESULTADOS.mkdir(exist_ok=True)

    filas, pares, tiempos, rechazadas = [], [], [], []
    for ruta in rutas:
        nombre = nombre_corto(ruta)
        p_otsu, bgr_o, tallo_o, lesion_o = metodo_natalia(ruta)
        try:
            inicio = time.perf_counter()
            r = analizar_tallo.medir(str(ruta))
            tiempos.append(time.perf_counter() - inicio)
        except analizar_tallo.FotoNoValida as e:
            rechazadas.append(f"{nombre}: {e}")
            continue

        escala = ESCALA[int(nombre[-1])] if nombre.startswith("escala_") else None
        ref = porcentaje_referencia(args.referencia, nombre, r["mascara_tallo"].shape) if args.referencia else None
        filas.append({"imagen": nombre, "csv_natalia": csv_natalia.get(nombre), "otsu_natalia": p_otsu,
                      "nuevo": r["porcentaje"], "nivel_nuevo": nivel(r["porcentaje"]),
                      "escala_esperado": escala, "referencia_manual": ref})

        alto = 420
        pares.append(np.hstack([
            miniatura(bgr_o, tallo_o, lesion_o, f"{nombre} Otsu {p_otsu}%", alto),
            miniatura(r["bgr"], r["mascara_tallo"], r["mascara_lesion"], f"nuevo {r['porcentaje']}%", alto),
        ]))

    with open(RESULTADOS / "comparacion.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(filas[0]))
        w.writeheader()
        w.writerows(filas)
    guardar_hojas(pares)

    print(f"{'imagen':>9} {'CSV':>7} {'Otsu':>7} {'nuevo':>7} {'nivel':>5} {'escala':>6} {'manual':>6}")
    for f in filas:
        print(f"{f['imagen']:>9} {f['csv_natalia']!s:>7} {f['otsu_natalia']:>7} {f['nuevo']:>7} "
              f"{f['nivel_nuevo']:>5} {f['escala_esperado']!s:>6} {f['referencia_manual']!s:>6}")

    print(f"\nImágenes analizadas: {len(filas)} | rechazadas: {len(rechazadas)} | "
          f"tiempo promedio: {np.mean(tiempos):.2f} s (máx {np.max(tiempos):.2f} s)")
    for r in rechazadas:
        print("  rechazada ->", r)

    escala = [f for f in filas if f["escala_esperado"] is not None]
    if escala:
        print("\nNivel en la escala diagramática (esperado -> Otsu / nuevo):")
        for f in escala:
            n = int(f["imagen"][-1])
            print(f"  {f['imagen']}: {n} -> {nivel(f['otsu_natalia'])} / {f['nivel_nuevo']}")

    manual = [f for f in filas if f["referencia_manual"] is not None]
    if manual:
        ref = [f["referencia_manual"] for f in manual]
        print(f"\nContra la referencia manual ({len(manual)} imágenes):")
        print("  Nuevo:            ", resumen(ref, [f["nuevo"] for f in manual]))
        print("  Otsu (Natalia):   ", resumen(ref, [f["otsu_natalia"] for f in manual]))
    else:
        print("\nSin referencia manual: usa --referencia <carpeta> para medir el error real.")

    print(f"\nResultados en {RESULTADOS}")


if __name__ == "__main__":
    main()
