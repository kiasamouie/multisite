-- =============================================
-- BOOKINGS: Multi-tenant appointment & reservation system
-- =============================================
-- Generic booking table that works for any service business:
-- restaurants, barbers, salons, gyms, consultants, etc.
-- Business type is determined purely by Puck block configuration.

CREATE TABLE public.bookings (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      integer not null references public.tenants(id) on delete cascade,

  -- Customer Identity
  customer_name  text not null,
  customer_email text not null,
  customer_phone text,

  -- Booking Details
  booking_date   date not null,
  booking_time   time not null,
  party_size     integer not null default 1,
  service_label  text,       -- Free text: "Haircut", "Table for 2", "Consultation" etc.
  special_notes  text,

  -- Status Management
  -- Values: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'noshow'
  status         text not null default 'pending'
                 check (status in ('pending', 'confirmed', 'cancelled', 'completed', 'noshow')),

  -- Metadata
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- Performance index for admin date filtering
CREATE INDEX bookings_tenant_date_idx ON public.bookings (tenant_id, booking_date);
CREATE INDEX bookings_tenant_status_idx ON public.bookings (tenant_id, status);

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Tenant members can read and manage their own bookings
CREATE POLICY "Tenant members can manage bookings"
  ON public.bookings FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.memberships WHERE user_id = auth.uid()
    )
  );

-- Platform admins can see and manage all bookings
CREATE POLICY "Platform admins can manage all bookings"
  ON public.bookings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid()
    )
  );

-- Public can insert (the booking form on the public tenant site)
CREATE POLICY "Public can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (true);
