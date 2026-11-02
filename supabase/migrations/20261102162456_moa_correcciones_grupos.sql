-- Grupos de modo de acción mal escritos o mal leídos, revisados uno por uno con la etiqueta y aprobados por
-- Cristóbal el 02-11-2026 («Sí, los 12»). Lo que dice la etiqueta se guarda igual en active_ingredients; el código
-- actual va en moa_equivalencias. La única corrección de un dato es la del propamocarb, que se había leído mal.

-- Propamocarb: la etiqueta de Previcur Energy dice «Propamocarb pertenece al grupo F4» y se había guardado «4».
update public.active_ingredients set mechanism_group = 'F4'
where common_name = 'Propamocarb' and mechanism_system = 'FRAC' and mechanism_group = '4';

-- codigo_actual vacío: el ingrediente no tiene grupo (la etiqueta se lo pone por error).
alter table public.moa_equivalencias alter column codigo_actual drop not null;

-- Generales: el código de la etiqueta solo ya dice cuál es el grupo actual.
insert into public.moa_equivalencias (sistema, codigo, codigo_actual, nota) values
  ('FRAC', 'E3 grupo 2', '2', 'La etiqueta trae el código de sitio de acción y el número: E3 = FRAC 2 (dicarboximidas)'),
  ('HRAC', 'E14', '14', 'La etiqueta trae el código antiguo y el actual: E y 14 (inhibidores de la PPO)'),
  ('HRAC', '2B', '2', 'La etiqueta trae el código actual y el antiguo: 2 y B (inhibidores de la ALS)');

-- Por ingrediente.
insert into public.moa_equivalencias (sistema, codigo, codigo_actual, ingrediente_id, nota)
select v.sistema, v.codigo, v.codigo_actual, ai.id, v.nota
from (values
  ('HRAC', 'K1', '10', 'Glufosinato de amonio', 'La etiqueta de FASCINATE 150 SL dice «Grupo HRAC K1» (y WSSA 3), pero el glufosinato es del grupo H antiguo = HRAC 10 (inhibidores de la glutamina sintetasa)'),
  ('HRAC', '4', null, 'Cloquintocet-mexilo (protector)', 'Es un protector del cultivo, no un herbicida: no tiene grupo HRAC. La etiqueta de ADMITT le pone «4» por error'),
  ('HRAC', '0', '4', 'MCPA-dimetilamonio', 'La etiqueta dice «grupo HRAC: 0 y WSSA: 4»: el 0 es la letra O antigua = HRAC 4 (auxinas sintéticas)'),
  ('HRAC', '40', '4', 'Dicamba-sodio', 'La etiqueta de Arrat dice «Grupo … 40»: es 4 y la letra O antigua = HRAC 4 (auxinas sintéticas)'),
  ('FRAC', 'G3', '17', 'Fenpirazamina', 'La etiqueta dice «Grupo G3»: código de sitio de acción G3 = FRAC 17 (inhibidores de la cetorreductasa)'),
  ('FRAC', 'G3', '3', 'Penconazol', 'La etiqueta de CANDADO dice «G3 (Triazoles)», pero los triazoles son G1 = FRAC 3; la de SOLVIT dice «Grupo FRAC 3»'),
  ('FRAC', 'U5', '22', 'Etaboxam', 'Código antiguo U5: el etaboxam pasó a FRAC 22 (B3, tubulina)'),
  ('FRAC', '33', 'P07', 'Fosetilo', 'Código antiguo 33: FRAC pasó los fosfonatos (fosetilo) a P07')
) as v(sistema, codigo, codigo_actual, nombre, nota)
join public.active_ingredients ai on ai.common_name = v.nombre and ai.mechanism_system = v.sistema and ai.mechanism_group = v.codigo;
