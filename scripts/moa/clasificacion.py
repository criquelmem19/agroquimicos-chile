"""Clasificación de modo de acción de los ingredientes que la etiqueta no trae (pedido de Cristóbal, 11-11-2026:
«todo lo que no tenga modo de acción que busques mejor… y ponerlo en base a eso»).

Escribe la migración supabase/migrations/20261111120000_moa_clasificacion.sql, que crea la tabla moa_clasificacion
y la llena. Uso:  python -I scripts/moa/clasificacion.py

Cada fila es un ingrediente (por su nombre exacto en active_ingredients) con:
- sistema y código: el grupo oficial, sacado de la lista de su comité (FUENTES). Un ingrediente puede tener dos
  filas de sistemas distintos (fenazaquina: IRAC 21A y FRAC 39): el sitio usa la que calza con el tipo de producto.
- tipo: cuando ningún comité lo clasifica (reguladores de crecimiento, feromonas, coadyuvantes…). Ver TIPOS en
  assets/js/moa.js.
- grupo químico: nombre de la familia química, para el título de cada grupo y la ficha. En los ingredientes que la
  etiqueta sí trae con código, solo se completa esto (el código sigue saliendo de la etiqueta).
active_ingredients no se toca: lo que dice la etiqueta queda igual.
"""
from pathlib import Path

FUENTES = {
    'FRAC': 'FRAC Code List 2024',
    'IRAC': 'IRAC MoA Classification 11.5 (feb. 2026)',
    'IRAC N': 'IRAC Nematicide MoA Classification 2.2 (ene. 2025)',
    'HRAC': 'HRAC MoA Classification 2024',
    'tipo': 'Sin código: no está en las listas de FRAC, IRAC ni HRAC',
    'grupo': 'Grupo químico según la lista oficial de su comité',
}

# Atajos: grupos químicos que se repiten.
DMI_T = 'Triazoles (DMI)'
DMI_I = 'Imidazoles (DMI)'
QOI = 'Estrobilurinas (QoI)'
SDHI = 'Carboxamidas (SDHI)'
COBRE = 'Cobre inorgánico'
MICRO_B = 'Microorganismo: bacteria'
MICRO_H = 'Microorganismo: hongo Trichoderma'
MICRO_L = 'Microorganismo: levadura'
NC_CIT = 'Extractos cítricos'
NC_ACID = 'Ácidos orgánicos'
NC_FLAV = 'Flavonoides cítricos'
PIRET = 'Piretrinas naturales'
OP = 'Organofosforados'
FOP = 'Ariloxifenoxipropionatos (FOP)'
DIM = 'Ciclohexanodionas (DIM)'
SU = 'Sulfonilureas'
FENOXI = 'Ácidos fenoxicarboxílicos'
FER = 'Feromona sexual'
TENSO = 'Tensoactivo'
UNE = 'Aceites y extractos de plantas'
UNM = 'Aceite mineral'
BT = 'Bacillus thuringiensis'
HONGO_E = 'Hongo entomopatógeno'
CCA = 'Sales de cobre, cromo, arsénico o boro'

# (nombre en active_ingredients, sistema, código, tipo, grupo químico, nota)
# sistema 'IRAC N' = clasificación de nematicidas de IRAC (códigos N-…).
FILAS = [
    # ---------- Fungicidas y bactericidas (FRAC) ----------
    ('Adepidin', 'FRAC', '7', None, SDHI, 'Adepidyn es el nombre comercial del pidiflumetofeno (Syngenta)'),
    ('Benomilo', 'FRAC', '1', None, 'Bencimidazoles (MBC)', None),
    ('Bordelés', 'FRAC', 'M01', None, COBRE, 'Caldo bordelés: sulfato de cobre con cal'),
    ('Caldo Bordelés', 'FRAC', 'M01', None, COBRE, 'Caldo bordelés: sulfato de cobre con cal'),
    ('Sulfato de cobre pentahidratado', 'FRAC', 'M01', None, COBRE, None),
    ('Sulfato tribásico de Cobre hemihidratado', 'FRAC', 'M01', None, COBRE, None),
    ('Calcio', 'FRAC', 'M02', None, 'Azufre inorgánico', 'Leído como ingrediente aparte en POLISULFURO DE CALCIO: es parte del polisulfuro'),
    ('Ferbam', 'FRAC', 'M03', None, 'Ditiocarbamatos', None),
    ('Folpet', 'FRAC', 'M04', None, 'Ftalimidas', None),
    ('Ciazofamida', 'FRAC', '21', None, 'Cianoimidazoles (QiI)', None),
    ('Ciflufenamida', 'FRAC', 'U06', None, 'Fenil-acetamidas', None),
    ('Dicloran', 'FRAC', '14', None, 'Hidrocarburos aromáticos', None),
    ('Tolclofós-metilo', 'FRAC', '14', None, 'Hidrocarburos aromáticos', None),
    ('Difenoconazole', 'FRAC', '3', None, DMI_T, None),
    ('Fenbuconazol', 'FRAC', '3', None, DMI_T, None),
    ('Miclobutanil', 'FRAC', '3', None, DMI_T, None),
    ('Tetraconazol', 'FRAC', '3', None, DMI_T, None),
    ('Imazalilo', 'FRAC', '3', None, DMI_I, None),
    ('Sulfato de Imazalilo', 'FRAC', '3', None, DMI_I, None),
    ('Prochloraz', 'FRAC', '3', None, DMI_I, None),
    ('Triflumizol', 'FRAC', '3', None, DMI_I, None),
    ('Fenarimol', 'FRAC', '3', None, 'Pirimidinas (DMI)', None),
    ('Triforina', 'FRAC', '3', None, 'Piperazinas (DMI)', None),
    ('Fenamidona', 'FRAC', '11', None, 'Imidazolinonas (QoI)', None),
    ('Kresoxim metil', 'FRAC', '11', None, QOI, None),
    ('Isofetamida', 'FRAC', '7', None, SDHI, None),
    ('Procimidona', 'FRAC', '2', None, 'Dicarboximidas', None),
    ('Pirimetanil', 'FRAC', '9', None, 'Anilinopirimidinas', None),
    ('Quinoxifeno', 'FRAC', '13', None, 'Ariloxiquinolinas', None),
    ('Himexazol', 'FRAC', '32', None, 'Isoxazoles', None),
    ('Siltiofam', 'FRAC', '38', None, 'Tiofeno-carboxamidas', None),
    ('Piriofenona', 'FRAC', '50', None, 'Aril-fenil-cetonas', None),
    ('Sulfato de Gentamicina', 'FRAC', '25', None, 'Antibiótico (aminoglucósido)',
     'Aminoglucósido como la estreptomicina (FRAC 25); la lista nombra solo a la estreptomicina'),
    ('Fosetilo-Aluminio', 'FRAC', 'P07', None, 'Fosfonatos', None),
    ('Fosfonatos de amonio', 'FRAC', 'P07', None, 'Fosfonatos', None),
    ('Fosfonatos de potasio', 'FRAC', 'P07', None, 'Fosfonatos', None),
    ('Fosfonatos de sodio', 'FRAC', 'P07', None, 'Fosfonatos', None),
    ('Laminarina', 'FRAC', 'P04', None, 'Polisacáridos (inductor)', None),
    ('Extracto de Reynoutria sachalinensis', 'FRAC', 'P05', None, 'Antraquinonas (inductor)', None),
    ('Cerevisana', 'FRAC', 'P06', None, 'Paredes de levadura (inductor)', 'Saccharomyces cerevisiae LAS117 inactivada'),
    ('Fenazaquina', 'FRAC', '39', None, 'Quinazolinas', 'Como fungicida (oídio); como acaricida es IRAC 21A'),
    # Extractos de plantas (BM01)
    ('Aceite de Árbol de Té', 'FRAC', 'BM01', None, 'Extracto de planta: árbol de té', None),
    ('Terpinen-4-ol', 'FRAC', 'BM01', None, 'Extracto de planta: árbol de té', 'Componente del aceite de árbol de té'),
    ('G-terpineno', 'FRAC', 'BM01', None, 'Extracto de planta: árbol de té', 'Componente del aceite de árbol de té'),
    ('Eugenol', 'FRAC', 'BM01', None, 'Extracto de planta: aceites esenciales', None),
    ('Timol', 'FRAC', 'BM01', None, 'Extracto de planta: aceites esenciales', None),
    ('Geraniol', 'FRAC', 'BM01', None, 'Extracto de planta: aceites esenciales', 'Como fungicida; como insecticida o acaricida es IRAC UNE'),
    ('Extracto de Quillay (Quillaja saponaria', 'FRAC', 'BM01', None, 'Extracto de planta: quillay', None),
    ('Extracto de semillas germinadas de Lupino Lupinus albus', 'FRAC', 'BM01', None, 'Polipéptido de lupino (BLAD)', None),
    ('Extracto de Swinglea glutinosa', 'FRAC', 'BM01', None, 'Extracto de planta: Swinglea', None),
    # Microorganismos (BM02)
    ('Agrobacterium radiobacter cepa K84', 'FRAC', 'BM02', None, MICRO_B, 'Contra la agalla del cuello'),
    ('Bacillus amyloliquefaciens', 'FRAC', 'BM02', None, MICRO_B, None),
    ('Bacillus amyloliquefaciens cepa F727', 'FRAC', 'BM02', None, MICRO_B, None),
    ('Bacillus cereus cepa N6', 'FRAC', 'BM02', None, MICRO_B, None),
    ('Bacillus cereus cepa N7', 'FRAC', 'BM02', None, MICRO_B, None),
    ('Bacillus licheniformis cepa Copihue', 'FRAC', 'BM02', None, MICRO_B, None),
    ('Bacillus licheniformis cepa Mallerauco', 'FRAC', 'BM02', None, MICRO_B, None),
    ('Bacillus subtilis cepa Antumávida', 'FRAC', 'BM02', None, MICRO_B, None),
    ('Bacillus subtilis cepa C110', 'FRAC', 'BM02', None, MICRO_B, None),
    ('Bacillus subtilis cepa C55', 'FRAC', 'BM02', None, MICRO_B, None),
    ('Bacillus subtilis cepa IAB/BS/03', 'FRAC', 'BM02', None, MICRO_B, None),
    ('Bacillus subtilis cepa N5', 'FRAC', 'BM02', None, MICRO_B, None),
    ('Bacillus subtilis cepa QST 713', 'FRAC', 'BM02', None, MICRO_B, None),
    ('Bacillus subtillis cepa QST 713', 'FRAC', 'BM02', None, MICRO_B, None),
    ('Bacillus subtilis cepa Vilcún', 'FRAC', 'BM02', None, MICRO_B, None),
    ('Bacillus subtilis cepa Y1336', 'FRAC', 'BM02', None, MICRO_B, None),
    ('Brevibacillus brevis cepa Maguellines', 'FRAC', 'BM02', None, MICRO_B, None),
    ('Brevibacillus brevis cepa Maguellines I', 'FRAC', 'BM02', None, MICRO_B, None),
    ('Brevibacillus parabrevis cepa N4', 'FRAC', 'BM02', None, MICRO_B, None),
    ('Aureobasidium pullulans cepa DSM 14940', 'FRAC', 'BM02', None, MICRO_L, None),
    ('Aureobasidium pullulans cepa DSM 14941', 'FRAC', 'BM02', None, MICRO_L, None),
    ('Cryptococcus albidus', 'FRAC', 'BM02', None, MICRO_L, None),
    ('Saccharomyces cerevisiae cepa LAS02', 'FRAC', 'BM02', None, MICRO_L, None),
    ('Bionectria ochroleuca cepa Mitique', 'FRAC', 'BM02', None, 'Microorganismo: hongo (Clonostachys)', None),
    ('Hypocrea lixii cepa Quintral', 'FRAC', 'BM02', None, MICRO_H, 'Hypocrea es la forma sexual de Trichoderma'),
    ('Hypocrea virens cepa Ñire', 'FRAC', 'BM02', None, MICRO_H, 'Hypocrea es la forma sexual de Trichoderma'),
] + [(n, 'FRAC', 'BM02', None, MICRO_H, None) for n in (
    'Trichoderma atroviride', 'Trichoderma atroviride cepa T10', 'Trichoderma atroviride cepa T1O',
    'Trichoderma atroviride cepa TC', 'Trichoderma gamsii cepa Volqui', 'Trichoderma harzianum',
    'Trichoderma harzianum (cepa T3 Los Robles)', 'Trichoderma harzianum cepa Queule', 'Trichoderma harzianum Cepa T-22',
    'Trichoderma harzianum cepa TA', 'Trichoderma harzianum cepa TF', 'Trichoderma longibrachiatum Cepa T-397',
    'Trichoderma parceramosum cepa Trailes', 'Trichoderma polysporum', 'Trichoderma virens cepa Chagual',
    'Trichoderma virens cepa Sherwood', 'Trichoderma viride Cepa T-26',
)] + [
    # Sin grupo FRAC (NC): extractos cítricos, ácidos orgánicos y flavonoides de los productos tipo BC-1000.
    ('Ácido L ascórbico', 'FRAC', 'NC', None, NC_ACID, None),
    ('Ácido cítrico', 'FRAC', 'NC', None, NC_ACID, None),
    ('Ácido L-láctico', 'FRAC', 'NC', None, NC_ACID, None),
    ('Ácido Láctico', 'FRAC', 'NC', None, NC_ACID, None),
    ('Naringina', 'FRAC', 'NC', None, NC_FLAV, None),
    ('Quercetina', 'FRAC', 'NC', None, NC_FLAV, None),
    ('Rutina', 'FRAC', 'NC', None, NC_FLAV, None),
] + [(n, 'FRAC', 'NC', None, NC_CIT, None) for n in (
    'Citrex', 'Derivados de extractos cítricos', 'Extracto Cítrico', 'Extracto de cítrico (toronja, Citrus paradisi)',
    'Extracto de cítricos', 'Extracto de frutos de Citrus aurantium', 'Extracto de Naranja (Citrus sinensis)',
    'Extracto de semilla y pulpa de toronja', 'Extracto de toronja', 'Extracto Toronja Citrus x paradisi',
)] + [
    # ---------- Insecticidas, acaricidas y nematicidas (IRAC) ----------
    ('Acefato', 'IRAC', '1B', None, OP, None),
    ('Azinfos metilo', 'IRAC', '1B', None, OP, None),
    ('Clorpirifos', 'IRAC', '1B', None, OP, None),
    ('Diazinon', 'IRAC', '1B', None, OP, None),
    ('Dimetoato', 'IRAC', '1B', None, OP, None),
    ('Fosmet', 'IRAC', '1B', None, OP, None),
    ('Fostiazato', 'IRAC', '1B', None, OP, 'Nematicida: N-1B en la lista de nematicidas'),
    ('Metidatión', 'IRAC', '1B', None, OP, None),
    ('Pirimifós-metilo', 'IRAC', '1B', None, OP, None),
    ('Fipronil', 'IRAC', '2B', None, 'Fenilpirazoles', None),
    ('Esfenvalerato', 'IRAC', '3A', None, 'Piretroides', None),
    ('Etofenprox', 'IRAC', '3A', None, 'Piretroides', None),
    ('Fenpropatrina', 'IRAC', '3A', None, 'Piretroides', None),
] + [(n, 'IRAC', '3A', None, PIRET, None) for n in (
    'Cinerina I', 'Cinerina II', 'Jasmolina I', 'Jasmolina II', 'Piretrina I', 'Piretrina II', 'Extracto de piretro',
    'Extracto de crisantemo (Chrysanthemum cinerariaefolium)',
)] + [
    ('Tiacloprid', 'IRAC', '4A', None, 'Neonicotinoides', None),
    ('Benzoato de Emamectina', 'IRAC', '6', None, 'Avermectinas', None),
    ('Milbemectina', 'IRAC', '6', None, 'Milbemicinas', None),
    ('1,3-Dicloropropeno', 'IRAC', '8A', None, 'Halogenuros de alquilo (fumigante)', 'Como nematicida: N-UNX'),
    ('Bromuro de metilo', 'IRAC', '8A', None, 'Halogenuros de alquilo (fumigante)', None),
    ('Cloropicrina', 'IRAC', '8B', None, 'Cloropicrina (fumigante)', 'Como nematicida: N-UNX'),
    ('Criolita', 'IRAC', '8C', None, 'Fluoruros', None),
    ('Dazomet', 'IRAC', '8F', None, 'Generadores de isotiocianato de metilo', 'Como nematicida: N-UNX'),
    ('Metam sodio', 'IRAC', '8F', None, 'Generadores de isotiocianato de metilo', 'Como nematicida: N-UNX'),
] + [(n, 'IRAC', '11A', None, BT, None) for n in (
    'Bacillus thuringiensis', 'Bacillus thuringiensis cepa Anemophila', 'Bacillus thuringiensis cepa N3',
    'Bacillus thuringiensis subesp kurstaki serotipo 3a, 3b, cepa SA-11',
    'Bacillus thuringiensis subesp. kurstaki (cepa: ABTS-351)', 'Bacillus thuringiensis subsp kurstaki Cepa SA-12',
)] + [
    ('Cihexatina', 'IRAC', '12B', None, 'Organoestánnicos', None),
    ('Propargita', 'IRAC', '12C', None, 'Propargita (sulfito)', None),
    ('Hidrogenooxalato de tiociclam', 'IRAC', '14', None, 'Análogos de nereistoxina', None),
    ('Monoclorhidrato de cartap', 'IRAC', '14', None, 'Análogos de nereistoxina', None),
    ('Monocloridrato de cartap', 'IRAC', '14', None, 'Análogos de nereistoxina', None),
    ('Diﬂubenzuron', 'IRAC', '15', None, 'Benzoilureas', None),
    ('Buprofezina', 'IRAC', '16', None, 'Buprofezina (tiadiazinas)', None),
    ('Ciromazina', 'IRAC', '17', None, 'Ciromazina (triazinas)', None),
    ('Tebufenozida', 'IRAC', '18', None, 'Diacilhidrazinas', None),
    ('Fenazaquina', 'IRAC', '21A', None, 'Quinazolinas (METI)', 'Como acaricida; como fungicida es FRAC 39'),
    ('Piridaben', 'IRAC', '21A', None, 'Piridazinonas (METI)', None),
    ('Fosfuro de aluminio', 'IRAC', '24A', None, 'Fosfina (fumigante)', None),
    ('Fosfuro de magnesio', 'IRAC', '24A', None, 'Fosfina (fumigante)', None),
    ('Virus de la granulosis de Cydia pomonella cepa R5', 'IRAC', '31', None, 'Granulovirus', None),
    ('Virus de la Granulosis de Cydia pomonella cepa V22', 'IRAC', '31', None, 'Granulovirus', None),
    ('Virus de la Granulosis de la Cydia pomonella', 'IRAC', '31', None, 'Granulovirus', None),
    ('Virus de la poliedrosis múltiple nuclear de Mamestra brassicae Cepa CHb1', 'IRAC', '31', None, 'Nucleopoliedrovirus', None),
    ('Azadiractina', 'IRAC', 'UN', None, 'Limonoides (neem)', None),
    ('Células muertas por calor de Burkholderia rinojensis Cepa A396 y medio fermentativo', 'IRAC', 'UNB', None, 'Bacteria (no Bt)', None),
    ('Chromobacterium subtsugae cepa PRAA4-1T', 'IRAC', 'UNB', None, 'Bacteria (no Bt)', None),
    ('Beauveria bassiana', 'IRAC', 'UNF', None, HONGO_E, None),
    ('Beauveria bassiana ATCC 74040', 'IRAC', 'UNF', None, HONGO_E, None),
    ('Beauveria bassiana cepa Cenicafé Bb 9205', 'IRAC', 'UNF', None, HONGO_E, None),
    ('Beauveria bassiana cepa R444', 'IRAC', 'UNF', None, HONGO_E, None),
    ('Metarhizium anisopliae cepa Cenicafé Ma 9236', 'IRAC', 'UNF', None, HONGO_E, None),
    ('Paecilomyces fumosoroseus cepa FE9901', 'IRAC', 'UNF', None, HONGO_E, None),
    ('Geraniol', 'IRAC', 'UNE', None, UNE, 'Como insecticida o acaricida; como fungicida es FRAC BM01'),
] + [(n, 'IRAC', 'UNE', None, UNE, None) for n in (
    '(E)-Cinamaldehído', 'Aceite de ajo', 'Aceite de Linaza', 'Aceite de Mandarina', 'Aceite de Soya', 'Aceite de Toronja',
    'Aceite Esencial de hojas de Eucaliptus globulus', 'Aceite Esencial de Naranja', 'B-Geraniol', 'Capsaicina',
    'Citronellol', 'D-limoneno', 'Farnesol', 'Nerolidol', 'Oleorresina de Capsicum', 'P-cimeno', 'Trilinoleina',
    'Α-terpineno',
)] + [(n, 'IRAC', 'UNM', None, UNM, None) for n in (
    'Parafínico', 'Hidrocarburos aromáticos', 'Hidrocarburos Tri aromáticos y polares',
    'Hidrocarburos alifáticos saturados (C -C',
)] + [
    # Nematicidas (clasificación de nematicidas de IRAC)
    ('Fluensulfone', 'IRAC N', 'N-UN', None, 'Fluoroalquenil sulfonas', None),
    ('Isotiocianato de Alilo', 'IRAC N', 'N-UNX', None, 'Isotiocianatos (fumigante)', None),
    ('Tetratiocarbonato de sodio', 'IRAC N', 'N-UNX', None, 'Generador de azufre volátil', None),
    ('Bacillus cereus cepa Bromelia', 'IRAC N', 'N-UNB', None, MICRO_B, None),
    ('Bacillus cereus cepa Peumo', 'IRAC N', 'N-UNB', None, MICRO_B, None),
    ('Paecilomyces lilacinus cepa Cenicafé PI 9301', 'IRAC N', 'N-UNF', None, 'Microorganismo: hongo (Purpureocillium)', None),
    ('Terpineol', 'IRAC N', 'N-UNE', None, 'Terpenos', None),

    # ---------- Herbicidas (HRAC) ----------
    ('Cihalofop-butilo', 'HRAC', '1', None, FOP, None),
    ('Clodinafop-propargil', 'HRAC', '1', None, FOP, None),
    ('Propaquizafop', 'HRAC', '1', None, FOP, None),
    ('Quizalofop - etilo', 'HRAC', '1', None, FOP, None),
    ('Quizalofop-P-tefurilo', 'HRAC', '1', None, FOP, None),
    ('Tepraloxidima', 'HRAC', '1', None, DIM, None),
    ('Tralkoxidima', 'HRAC', '1', None, DIM, None),
    ('Bensulfurón metilo', 'HRAC', '2', None, SU, None),
    ('Clorsulfurón', 'HRAC', '2', None, SU, None),
    ('Halosulfurón-metilo', 'HRAC', '2', None, SU, None),
    ('Sulfosulfurón', 'HRAC', '2', None, SU, None),
    ('Bispiribac-sodio', 'HRAC', '2', None, 'Pirimidinil-benzoatos', None),
    ('Flucarbazona-sodio', 'HRAC', '2', None, 'Triazolinonas', None),
    ('Flumetralina', 'HRAC', '3', None, 'Dinitroanilinas', 'Se usa como regulador (control de brotes)'),
    ('Orizalina', 'HRAC', '3', None, 'Dinitroanilinas', None),
    ('Trifluralina', 'HRAC', '3', None, 'Dinitroanilinas', None),
    ('2,4-D-isopropilo', 'HRAC', '4', None, FENOXI, 'En dosis bajas se usa como regulador (cítricos)'),
    ('2,4-DB-butilo', 'HRAC', '4', None, FENOXI, None),
    ('Diclorprop-P-2-etilhexilo', 'HRAC', '4', None, FENOXI, 'En dosis bajas se usa como regulador (cítricos)'),
    ('MCPA-potasio', 'HRAC', '4', None, FENOXI, None),
    ('MCPA-sodio', 'HRAC', '4', None, FENOXI, None),
    ('Dicamba-dimetilamonio', 'HRAC', '4', None, 'Ácidos benzoicos', None),
    ('Picloram-dimetilamonio', 'HRAC', '4', None, 'Ácidos piridincarboxílicos', None),
    ('Triclopir', 'HRAC', '4', None, 'Ácidos piridiniloxiacéticos', 'En dosis bajas se usa como regulador (cítricos)'),
    ('Amicarbazona', 'HRAC', '5', None, 'Triazolinonas', None),
    ('Cloridazona', 'HRAC', '5', None, 'Piridazinonas', None),
    ('Linuron', 'HRAC', '5', None, 'Ureas', None),
    ('Terbacilo', 'HRAC', '5', None, 'Uracilos', None),
    ('Terbutilazina', 'HRAC', '5', None, 'Triazinas', None),
    ('Epirifenacilo', 'HRAC', '14', None, 'Pirimidinedionas', None),
    ('Flumioxazina', 'HRAC', '14', None, 'N-fenil-imidas', None),
    ('Clorprofam', 'HRAC', '23', None, 'Carbamatos', 'Se usa sobre todo para frenar la brotación de papas en bodega'),
    ('Biciclopirona', 'HRAC', '27', None, 'Tricetonas', None),
    ('Tolpiralato', 'HRAC', '27', None, 'Benzoilpirazoles', None),
    ('Tolpyralate', 'HRAC', '27', None, 'Benzoilpirazoles', None),
    ('Amitrol', 'HRAC', '34', None, 'Triazoles', None),
    ('Napropamida', 'HRAC', '0', None, 'Acetamidas', 'HRAC lo pone en «modo de acción desconocido»'),
    ('Ácido cáprico', 'HRAC', '0', None, 'Ácidos grasos', 'HRAC pone a los ácidos grasos (pelargónico) en «modo de acción desconocido»'),
    ('Ácido caprílico', 'HRAC', '0', None, 'Ácidos grasos', 'HRAC pone a los ácidos grasos (pelargónico) en «modo de acción desconocido»'),

    # ---------- Sin código (ningún comité los clasifica) ----------
    ('Acroleina', None, None, 'no_clasificado', 'Aldehídos', 'Herbicida y alguicida de canales de riego; HRAC no lo clasifica'),
    ('Benzoato de denatonio', None, None, 'aditivo', 'Amargante', 'Evita que personas y mascotas coman el cebo'),
    ('Tiocianato de amonio', None, None, 'aditivo', 'Sinergista', 'Acompaña al amitrol'),
    ('Tiocianato de Amonio (Sinergizante)', None, None, 'aditivo', 'Sinergista', 'Acompaña al amitrol'),
    ('Metaldehído', None, None, 'molusquicida', 'Metaldehído', None),
    ('Steinernema feltiae cepa Qu-N820', None, None, 'biologico', 'Nematodo entomopatógeno', None),
    ('Difenilamina', None, None, 'postcosecha', 'Antioxidante (aminas)', None),
    ('Clorito de sodio', None, None, 'desinfectante', 'Compuestos de cloro', None),
    ('Hipoclorito de sodio', None, None, 'desinfectante', 'Compuestos de cloro', None),
    # Protectores del cultivo (acompañan a un herbicida)
    ('Benoxacor', None, None, 'protector', 'Protector del cultivo', None),
    ('Ciprosulfamida', None, None, 'protector', 'Protector del cultivo', None),
    ('Diclormid', None, None, 'protector', 'Protector del cultivo', None),
    ('Furilazol', None, None, 'protector', 'Protector del cultivo', None),
    ('Isoxadifeno-etilo', None, None, 'protector', 'Protector del cultivo', None),
    ('Isoxadifeno-etilo (protector)', None, None, 'protector', 'Protector del cultivo', None),
    ('Mefenpir-dietilo', None, None, 'protector', 'Protector del cultivo', None),
    ('Mefenpir-dietilo (protector)', None, None, 'protector', 'Protector del cultivo', None),
    ('Cloquintocet-mexilo (protector)', None, None, 'protector', 'Protector del cultivo', None),
    # Rodenticidas
    ('Brodifacoum', None, None, 'rodenticida', 'Anticoagulantes (cumarinas)', None),
    ('Brodifacum', None, None, 'rodenticida', 'Anticoagulantes (cumarinas)', None),
    ('Bromadiolona', None, None, 'rodenticida', 'Anticoagulantes (cumarinas)', None),
    ('Flocumafeno', None, None, 'rodenticida', 'Anticoagulantes (cumarinas)', None),
    # Preservantes de madera y biocidas industriales
    ('8-Quinolinolato de cobre', None, None, 'preservante', 'Cobre orgánico (oxina)', None),
    ('8-Quinolinóxido cúprico (oxina de cobre)', None, None, 'preservante', 'Cobre orgánico (oxina)', None),
    ('Quinolinolato de Cobre', None, None, 'preservante', 'Cobre orgánico (oxina)', None),
    ('Carbonato dibásico de cobre', None, None, 'preservante', COBRE, None),
    ('Óxido cúprico', None, None, 'preservante', CCA, None),
    ('Óxido crómico', None, None, 'preservante', CCA, None),
    ('Trióxido de Cromo', None, None, 'preservante', CCA, None),
    ('Acido crómico', None, None, 'preservante', CCA, None),
    ('Pentaóxido de diarsénico', None, None, 'preservante', CCA, None),
    ('Pentóxido arsénico', None, None, 'preservante', CCA, None),
    ('Pentóxido de arsénico', None, None, 'preservante', CCA, None),
    ('Óxido bórico', None, None, 'preservante', 'Boratos', None),
    ('Acido ortobórico', None, None, 'preservante', 'Boratos', None),
    ('Bórax', None, None, 'preservante', 'Boratos', None),
    ('Cloruro de cocoiltrimetilamonio', None, None, 'preservante', 'Amonio cuaternario', None),
    ('Bis(tiocianato) de metileno', None, None, 'preservante', 'Tiocianatos', None),
    ('Tiocianato de (1,3-benzotiazol-2-iltio)metilo', None, None, 'preservante', 'Tiocianatos (TCMTB)', None),
    ('2,4,6-Tribromofenato de sodio', None, None, 'preservante', 'Fenoles halogenados', None),
    ('2-octil-4-isotiazolin-3-ona', None, None, 'preservante', 'Isotiazolinonas', None),
    ('2-metil-4-isotiazolin-3-ona', None, None, 'biocida', 'Isotiazolinonas', None),
    ('5-cloro-2-metil-4-isotiazolin-3-ona', None, None, 'biocida', 'Isotiazolinonas', None),
    # Nutrientes y bioestimulantes
    ('Ascophyllum nodosum', None, None, 'bioestimulante', 'Extracto de algas', None),
    ('Extracto de Alfalfa (Medicago sativa)', None, None, 'bioestimulante', 'Extracto vegetal', None),
    ('Quitosano', None, None, 'bioestimulante', 'Polisacáridos (quitosano)', None),
    ('Sulfato magnésico heptahidratado', None, None, 'bioestimulante', 'Nutriente (magnesio)', None),
    ('Ibiforte', None, None, 'bioestimulante', 'Nutriente', 'Nombre comercial leído como ingrediente (BOROCAL S, fertilizante de calcio y boro)'),
    # Coadyuvantes
    ('Ácido ortofosfórico', None, None, 'coadyuvante', 'Acidificante', None),
    ('Ácido Metilacético', None, None, 'coadyuvante', 'Acidificante', None),
    ('Di-1-p-menteno', None, None, 'coadyuvante', 'Terpenos (película)', 'Forma una película: antitranspirante y adherente'),
    ('3-(polioxietilen)propilheptametiltrisiloxano', None, None, 'coadyuvante', 'Organosiliconados', None),
    ('Heptametiltrisiloxano', None, None, 'coadyuvante', 'Organosiliconados', None),
    ('Poli(dimetilpolisiloxano)', None, None, 'coadyuvante', 'Organosiliconados (antiespumante)', None),
    ('Hidrocarbonos del petróleo', None, None, 'coadyuvante', UNM, None),
    ('Ester metílico de aceite de raps (Brassica napus)', None, None, 'coadyuvante', 'Aceite vegetal metilado', None),
    ('Oleato de metilo', None, None, 'coadyuvante', 'Aceite vegetal metilado', None),
    ('Copolímero de ácido 2-propenóico con 1,3 butadieno y etilbenceno', None, None, 'coadyuvante', 'Polímero adherente', None),
    ('Otros agentes coadyuvantes', None, None, 'coadyuvante', TENSO, None),
    ('Isopropanol', None, None, 'coadyuvante', 'Solvente', None),
    ('Ftalato de Di(2-etilhexilo)', None, None, 'coadyuvante', 'Solvente', None),
] + [(n, None, None, 'coadyuvante', TENSO, None) for n in (
    'Alcohol alquilíco (C10-12) etoxilado', 'Alcohol decílico etoxilado', 'Alcohol tridecílico etoxilado',
    'Alcohol Undecílico Etoxilado', 'Ácido esteárico', 'Ácido linoléico', 'Ácido oleico', 'Ésteres fosfatados',
    'Fosfatidilcolina', 'Lecitina de soya', 'Fosfato de nonilfenol etoxilado', 'Fosfato de terc-Butilfenol etoxilado',
    'Nonifenol etoxilado', 'Nonilfenol etoxilado',
)] + [
    # Reguladores de crecimiento (actúan sobre la planta)
    ('(25R)-3β,5-dihidroxi-5α-espirostan-6-ona', None, None, 'regulador', 'Brasinoesteroide', None),
    ('1-Metilciclopropeno', None, None, 'regulador', 'Bloqueador de etileno', None),
    ('Clorhidrato de aviglicina', None, None, 'regulador', 'Inhibidor de etileno', None),
    ('Etefón', None, None, 'regulador', 'Liberador de etileno', None),
    ('Ácido 1-aminociclopropano- 1- carboxílico (ACC)', None, None, 'regulador', 'Precursor de etileno', None),
    ('Ácido giberélico', None, None, 'regulador', 'Giberelinas', None),
    ('Giberelina A4', None, None, 'regulador', 'Giberelinas', None),
    ('Giberelina A4 y Giberelina A7', None, None, 'regulador', 'Giberelinas', None),
    ('Giberelina A7', None, None, 'regulador', 'Giberelinas', None),
    ('6-Benciladenina', None, None, 'regulador', 'Citoquininas', None),
    ('Cinetina', None, None, 'regulador', 'Citoquininas', None),
    ('Zeatina', None, None, 'regulador', 'Citoquininas', None),
    ('Forclorfenuron', None, None, 'regulador', 'Citoquininas (fenilureas)', None),
    ('Tidiazurón', None, None, 'regulador', 'Citoquininas (fenilureas)', None),
    ('1-naftilacetato de potasio (NAA, sal potásica)', None, None, 'regulador', 'Auxinas', None),
    ('4-cpa', None, None, 'regulador', 'Auxinas', None),
    ('Ácido 2-naftiloxiacético', None, None, 'regulador', 'Auxinas', None),
    ('Ácido 4-indol-3-ilbutírico', None, None, 'regulador', 'Auxinas', None),
    ('Ácido Indol-3-ilacético', None, None, 'regulador', 'Auxinas', None),
    ('Ácido (S)-Abscísico', None, None, 'regulador', 'Ácido abscísico', None),
    ('Prohidrojasmona', None, None, 'regulador', 'Jasmonatos', None),
    ('Cianamida hidrogenada', None, None, 'regulador', 'Cianamidas', 'Rompe el receso invernal'),
    ('Paclobutrazol', None, None, 'regulador', 'Inhibidores de giberelinas', None),
    ('Prohexadiona calcio', None, None, 'regulador', 'Inhibidores de giberelinas', None),
    ('Trinexapac-etilo', None, None, 'regulador', 'Inhibidores de giberelinas', None),
    ('Uniconazol', None, None, 'regulador', 'Inhibidores de giberelinas', None),
    ('Uniconazol-p', None, None, 'regulador', 'Inhibidores de giberelinas', None),
    ('Cloruro de Clormequat', None, None, 'regulador', 'Inhibidores de giberelinas', None),
    ('Cloruro de Mepiquat', None, None, 'regulador', 'Inhibidores de giberelinas', None),
    ('Cloruro de colina', None, None, 'regulador', 'Reguladores varios', None),
    ('Ciclanilida', None, None, 'regulador', 'Reguladores varios', None),
    ('Lisofosfatidiletanolamina', None, None, 'regulador', 'Fosfolípidos', 'Adelanta la madurez y el color'),
    ('Sal potásica de Hidrazida maleica', None, None, 'regulador', 'Antibrotantes', 'Frena la brotación (papa y cebolla en bodega, tabaco)'),
    ('(E,Z)-2,4-decadienoato de etilo', None, None, 'feromona', 'Atrayente (éster de pera)', None),
] + [(n, None, None, 'feromona', FER, None) for n in (
    '(E,E)-8,10-dodecadien-1-ol', '(E,E)-8,10-dodecadien-1-ol (Codlemona)', '(E)-11- tetradecen-1-ol',
    '(Z)-8-dodecen-1-ol', '1-dodecanol', '1-tetradecanol', 'Acetato de (E )-11- tetradecen-1-ilo',
    'Acetato de (E,Z,Z)-3,8,11-tetradecatrienilo', 'Acetato de (E,Z)-3,8-tetradecadienilo', 'Acetato de (E)-8-dodecen-1-ilo',
    'Acetato de (EZ,Z)-3,8,11 - tetradecatrien- 1 -ilo', 'Acetato de (Z)-8-dodecen-1-ilo', 'Acetato de (Z/E)-8-dodecen-1-ilo',
    'Acetato de tetradecadien-l -ilo', 'Codlemona', 'Colemona',
)]

# Ingredientes que la etiqueta trae con código: solo el grupo químico (para el título de cada grupo y la ficha).
GRUPOS = {
    'Bencimidazoles (MBC)': ['Tiabendazol', 'Carbendazima'],
    'Tiofanatos': ['Tiofanato-Metilo'],
    QOI: ['Azoxistrobina', 'Picoxistrobin', 'Picoxistrobina', 'Piraclostrobina', 'Kresoxim metilo', 'Trifloxistrobina',
          'Mandestrobina'],
    'Oxazolidinadionas (QoI)': ['Famoxadona'],
    'Dihidrodioxazinas (QoI)': ['Fluoxastrobina'],
    'Fenilpirroles': ['Fludioxonil', 'Fludioxonilo'],
    'Quinazolinonas': ['Proquinazid'],
    'Picolinamidas (QiI)': ['Fenpicoxamida', 'Florilpicoxamida'],
    'Antibiótico (hexopiranosil)': ['Clorhidrato de kasugamicina hidratado'],
    'Antibiótico (aminoglucósido)': ['Sesquisulfato de estreptomicina'],
    'Antibiótico (tetraciclina)': ['Clorhidrato de oxitetraciclina'],
    'Cianoacetamida-oximas': ['Cimoxanilo'],
    'Dinitroanilinas (desacoplantes)': ['Fluazinam'],
    'Dinitrofenil-crotonatos': ['Meptildinocap'],
    DMI_T: ['Ciproconazol', 'Difenoconazol', 'Fenbuconazole', 'Flutriafol', 'Metconazol', 'Miclobutanilo', 'Propiconazol',
            'Tebuconazol', 'Epoxiconazol', 'Fluquinconazol', 'Mefentrifluconazol', 'Triadimefón', 'Triadimenol',
            'Triticonazol', 'Penconazol'],
    'Triazolintionas (DMI)': ['Protioconazol'],
    DMI_I: ['Procloraz'],
    'Fosfonatos': ['Fosetilo'],
    'Fenilamidas': ['Benalaxilo', 'Metalaxilo', 'Metalaxilo-M', 'Metalaxilo-M (Mefenoxam)'],
    'Amidas del ácido carboxílico (CAA)': ['Dimetomorfo', 'Mandipropamida'],
    'Piperidinil-tiazol-isoxazolinas': ['Oxatiapiprolina', 'Fluoxapiprolina'],
    'Aminas (piperidinas)': ['Fenpropidina'],
    'Aminas (morfolinas)': ['Fenpropimorfo'],
    SDHI: ['Benzovindiflupir', 'Boscalid', 'Ciclobutrifluram', 'Fluindapir', 'Flutolanilo', 'Fluxapiroxad', 'Isopirazam',
           'Pentiopirad', 'Pidiflumetofen', 'Pidiflumetofeno', 'Sedaxano', 'Bixafeno', 'Fluopiram', 'Impirfluxam',
           'Isoflucipram', 'Penflufen', 'Piraziflumida'],
    'Hidroxi-(2-amino)pirimidinas': ['Bupirimato'],
    'Anilinopirimidinas': ['Ciprodinilo', 'Pirimetanilo'],
    'Toluamidas': ['Zoxamida'],
    'Fenilureas': ['Pencicuron'],
    'Piridinilmetil-benzamidas': ['Fluopicolida'],
    'Aril-fenil-cetonas': ['Metrafenona'],
    'Polipéptido de lupino (BLAD)': ['Banda de Lupinus albus dulce (BLAD)'],
    'Extracto de planta: quillay': ['Extracto de quillay'],
    'Triazolopirimidilaminas (QoSI)': ['Ametoctradina'],
    'Dicarboximidas': ['Iprodiona'],
    'Carbamatos': ['Clorhidrato de propamocarb', 'Propamocarb', 'Carbarilo', 'Oxamilo', 'Pirimicarb', 'Asulam-sodio'],
    'Hidroxianilidas': ['Fenhexamida'],
    'Amino-pirazolinonas': ['Fenpirazamina'],
    COBRE: ['Hidróxido de cobre', 'Oxicloruro de cobre', 'Óxido cuproso', 'Sulfato Básico de cobre', 'Sulfato de cobre',
            'Sulfato dibásico de cobre', 'Sulfato tribásico de cobre'],
    'Azufre inorgánico': ['Azufre', 'Polisulfuro de calcio'],
    'Ditiocarbamatos': ['Mancozeb', 'Metiram', 'Ziram', 'Propineb'],
    'Ftalimidas': ['Captan'],
    'Cloronitrilos': ['Clorotalonilo'],
    'Guanidinas': ['Dodina'],
    'Sales inorgánicas (bicarbonato)': ['Hidrogenocarbonato de Potasio'],
    'Benzotiadiazoles (inductor)': ['Acibenzolar-S-metilo'],
    'Antraquinonas (inductor)': ['Fisciona'],
    'Tiazolidinas': ['Flutianilo'],
    'Tiazol-carboxamidas': ['Etaboxam'],
    # Herbicidas
    FENOXI: ['MCPA-dimetilamonio', '2,4-D butotilo', '2,4-D-triisopropanolamonio', '2,4-D-dimetilamonio'],
    FOP: ['Clodinafop-propargilo', 'Haloxifop-P-metilo', 'Fluazifop-P-butilo', 'Quizalofop-P-etilo'],
    'Fenilpirazolinas (DEN)': ['Pinoxadeno'],
    DIM: ['Cletodima'],
    'Isoxazolidinonas': ['Bixlozona', 'Clomazona'],
    'Difeniléteres': ['Fomesafeno', 'Oxifluorfen', 'Oxifluorfeno', 'Aclonifeno'],
    'Triazinonas': ['Trifludimoxazina', 'Hexazinona', 'Metamitrona', 'Metribuzina'],
    'Pirimidinedionas': ['Saflufenacilo'],
    'Oxadiazoles': ['Oxadiargilo'],
    'Fenilpirazoles': ['Piraflufen-etil', 'Fipronilo'],
    'Triazolinonas': ['Carfentrazona-etilo', 'Tiencarbazona-metilo'],
    'Cloroacetamidas': ['Dimetenamida-P', 'S-Metolacloro', 'Acetocloro', 'Metazacloro', 'Propisocloro'],
    'Tiocarbamatos': ['Prosulfocarb', 'Trialato', 'Molinato'],
    'Oxiacetamidas': ['Flufenacet'],
    'Isoxazolinas': ['Piroxasulfona', 'Isocicloseram'],
    'Benzofuranos': ['Etofumesato'],
    'Triazolopirimidinas': ['Diclosulam', 'Flumetsulam', 'Penoxsulam', 'Piroxsulam'],
    SU: ['Flazasulfurón', 'Nicosulfurón', 'Rimsulfurón', 'Tifensulfuron-Metilo', 'Triasulfurón', 'Tritosulfurón',
         'Foramsulfurón', 'Mesosulfurón-metilo', 'Metsulfurón-metilo', 'Triflusulfurón metilo',
         'Yodosulfurón-metilo-sodio', 'Etametsulfurón metilo'],
    'Imidazolinonas': ['Imazamox', 'Imazapic', 'Imazapir', 'Imazetapir'],
    'Bipiridilos': ['Dibromuro de Diquat', 'Diquat'],
    'Tricetonas': ['Mesotriona', 'Tembotriona'],
    'Isoxazoles': ['Isoxaflutol'],
    'Benzamidas': ['Isoxaben', 'Propizamida'],
    'Ácidos piridincarboxílicos': ['Aminopiralida-dimetilamonio', 'Picloram-triisopropanolamonio', 'Clopiralid-olamina',
                                   'Picloram-potasio'],
    'Ácidos benzoicos': ['Dicamba', 'Dicamba-sodio'],
    'Arilpicolinatos': ['Florpirauxifeno-bencilo'],
    'Ácidos piridiniloxiacéticos': ['Fluroxipir-meptilo', 'Triclopir-butotilo'],
    'Ácidos quinolincarboxílicos': ['Quinclorac'],
    'Triazinas': ['Atrazina', 'Simazina'],
    'Piridazinonas': ['Cloridazon'],
    'Glicinas': ['Glifosato', 'Glifosato-dimetilamonio', 'Glifosato-isopropilamonio', 'Glifosato-monoamonio',
                 'Glifosato-potasio'],
    'Fenilcarbamatos': ['Desmedifam', 'Fenmedifam'],
    'Uracilos': ['Lenacilo'],
    'Ureas': ['Diuron', 'Isoproturón'],
    'Benzotiadiazinonas': ['Bentazona-sodio'],
    'Piridincarboxamidas': ['Diflufenicán'],
    'Furanonas': ['Flurtamona'],
    'Ácidos fosfínicos': ['Glufosinato-amonio', 'Glufosinato de amonio'],
    'Dinitroanilinas': ['Pendimetalina'],
    'Nitrilos': ['Diclobenilo'],
    'Alquilazinas': ['Indaziflam'],
    # Insecticidas, acaricidas y nematicidas
    'Difeniloxazolinas': ['Etoxazol'],
    'Pirroles': ['Clorfenapir'],
    'Benzoilureas': ['Lufenuron', 'Novaluron', 'Teflubenzuron', 'Triflumurón'],
    'Diacilhidrazinas': ['Metoxifenozida'],
    OP: ['Cadusafós', 'Profenofós', 'Etoprofós', 'Fenamifós'],
    'Naftoquinonas': ['Acequinocilo'],
    'Carbazatos': ['Bifenazato'],
    'Fenoxipirazoles (METI)': ['Fenpiroximato'],
    'Oxadiazinas': ['Indoxacarb'],
    'Semicarbazonas': ['Metaflumizona'],
    'Ácidos tetrónicos y tetrámicos': ['Espidoxamato', 'Espirodiclofeno', 'Espiromesifeno', 'Espiropidiona',
                                       'Espirotetramato'],
    'Beta-cetonitrilos': ['Ciflumetofeno'],
    'Diamidas': ['Ciantraniliprol', 'Ciclaniliprol', 'Clorantraniliprol', 'Flubendiamida', 'Tetraniliprole'],
    'Flonicamida': ['Flonicamida'],
    'Piretroides': ['Acrinatrina', 'Deltametrina', 'Alfacipermetrina', 'Beta-ciflutrina', 'Bifentrina',
                    'Gamma - Cihalotrina', 'Lambda-cihalotrina', 'Permetrina', 'Tau-fluvalinato', 'Teflutrina'],
    'Meta-diamidas': ['Broflanilida'],
    'Granulovirus': ['Virus de la Granulosis de la Cydia pomonella cepa R5'],
    'Neonicotinoides': ['Acetamiprid', 'Clotianidina', 'Dinotefuran', 'Imidacloprid', 'Tiametoxam'],
    'Sulfoximinas': ['Sulfoxaflor'],
    'Butenolidas': ['Flupiradifurona'],
    'Espinosinas': ['Espinetoram', 'Espinosad'],
    'Avermectinas': ['Abamectina', 'Emamectina'],
    'Análogos de hormona juvenil': ['Fenoxicarb', 'Piriproxifeno'],
    'Piridin-azometinas': ['Pimetrozina'],
    'Pirifluquinazona': ['Pirifluquinazona'],
    'Pyropenos': ['Afidopiropeno'],
    'Sulfonamidas (fluazaindolizina)': ['Fluazaindolizina'],
    UNM: ['Aceite parafínico'],
}

# Códigos de la etiqueta escritos raro que son un grupo actual (van a moa_equivalencias).
EQUIVALENCIAS = [
    ('FRAC', 'F-49', '49', None, 'La etiqueta escribe «F-49»: es el grupo FRAC 49 (inhibidores de OSBP)'),
    ('HRAC', '29 L', '29', None, 'La etiqueta trae el código actual y el antiguo: 29 y L (síntesis de celulosa)'),
    ('HRAC', 'I18', '18', None, 'La etiqueta trae el código antiguo y el actual: I y 18 (inhibidores de la DHPS)'),
    ('IRAC', 'UN', 'UNM', 'Aceite parafínico',
     'La etiqueta dice IRAC UN; la clasificación IRAC 11.5 pone al aceite mineral en UNM (disruptores mecánicos)'),
]


def q(s):
    return 'null' if s is None else "'" + str(s).replace("'", "''") + "'"


def main():
    filas = []
    for nombre, sistema, codigo, tipo, grupo, nota in FILAS:
        if sistema:
            fuente = FUENTES[sistema]
            sistema = 'IRAC' if sistema == 'IRAC N' else sistema
        else:
            fuente = FUENTES['tipo']
        filas.append((nombre, sistema, codigo, tipo, grupo, fuente, nota))
    clasificados = {f[0] for f in filas}
    for grupo, nombres in GRUPOS.items():
        for nombre in nombres:
            assert nombre not in clasificados, nombre
            filas.append((nombre, None, None, None, grupo, FUENTES['grupo'], None))
    vistos = set()
    for f in filas:
        clave = (f[0], f[1])
        assert clave not in vistos, clave
        vistos.add(clave)

    valores = ',\n'.join('  (' + ', '.join(q(x) for x in f) + ')' for f in filas)
    eq = ',\n'.join('  (' + ', '.join(q(x) for x in e) + ')' for e in EQUIVALENCIAS)
    sql = f"""-- Clasificación de modo de acción de los ingredientes que la etiqueta no trae, y grupo químico de todos (pedido de
-- Cristóbal el 11-11-2026: «todo lo que no tenga modo de acción que busques mejor… y ponerlo en base a eso»).
-- Generado por scripts/moa/clasificacion.py (ahí está cada fila con su nota): no editar a mano.
-- Fuentes: FRAC Code List 2024, IRAC MoA Classification 11.5 (feb. 2026) y su clasificación de nematicidas 2.2,
-- HRAC MoA Classification 2024. Lo que no clasifica ningún comité va con un tipo (regulador, feromona…).
-- active_ingredients no se toca: el código de la etiqueta, si lo trae, sigue mandando (con moa_equivalencias).

create table public.moa_clasificacion (
  id smallint generated always as identity primary key,
  ingrediente_id uuid not null references public.active_ingredients(id),
  sistema text check (sistema in ('FRAC', 'HRAC', 'IRAC')),
  codigo text,
  tipo text check (tipo in ('regulador', 'feromona', 'coadyuvante', 'protector', 'rodenticida', 'preservante', 'biocida',
    'desinfectante', 'molusquicida', 'bioestimulante', 'biologico', 'aditivo', 'postcosecha', 'no_clasificado')),
  grupo_quimico text,
  fuente text not null,
  nota text,
  check ((sistema is null) = (codigo is null)),
  check (codigo is null or tipo is null),
  check (codigo is not null or tipo is not null or grupo_quimico is not null),
  unique nulls not distinct (ingrediente_id, sistema)
);
comment on table public.moa_clasificacion is
  'Grupo de modo de acción (lista oficial FRAC/IRAC/HRAC) o tipo sin código de los ingredientes cuya etiqueta no lo trae; grupo químico de todos. Ver scripts/moa/clasificacion.py.';

alter table public.moa_clasificacion enable row level security;
create policy lectura_publica_moa_clasificacion on public.moa_clasificacion
  for select to anon, authenticated using (true);
revoke all on public.moa_clasificacion from anon, authenticated;
grant select on public.moa_clasificacion to anon, authenticated;

create temp table _c (nombre text, sistema text, codigo text, tipo text, grupo text, fuente text, nota text) on commit drop;
insert into _c values
{valores};

do $$
declare faltan text;
begin
  select string_agg(nombre, ', ') into faltan from _c
  where not exists (select 1 from public.active_ingredients a where a.common_name = _c.nombre);
  if faltan is not null then raise exception 'Ingredientes que no están en la base: %', faltan; end if;
end $$;

insert into public.moa_clasificacion (ingrediente_id, sistema, codigo, tipo, grupo_quimico, fuente, nota)
select a.id, c.sistema, c.codigo, c.tipo, c.grupo, c.fuente, c.nota
from _c c join public.active_ingredients a on a.common_name = c.nombre;

-- Códigos de la etiqueta escritos raro.
insert into public.moa_equivalencias (sistema, codigo, codigo_actual, ingrediente_id, nota)
select v.sistema, v.codigo, v.codigo_actual, a.id, v.nota
from (values
{eq}
) as v(sistema, codigo, codigo_actual, nombre, nota)
left join public.active_ingredients a on a.common_name = v.nombre;
"""
    raiz = Path(__file__).resolve().parents[2]
    destino = raiz / 'supabase' / 'migrations' / '20261111120000_moa_clasificacion.sql'
    destino.write_text(sql, encoding='utf-8', newline='\n')
    print(f'{len(filas)} filas -> {destino.relative_to(raiz)}')


if __name__ == '__main__':
    main()
