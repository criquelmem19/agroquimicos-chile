-- Equivalencias entre códigos antiguos y actuales de los grupos de modo de acción (pedido de Cristóbal el
-- 27-10-2026: «sí, únelos»). Las etiquetas traen el mismo grupo escrito de dos formas: el código de sitio de acción
-- de FRAC («G1», «C2») o la letra antigua de HRAC («A», «K3»), y el código actual («FRAC 3», «HRAC 1»).
-- active_ingredients.mechanism_group sigue con lo que dice la etiqueta; el sitio muestra el código actual y,
-- al lado, el de la etiqueta. Fuentes: FRAC Code List (código de sitio de acción → código FRAC) y la
-- clasificación HRAC de 2020 (letras antiguas → números).
-- ingrediente_id: la equivalencia vale solo para ese ingrediente (cuando el código solo no basta).
create table public.moa_equivalencias (
  id smallint generated always as identity primary key,
  sistema text not null check (sistema in ('FRAC', 'HRAC', 'IRAC')),
  codigo text not null,
  codigo_actual text not null,
  ingrediente_id uuid references public.active_ingredients(id),
  nota text,
  unique nulls not distinct (sistema, codigo, ingrediente_id)
);

alter table public.moa_equivalencias enable row level security;
create policy lectura_publica_moa_equivalencias on public.moa_equivalencias
  for select to anon, authenticated using (true);
revoke all on public.moa_equivalencias from anon, authenticated;
grant select on public.moa_equivalencias to anon, authenticated;

-- FRAC: código de sitio de acción → código FRAC. G3 y «G» solos no van: G3 se usa solo con la fenhexamida
-- (la etiqueta de CANDADO pone al penconazol, un triazol, en «G3», lo que no calza) y «G» solo con el tebuconazol.
insert into public.moa_equivalencias (sistema, codigo, codigo_actual, nota) values
  ('FRAC', 'A1', '4', 'Código de sitio de acción A1 = FRAC 4 (fenilamidas)'),
  ('FRAC', 'A2', '8', 'Código de sitio de acción A2 = FRAC 8'),
  ('FRAC', 'A3', '32', 'Código de sitio de acción A3 = FRAC 32'),
  ('FRAC', 'A4', '31', 'Código de sitio de acción A4 = FRAC 31'),
  ('FRAC', 'B1', '1', 'Código de sitio de acción B1 = FRAC 1 (bencimidazoles, MBC)'),
  ('FRAC', 'B2', '10', 'Código de sitio de acción B2 = FRAC 10'),
  ('FRAC', 'B3', '22', 'Código de sitio de acción B3 = FRAC 22 (toluamidas)'),
  ('FRAC', 'B4', '20', 'Código de sitio de acción B4 = FRAC 20'),
  ('FRAC', 'B5', '43', 'Código de sitio de acción B5 = FRAC 43 (benzamidas)'),
  ('FRAC', 'B6', '50', 'Código de sitio de acción B6 = FRAC 50 (aril-fenil-cetonas)'),
  ('FRAC', 'C1', '39', 'Código de sitio de acción C1 = FRAC 39'),
  ('FRAC', 'C2', '7', 'Código de sitio de acción C2 = FRAC 7 (SDHI)'),
  ('FRAC', 'C3', '11', 'Código de sitio de acción C3 = FRAC 11 (QoI, estrobilurinas)'),
  ('FRAC', 'C4', '21', 'Código de sitio de acción C4 = FRAC 21 (QiI)'),
  ('FRAC', 'C5', '29', 'Código de sitio de acción C5 = FRAC 29'),
  ('FRAC', 'C6', '30', 'Código de sitio de acción C6 = FRAC 30'),
  ('FRAC', 'C7', '38', 'Código de sitio de acción C7 = FRAC 38'),
  ('FRAC', 'C8', '45', 'Código de sitio de acción C8 = FRAC 45'),
  ('FRAC', 'D1', '9', 'Código de sitio de acción D1 = FRAC 9 (anilinopirimidinas)'),
  ('FRAC', 'D2', '23', 'Código de sitio de acción D2 = FRAC 23'),
  ('FRAC', 'D3', '24', 'Código de sitio de acción D3 = FRAC 24'),
  ('FRAC', 'D4', '25', 'Código de sitio de acción D4 = FRAC 25'),
  ('FRAC', 'D5', '41', 'Código de sitio de acción D5 = FRAC 41'),
  ('FRAC', 'E1', '13', 'Código de sitio de acción E1 = FRAC 13'),
  ('FRAC', 'E2', '12', 'Código de sitio de acción E2 = FRAC 12 (fenilpirroles)'),
  ('FRAC', 'E3', '2', 'Código de sitio de acción E3 = FRAC 2 (dicarboximidas)'),
  ('FRAC', 'F2', '6', 'Código de sitio de acción F2 = FRAC 6'),
  ('FRAC', 'F3', '14', 'Código de sitio de acción F3 = FRAC 14'),
  ('FRAC', 'F4', '28', 'Código de sitio de acción F4 = FRAC 28 (carbamatos)'),
  ('FRAC', 'G1', '3', 'Código de sitio de acción G1 = FRAC 3 (inhibidores de la desmetilación, DMI)'),
  ('FRAC', 'G2', '5', 'Código de sitio de acción G2 = FRAC 5 (aminas)'),
  ('FRAC', 'G4', '18', 'Código de sitio de acción G4 = FRAC 18'),
  ('FRAC', 'H4', '19', 'Código de sitio de acción H4 = FRAC 19'),
  ('FRAC', 'H5', '40', 'Código de sitio de acción H5 = FRAC 40 (CAA)'),
  ('FRAC', 'I1', '16.1', 'Código de sitio de acción I1 = FRAC 16.1'),
  ('FRAC', 'I2', '16.2', 'Código de sitio de acción I2 = FRAC 16.2');

-- HRAC: letra antigua → número actual (clasificación HRAC 2020). N y F3 no van por código: se repartieron entre
-- varios grupos nuevos; van por ingrediente más abajo.
insert into public.moa_equivalencias (sistema, codigo, codigo_actual, nota) values
  ('HRAC', 'A', '1', 'Grupo A antiguo = HRAC 1 (inhibidores de la ACCasa)'),
  ('HRAC', 'B', '2', 'Grupo B antiguo = HRAC 2 (inhibidores de la ALS)'),
  ('HRAC', 'C1', '5', 'Grupo C1 antiguo = HRAC 5 (fotosistema II)'),
  ('HRAC', 'C2', '5', 'Grupo C2 antiguo = HRAC 5 (fotosistema II)'),
  ('HRAC', 'C3', '6', 'Grupo C3 antiguo = HRAC 6 (fotosistema II)'),
  ('HRAC', 'D', '22', 'Grupo D antiguo = HRAC 22 (fotosistema I)'),
  ('HRAC', 'E', '14', 'Grupo E antiguo = HRAC 14 (inhibidores de la PPO)'),
  ('HRAC', '14/E', '14', 'La etiqueta trae el código actual y el antiguo: 14 y E'),
  ('HRAC', 'F1', '12', 'Grupo F1 antiguo = HRAC 12 (inhibidores de la PDS)'),
  ('HRAC', 'F2', '27', 'Grupo F2 antiguo = HRAC 27 (inhibidores de la HPPD)'),
  ('HRAC', 'G', '9', 'Grupo G antiguo = HRAC 9 (inhibidores de la EPSP sintasa)'),
  ('HRAC', 'H', '10', 'Grupo H antiguo = HRAC 10 (inhibidores de la glutamina sintetasa)'),
  ('HRAC', 'I', '18', 'Grupo I antiguo = HRAC 18'),
  ('HRAC', 'K1', '3', 'Grupo K1 antiguo = HRAC 3 (microtúbulos)'),
  ('HRAC', 'K2', '23', 'Grupo K2 antiguo = HRAC 23'),
  ('HRAC', 'K3', '15', 'Grupo K3 antiguo = HRAC 15 (ácidos grasos de cadena muy larga)'),
  ('HRAC', 'L', '29', 'Grupo L antiguo = HRAC 29 (síntesis de celulosa)'),
  ('HRAC', 'M', '24', 'Grupo M antiguo = HRAC 24'),
  ('HRAC', 'O', '4', 'Grupo O antiguo = HRAC 4 (auxinas sintéticas)'),
  ('HRAC', 'P', '19', 'Grupo P antiguo = HRAC 19');

-- Por ingrediente: cuando el código de la etiqueta solo no alcanza para saber el grupo actual.
insert into public.moa_equivalencias (sistema, codigo, codigo_actual, ingrediente_id, nota)
select v.sistema, v.codigo, v.codigo_actual, ai.id, v.nota
from (values
  ('FRAC', 'G', '3', 'Tebuconazol', 'La etiqueta dice «Grupo G, Clase 1», es decir G1 = FRAC 3'),
  ('FRAC', 'G3', '17', 'Fenhexamida', 'La etiqueta dice «G3 (… Hidroxianilidas)»: G3 = FRAC 17'),
  ('HRAC', 'N', '15', 'Etofumesato', 'Grupo N antiguo: los benzofuranos pasaron a HRAC 15'),
  ('HRAC', 'N', '15', 'Molinato', 'Grupo N antiguo: los tiocarbamatos pasaron a HRAC 15'),
  ('HRAC', 'F3', '32', 'Aclonifeno', 'Grupo F3 antiguo: el aclonifeno pasó a HRAC 32')
) as v(sistema, codigo, codigo_actual, nombre, nota)
join public.active_ingredients ai on ai.common_name = v.nombre and ai.mechanism_system = v.sistema and ai.mechanism_group = v.codigo;
