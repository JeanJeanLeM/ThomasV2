-- Migration: Create notifications system (Safe version)
-- Description: Allows users to create custom notifications with title, message, reminder time and selected days
-- Note: Default notifications will be created dynamically by the application, not during migration

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  farm_id integer NOT NULL,
  user_id uuid NOT NULL,
  title character varying NOT NULL CHECK (char_length(title::text) >= 2 AND char_length(title::text) <= 200),
  message text NOT NULL CHECK (char_length(message::text) >= 1 AND char_length(message::text) <= 1000),
  reminder_time time without time zone NOT NULL,
  selected_days integer[] NOT NULL DEFAULT '{}' CHECK (array_length(selected_days, 1) > 0),
  -- Days of week: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
  is_active boolean NOT NULL DEFAULT true,
  notification_type character varying NOT NULL DEFAULT 'custom' CHECK (notification_type::text = ANY (ARRAY['custom', 'system', 'task_reminder'])),
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.farms(id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT notifications_selected_days_valid CHECK (
    selected_days <@ ARRAY[0,1,2,3,4,5,6] AND 
    array_length(selected_days, 1) <= 7
  )
);

-- Create notification logs table to track sent notifications
CREATE TABLE public.notification_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL,
  user_id uuid NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  status character varying NOT NULL DEFAULT 'sent' CHECK (status::text = ANY (ARRAY['sent', 'failed', 'read'])),
  error_message text,
  metadata jsonb DEFAULT '{}',
  CONSTRAINT notification_logs_pkey PRIMARY KEY (id),
  CONSTRAINT notification_logs_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE CASCADE,
  CONSTRAINT notification_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX idx_notifications_farm_user ON public.notifications(farm_id, user_id);
CREATE INDEX idx_notifications_active ON public.notifications(is_active) WHERE is_active = true;
CREATE INDEX idx_notifications_reminder_time ON public.notifications(reminder_time);
CREATE INDEX idx_notifications_type ON public.notifications(notification_type);
CREATE INDEX idx_notification_logs_sent_at ON public.notification_logs(sent_at);
CREATE INDEX idx_notification_logs_notification_id ON public.notification_logs(notification_id);
CREATE INDEX idx_notification_logs_user_status ON public.notification_logs(user_id, status);

-- Add RLS policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Policy for notifications: users can only see notifications for farms they belong to
CREATE POLICY "Users can view notifications for their farms" ON public.notifications
  FOR SELECT USING (
    farm_id IN (
      SELECT fm.farm_id 
      FROM public.farm_members fm 
      WHERE fm.user_id = auth.uid() AND fm.is_active = true
    )
  );

CREATE POLICY "Users can create notifications for their farms" ON public.notifications
  FOR INSERT WITH CHECK (
    farm_id IN (
      SELECT fm.farm_id 
      FROM public.farm_members fm 
      WHERE fm.user_id = auth.uid() AND fm.is_active = true
    ) AND user_id = auth.uid()
  );

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications" ON public.notifications
  FOR DELETE USING (user_id = auth.uid());

-- Policy for notification logs
CREATE POLICY "Users can view their notification logs" ON public.notification_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert notification logs" ON public.notification_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their notification logs" ON public.notification_logs
  FOR UPDATE USING (user_id = auth.uid());

-- Add helpful comments
COMMENT ON TABLE public.notifications IS 'User-defined notifications with customizable schedule';
COMMENT ON COLUMN public.notifications.selected_days IS 'Array of integers representing days of week (0=Sunday, 1=Monday, etc.)';
COMMENT ON COLUMN public.notifications.reminder_time IS 'Time of day to send the notification';
COMMENT ON COLUMN public.notifications.notification_type IS 'Type of notification: custom, system, or task_reminder';

COMMENT ON TABLE public.notification_logs IS 'Log of sent notifications for tracking and analytics';
COMMENT ON COLUMN public.notification_logs.status IS 'Status of the notification: sent, failed, or read';

-- Note: Default notifications will be created by the application when users first access the notifications screen
-- This avoids foreign key constraint issues during migration













