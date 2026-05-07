import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await userSupabase.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const { data: roleData } = await userSupabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleData) throw new Error('Admin access required')

    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('SERVICE_ROLE_KEY_MISSING')

    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    let allUsers: any[] = []
    let page = 1
    const perPage = 1000
    while (true) {
      const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage })
      if (error) throw error
      const batch = data?.users ?? []
      if (batch.length === 0) break
      allUsers = allUsers.concat(batch)
      if (batch.length < perPage) break
      page++
    }

    const { data: profiles } = await adminSupabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, created_at')
    const { data: roles } = await adminSupabase
      .from('user_roles')
      .select('user_id, role')

    const profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]))
    const rolesMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]))

    const usersWithDetails = allUsers.map(u => ({
      id: u.id,
      email: u.email || '',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at || null,
      profile: profilesMap.get(u.id) || null,
      role: rolesMap.get(u.id) || 'user',
    }))

    return new Response(JSON.stringify({ users: usersWithDetails }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
