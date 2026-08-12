-- =============================================================================
-- 3. SECUENCIAS, FUNCIONES PLPGSQL Y TRIGGERS AUTOMÁTICOS
-- Proyecto: Support-Connect
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS public.ticket_number_seq START WITH 10500;

CREATE OR REPLACE FUNCTION public.generar_numero_ticket_auto()
RETURNS trigger AS $$
DECLARE
  v_max_num INT;
  v_prefix TEXT;
BEGIN
  IF NEW.numero_ticket IS NULL OR NEW.numero_ticket = '' THEN
    v_prefix := CASE WHEN NEW.escalados IS TRUE THEN 'TCKIT-' ELSE 'TCK-' END;
    
    -- Extraer el número numérico más alto existente en la base de datos
    SELECT COALESCE(
      MAX(
        NULLIF(
          regexp_replace(numero_ticket, '[^0-9]', '', 'g'), 
          ''
        )::INT
      ), 
      10000
    )
    INTO v_max_num
    FROM public.tickets;

    NEW.numero_ticket := v_prefix || lpad((v_max_num + 1)::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generar_numero_ticket ON public.tickets;
CREATE TRIGGER trg_generar_numero_ticket
BEFORE INSERT ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.generar_numero_ticket_auto();

CREATE OR REPLACE FUNCTION public.tickets_vector_busqueda_update()
RETURNS trigger AS $$
BEGIN
  NEW.vector_busqueda :=
    setweight(to_tsvector('pg_catalog.spanish', COALESCE(NEW.numero_ticket, '')), 'A') ||
    setweight(to_tsvector('pg_catalog.spanish', COALESCE(NEW.nombre_solicitante, '')), 'A') ||
    setweight(to_tsvector('pg_catalog.spanish', COALESCE(NEW.titulo, '')), 'B') ||
    setweight(to_tsvector('pg_catalog.spanish', COALESCE(NEW.puesto_trabajo, '')), 'C') ||
    setweight(to_tsvector('pg_catalog.spanish', COALESCE(NEW.descripcion, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tickets_vector_busqueda ON public.tickets;
CREATE TRIGGER trg_tickets_vector_busqueda
BEFORE INSERT OR UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.tickets_vector_busqueda_update();

