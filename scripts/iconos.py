"""Íconos PNG del sitio, con el dibujo de assets/img/icono.svg (cuadrado azul rey con una lista que brota, 10-11-2026).

Uso (necesita Pillow: el Python del venv de la carpeta de datos):
  C:\\Users\\crisa\\agroquimicos-datos\\venv\\Scripts\\python.exe -I scripts/iconos.py

- icono-32.png: pestaña, para los navegadores que no leen el SVG (mismo dibujo, esquinas redondeadas).
- icono-180.png (iPhone) e icono-192.png / icono-512.png (Android, manifest.webmanifest): cuadrado entero, porque el
  celular le pone sus propias esquinas; el dibujo va un poco más chico para que no lo corte el recorte redondo.
El dibujo está en una caja de 64 (igual que el SVG y el #logo-crm de index.html): barras y hoja.
"""
import os

from PIL import Image, ImageDraw

AZUL = "#154ecd"
MARFIL = "#fefefd"
AUMENTO = 8  # se dibuja más grande y se achica: bordes suaves
CARPETA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "img")

BARRAS = [(11, 23.5, 28, 5), (11, 34, 38, 5), (11, 44.5, 22, 5)]  # x, y, ancho, alto (radio = alto / 2)
# Hoja: M37.5 25 C37.6 16 44 9.6 54 9 C53.6 17.6 47.4 24.4 37.5 25 Z
HOJA = [((37.5, 25), (37.6, 16), (44, 9.6), (54, 9)), ((54, 9), (53.6, 17.6), (47.4, 24.4), (37.5, 25))]


def bezier(p0, p1, p2, p3, pasos=40):
    puntos = []
    for i in range(pasos + 1):
        t = i / pasos
        a = (1 - t) ** 3
        b = 3 * (1 - t) ** 2 * t
        c = 3 * (1 - t) * t ** 2
        d = t ** 3
        puntos.append((a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]))
    return puntos


def dibujo(d, k, dx=0.0, dy=0.0):
    """Barras y hoja (caja de 64) escaladas por k y movidas dx, dy (en píxeles ya escalados)."""
    for x, y, w, h in BARRAS:
        d.rounded_rectangle((dx + x * k, dy + y * k, dx + (x + w) * k, dy + (y + h) * k), radius=h / 2 * k, fill=MARFIL)
    contorno = []
    for curva in HOJA:
        contorno += bezier(*curva)
    d.polygon([(dx + x * k, dy + y * k) for x, y in contorno], fill=MARFIL)


def pestana():
    lado = 32 * AUMENTO
    k = lado / 64
    img = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, lado - 1, lado - 1), radius=16 * k, fill=AZUL)
    dibujo(d, k)
    return img.resize((32, 32), Image.LANCZOS)


def celular(lado):
    total = lado * AUMENTO
    img = Image.new("RGB", (total, total), AZUL)
    d = ImageDraw.Draw(img)
    escala = 0.78  # margen para el recorte del celular
    k = total / 64 * escala
    margen = (total - 64 * k) / 2
    dibujo(d, k, margen, margen)
    return img.resize((lado, lado), Image.LANCZOS)


def main():
    pestana().save(os.path.join(CARPETA, "icono-32.png"), optimize=True)
    for lado in (180, 192, 512):
        celular(lado).save(os.path.join(CARPETA, f"icono-{lado}.png"), optimize=True)
    print("Listo:", CARPETA)


if __name__ == "__main__":
    main()
