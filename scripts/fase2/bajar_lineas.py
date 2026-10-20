"""Baja las líneas de uso y tablas de apoyo (lectura pública) para cruzarlas con el texto de las etiquetas.

Uso:  python -I scripts/fase2/bajar_lineas.py <salida.json>
"""
import json
import sys
import urllib.request

URL = "https://cejkhfugaobfqnjpkgpl.supabase.co"
LLAVE = "sb_publishable_dzR4zTF-RcJGyw6Fq1LCRA_lAf1tpF8"


def todas(ruta):
    filas = []
    desde = 0
    while True:
        pedido = urllib.request.Request(f"{URL}/rest/v1/{ruta}", headers={"apikey": LLAVE, "Range": f"{desde}-{desde + 999}"})
        with urllib.request.urlopen(pedido, timeout=120) as r:
            parte = json.load(r)
        filas.extend(parte)
        if len(parte) < 1000:
            return filas
        desde += 1000


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    salida = sys.argv[1]
    campos = ",".join([
        "id", "product_id", "crop_id", "source_document_id", "source_page", "source_table_row", "source_use_code",
        "source_text", "dose_raw", "observations", "application_timing", "application_method",
        "withholding_period_days", "withholding_not_applicable", "withholding_period_raw",
        "water_volume_min_l_ha", "water_volume_max_l_ha", "interval_min_days", "interval_max_days",
        "maximum_applications_per_season", "review_status", "confidence_score",
    ])
    datos = {
        "lineas": todas(f"product_uses?select={campos},use_targets(target_id)&order=id"),
        "cultivos": todas("crops?select=id,name,aliases&order=id"),
        "productos": todas("products?select=id,commercial_name,registration_number&order=id"),
        "documentos": todas("documents?select=id,product_id,document_type,filename,storage_path,page_count&order=id"),
        "objetivos": todas("targets?select=id,common_name,scientific_name&order=id"),
    }
    with open(salida, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False)
    print({k: len(v) for k, v in datos.items()})


if __name__ == "__main__":
    main()
