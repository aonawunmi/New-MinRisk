/**
 * Supabase Edge Function: AI Refinement Proxy
 *
 * This function proxies AI requests to Anthropic API to avoid CORS issues
 * and keep the API key secure on the server side.
 *
 * Updated: 2025-12-13 - Centralized AI model configuration
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyClerkAuth } from '../_shared/clerk-auth.ts';
import { USE_CASE_MODELS } from '../_shared/ai-models.ts';

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user is authenticated via Clerk
    let profile;
    try {
      const authResult = await verifyClerkAuth(req);
      profile = authResult.profile;
    } catch (authError) {
      console.error("Authentication failed:", authError.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: authError.message }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }

    console.log("User authenticated:", profile.email);

    // Parse request body
    const body = await req.json();
    const { prompt, maxTokens = 1024 } = body;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Missing prompt parameter" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }

    if (!ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }

    // Call Anthropic API
    const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: USE_CASE_MODELS.TEXT_REFINEMENT,
        max_tokens: maxTokens,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error("Anthropic API error:", errorText);
      return new Response(
        JSON.stringify({
          error: "AI service error",
          details: errorText
        }),
        {
          status: anthropicResponse.status,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }

    const anthropicData = await anthropicResponse.json();

    // Extract the text response
    const responseText = anthropicData.content?.[0]?.text || "";

    return new Response(
      JSON.stringify({
        data: responseText,
        usage: anthropicData.usage
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        },
      }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error.message
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        },
      }
    );
  }
});
