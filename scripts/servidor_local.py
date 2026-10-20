"""Servidor local para probar el sitio sin caché del navegador.

Uso:  python scripts/servidor_local.py [puerto]   (por defecto 8765)
Luego abrir http://127.0.0.1:8765
"""
import functools
import http.server
import os
import sys


class SinCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    manejador = functools.partial(SinCache, directory=raiz)
    with http.server.ThreadingHTTPServer(("127.0.0.1", puerto), manejador) as servidor:
        print(f"Sirviendo {raiz} en http://127.0.0.1:{puerto}", flush=True)
        servidor.serve_forever()


if __name__ == "__main__":
    main()
