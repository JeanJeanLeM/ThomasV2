-- Migration 087: Activity streak system
-- Tracks daily task activity per user/farm, with excluded days, vacation mode,
-- and weekly safe passes capped at 4.

CREATE TABLE IF NOT EXISTS public.activity_streak_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id INTEGER NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  active_days INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6],
  safe_pass_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  safe_pass_cap INTEGER NOT NULL DEFAULT 4 CHECK (safe_pass_cap >= 0 AND safe_pass_cap <= 14),
  vacation_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  vacation_start DATE,
  vacation_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, farm_id),
  CHECK (active_days <@ ARRAY[0,1,2,3,4,5,6]),
  CHECK (
    vacation_enabled = FALSE
    OR (vacation_start IS NOT NULL AND vacation_end IS NOT NULL AND vacation_end >= vacation_start)
  )
);

CREATE TABLE IF NOT EXISTS public.activity_streak_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id INTEGER NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  best_streak INTEGER NOT NULL DEFAULT 0 CHECK (best_streak >= 0),
  safe_pass_balance INTEGER NOT NULL DEFAULT 1 CHECK (safe_pass_balance >= 0),
  last_safe_pass_week TEXT,
  last_evaluated_date DATE,
  last_success_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, farm_id)
);

CREATE TABLE IF NOT EXISTS public.activity_streak_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id INTEGER NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  has_task BOOLEAN NOT NULL DEFAULT FALSE,
  task_count INTEGER NOT NULL DEFAULT 0 CHECK (task_count >= 0),
  last_task_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, farm_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_activity_streak_days_lookup
  ON public.activity_streak_days (user_id, farm_id, activity_date);

CREATE INDEX IF NOT EXISTS idx_activity_streak_config_vacation
  ON public.activity_streak_config (vacation_enabled, vacation_start, vacation_end)
  WHERE vacation_enabled = TRUE;

ALTER TABLE public.activity_streak_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_streak_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_streak_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own activity streak config" ON public.activity_streak_config;
CREATE POLICY "Users manage own activity streak config"
  ON public.activity_streak_config FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own activity streak state" ON public.activity_streak_state;
CREATE POLICY "Users read own activity streak state"
  ON public.activity_streak_state FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own activity streak days" ON public.activity_streak_days;
CREATE POLICY "Users read own activity streak days"
  ON public.activity_streak_days FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access activity streak config" ON public.activity_streak_config;
CREATE POLICY "Service role full access activity streak config"
  ON public.activity_streak_config FOR ALL TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access activity streak state" ON public.activity_streak_state;
CREATE POLICY "Service role full access activity streak state"
  ON public.activity_streak_state FOR ALL TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access activity streak days" ON public.activity_streak_days;
CREATE POLICY "Service role full access activity streak days"
  ON public.activity_streak_days FOR ALL TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS activity_streak_config_updated_at ON public.activity_streak_config;
CREATE TRIGGER activity_streak_config_updated_at
  BEFORE UPDATE ON public.activity_streak_config
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS activity_streak_state_updated_at ON public.activity_streak_state;
CREATE TRIGGER activity_streak_state_updated_at
  BEFORE UPDATE ON public.activity_streak_state
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS activity_streak_days_updated_at ON public.activity_streak_days;
CREATE TRIGGER activity_streak_days_updated_at
  BEFORE UPDATE ON public.activity_streak_days
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.upsert_activity_streak_day_from_task()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type IS DISTINCT FROM 'tache' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.activity_streak_days (
    user_id,
    farm_id,
    activity_date,
    has_task,
    task_count,
    last_task_at
  )
  VALUES (
    NEW.user_id,
    NEW.farm_id,
    NEW.date,
    TRUE,
    1,
    COALESCE(NEW.created_at, NOW())
  )
  ON CONFLICT (user_id, farm_id, activity_date)
  DO UPDATE SET
    has_task = TRUE,
    task_count = (
      SELECT COUNT(*)
      FROM public.tasks t
      WHERE t.user_id = NEW.user_id
        AND t.farm_id = NEW.farm_id
        AND t.date = NEW.date
        AND t.type = 'tache'
    ),
    last_task_at = GREATEST(
      COALESCE(public.activity_streak_days.last_task_at, COALESCE(NEW.created_at, NOW())),
      COALESCE(NEW.created_at, NOW())
    ),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tasks_activity_streak_day_insert ON public.tasks;
CREATE TRIGGER tasks_activity_streak_day_insert
  AFTER INSERT OR UPDATE OF type, date, farm_id, user_id ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.upsert_activity_streak_day_from_task();

CREATE OR REPLACE FUNCTION public.refresh_activity_streak(
  p_user_id UUID,
  p_farm_id INTEGER,
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  user_id UUID,
  farm_id INTEGER,
  is_active BOOLEAN,
  current_streak INTEGER,
  best_streak INTEGER,
  safe_pass_balance INTEGER,
  safe_pass_cap INTEGER,
  last_success_date DATE,
  last_evaluated_date DATE,
  vacation_enabled BOOLEAN,
  vacation_start DATE,
  vacation_end DATE,
  active_days INTEGER[]
) AS $$
#variable_conflict use_column
DECLARE
  v_config public.activity_streak_config%ROWTYPE;
  v_state public.activity_streak_state%ROWTYPE;
  v_eval_date DATE;
  v_end_date DATE := p_as_of_date - 1;
  v_has_task BOOLEAN;
  v_week_key TEXT;
  v_current INTEGER;
  v_best INTEGER;
  v_safe_balance INTEGER;
  v_last_success DATE;
  v_last_safe_week TEXT;
BEGIN
  INSERT INTO public.activity_streak_config (user_id, farm_id)
  VALUES (p_user_id, p_farm_id)
  ON CONFLICT (user_id, farm_id) DO NOTHING;

  SELECT * INTO v_config
  FROM public.activity_streak_config c
  WHERE c.user_id = p_user_id AND c.farm_id = p_farm_id;

  INSERT INTO public.activity_streak_state (user_id, farm_id)
  VALUES (p_user_id, p_farm_id)
  ON CONFLICT (user_id, farm_id) DO NOTHING;

  SELECT * INTO v_state
  FROM public.activity_streak_state s
  WHERE s.user_id = p_user_id AND s.farm_id = p_farm_id;

  v_current := COALESCE(v_state.current_streak, 0);
  v_best := COALESCE(v_state.best_streak, 0);
  v_safe_balance := LEAST(COALESCE(v_state.safe_pass_balance, 1), v_config.safe_pass_cap);
  v_last_success := v_state.last_success_date;
  v_last_safe_week := v_state.last_safe_pass_week;

  IF NOT v_config.is_active OR v_end_date < COALESCE(v_state.last_evaluated_date + 1, p_as_of_date) THEN
    RETURN QUERY
    SELECT
      v_config.user_id,
      v_config.farm_id,
      v_config.is_active,
      v_current,
      v_best,
      v_safe_balance,
      v_config.safe_pass_cap,
      v_last_success,
      v_state.last_evaluated_date,
      v_config.vacation_enabled,
      v_config.vacation_start,
      v_config.vacation_end,
      v_config.active_days;
    RETURN;
  END IF;

  v_eval_date := COALESCE(v_state.last_evaluated_date + 1, p_as_of_date);

  WHILE v_eval_date <= v_end_date LOOP
    IF v_config.safe_pass_enabled THEN
      v_week_key := to_char(v_eval_date, 'IYYY-IW');
      IF v_last_safe_week IS DISTINCT FROM v_week_key THEN
        v_safe_balance := LEAST(v_safe_balance + 1, v_config.safe_pass_cap);
        v_last_safe_week := v_week_key;
      END IF;
    END IF;

    IF NOT (EXTRACT(DOW FROM v_eval_date)::INTEGER = ANY(v_config.active_days)) THEN
      v_eval_date := v_eval_date + 1;
      CONTINUE;
    END IF;

    IF v_config.vacation_enabled
      AND v_config.vacation_start IS NOT NULL
      AND v_config.vacation_end IS NOT NULL
      AND v_eval_date BETWEEN v_config.vacation_start AND v_config.vacation_end THEN
      v_eval_date := v_eval_date + 1;
      CONTINUE;
    END IF;

    INSERT INTO public.activity_streak_days (
      user_id,
      farm_id,
      activity_date,
      has_task,
      task_count,
      last_task_at
    )
    SELECT
      p_user_id,
      p_farm_id,
      v_eval_date,
      COUNT(*) > 0,
      COUNT(*)::INTEGER,
      MAX(t.created_at)
    FROM public.tasks t
    WHERE t.user_id = p_user_id
      AND t.farm_id = p_farm_id
      AND t.date = v_eval_date
      AND t.type = 'tache'
    ON CONFLICT (user_id, farm_id, activity_date)
    DO UPDATE SET
      has_task = EXCLUDED.has_task,
      task_count = EXCLUDED.task_count,
      last_task_at = EXCLUDED.last_task_at,
      updated_at = NOW();

    SELECT d.has_task INTO v_has_task
    FROM public.activity_streak_days d
    WHERE d.user_id = p_user_id
      AND d.farm_id = p_farm_id
      AND d.activity_date = v_eval_date;

    IF v_has_task THEN
      v_current := v_current + 1;
      v_best := GREATEST(v_best, v_current);
      v_last_success := v_eval_date;
    ELSIF v_config.safe_pass_enabled AND v_safe_balance > 0 THEN
      v_safe_balance := v_safe_balance - 1;
    ELSE
      v_current := 0;
    END IF;

    v_eval_date := v_eval_date + 1;
  END LOOP;

  UPDATE public.activity_streak_state s SET
    current_streak = v_current,
    best_streak = v_best,
    safe_pass_balance = v_safe_balance,
    last_safe_pass_week = v_last_safe_week,
    last_success_date = v_last_success,
    last_evaluated_date = v_end_date,
    updated_at = NOW()
  WHERE s.user_id = p_user_id AND s.farm_id = p_farm_id;

  RETURN QUERY
  SELECT
    v_config.user_id,
    v_config.farm_id,
    v_config.is_active,
    v_current,
    v_best,
    v_safe_balance,
    v_config.safe_pass_cap,
    v_last_success,
    v_end_date,
    v_config.vacation_enabled,
    v_config.vacation_start,
    v_config.vacation_end,
    v_config.active_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.refresh_activity_streak(UUID, INTEGER, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_activity_streak(UUID, INTEGER, DATE) TO service_role;
