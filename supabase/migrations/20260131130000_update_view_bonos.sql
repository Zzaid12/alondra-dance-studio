DROP VIEW IF EXISTS public.vista_bonos_activos;

create or replace view public.vista_bonos_activos as
select b.id as bono_usuario_id,
       b.usuario_id,
       tb.nombre as tipo_bono,
       tb.numero_barras_tipo,
       b.clases_restantes,
       b.clases_totales,
       b.fecha_compra,
       b.fecha_caducidad,
       greatest((b.fecha_caducidad::date - current_date), 0) as dias_restantes,
       b.estado
from public.bonos_usuario b
join public.tipos_bono tb on tb.id = b.tipo_bono_id
where b.estado = 'activo';
