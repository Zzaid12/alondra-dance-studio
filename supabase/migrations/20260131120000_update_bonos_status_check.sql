ALTER TABLE public.bonos_usuario DROP CONSTRAINT IF EXISTS bonos_usuario_estado_check;

ALTER TABLE public.bonos_usuario 
ADD CONSTRAINT bonos_usuario_estado_check 
CHECK (estado IN ('activo', 'agotado', 'caducado', 'cancelado', 'eliminado'));
