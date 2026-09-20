-- =============================================================================
-- 02_seeds.sql: Datos Maestros y SuperAdmin para Inicialización Limpia
-- =============================================================================

-- 1. Sembrar Matriz RBAC base (Modulos, Acciones, Permisos y Roles)
SELECT public.sembrar_matriz_rbac_inicial();

-- 2. Estados de Ticket
INSERT INTO public.estados_ticket (id, nombre) VALUES ('6c8a9009-475b-49cd-b4a0-e5497ee790c0', 'Abierto') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.estados_ticket (id, nombre) VALUES ('7a0172c5-8a96-49cf-98c3-8e9ef9bcbfc7', 'En Proceso') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.estados_ticket (id, nombre) VALUES ('6ca5dc05-d2c0-4a7a-a9c5-de4e974f56b9', 'Escalado') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.estados_ticket (id, nombre) VALUES ('bdc02081-afd2-4598-a110-c0409fd0f44f', 'Resuelto') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.estados_ticket (id, nombre) VALUES ('9952b6bf-fda4-4ee6-af38-c4d36683379a', 'Cerrado') ON CONFLICT (id) DO NOTHING;

-- 3. Prioridades de Ticket
INSERT INTO public.prioridades_ticket (id, nombre, nivel) VALUES ('26709bfa-a9ef-4a7c-8b13-f386d03ebd58', 'Baja', 1) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.prioridades_ticket (id, nombre, nivel) VALUES ('b34871f2-cf8d-4c5c-befb-5b99fbf96836', 'Media', 2) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.prioridades_ticket (id, nombre, nivel) VALUES ('265c1fbc-4f9c-450a-9fda-1065809b83f6', 'Alta', 3) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.prioridades_ticket (id, nombre, nivel) VALUES ('0e3647e7-f4f2-4978-ae86-f2a606473cf3', 'Crítica', 4) ON CONFLICT (id) DO NOTHING;

-- 4. Categorías de Problema
INSERT INTO public.categorias_problema (id, nombre) VALUES ('470cddea-faa2-4ba7-bdc9-145d25eccb85', 'General') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.categorias_problema (id, nombre) VALUES ('b60b72eb-865b-49d8-ab61-58aab72e4d0f', 'Redes') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.categorias_problema (id, nombre) VALUES ('5f8ac7e9-6082-442a-8eff-8723e385061b', 'Hardware') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.categorias_problema (id, nombre) VALUES ('f9ed0da8-8c9a-4663-a3ed-caea919e1bb4', 'Software') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.categorias_problema (id, nombre) VALUES ('a4def877-538b-4085-9ee6-6187efe4bea3', 'Accesos') ON CONFLICT (id) DO NOTHING;

-- 5. Tipos de Problema
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('fbb20918-df20-470e-8efd-7a74892e72b9', 'Sin acceso al sistema', '470cddea-faa2-4ba7-bdc9-145d25eccb85', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('b1a77a02-75c4-40ee-9e77-2656dd4ea4fe', 'Problemas de red / internet', '470cddea-faa2-4ba7-bdc9-145d25eccb85', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('e81657c4-d731-4df6-b75c-a6f84442b97d', 'Pantalla congelada', '470cddea-faa2-4ba7-bdc9-145d25eccb85', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('4a1b5f15-267f-4111-9ea2-54ff6a64ac42', 'Audio / micrófono no funciona', '470cddea-faa2-4ba7-bdc9-145d25eccb85', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('af23ab99-6b32-4f76-95fc-2c235fe22c7a', 'Otro', '470cddea-faa2-4ba7-bdc9-145d25eccb85', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('f1c9a7b6-2c6e-4a79-bdb4-5e0f5c3d2ea2', 'VPN no conecta', '470cddea-faa2-4ba7-bdc9-145d25eccb85', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('922a4870-8ddf-46c9-902d-5f1ef0654951', 'Equipo no enciende', '470cddea-faa2-4ba7-bdc9-145d25eccb85', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('ec6bfc87-1883-4d68-a293-6a5504863241', 'Software no responde', '470cddea-faa2-4ba7-bdc9-145d25eccb85', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('f390328b-70aa-4121-ad32-1dc1d06491e3', 'Ampliación de VPN', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('71bf9445-18a6-4328-9a87-edfde35fda34', 'Acceso a Carpeta Compartida', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('17a8970d-0649-4822-8f7f-822e41cc9aa7', 'Baja de Usuarios AD', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('3484908e-edc0-4a00-8a49-128a2884f7b5', 'Cambio de Equipo', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('ff4b1613-82f4-499b-872c-f4903cbd87ce', 'Cambio de VLAN', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('f3543488-51b6-40fe-84eb-7f5506b47679', 'Cargado de Base', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('602fc784-269b-4c58-ac89-bbd7ad2febee', 'Configuración de Audio de Softphone', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('88ce63ae-4767-44cf-bf45-63e35b382d96', 'Configuración de Correo', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('f0c3b4be-4a82-4b34-8fd6-f45548fc2ded', 'Configuración de Equipos', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('25f09a2a-6f96-4bf3-8184-7fe13da2df1c', 'Configuración de Herramienta', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('b31b4c8a-8ae0-4073-a63f-17dcb5e6473b', 'Configuración de Switches', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('553e573b-be99-467d-b7bd-d70eb1a2044c', 'Configuración de VPN', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('ffdefdbd-97df-4ddd-bcae-cbe46716c9be', 'Configuración de Sistemas de los Servicios', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('123b332b-405b-4cab-9939-ee77e48a0be6', 'Creación de Correo', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('89300e8e-a38e-4772-a4d6-84ef6375ce27', 'Creación de Usuarios VPN', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('9e7fc7cc-c28f-4379-8b0c-fc49bebd6089', 'Envío de QR para VPN', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('c82ce2ca-4482-4f61-92ca-fcf6c954045f', 'Escalado a Nivel 2 (L2)', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('bdfa756c-4227-4535-a3a9-858986a48301', 'Escalamiento al Cliente', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('33f5480a-1ae0-4b21-97c6-ad5d4713ac1c', 'Instalación de Audio de Softphone', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('fea16727-12d0-4bf0-a3d0-be693fdd47ce', 'Instalación de Equipos', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('eae00448-85e0-4a16-92dc-4aada8a1b1c6', 'Instalación de Sistemas de los Servicios', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('f3d2e66e-5cc6-427f-b3e7-88e0eabff695', 'Instalación de VPN', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('85cf831a-fbb8-4dc7-a206-7990a968c6a5', 'Mantenimiento de Hardware', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('1407be39-e27a-43c7-b67d-3ab489232799', 'Mantenimiento de Software', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('0acdae9d-c135-4a04-bc86-9016aadd7380', 'Mantenimiento y Testeo de Puntos de Red', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('c0462837-0739-449f-a0ff-56f7f426c3cf', 'Movimiento de Equipos', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('740f44a1-affc-4c98-86ba-51a83f4646cb', 'No Presenta Falla', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('f97a5e52-84b9-4898-8f41-fc64647e4af3', 'Problemas de Internet / Red', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('568e7d1a-3a76-4858-8604-02e1d6ac59b6', 'Reinicio de PC', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('81395598-3e05-43fe-9c19-8d45bf06ca84', 'Reseteo de Contraseña de Correo', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('7cbe5473-9a36-42a7-8982-1760d3368e18', 'Reseteo de Contraseña Conecta', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('cff52d06-0947-4534-9c7d-80979f5de154', 'Reseteo de Contraseña VPN', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('6a7d1034-c316-4056-8eae-b5f1f4fca1aa', 'Solicitud de Accesorios', '470cddea-faa2-4ba7-bdc9-145d25eccb85', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('dcf65b51-e644-46d6-8a17-6aeaae4b055f', 'configuracion de ip para tigo chat', 'a4def877-538b-4085-9ee6-6187efe4bea3', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tipos_problema (id, nombre, categoria_id, esta_activo) VALUES ('a0cd52fb-b02c-4b37-8733-3cc65fd7b533', 'BLOQUEO DE USUARIO', 'a4def877-538b-4085-9ee6-6187efe4bea3', true) ON CONFLICT (id) DO NOTHING;

-- 6. Call Centers (Centros de Contacto)
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('180bda49-97ec-4972-8e4a-c623107adf7f', 'MULEMPRESAS-01', 'Call Center Multiempresas', 'Multiempresas', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('3868f45f-0a17-445a-9dc5-e0e7a83cafb8', NULL, 'Call Center CDLA', 'CDLA', '100%', false, 'CDLA', '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('747fb0ca-4bf5-4961-86e8-28dffe2c7745', 'NACIONAL SEGUROS-03', 'Call Center Multiempresas - Nacional Seguros', 'Nacional Seguros', '100%', true, 'Nacional S.', '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('1d23525b-f724-4091-91fd-633f78ef1508', 'LBC', 'Call Center Telecobranzas - LBC', 'LBC', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('43558489-607a-4458-af24-f6158019c1e2', 'TIGO BOLIVIA B2B', 'Call Center NOC - Tigo Bolivia B2B', 'NOC', '100%', true, 'NOC', '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('4c48a076-efb7-4d39-8a93-41fa44fe691d', 'BANCO ECONOMICO-02', 'Call Center Multiempresas - Banco Economico', 'Economico', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('90e44f9e-680f-498c-8573-f34f86506bcc', 'BANCO ECONOMICO-01', 'Call Center Televentas - Banco Economico', 'Economico', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('5614411a-7f11-485b-b8f3-8c1e03d87d47', 'PA', 'Call Center TIGO Panamá', 'Panamá', '100%', true, 'TIGO PA', '507', 'linear-gradient(to bottom, #ffffff 25%, #005293 25% 50%, #d21034 50% 75%, #ffffff 75%)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('92f0ee81-81d1-46e7-b707-e9f1090e94aa', 'CA', 'Call Center TIGO Nicaragua', 'Nicaragua', '100%', true, 'TIGO NI', '505', 'linear-gradient(to bottom, #003594 33%, #ffffff 33% 66%, #003594 66%)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('47e42815-18cf-44bf-bae3-0c2f4f1400c1', 'CBN-01', 'Call Center CX - CBN', 'CBN', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('579dcd36-b830-4987-85e9-1312d9d73c22', 'TH', 'Int - Talento Humano', 'Humano', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('032bd077-99e3-45e3-9400-b720b82a1db4', 'CIES-01', 'Call Center Multiempresas - CIES', 'CIES', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('799f444b-8053-40ad-a68a-5626d41b2658', 'ITACAMBA-01', 'Call Center Telecobranzas - Itacamba', 'Itacamba', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('39d781d2-2e1c-4437-b35e-54610ec3a838', 'LINDE-01', 'Call Center Multiempresas - Linde', 'Linde', '100%', true, 'Linde', '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('a0b8d783-68a7-42b4-a448-ba080b7c7c34', 'MARATHON-01', 'Call Center Multiempresas - Marathon', 'Marathon', '100%', true, 'Marathon', '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('9d72dd30-3285-4f2a-a8c9-652f9dab9141', 'TIGO BOLIVIA-01MUM', 'Call Center Televentas - Tigo Bolivia B2B', 'B2B', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('23affb00-1ef8-4205-ab0c-0a00a3968f63', 'BO', 'Call Center TIGO Bolivia', 'Bolivia', '100%', true, 'TIGO BO', '591', 'linear-gradient(to bottom, #d52b1e 33%, #f9e300 33% 66%, #007934 66%)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('35d189c9-e5da-4757-b499-9c3ff58f8ac3', 'Pa', 'Call Center Paraguay', 'Paraguay', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('a85df2a1-513c-4823-885f-1f6b123290af', 'CONECTA-03', 'Comercial', 'Comercial', '100%', false, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('57ad4d75-81ef-4bb8-9f56-9ff28e7fb993', 'TIGO CENTRO AMERICA', 'Call Center Televentas - Tigo Panamá ', 'Televenta Panamá', '100%', true, 'Tel. Panamá', '507', 'linear-gradient(to bottom, #ffffff 25%, #005293 25% 50%, #d21034 50% 75%, #ffffff 75%)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('873771b8-764f-4f7c-9ce5-47962aeb4392', 'ALICONSUMOS', 'Call Center Televentas - Aliconsumos', 'Televentas', '100%', true, 'Televentas', '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('c35328fe-c210-4b94-b3b1-1af746617b88', NULL, 'Call Center Cobranzas', 'Cobranzas', '100%', true, 'Cobranzas', '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('b09bd514-171a-4874-ab05-f4efed398eee', 'BELCORP', 'Call Center Telecobranzas - Belcorp', 'Belcorp', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('55fb75f5-7061-4bdb-85cb-6f58f5d7ea57', 'GT', 'Call Center TIGO Guatemala', 'Guatemala', '100%', true, 'TIGO GT', '502', 'linear-gradient(to bottom, #4997d0 33%, #ffffff 33% 66%, #4997d0 66%)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('38be46a9-ce2a-4e5c-bd71-09f02abc975c', 'CONECTA-04', 'Call Center Televentas', 'Televentas', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('077641cf-37c6-4a1d-9c3c-8837fd4c14b1', 'CONECTA-05', 'Call Center Telecobranzas', 'Telecobranzas', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('fe0395d2-b9a7-4cac-871d-6877ce774a09', 'NACIONAL SEGUROS-01', 'Call Center Televentas - Nacional Seguros', 'Seguros', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('1f84a6ce-0ca3-45cc-8a86-c6c74ab3dcbd', 'NACIONAL SEGUROS-02', 'Call Center Telecobranzas - Nacional Seguros', 'Seguros', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('ce18741d-bcd6-4463-9be9-4c7eba9fd1e1', 'OGA', 'Call Center Telecobranzas - OGA', 'OGA', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('9b7ed0ed-eb46-4d4b-a3ad-1809d37edd13', 'WF', 'Int - Workforce - Programación y Planificación', 'WORKFORCE', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('7c0685c0-9bb6-41ac-a011-a5dbdcde1cb9', 'CONECTA-03 ', 'Int - Administración y Contabilidad', 'Contabilidad', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('7e96d73b-5a2e-40a3-850d-7cafb5623464', 'TIGO CENTRO AMERICA-01', 'Call Center Televentas - Tigo Nicaragua ', 'Televenta Nicaragua', '100%', true, 'Tel. Nicaragua', '505', 'linear-gradient(to bottom, #003594 33%, #ffffff 33% 66%, #003594 66%)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('05ec9dd9-449a-4e85-a02a-ed02ba46bc48', 'TIGO BOLIVIA B2C', 'Call Center Telecobranzas - Tigo Bolivia B2C', 'B2C', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('a42095e9-8c69-43f9-a9c8-6bc81afe4542', 'TIGO CENTRO AMERICA-02', 'Call Center Telecobranzas - Tigo Nicaragua', 'Panamá', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('e9bbcf4a-b3b2-4410-a986-73d037f967d3', 'CONECTA', 'Int - RRHH', 'RRHH', '100%', true, 'RRHH', '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('b5947c13-355c-4422-a383-3a168230658d', 'BI', 'Int - BI - Inteligencia De Negocios', 'BI', '100%', true, 'BI', '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('51119c80-64c9-4104-91e5-c9a6d469ab29', 'CONECTA-01', 'Int - Innovación', 'Innovación', '100%', true, 'Innovación', '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('4bd87be4-6dfe-4c5f-8f35-b70203363387', 'cp', 'Int - Capacitacion', 'Capacitacion', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('2ea98c4e-5244-412b-9ad1-f77fa89df739', 'CONECTA-02', 'Int - Calidad', 'Calidad', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('d837f89a-6543-4fcb-8284-6c8cb76e0227', 'ALICORP', 'Call Center Multiempresas Multiskill - Alicorp ', 'Multiskill', '100%', true, 'Multiskill', '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('7809b752-4efd-4979-ad38-d026e6781baf', 'ASSIST CARD', 'Call Center Multiempresas Multiskill - Assist Card', 'Card', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('f982fb86-4300-403e-a580-08112ae04605', 'ASSIST CARD - ECONOMICO', 'Call Center Multiempresas Multiskill - Assist Card Economico', 'Economico', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('d38e7c63-669e-4062-aa2f-0d2742a2509a', 'CONECTA-06', 'Call Center Multiempresas Multiskill - Conecta', 'Conecta', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('5540a1f6-e564-4655-aadf-65f5ea40a09d', 'IMCRUZ', 'Call Center Multiempresas Multiskill - Imcruz', 'Imcruz', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('745ab50f-504d-4620-9661-9218ea5f766c', 'MEDICUAN - INNOVA BROKERS', 'Call Center Multiempresas Multiskill - Medicuan Innova Brokers', 'Brokers', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('2543811c-c702-4e3e-b989-20719fd60dcd', 'PREMIUM BRANDS', 'Call Center Multiempresas Multiskill - Premium Brands', 'Brands', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('b4a28eb5-b8de-4d5f-98fa-5665e7c20085', 'MULTIEMPRESAS', 'Call Center Multiempresas Multiskil', 'Multiskil', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('e3671c15-4207-4d4e-8de0-1f8f2f7e8d67', 'UNIBROSA', 'Call Center Multiempresas Multiskill - Unibrosa', 'Unibrosa', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('5f0e9a7a-8e9b-4e2d-a634-09cb80a555c6', 'LBC--', 'Call Center LBC', 'LBC', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('1eb05cbf-c9ab-4b53-a0f7-bfdf751f9bec', 'CBN-02', 'Call Center Grow - CBN', 'CBN', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('5edafc94-e65d-4aee-8877-528c6f5bc3d2', 'ITACAMBA-02', 'Call Center Multiempresas - Itacamba', 'Itacamba', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('d98440d2-3652-486e-9fee-eb5e392daa30', 'NACIONAL SEGUROS-04', 'Call Center Multiempresas Fábrica de Pólizas - Nacional Seguros', 'Seguros', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('7be988b3-1cd8-4388-9a60-672dc79cd6f2', 'SIKA LATAM-01', 'Call Center Multiempresas - Sika LATAM', 'LATAM', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('ea8052b9-a509-4b4a-9dc4-b2023693939c', 'SIKA USA-01', 'Call Center Multiempresas - Sika USA', 'USA', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('d5b2e368-42be-45cb-8422-c703eb3d92f9', 'TIGO BOLIVIA-02MYUMYU', 'Call Center Televentas - Tigo Bolivia B2B', 'B2B', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.call_centers (id, codigo, nombre, pais, nivel_servicio, esta_activo, nombre_corto, codigo_telefono, color_bandera) VALUES ('c6dcd575-84c4-4e00-8ca9-3348b106915e', 'TIGO BOLIVIA-03BDBD', 'Call Center Televentas - Tigo Bolivia B2B', 'B2B', '100%', true, NULL, '591', 'var(--primary)') ON CONFLICT (id) DO NOTHING;

-- 7. Usuario SuperAdmin Raíz (admin@admin.com / admin)
INSERT INTO public.usuarios (id, nombre_completo, email, esta_activo, creado_en, actualizado_en, password, debe_cambiar_password)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Elias CJ',
  'admin@admin.com',
  TRUE,
  NOW(),
  NOW(),
  crypt('admin', gen_salt('bf', 10)),
  FALSE
)
ON CONFLICT (id) DO UPDATE SET
  password = crypt('admin', gen_salt('bf', 10)),
  esta_activo = TRUE,
  debe_cambiar_password = FALSE;

-- 8. Asignar rol Administrador Supremo al SuperAdmin
INSERT INTO public.roles_usuario (usuario_id, rol_id, asignado_por, asignado_en)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', r.id, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW()
FROM public.roles r
WHERE r.nombre = 'Administrador Supremo'
ON CONFLICT (usuario_id, rol_id) DO NOTHING;

-- 9. Asignar todos los permisos del sistema al rol Administrador Supremo
INSERT INTO public.permisos_rol (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permisos p
WHERE r.nombre = 'Administrador Supremo'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;
