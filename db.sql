-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.asset_mapping (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  asset_class text NOT NULL,
  asset_name text NOT NULL,
  form_service_layer text NOT NULL,
  form_service_layer_num text NOT NULL,
  relate_guid_key_name text NOT NULL,
  use_point_layer_guid boolean NOT NULL DEFAULT true,
  save_guid_to_child boolean NOT NULL DEFAULT false,
  parent_asset_name text,
  child_keys ARRAY NOT NULL DEFAULT '{}'::text[],
  match_terms ARRAY NOT NULL DEFAULT '{}'::text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT asset_mapping_pkey PRIMARY KEY (id),
  CONSTRAINT asset_mapping_form_service_layer_fkey FOREIGN KEY (form_service_layer) REFERENCES public.published_forms(form_name)
);
CREATE TABLE public.asset_mapping_revisions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  asset_mapping_id uuid NOT NULL,
  previous_value jsonb NOT NULL,
  changed_by text NOT NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  note text,
  CONSTRAINT asset_mapping_revisions_pkey PRIMARY KEY (id),
  CONSTRAINT asset_mapping_revisions_asset_mapping_id_fkey FOREIGN KEY (asset_mapping_id) REFERENCES public.asset_mapping(id)
);
CREATE TABLE public.published_forms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  form_name text NOT NULL UNIQUE,
  total_layer_count integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT published_forms_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'PM'::text CHECK (role = ANY (ARRAY['PM'::text, 'ADMIN'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.work_order_cache (
  id integer NOT NULL DEFAULT 1 CHECK (id = 1),
  data jsonb NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT work_order_cache_pkey PRIMARY KEY (id)
);
CREATE TABLE public.work_order_revisions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  wo_num text NOT NULL,
  field text NOT NULL CHECK (field = ANY (ARRAY['processed_data'::text, 'arcgis_payload'::text])),
  previous_value jsonb NOT NULL,
  new_value jsonb NOT NULL,
  changed_by text NOT NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  note text,
  CONSTRAINT work_order_revisions_pkey PRIMARY KEY (id),
  CONSTRAINT work_order_revisions_wo_num_fkey FOREIGN KEY (wo_num) REFERENCES public.work_orders(wo_num)
);
CREATE TABLE public.work_orders (
  wo_num text NOT NULL,
  parent_wo_num text,
  raw_data jsonb NOT NULL,
  processed_data jsonb,
  arcgis_payload jsonb,
  status text NOT NULL DEFAULT 'RECEIVED'::text CHECK (status = ANY (ARRAY['RECEIVED'::text, 'QUEUED'::text, 'SENT'::text, 'ERROR'::text, 'SKIPPED'::text])),
  arcgis_object_id text,
  arcgis_form text,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT work_orders_pkey PRIMARY KEY (wo_num)
);