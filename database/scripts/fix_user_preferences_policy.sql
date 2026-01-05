-- Fix RLS policies for user_preferences to avoid querying auth.users directly

-- Drop problematic admin policy
DROP POLICY IF EXISTS "Admins can view all preferences" ON public.user_preferences;

-- Create new policy using auth.jwt()
CREATE POLICY "Admins can view all preferences" ON public.user_preferences
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Also ensure we have a policy for admins to update/delete if needed, 
-- but consistent with other tables, usually admins should be able to manage everything.
-- For now, matching the previous logic which only had specific admin View policy 
-- (and likely relied on generic logic or specific user policies for edits).

-- However, if admins need to edit OTHER users' preferences, we should add those policies too.
-- Let's check the original file again... it didn't seem to have Admin Update policies, only View.
-- If the error was 403 on GET, this SELECT policy fix should be enough.

-- Just in case, grant permissions if missing (though they should exist)
GRANT ALL ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
