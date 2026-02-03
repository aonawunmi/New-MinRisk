/**
 * Supabase Edge Function: Suggest PCI Templates
 *
 * Given a risk and its chosen response type, suggests appropriate
 * Primary Control Instance templates with AI-powered rationale.
 *
 * Input:
 *   - risk_id: string - The risk to get suggestions for
 *   - response_type: string - The chosen risk response (reduce_likelihood, etc.)
 *
 * Output:
 *   - suggestions: Array of { template_id, template_name, priority, rationale }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { USE_CASE_MODELS } from "../_shared/ai-models.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Priority mappings by response type (hardcoded fallback if AI fails)
const RESPONSE_PCI_PRIORITY: Record<string, string[]> = {
  reduce_likelihood: [
    "PCI-01",
    "PCI-02",
    "PCI-03",
    "PCI-04",
    "PCI-05",
    "PCI-06",
    "PCI-07",
    "PCI-09",
    "PCI-10",
    "PCI-11",
    "PCI-12",
    "PCI-16",
  ],
  reduce_impact: ["PCI-13", "PCI-14", "PCI-15", "PCI-08", "PCI-12"],
  transfer_share: ["PCI-14", "PCI-13"],
  avoid: ["PCI-01", "PCI-07", "PCI-16", "PCI-03"],
  accept: [], // No PCIs for accept response
};

interface PCITemplate {
  id: string;
  name: string;
  category: string;
  objective_default: string;
  purpose: string;
}

interface Risk {
  id: string;
  risk_name: string;
  risk_description: string;
  category: string;
  subcategory: string | null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body = await req.json();
    const { risk_id, response_type } = body;

    if (!risk_id || !response_type) {
      return new Response(
        JSON.stringify({
          error: "Missing risk_id or response_type",
          suggestions: [],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch risk data
    const { data: risk, error: riskError } = await supabase
      .from("risks")
      .select("id, risk_name, risk_description, category, subcategory")
      .eq("id", risk_id)
      .single();

    if (riskError || !risk) {
      console.error("Failed to fetch risk:", riskError);
      return new Response(
        JSON.stringify({ error: "Risk not found", suggestions: [] }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Fetch all active PCI templates
    const { data: templates, error: templatesError } = await supabase
      .from("pci_templates")
      .select("id, name, category, objective_default, purpose")
      .eq("is_active", true)
      .order("id");

    if (templatesError || !templates) {
      console.error("Failed to fetch templates:", templatesError);
      return new Response(
        JSON.stringify({
          error: "Failed to load PCI templates",
          suggestions: [],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // If response is "accept", return empty suggestions
    if (response_type === "accept") {
      return new Response(
        JSON.stringify({
          suggestions: [],
          message:
            "Accept response does not require controls. The risk is accepted within appetite.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Try AI-powered suggestions first
    let suggestions = [];

    if (ANTHROPIC_API_KEY) {
      try {
        suggestions = await getAISuggestions(
          risk as Risk,
          response_type,
          templates as PCITemplate[]
        );
      } catch (aiError) {
        console.error("AI suggestions failed, using fallback:", aiError);
        suggestions = getFallbackSuggestions(response_type, templates);
      }
    } else {
      console.log("No API key, using fallback suggestions");
      suggestions = getFallbackSuggestions(response_type, templates);
    }

    return new Response(
      JSON.stringify({ suggestions }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
        suggestions: [],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

async function getAISuggestions(
  risk: Risk,
  responseType: string,
  templates: PCITemplate[]
): Promise<any[]> {
  const templateList = templates
    .map(
      (t) =>
        `${t.id}: ${t.name} (${t.category}) - ${t.purpose}`
    )
    .join("\n");

  const prompt = `You are a risk management expert helping select appropriate control templates.

RISK DETAILS:
- Name: ${risk.risk_name}
- Description: ${risk.risk_description}
- Category: ${risk.category}${risk.subcategory ? ` > ${risk.subcategory}` : ""}

CHOSEN RESPONSE TYPE: ${responseType}
${getResponseDescription(responseType)}

AVAILABLE CONTROL TEMPLATES:
${templateList}

TASK:
Select the 3-5 most appropriate control templates for this risk given the chosen response type.
Consider:
1. The response type objective (${responseType === "reduce_likelihood" ? "prevent occurrence" : responseType === "reduce_impact" ? "limit damage if it occurs" : "transfer risk to another party"})
2. The risk category and nature
3. Template purpose alignment

Return your response as a JSON array with this exact structure:
[
  {
    "template_id": "PCI-XX",
    "template_name": "Full template name",
    "priority": 1,
    "rationale": "Brief explanation of why this control is appropriate for this risk"
  }
]

Priority 1 = most recommended, 2 = second most, etc.
Return ONLY the JSON array, no other text.`;

  const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: USE_CASE_MODELS.DEFAULT,
      max_tokens: 2000,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!anthropicResponse.ok) {
    throw new Error(`Anthropic API error: ${anthropicResponse.status}`);
  }

  const anthropicData = await anthropicResponse.json();
  const responseText = anthropicData.content?.[0]?.text || "";

  // Parse JSON from response
  let jsonText = responseText.trim();
  if (jsonText.startsWith("```json")) {
    jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  return JSON.parse(jsonText);
}

function getFallbackSuggestions(
  responseType: string,
  templates: PCITemplate[]
): any[] {
  const priorityList = RESPONSE_PCI_PRIORITY[responseType] || [];

  return priorityList.slice(0, 5).map((templateId, index) => {
    const template = templates.find((t) => t.id === templateId);
    return {
      template_id: templateId,
      template_name: template?.name || templateId,
      priority: index + 1,
      rationale: template
        ? `Recommended for ${responseType.replace("_", " ")} response. ${template.purpose}`
        : `Standard recommendation for ${responseType.replace("_", " ")} response.`,
    };
  });
}

function getResponseDescription(responseType: string): string {
  const descriptions: Record<string, string> = {
    reduce_likelihood:
      "Goal: Implement controls that PREVENT the risk from occurring. Focus on detection, access controls, validation, approval workflows.",
    reduce_impact:
      "Goal: Implement controls that LIMIT DAMAGE if the risk materializes. Focus on containment, recovery, hedging, resilience.",
    transfer_share:
      "Goal: Transfer or share risk exposure with external parties. Focus on insurance, contracts, partnerships.",
    avoid:
      "Goal: Eliminate the risk entirely by prohibiting the activity or exposure. Focus on exclusion rules and prohibitions.",
  };
  return descriptions[responseType] || "";
}
