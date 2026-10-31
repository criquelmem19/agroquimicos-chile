"""Íconos PNG del sitio, con el dibujo de assets/img/icono.svg (logo «CRM» negro con un punto verde).

Uso (necesita Pillow: el Python del venv de la carpeta de datos):
  C:\\Users\\crisa\\agroquimicos-datos\\venv\\Scripts\\python.exe -I scripts/iconos.py

- icono-32.png: pestaña, para los navegadores que no leen el SVG (mismo dibujo, fondo transparente).
- icono-180.png (iPhone) e icono-192.png / icono-512.png (Android, manifest.webmanifest): cuadrado negro
  entero, porque el celular le pone sus propias esquinas.
Letra: Arial negrita, la misma con que el navegador dibuja el SVG (Rubik no está instalada en Windows).
"""
import os

from PIL import Image, ImageDraw, ImageFont

NEGRO = "#141414"
VERDE = "#63d17b"
BLANCO = "#ffffff"
FUENTE = r"C:\Windows\Fonts\arialbd.ttf"
AUMENTO = 8  # se dibuja más grande y se achica: bordes suaves
CARPETA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "img")


def punto(d, cx, cy, radio, borde):
    """Punto verde con borde blanco (el borde va mitad afuera y mitad adentro, como el stroke del SVG)."""
    afuera, adentro = radio + borde / 2, radio - borde / 2
    d.ellipse((cx - afuera, cy - afuera, cx + afuera, cy + afuera), fill=BLANCO)
    d.ellipse((cx - adentro, cy - adentro, cx + adentro, cy + adentro), fill=VERDE)


def pestana():
    """Copia de icono.svg (caja de 32): rect 1,3,30×27 rx 8; «CRM» 11,5 px en 15,6/21,6; punto en 27,2/4,6 r 4."""
    k = AUMENTO * 1.0
    img = Image.new("RGBA", (int(32 * k), int(32 * k)), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((1 * k, 3 * k, 31 * k, 30 * k), radius=8 * k, fill=NEGRO)
    d.text((15.6 * k, 21.6 * k), "CRM", font=ImageFont.truetype(FUENTE, round(11.5 * k)), fill=BLANCO, anchor="ms")
    punto(d, 27.2 * k, 4.6 * k, 4 * k, 1.6 * k)
    return img.resize((32, 32), Image.LANCZOS)


def celular(lado):
    k = lado * AUMENTO
    img = Image.new("RGB", (k, k), NEGRO)
    d = ImageDraw.Draw(img)
    d.text((k * 0.5, k * 0.62), "CRM", font=ImageFont.truetype(FUENTE, round(k * 0.28)), fill=BLANCO, anchor="ms")
    punto(d, k * 0.79, k * 0.23, k * 0.07, k * 0.03)
    return img.resize((lado, lado), Image.LANCZOS)


def main():
    pestana().save(os.path.join(CARPETA, "icono-32.png"), optimize=True)
    for lado in (180, 192, 512):
        celular(lado).save(os.path.join(CARPETA, f"icono-{lado}.png"), optimize=True)
    print("Listo:", CARPETA)


if __name__ == "__main__":
    main()
