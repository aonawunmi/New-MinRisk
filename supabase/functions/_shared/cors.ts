/**
 * CORS Configuration for Supabase Edge Functions
 */

export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-clerk-token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
