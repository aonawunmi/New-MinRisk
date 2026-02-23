/**
 * Supabase Edge Function: AI KRI Suggestions
 *
 * Generates KRI suggestions using Claude AI based on risk data
 *
 * Updated: 2025-12-13 - Centralized AI model configuration
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { USE_CASE_MODELS } from '../_shared/ai-models.ts';
import { verifyClerkAuth } from '../_shared/clerk-auth.ts';

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-clerk-token",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Function called");

    // Authenticate user via Clerk
    let profile, supabaseClient, supabaseAdmin;
    try {
      ({ profile, supabaseClient, supabaseAdmin } = await verifyClerkAuth(req));
    } catch (authError) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { prompt } = body;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Missing prompt parameter", suggestions: null }),
        {
          status: 200,
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
        JSON.stringify({ error: "AI service not configured", suggestions: null }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }

    // Call Anthropic API
    console.log("Calling Anthropic API for KRI suggestions...");
    const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: USE_CASE_MODELS.KRI_GENERATION,
        max_tokens: 4000,
        temperature: 0.7,
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
          error: `AI service error: ${anthropicResponse.status}`,
          details: errorText,
          suggestions: null
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }

    const anthropicData = await anthropicResponse.json();
    const responseText = anthropicData.content?.[0]?.text || "";

    // Parse the JSON response from Claude
    let suggestions;
    try {
      // Try to extract JSON from response (Claude might wrap it in markdown)
      let jsonText = responseText.trim();

      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/,'').replace(/\s*```$/,'');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*/,'').replace(/\s*```$/,'');
      }

      suggestions = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("Failed to parse AI response:", responseText.substring(0, 500));
      console.error("Parse error:", parseError.message);
      return new Response(
        JSON.stringify({
          error: "Failed to parse AI suggestions",
          details: responseText.substring(0, 500),
          suggestions: null
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }

    console.log(`Generated ${suggestions.length} KRI suggestions`);

    return new Response(
      JSON.stringify({
        suggestions,
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
        details: error.message,
        suggestions: null
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        },
      }
    );
  }
});
