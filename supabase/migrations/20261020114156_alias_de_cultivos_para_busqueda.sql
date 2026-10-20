-- Aplicada el 20-10-2026 con el MCP de Supabase (apply_migration).
-- Alias de búsqueda (sinónimos de nombre común en Chile). No son datos de etiqueta:
-- solo sirven para que "uva" encuentre "Vid" o "palta" encuentre "Palto".
-- Solo se llenan cultivos que hoy no tienen alias.
with alias(nombre, lista) as (values
  ('Vid', array['Uva','Parronal','Parrón','Viña','Viñedo','Uva de mesa','Uva vinífera','Uva pisquera']),
  ('Manzano', array['Manzana']),
  ('Peral', array['Pera']),
  ('Cerezo', array['Cereza']),
  ('Guindo', array['Guinda']),
  ('Ciruelo', array['Ciruela']),
  ('Duraznero', array['Durazno','Melocotón']),
  ('Nectarino', array['Nectarín','Nectarina']),
  ('Damasco', array['Albaricoque']),
  ('Almendro', array['Almendra']),
  ('Nogal', array['Nuez','Nueces']),
  ('Avellano Europeo', array['Avellano','Avellana']),
  ('Palto', array['Palta','Aguacate']),
  ('Olivo', array['Oliva','Aceituna']),
  ('Limonero', array['Limón']),
  ('Naranjo', array['Naranja']),
  ('Mandarino', array['Mandarina']),
  ('Pomelo', array['Toronja']),
  ('Arándano', array['Blueberry']),
  ('Frambuesa', array['Frambueso']),
  ('Mora', array['Zarzamora']),
  ('Frutilla', array['Fresa']),
  ('Membrillero', array['Membrillo']),
  ('Granado', array['Granada']),
  ('Chirimoyo', array['Chirimoya']),
  ('Caqui', array['Kaki','Persimón']),
  ('Higo', array['Higuera']),
  ('Papayo', array['Papaya']),
  ('Pecano', array['Nuez pecana','Pecán']),
  ('Papa', array['Patata']),
  ('Maíz', array['Choclo']),
  ('Frejol', array['Poroto','Fréjol','Frijol']),
  ('Arveja', array['Guisante']),
  ('Zapallo italiano', array['Zucchini','Zapallito italiano','Calabacín']),
  ('Zapallo', array['Calabaza']),
  ('Maravilla', array['Girasol']),
  ('Raps', array['Canola','Colza']),
  ('Soya', array['Soja']),
  ('Pimiento', array['Pimentón','Morrón']),
  ('Repollo', array['Col']),
  ('Repollito de Bruselas', array['Repollo de Bruselas','Coles de Bruselas']),
  ('Betarraga', array['Beterraga']),
  ('Ballica', array['Ryegrass']),
  ('Lupino', array['Altramuz']),
  ('Rosal', array['Rosa'])
)
update public.crops c
set aliases = a.lista
from alias a
where c.name = a.nombre and cardinality(c.aliases) = 0;
