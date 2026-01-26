-- Email Verification Schema Update
-- Adds email verification support to the users table

-- Add email verification columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_verification_token TEXT,
  ADD COLUMN IF NOT EXISTS email_verification_token_expires_at TIMESTAMPTZ;

-- Create index for token lookup during verification
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(email_verification_token)
  WHERE email_verification_token IS NOT NULL;

-- Function to generate a cryptographically secure verification token
CREATE OR REPLACE FUNCTION generate_verification_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to set up email verification for a user
CREATE OR REPLACE FUNCTION setup_email_verification(p_user_id UUID)
RETURNS TABLE(token TEXT, expires_at TIMESTAMPTZ) AS $$
DECLARE
  v_token TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  v_token := generate_verification_token();
  v_expires_at := NOW() + INTERVAL '24 hours';

  UPDATE users
  SET
    email_verification_token = v_token,
    email_verification_token_expires_at = v_expires_at,
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN QUERY SELECT v_token, v_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify email with token
CREATE OR REPLACE FUNCTION verify_email_with_token(p_token TEXT)
RETURNS TABLE(success BOOLEAN, user_id UUID, email TEXT, error_message TEXT) AS $$
DECLARE
  v_user RECORD;
BEGIN
  -- Find user with this token
  SELECT id, email AS user_email, email_verification_token_expires_at
  INTO v_user
  FROM users
  WHERE email_verification_token = p_token;

  -- Check if token exists
  IF v_user.id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, 'Invalid verification token'::TEXT;
    RETURN;
  END IF;

  -- Check if token is expired
  IF v_user.email_verification_token_expires_at < NOW() THEN
    RETURN QUERY SELECT FALSE, v_user.id, v_user.user_email, 'Verification token has expired'::TEXT;
    RETURN;
  END IF;

  -- Verify the email
  UPDATE users
  SET
    email_verified_at = NOW(),
    email_verification_token = NULL,
    email_verification_token_expires_at = NULL,
    updated_at = NOW()
  WHERE id = v_user.id;

  RETURN QUERY SELECT TRUE, v_user.id, v_user.user_email, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
