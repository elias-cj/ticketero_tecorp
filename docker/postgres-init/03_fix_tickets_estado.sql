-- =============================================================================
-- Migración / Corrección: Estado obligatorio y numeración correlativa desde TCK-00001
-- =============================================================================

-- 1. Asignar valor DEFAULT a estado_id en la tabla tickets
ALTER TABLE public.tickets 
  ALTER COLUMN estado_id SET DEFAULT '6c8a9009-475b-49cd-b4a0-e5497ee790c0'::uuid;

-- 2. Corregir cualquier ticket existente con estado nulo
UPDATE public.tickets
SET estado_id = COALESCE(
  (SELECT id FROM public.estados_ticket WHERE LOWER(TRIM(nombre)) = 'abierto' LIMIT 1),
  '6c8a9009-475b-49cd-b4a0-e5497ee790c0'::uuid
)
WHERE estado_id IS NULL;

-- 3. Si existe el ticket inicial de prueba TCK-10001, normalizarlo a TCK-00001
UPDATE public.tickets
SET numero_ticket = 'TCK-00001'
WHERE numero_ticket = 'TCK-10001'
  AND (SELECT count(*) FROM public.tickets) = 1;

-- 4. Actualizar la función del trigger para blindar estado_id y numeración desde 0
CREATE OR REPLACE FUNCTION public.generar_numero_ticket_auto() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_num INT;
  v_prefix TEXT;
BEGIN
  -- Blindaje: si viene NULL o vacío, asignar 'Abierto'
  IF NEW.estado_id IS NULL THEN
    NEW.estado_id := COALESCE(
      (SELECT id FROM public.estados_ticket WHERE lower(trim(nombre)) = 'abierto' LIMIT 1),
      '6c8a9009-475b-49cd-b4a0-e5497ee790c0'::uuid
    );
  END IF;

  -- Generar correlativo iniciando en 00001 (0 + 1)
  IF NEW.numero_ticket IS NULL OR NEW.numero_ticket = '' THEN
    v_prefix := CASE WHEN NEW.escalados IS TRUE THEN 'TCKIT-' ELSE 'TCK-' END;
    
    SELECT COALESCE(
      MAX(
        NULLIF(
          regexp_replace(numero_ticket, '[^0-9]', '', 'g'), 
          ''
        )::INT
      ), 
      0
    )
    INTO v_max_num
    FROM public.tickets;

    NEW.numero_ticket := v_prefix || lpad((v_max_num + 1)::text, 5, '0');
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Garantizar trigger BEFORE INSERT en tickets
DROP TRIGGER IF EXISTS trg_generar_numero_ticket ON public.tickets;
CREATE TRIGGER trg_generar_numero_ticket
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.generar_numero_ticket_auto();
