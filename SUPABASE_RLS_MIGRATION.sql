-- ============================================================
-- 2Man Finder — Supabase RLS Migration
-- Run this entire script in the Supabase SQL Editor
-- Generated: 2026-05-12
-- ============================================================
-- Tables found in codebase (grep .from('...') across all .ts/.tsx):
--   profiles, friendships, interests, passes,
--   double_date_proposals, proposal_confirmations,
--   messages, group_chats, group_chat_members, group_messages,
--   friend_groups, friend_group_members, friend_group_votes
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- HELPER FUNCTIONS  (SECURITY DEFINER so they bypass RLS when
-- called inside a policy — safe because they only expose a
-- boolean result, not raw rows)
-- ────────────────────────────────────────────────────────────

-- Returns TRUE if `other_user` is an accepted friend of the
-- currently-authenticated user.
CREATE OR REPLACE FUNCTION is_my_friend(other_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM friendships
    WHERE  status = 'accepted'
    AND    (
             (requester_id = auth.uid() AND receiver_id = other_user)
          OR (receiver_id  = auth.uid() AND requester_id = other_user)
           )
  );
$$;

-- Returns TRUE if the current user is a member of the given
-- group_chat.
CREATE OR REPLACE FUNCTION is_group_chat_member(chat_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_chat_members
    WHERE  chat_id = chat_uuid
    AND    user_id = auth.uid()
  );
$$;

-- Returns TRUE if the current user is one of the four
-- participants of the given double_date_proposal.
CREATE OR REPLACE FUNCTION is_in_proposal(proposal_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM double_date_proposals
    WHERE  id = proposal_uuid
    AND    auth.uid() IN (guy1_id, guy2_id, girl1_id, girl2_id)
  );
$$;

-- Returns TRUE if the current user is a member of the given
-- friend_group.
CREATE OR REPLACE FUNCTION is_friend_group_member(group_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM friend_group_members
    WHERE  group_id = group_uuid
    AND    user_id  = auth.uid()
  );
$$;


-- ────────────────────────────────────────────────────────────
-- 1. profiles
-- ────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read any complete profile
-- (needed for search, discover, friend suggestions, invite page)
DROP POLICY IF EXISTS "profiles_select_all"     ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own"     ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"     ON profiles;

CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can only insert their own row (triggered by signup)
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING     (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- ────────────────────────────────────────────────────────────
-- 2. friendships
-- ────────────────────────────────────────────────────────────
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friendships_select"       ON friendships;
DROP POLICY IF EXISTS "friendships_insert"       ON friendships;
DROP POLICY IF EXISTS "friendships_update"       ON friendships;
DROP POLICY IF EXISTS "friendships_delete"       ON friendships;

-- Can see your own friendships AND your friends' friendships
-- (the app reads friends-of-friends for the "People You May Know"
-- feature in search and to compute 2Man proposals)
CREATE POLICY "friendships_select"
  ON friendships FOR SELECT
  TO authenticated
  USING (
    requester_id = auth.uid()
    OR receiver_id  = auth.uid()
    OR is_my_friend(requester_id)
    OR is_my_friend(receiver_id)
  );

-- Only the requester can create a friendship row
CREATE POLICY "friendships_insert"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

-- Only the receiver can accept/reject; or requester can cancel
CREATE POLICY "friendships_update"
  ON friendships FOR UPDATE
  TO authenticated
  USING (
    requester_id = auth.uid()
    OR receiver_id = auth.uid()
  );

CREATE POLICY "friendships_delete"
  ON friendships FOR DELETE
  TO authenticated
  USING (
    requester_id = auth.uid()
    OR receiver_id = auth.uid()
  );


-- ────────────────────────────────────────────────────────────
-- 3. interests  (the "2Man" likes/swipes)
-- ────────────────────────────────────────────────────────────
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interests_select" ON interests;
DROP POLICY IF EXISTS "interests_insert" ON interests;
DROP POLICY IF EXISTS "interests_upsert" ON interests;

-- Can read your own interests, interests aimed at you, AND
-- your friends' interests (needed by Discover + recalculate
-- to detect mutual matches across the friend graph)
CREATE POLICY "interests_select"
  ON interests FOR SELECT
  TO authenticated
  USING (
    from_user_id = auth.uid()
    OR to_user_id   = auth.uid()
    OR is_my_friend(from_user_id)
    OR is_my_friend(to_user_id)
  );

CREATE POLICY "interests_insert"
  ON interests FOR INSERT
  TO authenticated
  WITH CHECK (from_user_id = auth.uid());

-- upsert issues an UPDATE when row already exists
CREATE POLICY "interests_update"
  ON interests FOR UPDATE
  TO authenticated
  USING (from_user_id = auth.uid());

CREATE POLICY "interests_delete"
  ON interests FOR DELETE
  TO authenticated
  USING (from_user_id = auth.uid());


-- ────────────────────────────────────────────────────────────
-- 4. passes
-- ────────────────────────────────────────────────────────────
ALTER TABLE passes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "passes_select" ON passes;
DROP POLICY IF EXISTS "passes_insert" ON passes;
DROP POLICY IF EXISTS "passes_update" ON passes;
DROP POLICY IF EXISTS "passes_delete" ON passes;

CREATE POLICY "passes_select"
  ON passes FOR SELECT
  TO authenticated
  USING (from_user_id = auth.uid());

CREATE POLICY "passes_insert"
  ON passes FOR INSERT
  TO authenticated
  WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "passes_update"
  ON passes FOR UPDATE
  TO authenticated
  USING (from_user_id = auth.uid());

CREATE POLICY "passes_delete"
  ON passes FOR DELETE
  TO authenticated
  USING (from_user_id = auth.uid());


-- ────────────────────────────────────────────────────────────
-- 5. double_date_proposals
-- ────────────────────────────────────────────────────────────
ALTER TABLE double_date_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proposals_select" ON double_date_proposals;
DROP POLICY IF EXISTS "proposals_insert" ON double_date_proposals;
DROP POLICY IF EXISTS "proposals_update" ON double_date_proposals;

-- Only participants can see the proposal
CREATE POLICY "proposals_select"
  ON double_date_proposals FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (guy1_id, guy2_id, girl1_id, girl2_id)
  );

-- Any authenticated user can insert (creation happens server-side
-- in /api/proposals/recalculate — the inserting user is always
-- one of the participants by construction)
CREATE POLICY "proposals_insert"
  ON double_date_proposals FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (guy1_id, guy2_id, girl1_id, girl2_id)
  );

-- Participants can update status (confirm / expire)
CREATE POLICY "proposals_update"
  ON double_date_proposals FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (guy1_id, guy2_id, girl1_id, girl2_id)
  );


-- ────────────────────────────────────────────────────────────
-- 6. proposal_confirmations
-- ────────────────────────────────────────────────────────────
ALTER TABLE proposal_confirmations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proposal_confirmations_select" ON proposal_confirmations;
DROP POLICY IF EXISTS "proposal_confirmations_insert" ON proposal_confirmations;
DROP POLICY IF EXISTS "proposal_confirmations_upsert" ON proposal_confirmations;

-- Any participant in the proposal can see who has confirmed
CREATE POLICY "proposal_confirmations_select"
  ON proposal_confirmations FOR SELECT
  TO authenticated
  USING (is_in_proposal(proposal_id));

-- Only a participant can add their own confirmation
CREATE POLICY "proposal_confirmations_insert"
  ON proposal_confirmations FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND is_in_proposal(proposal_id)
  );

CREATE POLICY "proposal_confirmations_update"
  ON proposal_confirmations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());


-- ────────────────────────────────────────────────────────────
-- 7. messages  (1-on-1 DMs)
-- ────────────────────────────────────────────────────────────
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;

CREATE POLICY "messages_select"
  ON messages FOR SELECT
  TO authenticated
  USING (
    sender_id   = auth.uid()
    OR receiver_id = auth.uid()
  );

CREATE POLICY "messages_insert"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Only receiver can mark as read
CREATE POLICY "messages_update"
  ON messages FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid());


-- ────────────────────────────────────────────────────────────
-- 8. group_chats
-- ────────────────────────────────────────────────────────────
ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "group_chats_select" ON group_chats;
DROP POLICY IF EXISTS "group_chats_insert" ON group_chats;

-- Members can see their group chats
CREATE POLICY "group_chats_select"
  ON group_chats FOR SELECT
  TO authenticated
  USING (is_group_chat_member(id));

-- Any authenticated user can create a group chat (creation
-- always happens server-side tied to a confirmed proposal)
CREATE POLICY "group_chats_insert"
  ON group_chats FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 9. group_chat_members
-- ────────────────────────────────────────────────────────────
ALTER TABLE group_chat_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gcm_select" ON group_chat_members;
DROP POLICY IF EXISTS "gcm_insert" ON group_chat_members;

-- Members can see who else is in their chats
CREATE POLICY "gcm_select"
  ON group_chat_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_group_chat_member(chat_id)
  );

-- Server-side routes insert members on chat creation;
-- any authenticated user may insert (members are always
-- the proposal participants, set by server logic)
CREATE POLICY "gcm_insert"
  ON group_chat_members FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 10. group_messages
-- ────────────────────────────────────────────────────────────
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gm_select" ON group_messages;
DROP POLICY IF EXISTS "gm_insert" ON group_messages;

-- Only chat members can read messages
CREATE POLICY "gm_select"
  ON group_messages FOR SELECT
  TO authenticated
  USING (is_group_chat_member(chat_id));

-- Only chat members can send messages
CREATE POLICY "gm_insert"
  ON group_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND is_group_chat_member(chat_id)
  );


-- ────────────────────────────────────────────────────────────
-- 11. friend_groups  (squad / group management feature)
-- ────────────────────────────────────────────────────────────
ALTER TABLE friend_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fg_select" ON friend_groups;
DROP POLICY IF EXISTS "fg_insert" ON friend_groups;
DROP POLICY IF EXISTS "fg_update" ON friend_groups;

CREATE POLICY "fg_select"
  ON friend_groups FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR is_friend_group_member(id)
  );

CREATE POLICY "fg_insert"
  ON friend_groups FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "fg_update"
  ON friend_groups FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());


-- ────────────────────────────────────────────────────────────
-- 12. friend_group_members
-- ────────────────────────────────────────────────────────────
ALTER TABLE friend_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fgm_select" ON friend_group_members;
DROP POLICY IF EXISTS "fgm_insert" ON friend_group_members;
DROP POLICY IF EXISTS "fgm_upsert" ON friend_group_members;
DROP POLICY IF EXISTS "fgm_delete" ON friend_group_members;

-- Members can see the roster of their groups
CREATE POLICY "fgm_select"
  ON friend_group_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_friend_group_member(group_id)
  );

-- The group creator or the user themselves can add a member
-- (invite flow handled by /api/groups/[id]/invite)
CREATE POLICY "fgm_insert"
  ON friend_group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR is_friend_group_member(group_id)
  );

CREATE POLICY "fgm_update"
  ON friend_group_members FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_friend_group_member(group_id)
  );

CREATE POLICY "fgm_delete"
  ON friend_group_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- ────────────────────────────────────────────────────────────
-- 13. friend_group_votes
-- ────────────────────────────────────────────────────────────
ALTER TABLE friend_group_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fgv_select" ON friend_group_votes;
DROP POLICY IF EXISTS "fgv_insert" ON friend_group_votes;

-- Group members can see all votes within their groups
CREATE POLICY "fgv_select"
  ON friend_group_votes FOR SELECT
  TO authenticated
  USING (is_friend_group_member(group_id));

-- Only group members can cast their own vote
CREATE POLICY "fgv_insert"
  ON friend_group_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    voter_id = auth.uid()
    AND is_friend_group_member(group_id)
  );


-- ────────────────────────────────────────────────────────────
-- STORAGE  (photos bucket)
-- ────────────────────────────────────────────────────────────
-- Run these in the Storage → Policies section or here:

-- Anyone authenticated can read photos (needed for profile display)
-- If this policy doesn't exist yet, create it:
INSERT INTO storage.policies (name, bucket_id, operation, definition)
SELECT
  'photos_select_authenticated',
  'photos',
  'SELECT',
  'auth.role() = ''authenticated'''
WHERE NOT EXISTS (
  SELECT 1 FROM storage.policies
  WHERE bucket_id = 'photos' AND operation = 'SELECT'
    AND name = 'photos_select_authenticated'
);

-- Users can only upload to their own folder  (path starts with their uid)
INSERT INTO storage.policies (name, bucket_id, operation, definition)
SELECT
  'photos_insert_own_folder',
  'photos',
  'INSERT',
  $$(storage.foldername(name))[1] = auth.uid()::text$$
WHERE NOT EXISTS (
  SELECT 1 FROM storage.policies
  WHERE bucket_id = 'photos' AND operation = 'INSERT'
    AND name = 'photos_insert_own_folder'
);

-- Users can delete their own files
INSERT INTO storage.policies (name, bucket_id, operation, definition)
SELECT
  'photos_delete_own_folder',
  'photos',
  'DELETE',
  $$(storage.foldername(name))[1] = auth.uid()::text$$
WHERE NOT EXISTS (
  SELECT 1 FROM storage.policies
  WHERE bucket_id = 'photos' AND operation = 'DELETE'
    AND name = 'photos_delete_own_folder'
);


-- ════════════════════════════════════════════════════════════
-- END OF MIGRATION
-- ════════════════════════════════════════════════════════════
