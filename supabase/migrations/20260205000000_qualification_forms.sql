-- Qualification Forms: Reusable question sets shared across funnels
-- A form groups questions together; multiple funnels can reference the same form.

-- 1. Create qualification_forms table
CREATE TABLE qualification_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default Form',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qualification_forms_user ON qualification_forms(user_id);

-- 2. Add form_id to qualification_questions (nullable, for form-based questions)
ALTER TABLE qualification_questions
  ADD COLUMN form_id UUID REFERENCES qualification_forms(id) ON DELETE CASCADE;

-- 3. Make funnel_page_id nullable (was NOT NULL; form-based questions don't need it)
ALTER TABLE qualification_questions
  ALTER COLUMN funnel_page_id DROP NOT NULL;

-- 4. Add CHECK: a question must belong to either a form OR a funnel page (not both null, not both set)
ALTER TABLE qualification_questions
  ADD CONSTRAINT chk_question_parent
  CHECK (
    (form_id IS NOT NULL AND funnel_page_id IS NULL)
    OR (form_id IS NULL AND funnel_page_id IS NOT NULL)
  );

-- 5. Index for form-based question lookups
CREATE INDEX idx_qualification_questions_form ON qualification_questions(form_id)
  WHERE form_id IS NOT NULL;

-- 6. Add qualification_form_id to funnel_pages (nullable, links funnel to shared form)
ALTER TABLE funnel_pages
  ADD COLUMN qualification_form_id UUID REFERENCES qualification_forms(id) ON DELETE SET NULL;

-- 7. Data migration: move existing funnel-based questions into forms
DO $$
DECLARE
  r RECORD;
  new_form_id UUID;
BEGIN
  -- For each funnel that has questions, create a form and migrate
  FOR r IN
    SELECT DISTINCT fp.id AS funnel_page_id, fp.user_id, fp.slug
    FROM funnel_pages fp
    INNER JOIN qualification_questions qq ON qq.funnel_page_id = fp.id
    WHERE qq.form_id IS NULL
  LOOP
    -- Create a form for this funnel's questions
    INSERT INTO qualification_forms (user_id, name)
    VALUES (r.user_id, 'Form: ' || COALESCE(r.slug, 'unnamed'))
    RETURNING id INTO new_form_id;

    -- Move questions from funnel_page_id to form_id
    UPDATE qualification_questions
    SET form_id = new_form_id, funnel_page_id = NULL
    WHERE funnel_page_id = r.funnel_page_id;

    -- Link the funnel to the new form
    UPDATE funnel_pages
    SET qualification_form_id = new_form_id
    WHERE id = r.funnel_page_id;
  END LOOP;
END;
$$;

-- 8. RLS policies for qualification_forms
ALTER TABLE qualification_forms ENABLE ROW LEVEL SECURITY;

-- Users can manage their own forms
CREATE POLICY qualification_forms_owner_all
  ON qualification_forms
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Public can view forms that are referenced by published funnels
CREATE POLICY qualification_forms_public_read
  ON qualification_forms
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM funnel_pages fp
      WHERE fp.qualification_form_id = qualification_forms.id
        AND fp.is_published = true
    )
  );
