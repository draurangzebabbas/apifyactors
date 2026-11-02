# schema visualizer

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_url text NOT NULL UNIQUE,
  group_name text,
  group_type text NOT NULL CHECK (group_type = ANY (ARRAY['public'::text, 'private'::text])),
  status text NOT NULL DEFAULT 'SUBMITTED'::text CHECK (status = ANY (ARRAY['SUBMITTED'::text, 'ACTIVE'::text, 'PAUSED'::text, 'REJECTED'::text, 'NEEDS_COOKIE'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  current_results_limit integer NOT NULL DEFAULT 30,
  adaptive_state text NOT NULL DEFAULT 'NORMAL'::text,
  CONSTRAINT groups_pkey PRIMARY KEY (id)
);
CREATE TABLE public.group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  cookie_id uuid,
  CONSTRAINT group_members_pkey PRIMARY KEY (id),
  CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT group_members_cookie_id_fkey FOREIGN KEY (cookie_id) REFERENCES public.user_cookies(id)
);
CREATE TABLE public.facebook_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  post_id text NOT NULL UNIQUE,
  author text,
  content text,
  post_url text,
  posted_at timestamp with time zone,
  scraped_at timestamp with time zone NOT NULL DEFAULT now(),
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  media_urls jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT facebook_posts_pkey PRIMARY KEY (id),
  CONSTRAINT facebook_posts_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.scrape_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['SUCCESS'::text, 'FAILED'::text, 'NO_COOKIES'::text])),
  posts_found integer NOT NULL DEFAULT 0,
  error_msg text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone,
  cookie_id uuid,
  requested_limit integer,
  new_posts_count integer DEFAULT 0,
  near_limit boolean NOT NULL DEFAULT false,
  limit_hit boolean NOT NULL DEFAULT false,
  cost_usd numeric DEFAULT 0,
  CONSTRAINT scrape_runs_pkey PRIMARY KEY (id),
  CONSTRAINT scrape_runs_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT scrape_runs_cookie_id_fkey FOREIGN KEY (cookie_id) REFERENCES public.user_cookies(id)
);
CREATE TABLE public.api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key_value text NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT 'apify'::text,
  status text NOT NULL DEFAULT 'ACTIVE'::text CHECK (status = ANY (ARRAY['Active'::text, 'Quota Exhausted'::text, 'Token Invalid'::text, 'ACTIVE'::text, 'INACTIVE'::text, 'INVALID'::text, 'RATE_LIMITED'::text, 'FAILED'::text])),
  fail_count integer NOT NULL DEFAULT 0,
  cooldown_until timestamp with time zone,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  key_name text,
  last_used timestamp with time zone,
  health numeric DEFAULT 100,
  usage_usd numeric DEFAULT 0,
  limit_usd numeric DEFAULT 5.0,
  CONSTRAINT api_keys_pkey PRIMARY KEY (id)
);
CREATE TABLE public.admin_users (
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admin_users_pkey PRIMARY KEY (user_id),
  CONSTRAINT admin_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  email text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  push_subscription jsonb,
  telegram_chat_id text,
  slack_webhook_url text,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.subscriptions (
  id text NOT NULL,
  user_id uuid,
  polar_customer_id text,
  status text,
  plan_id text,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  email text,
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_cookies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cookie_name text NOT NULL,
  cookie_value text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE'::text CHECK (status = ANY (ARRAY['ACTIVE'::text, 'FAILED'::text, 'EXPIRED'::text])),
  fail_count integer NOT NULL DEFAULT 0,
  last_used_at timestamp with time zone,
  last_failed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_cookies_pkey PRIMARY KEY (id),
  CONSTRAINT user_cookies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_keywords (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rule_name text NOT NULL,
  must_include ARRAY DEFAULT '{}'::text[],
  any_of ARRAY DEFAULT '{}'::text[],
  must_exclude ARRAY DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  auto_comment_enabled boolean DEFAULT false,
  user_page_id uuid,
  comment_pool_id uuid,
  cookie_id uuid,
  cookie_ids ARRAY DEFAULT '{}'::uuid[],
  group_ids ARRAY DEFAULT '{}'::uuid[],
  comment_delay_seconds integer DEFAULT 5,
  CONSTRAINT user_keywords_pkey PRIMARY KEY (id),
  CONSTRAINT user_keywords_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_keywords_cookie_id_fkey FOREIGN KEY (cookie_id) REFERENCES public.user_cookies(id),
  CONSTRAINT user_keywords_user_page_id_fkey FOREIGN KEY (user_page_id) REFERENCES public.user_pages(id),
  CONSTRAINT user_keywords_comment_pool_id_fkey FOREIGN KEY (comment_pool_id) REFERENCES public.comment_pools(id)
);
CREATE TABLE public.user_post_matches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  keyword_id uuid,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_post_matches_pkey PRIMARY KEY (id),
  CONSTRAINT user_post_matches_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_post_matches_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.facebook_posts(id),
  CONSTRAINT user_post_matches_keyword_id_fkey FOREIGN KEY (keyword_id) REFERENCES public.user_keywords(id)
);
CREATE TABLE public.notification_channels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  channel_type text NOT NULL CHECK (channel_type = ANY (ARRAY['telegram'::text, 'email'::text, 'web_push'::text])),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notification_channels_pkey PRIMARY KEY (id),
  CONSTRAINT notification_channels_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  keyword_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel = ANY (ARRAY['telegram'::text, 'email'::text, 'web_push'::text, 'in_app'::text])),
  status text NOT NULL DEFAULT 'PENDING'::text CHECK (status = ANY (ARRAY['PENDING'::text, 'SENT'::text, 'FAILED'::text])),
  error_msg text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  sent_at timestamp with time zone,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT notifications_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.facebook_posts(id),
  CONSTRAINT notifications_keyword_id_fkey FOREIGN KEY (keyword_id) REFERENCES public.user_keywords(id)
);
CREATE TABLE public.hourly_post_stats (
  group_id uuid NOT NULL,
  date date NOT NULL,
  hour integer NOT NULL,
  post_count integer DEFAULT 1,
  CONSTRAINT hourly_post_stats_pkey PRIMARY KEY (group_id, date, hour)
);
CREATE TABLE public.hourly_user_match_stats (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  group_id uuid NOT NULL,
  date date NOT NULL,
  hour integer NOT NULL CHECK (hour >= 0 AND hour <= 23),
  match_count integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT hourly_user_match_stats_pkey PRIMARY KEY (id),
  CONSTRAINT hourly_user_match_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT hourly_user_match_stats_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.daily_scrape_cost_summary (
  date date NOT NULL,
  group_id uuid NOT NULL,
  total_cost_usd numeric NOT NULL DEFAULT 0,
  runs_count integer NOT NULL DEFAULT 0,
  new_posts_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT daily_scrape_cost_summary_pkey PRIMARY KEY (date, group_id),
  CONSTRAINT daily_scrape_cost_summary_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.historical_group_stats (
  group_id uuid NOT NULL,
  lifetime_posts_tracked bigint NOT NULL DEFAULT 0,
  lifetime_cost_usd numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT historical_group_stats_pkey PRIMARY KEY (group_id),
  CONSTRAINT historical_group_stats_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.user_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  composio_connection_id text NOT NULL,
  page_id text NOT NULL,
  page_name text NOT NULL,
  page_avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_pages_pkey PRIMARY KEY (id),
  CONSTRAINT user_pages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.comment_pools (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT comment_pools_pkey PRIMARY KEY (id),
  CONSTRAINT comment_pools_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.comment_pool_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pool_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT comment_pool_items_pkey PRIMARY KEY (id),
  CONSTRAINT comment_pool_items_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.comment_pools(id)
);
CREATE TABLE public.auto_comment_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id text NOT NULL,
  keyword_id uuid,
  user_page_id uuid,
  comment_text text,
  status text NOT NULL,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  cookie_id uuid,
  cost_usd numeric DEFAULT 0,
  CONSTRAINT auto_comment_logs_pkey PRIMARY KEY (id),
  CONSTRAINT auto_comment_logs_cookie_id_fkey FOREIGN KEY (cookie_id) REFERENCES public.user_cookies(id),
  CONSTRAINT auto_comment_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT auto_comment_logs_keyword_id_fkey FOREIGN KEY (keyword_id) REFERENCES public.user_keywords(id),
  CONSTRAINT auto_comment_logs_user_page_id_fkey FOREIGN KEY (user_page_id) REFERENCES public.user_pages(id)
);
CREATE TABLE public.daily_comment_cost_summary (
  date date NOT NULL,
  user_id uuid NOT NULL,
  total_cost_usd numeric DEFAULT 0,
  comments_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT daily_comment_cost_summary_pkey PRIMARY KEY (date, user_id),
  CONSTRAINT daily_comment_cost_summary_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

# schema auth

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE auth.users (
  instance_id uuid,
  id uuid NOT NULL,
  aud character varying,
  role character varying,
  email character varying,
  encrypted_password character varying,
  email_confirmed_at timestamp with time zone,
  invited_at timestamp with time zone,
  confirmation_token character varying,
  confirmation_sent_at timestamp with time zone,
  recovery_token character varying,
  recovery_sent_at timestamp with time zone,
  email_change_token_new character varying,
  email_change character varying,
  email_change_sent_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  is_super_admin boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  phone text DEFAULT NULL::character varying UNIQUE,
  phone_confirmed_at timestamp with time zone,
  phone_change text DEFAULT ''::character varying,
  phone_change_token character varying DEFAULT ''::character varying,
  phone_change_sent_at timestamp with time zone,
  confirmed_at timestamp with time zone DEFAULT LEAST(email_confirmed_at, phone_confirmed_at),
  email_change_token_current character varying DEFAULT ''::character varying,
  email_change_confirm_status smallint DEFAULT 0 CHECK (email_change_confirm_status >= 0 AND email_change_confirm_status <= 2),
  banned_until timestamp with time zone,
  reauthentication_token character varying DEFAULT ''::character varying,
  reauthentication_sent_at timestamp with time zone,
  is_sso_user boolean NOT NULL DEFAULT false,
  deleted_at timestamp with time zone,
  is_anonymous boolean NOT NULL DEFAULT false,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE auth.refresh_tokens (
  instance_id uuid,
  id bigint NOT NULL DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass),
  token character varying UNIQUE,
  user_id character varying,
  revoked boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  parent character varying,
  session_id uuid,
  CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id)
);
CREATE TABLE auth.instances (
  id uuid NOT NULL,
  uuid uuid,
  raw_base_config text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  CONSTRAINT instances_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.audit_log_entries (
  instance_id uuid,
  id uuid NOT NULL,
  payload json,
  created_at timestamp with time zone,
  ip_address character varying NOT NULL DEFAULT ''::character varying,
  CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.schema_migrations (
  version character varying NOT NULL,
  CONSTRAINT schema_migrations_pkey PRIMARY KEY (version)
);
CREATE TABLE auth.identities (
  provider_id text NOT NULL,
  user_id uuid NOT NULL,
  identity_data jsonb NOT NULL,
  provider text NOT NULL,
  last_sign_in_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  email text DEFAULT lower((identity_data ->> 'email'::text)),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT identities_pkey PRIMARY KEY (id),
  CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE auth.sessions (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  factor_id uuid,
  aal USER-DEFINED,
  not_after timestamp with time zone,
  refreshed_at timestamp without time zone,
  user_agent text,
  ip inet,
  tag text,
  oauth_client_id uuid,
  refresh_token_hmac_key text,
  refresh_token_counter bigint,
  scopes text CHECK (char_length(scopes) <= 4096),
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id)
);
CREATE TABLE auth.mfa_factors (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  friendly_name text,
  factor_type USER-DEFINED NOT NULL,
  status USER-DEFINED NOT NULL,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  secret text,
  phone text,
  last_challenged_at timestamp with time zone UNIQUE,
  web_authn_credential jsonb,
  web_authn_aaguid uuid,
  last_webauthn_challenge_data jsonb,
  CONSTRAINT mfa_factors_pkey PRIMARY KEY (id),
  CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE auth.mfa_challenges (
  id uuid NOT NULL,
  factor_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL,
  verified_at timestamp with time zone,
  ip_address inet NOT NULL,
  otp_code text,
  web_authn_session_data jsonb,
  CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id),
  CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id)
);
CREATE TABLE auth.mfa_amr_claims (
  session_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  authentication_method text NOT NULL,
  id uuid NOT NULL,
  CONSTRAINT mfa_amr_claims_pkey PRIMARY KEY (id),
  CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id)
);
CREATE TABLE auth.sso_providers (
  id uuid NOT NULL,
  resource_id text CHECK (resource_id = NULL::text OR char_length(resource_id) > 0),
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  disabled boolean,
  CONSTRAINT sso_providers_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.sso_domains (
  id uuid NOT NULL,
  sso_provider_id uuid NOT NULL,
  domain text NOT NULL CHECK (char_length(domain) > 0),
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  CONSTRAINT sso_domains_pkey PRIMARY KEY (id),
  CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id)
);
CREATE TABLE auth.saml_providers (
  id uuid NOT NULL,
  sso_provider_id uuid NOT NULL,
  entity_id text NOT NULL UNIQUE CHECK (char_length(entity_id) > 0),
  metadata_xml text NOT NULL CHECK (char_length(metadata_xml) > 0),
  metadata_url text CHECK (metadata_url = NULL::text OR char_length(metadata_url) > 0),
  attribute_mapping jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  name_id_format text,
  CONSTRAINT saml_providers_pkey PRIMARY KEY (id),
  CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id)
);
CREATE TABLE auth.saml_relay_states (
  id uuid NOT NULL,
  sso_provider_id uuid NOT NULL,
  request_id text NOT NULL CHECK (char_length(request_id) > 0),
  for_email text,
  redirect_to text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  flow_state_id uuid,
  CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id),
  CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id),
  CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id)
);
CREATE TABLE auth.flow_state (
  id uuid NOT NULL,
  user_id uuid,
  auth_code text,
  code_challenge_method USER-DEFINED,
  code_challenge text,
  provider_type text NOT NULL,
  provider_access_token text,
  provider_refresh_token text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  authentication_method text NOT NULL,
  auth_code_issued_at timestamp with time zone,
  invite_token text,
  referrer text,
  oauth_client_state_id uuid,
  linking_target_id uuid,
  email_optional boolean NOT NULL DEFAULT false,
  CONSTRAINT flow_state_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.one_time_tokens (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  token_type USER-DEFINED NOT NULL,
  token_hash text NOT NULL CHECK (char_length(token_hash) > 0),
  relates_to text NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE auth.oauth_clients (
  id uuid NOT NULL,
  client_secret_hash text,
  registration_type USER-DEFINED NOT NULL,
  redirect_uris text NOT NULL,
  grant_types text NOT NULL,
  client_name text CHECK (char_length(client_name) <= 1024),
  client_uri text CHECK (char_length(client_uri) <= 2048),
  logo_uri text CHECK (char_length(logo_uri) <= 2048),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  client_type USER-DEFINED NOT NULL DEFAULT 'confidential'::auth.oauth_client_type,
  token_endpoint_auth_method text NOT NULL CHECK (token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])),
  CONSTRAINT oauth_clients_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.oauth_authorizations (
  id uuid NOT NULL,
  authorization_id text NOT NULL UNIQUE,
  client_id uuid NOT NULL,
  user_id uuid,
  redirect_uri text NOT NULL CHECK (char_length(redirect_uri) <= 2048),
  scope text NOT NULL CHECK (char_length(scope) <= 4096),
  state text CHECK (char_length(state) <= 4096),
  resource text CHECK (char_length(resource) <= 2048),
  code_challenge text CHECK (char_length(code_challenge) <= 128),
  code_challenge_method USER-DEFINED,
  response_type USER-DEFINED NOT NULL DEFAULT 'code'::auth.oauth_response_type,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::auth.oauth_authorization_status,
  authorization_code text UNIQUE CHECK (char_length(authorization_code) <= 255),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '00:03:00'::interval),
  approved_at timestamp with time zone,
  nonce text CHECK (char_length(nonce) <= 255),
  CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id),
  CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id),
  CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE auth.oauth_consents (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  client_id uuid NOT NULL,
  scopes text NOT NULL CHECK (char_length(scopes) <= 2048),
  granted_at timestamp with time zone NOT NULL DEFAULT now(),
  revoked_at timestamp with time zone,
  CONSTRAINT oauth_consents_pkey PRIMARY KEY (id),
  CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id)
);
CREATE TABLE auth.oauth_client_states (
  id uuid NOT NULL,
  provider_type text NOT NULL,
  code_verifier text,
  created_at timestamp with time zone NOT NULL,
  CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.custom_oauth_providers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_type text NOT NULL CHECK (provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text])),
  identifier text NOT NULL UNIQUE CHECK (identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text),
  name text NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  client_id text NOT NULL CHECK (char_length(client_id) >= 1 AND char_length(client_id) <= 512),
  client_secret text NOT NULL,
  acceptable_client_ids ARRAY NOT NULL DEFAULT '{}'::text[],
  scopes ARRAY NOT NULL DEFAULT '{}'::text[],
  pkce_enabled boolean NOT NULL DEFAULT true,
  attribute_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  authorization_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  email_optional boolean NOT NULL DEFAULT false,
  issuer text CHECK (issuer IS NULL OR char_length(issuer) >= 1 AND char_length(issuer) <= 2048),
  discovery_url text CHECK (discovery_url IS NULL OR char_length(discovery_url) <= 2048),
  skip_nonce_check boolean NOT NULL DEFAULT false,
  cached_discovery jsonb,
  discovery_cached_at timestamp with time zone,
  authorization_url text CHECK (authorization_url IS NULL OR authorization_url ~~ 'https://%'::text),
  token_url text CHECK (token_url IS NULL OR token_url ~~ 'https://%'::text),
  userinfo_url text CHECK (userinfo_url IS NULL OR userinfo_url ~~ 'https://%'::text),
  jwks_uri text CHECK (jwks_uri IS NULL OR jwks_uri ~~ 'https://%'::text),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  custom_claims_allowlist ARRAY NOT NULL DEFAULT '{}'::text[],
  CONSTRAINT custom_oauth_providers_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.webauthn_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  credential_id bytea NOT NULL,
  public_key bytea NOT NULL,
  attestation_type text NOT NULL DEFAULT ''::text,
  aaguid uuid,
  sign_count bigint NOT NULL DEFAULT 0,
  transports jsonb NOT NULL DEFAULT '[]'::jsonb,
  backup_eligible boolean NOT NULL DEFAULT false,
  backed_up boolean NOT NULL DEFAULT false,
  friendly_name text NOT NULL DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone,
  CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id),
  CONSTRAINT webauthn_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE auth.webauthn_challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  challenge_type text NOT NULL CHECK (challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text])),
  session_data jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  CONSTRAINT webauthn_challenges_pkey PRIMARY KEY (id),
  CONSTRAINT webauthn_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE auth.scim_users (
  id uuid NOT NULL,
  sso_provider_id uuid NOT NULL,
  user_id uuid,
  resource jsonb NOT NULL,
  user_name text NOT NULL DEFAULT lower((resource ->> 'userName'::text)),
  external_id text DEFAULT (resource ->> 'externalId'::text),
  active boolean NOT NULL DEFAULT COALESCE(((resource ->> 'active'::text))::boolean, true),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT scim_users_pkey PRIMARY KEY (id),
  CONSTRAINT scim_users_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id),
  CONSTRAINT scim_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE auth.scim_tokens (
  id uuid NOT NULL,
  sso_provider_id uuid NOT NULL,
  token_hash text NOT NULL CHECK (token_hash ~ '^[0-9a-f]{64}$'::text),
  prefix text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  revoked_at timestamp with time zone,
  last_used_at timestamp with time zone,
  CONSTRAINT scim_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT scim_tokens_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id)
);
CREATE TABLE auth.mfa_recovery_code_sets (
  id uuid NOT NULL,
  user_id uuid NOT NULL UNIQUE,
  mfa_factor_id uuid NOT NULL UNIQUE,
  failed_verification_count integer NOT NULL DEFAULT 0 CHECK (failed_verification_count >= 0),
  verification_locked_until timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT mfa_recovery_code_sets_pkey PRIMARY KEY (id),
  CONSTRAINT mfa_recovery_code_sets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT mfa_recovery_code_sets_mfa_factor_id_fkey FOREIGN KEY (mfa_factor_id) REFERENCES auth.mfa_factors(id)
);
CREATE TABLE auth.mfa_recovery_codes (
  id uuid NOT NULL,
  mfa_recovery_code_set_id uuid NOT NULL,
  code_hash text NOT NULL,
  consumed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT mfa_recovery_codes_pkey PRIMARY KEY (id),
  CONSTRAINT mfa_recovery_codes_mfa_recovery_code_set_id_fkey FOREIGN KEY (mfa_recovery_code_set_id) REFERENCES auth.mfa_recovery_code_sets(id)
);

# schema cron
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE cron.job (
  jobid bigint NOT NULL DEFAULT nextval('cron.jobid_seq'::regclass),
  schedule text NOT NULL,
  command text NOT NULL,
  nodename text NOT NULL DEFAULT 'localhost'::text,
  nodeport integer NOT NULL DEFAULT inet_server_port(),
  database text NOT NULL DEFAULT current_database(),
  username text NOT NULL DEFAULT CURRENT_USER,
  active boolean NOT NULL DEFAULT true,
  jobname text,
  CONSTRAINT job_pkey PRIMARY KEY (jobid)
);
CREATE TABLE cron.job_run_details (
  jobid bigint,
  runid bigint NOT NULL DEFAULT nextval('cron.runid_seq'::regclass),
  job_pid integer,
  database text,
  username text,
  command text,
  status text,
  return_message text,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  CONSTRAINT job_run_details_pkey PRIMARY KEY (runid)
);

# schema net 
'-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE net.http_request_queue (
  id bigint NOT NULL DEFAULT nextval('net.http_request_queue_id_seq'::regclass),
  method text NOT NULL,
  url text NOT NULL,
  headers jsonb,
  body bytea,
  timeout_milliseconds integer NOT NULL
);
CREATE TABLE net._http_response (
  id bigint,
  status_code integer,
  content_type text,
  headers jsonb,
  content text,
  timed_out boolean,
  error_msg text,
  created timestamp with time zone NOT NULL DEFAULT now()
);

# schema public

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_url text NOT NULL UNIQUE,
  group_name text,
  group_type text NOT NULL CHECK (group_type = ANY (ARRAY['public'::text, 'private'::text])),
  status text NOT NULL DEFAULT 'SUBMITTED'::text CHECK (status = ANY (ARRAY['SUBMITTED'::text, 'ACTIVE'::text, 'PAUSED'::text, 'REJECTED'::text, 'NEEDS_COOKIE'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  current_results_limit integer NOT NULL DEFAULT 30,
  adaptive_state text NOT NULL DEFAULT 'NORMAL'::text,
  CONSTRAINT groups_pkey PRIMARY KEY (id)
);
CREATE TABLE public.group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  cookie_id uuid,
  CONSTRAINT group_members_pkey PRIMARY KEY (id),
  CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT group_members_cookie_id_fkey FOREIGN KEY (cookie_id) REFERENCES public.user_cookies(id)
);
CREATE TABLE public.facebook_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  post_id text NOT NULL UNIQUE,
  author text,
  content text,
  post_url text,
  posted_at timestamp with time zone,
  scraped_at timestamp with time zone NOT NULL DEFAULT now(),
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  media_urls jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT facebook_posts_pkey PRIMARY KEY (id),
  CONSTRAINT facebook_posts_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.scrape_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['SUCCESS'::text, 'FAILED'::text, 'NO_COOKIES'::text])),
  posts_found integer NOT NULL DEFAULT 0,
  error_msg text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone,
  cookie_id uuid,
  requested_limit integer,
  new_posts_count integer DEFAULT 0,
  near_limit boolean NOT NULL DEFAULT false,
  limit_hit boolean NOT NULL DEFAULT false,
  cost_usd numeric DEFAULT 0,
  CONSTRAINT scrape_runs_pkey PRIMARY KEY (id),
  CONSTRAINT scrape_runs_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT scrape_runs_cookie_id_fkey FOREIGN KEY (cookie_id) REFERENCES public.user_cookies(id)
);
CREATE TABLE public.api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key_value text NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT 'apify'::text,
  status text NOT NULL DEFAULT 'ACTIVE'::text CHECK (status = ANY (ARRAY['Active'::text, 'Quota Exhausted'::text, 'Token Invalid'::text, 'ACTIVE'::text, 'INACTIVE'::text, 'INVALID'::text, 'RATE_LIMITED'::text, 'FAILED'::text])),
  fail_count integer NOT NULL DEFAULT 0,
  cooldown_until timestamp with time zone,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  key_name text,
  last_used timestamp with time zone,
  health numeric DEFAULT 100,
  usage_usd numeric DEFAULT 0,
  limit_usd numeric DEFAULT 5.0,
  CONSTRAINT api_keys_pkey PRIMARY KEY (id)
);
CREATE TABLE public.admin_users (
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admin_users_pkey PRIMARY KEY (user_id),
  CONSTRAINT admin_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  email text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  push_subscription jsonb,
  telegram_chat_id text,
  slack_webhook_url text,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.subscriptions (
  id text NOT NULL,
  user_id uuid,
  polar_customer_id text,
  status text,
  plan_id text,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  email text,
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_cookies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cookie_name text NOT NULL,
  cookie_value text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE'::text CHECK (status = ANY (ARRAY['ACTIVE'::text, 'FAILED'::text, 'EXPIRED'::text])),
  fail_count integer NOT NULL DEFAULT 0,
  last_used_at timestamp with time zone,
  last_failed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_cookies_pkey PRIMARY KEY (id),
  CONSTRAINT user_cookies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_keywords (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rule_name text NOT NULL,
  must_include ARRAY DEFAULT '{}'::text[],
  any_of ARRAY DEFAULT '{}'::text[],
  must_exclude ARRAY DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  auto_comment_enabled boolean DEFAULT false,
  user_page_id uuid,
  comment_pool_id uuid,
  cookie_id uuid,
  cookie_ids ARRAY DEFAULT '{}'::uuid[],
  group_ids ARRAY DEFAULT '{}'::uuid[],
  comment_delay_seconds integer DEFAULT 5,
  CONSTRAINT user_keywords_pkey PRIMARY KEY (id),
  CONSTRAINT user_keywords_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_keywords_cookie_id_fkey FOREIGN KEY (cookie_id) REFERENCES public.user_cookies(id),
  CONSTRAINT user_keywords_user_page_id_fkey FOREIGN KEY (user_page_id) REFERENCES public.user_pages(id),
  CONSTRAINT user_keywords_comment_pool_id_fkey FOREIGN KEY (comment_pool_id) REFERENCES public.comment_pools(id)
);
CREATE TABLE public.user_post_matches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  keyword_id uuid,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_post_matches_pkey PRIMARY KEY (id),
  CONSTRAINT user_post_matches_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_post_matches_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.facebook_posts(id),
  CONSTRAINT user_post_matches_keyword_id_fkey FOREIGN KEY (keyword_id) REFERENCES public.user_keywords(id)
);
CREATE TABLE public.notification_channels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  channel_type text NOT NULL CHECK (channel_type = ANY (ARRAY['telegram'::text, 'email'::text, 'web_push'::text])),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notification_channels_pkey PRIMARY KEY (id),
  CONSTRAINT notification_channels_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  keyword_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel = ANY (ARRAY['telegram'::text, 'email'::text, 'web_push'::text, 'in_app'::text])),
  status text NOT NULL DEFAULT 'PENDING'::text CHECK (status = ANY (ARRAY['PENDING'::text, 'SENT'::text, 'FAILED'::text])),
  error_msg text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  sent_at timestamp with time zone,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT notifications_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.facebook_posts(id),
  CONSTRAINT notifications_keyword_id_fkey FOREIGN KEY (keyword_id) REFERENCES public.user_keywords(id)
);
CREATE TABLE public.hourly_post_stats (
  group_id uuid NOT NULL,
  date date NOT NULL,
  hour integer NOT NULL,
  post_count integer DEFAULT 1,
  CONSTRAINT hourly_post_stats_pkey PRIMARY KEY (group_id, date, hour)
);
CREATE TABLE public.hourly_user_match_stats (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  group_id uuid NOT NULL,
  date date NOT NULL,
  hour integer NOT NULL CHECK (hour >= 0 AND hour <= 23),
  match_count integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT hourly_user_match_stats_pkey PRIMARY KEY (id),
  CONSTRAINT hourly_user_match_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT hourly_user_match_stats_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.daily_scrape_cost_summary (
  date date NOT NULL,
  group_id uuid NOT NULL,
  total_cost_usd numeric NOT NULL DEFAULT 0,
  runs_count integer NOT NULL DEFAULT 0,
  new_posts_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT daily_scrape_cost_summary_pkey PRIMARY KEY (date, group_id),
  CONSTRAINT daily_scrape_cost_summary_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.historical_group_stats (
  group_id uuid NOT NULL,
  lifetime_posts_tracked bigint NOT NULL DEFAULT 0,
  lifetime_cost_usd numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT historical_group_stats_pkey PRIMARY KEY (group_id),
  CONSTRAINT historical_group_stats_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.user_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  composio_connection_id text NOT NULL,
  page_id text NOT NULL,
  page_name text NOT NULL,
  page_avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_pages_pkey PRIMARY KEY (id),
  CONSTRAINT user_pages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.comment_pools (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT comment_pools_pkey PRIMARY KEY (id),
  CONSTRAINT comment_pools_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.comment_pool_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pool_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT comment_pool_items_pkey PRIMARY KEY (id),
  CONSTRAINT comment_pool_items_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.comment_pools(id)
);
CREATE TABLE public.auto_comment_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id text NOT NULL,
  keyword_id uuid,
  user_page_id uuid,
  comment_text text,
  status text NOT NULL,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  cookie_id uuid,
  cost_usd numeric DEFAULT 0,
  CONSTRAINT auto_comment_logs_pkey PRIMARY KEY (id),
  CONSTRAINT auto_comment_logs_cookie_id_fkey FOREIGN KEY (cookie_id) REFERENCES public.user_cookies(id),
  CONSTRAINT auto_comment_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT auto_comment_logs_keyword_id_fkey FOREIGN KEY (keyword_id) REFERENCES public.user_keywords(id),
  CONSTRAINT auto_comment_logs_user_page_id_fkey FOREIGN KEY (user_page_id) REFERENCES public.user_pages(id)
);
CREATE TABLE public.daily_comment_cost_summary (
  date date NOT NULL,
  user_id uuid NOT NULL,
  total_cost_usd numeric DEFAULT 0,
  comments_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT daily_comment_cost_summary_pkey PRIMARY KEY (date, user_id),
  CONSTRAINT daily_comment_cost_summary_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

# schema realtime 
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE realtime.messages (
  topic text NOT NULL,
  extension text NOT NULL,
  payload jsonb,
  event text,
  private boolean DEFAULT false,
  updated_at timestamp without time zone NOT NULL DEFAULT timezone('utc'::text, clock_timestamp()),
  inserted_at timestamp without time zone NOT NULL DEFAULT timezone('utc'::text, clock_timestamp()),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  binary_payload bytea,
  skip_broadcast boolean NOT NULL DEFAULT false,
  CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at)
);
CREATE TABLE realtime.schema_migrations (
  version bigint NOT NULL,
  inserted_at timestamp without time zone DEFAULT now(),
  CONSTRAINT schema_migrations_pkey PRIMARY KEY (version)
);
CREATE TABLE realtime.subscription (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  subscription_id uuid NOT NULL,
  entity regclass NOT NULL,
  filters ARRAY NOT NULL DEFAULT '{}'::realtime.user_defined_filter[],
  claims jsonb NOT NULL,
  claims_role regrole NOT NULL DEFAULT realtime.to_regrole((claims ->> 'role'::text)),
  created_at timestamp without time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  action_filter text DEFAULT '*'::text CHECK (action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])),
  selected_columns ARRAY,
  CONSTRAINT subscription_pkey PRIMARY KEY (id)
);

# schema storage 
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE storage.migrations (
  id integer NOT NULL,
  name character varying NOT NULL UNIQUE,
  hash character varying NOT NULL,
  executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT migrations_pkey PRIMARY KEY (id)
);
CREATE TABLE storage.buckets (
  id text NOT NULL,
  name text NOT NULL,
  owner uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  public boolean DEFAULT false,
  avif_autodetection boolean DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types ARRAY,
  owner_id text,
  type USER-DEFINED NOT NULL DEFAULT 'STANDARD'::storage.buckettype,
  versioning_status text NOT NULL DEFAULT 'DISABLED'::text CHECK (versioning_status = ANY (ARRAY['DISABLED'::text, 'ENABLED'::text, 'SUSPENDED'::text])),
  lifecycle_configuration jsonb CHECK (lifecycle_configuration IS NULL OR jsonb_typeof(lifecycle_configuration) = 'object'::text AND lifecycle_configuration ? 'rules'::text AND
CASE
    WHEN jsonb_typeof(lifecycle_configuration -> 'rules'::text) = 'array'::text THEN jsonb_array_length(lifecycle_configuration -> 'rules'::text) >= 1 AND jsonb_array_length(lifecycle_configuration -> 'rules'::text) <= 1000
    ELSE false
END),
  lifecycle_configuration_generation uuid,
  CONSTRAINT buckets_pkey PRIMARY KEY (id)
);
CREATE TABLE storage.objects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bucket_id text,
  name text,
  owner uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_accessed_at timestamp with time zone DEFAULT now(),
  metadata jsonb,
  path_tokens ARRAY DEFAULT string_to_array(name, '/'::text),
  version text,
  owner_id text,
  user_metadata jsonb,
  archived_at timestamp with time zone,
  is_delete_marker boolean NOT NULL DEFAULT false,
  is_versioned boolean NOT NULL DEFAULT false,
  CONSTRAINT objects_pkey PRIMARY KEY (id),
  CONSTRAINT objects_bucketId_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id)
);
CREATE TABLE storage.s3_multipart_uploads (
  id text NOT NULL,
  in_progress_size bigint NOT NULL DEFAULT 0,
  upload_signature text NOT NULL,
  bucket_id text NOT NULL,
  key text NOT NULL,
  version text NOT NULL,
  owner_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_metadata jsonb,
  metadata jsonb,
  CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id),
  CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id)
);
CREATE TABLE storage.s3_multipart_uploads_parts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  upload_id text NOT NULL,
  size bigint NOT NULL DEFAULT 0,
  part_number integer NOT NULL,
  bucket_id text NOT NULL,
  key text NOT NULL,
  etag text NOT NULL,
  owner_id text,
  version text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id),
  CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id),
  CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id)
);
CREATE TABLE storage.buckets_analytics (
  name text NOT NULL,
  type USER-DEFINED NOT NULL DEFAULT 'ANALYTICS'::storage.buckettype,
  format text NOT NULL DEFAULT 'ICEBERG'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deleted_at timestamp with time zone,
  CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id)
);
CREATE TABLE storage.buckets_vectors (
  id text NOT NULL,
  type USER-DEFINED NOT NULL DEFAULT 'VECTOR'::storage.buckettype,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id)
);
CREATE TABLE storage.vector_indexes (
  id text NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bucket_id text NOT NULL,
  data_type text NOT NULL,
  dimension integer NOT NULL,
  distance_metric text NOT NULL,
  metadata_configuration jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT vector_indexes_pkey PRIMARY KEY (id),
  CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id)
);

# schema supabse migrations 
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE supabase_migrations.schema_migrations (
  version text NOT NULL,
  statements ARRAY,
  name text,
  created_by text,
  idempotency_key text UNIQUE,
  rollback ARRAY,
  CONSTRAINT schema_migrations_pkey PRIMARY KEY (version)
);

# schema vault

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE vault.secrets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text,
  description text NOT NULL DEFAULT ''::text,
  secret text NOT NULL,
  key_id uuid,
  nonce bytea DEFAULT vault._crypto_aead_det_noncegen(),
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT secrets_pkey PRIMARY KEY (id)
);
