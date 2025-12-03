/**
 * AI Library
 *
 * Functions for AI-powered features using Claude API via Supabase Edge Function
 */
import { supabase } from './supabase';
/**
 * Call AI via Supabase Edge Function
 * This proxies requests to Anthropic API to avoid CORS issues
 *
 * Using Supabase SDK's functions.invoke() for proper auth and error handling.
 */
async function callAI(prompt, maxTokens = 1024) {
    console.log('Calling AI edge function...');
    console.log('Prompt length:', prompt.length, 'characters');
    console.log('Max tokens:', maxTokens);
    try {
        const { data, error } = await supabase.functions.invoke('ai-refine', {
            body: { prompt, maxTokens },
        });
        console.log('Edge function response:', { hasData: !!data, hasError: !!error });
        if (error) {
            console.error('Edge function error:', error);
            throw new Error(error.message || 'AI service error');
        }
        if (!data) {
            throw new Error('No response from AI service');
        }
        // The edge function returns { data: string, usage: object }
        if (!data.data) {
            console.error('Unexpected response format:', data);
            throw new Error('Invalid response from AI service');
        }
        console.log('AI response received successfully');
        return data.data;
    }
    catch (error) {
        console.error('AI call failed:', error);
        // Provide user-friendly error messages
        if (error instanceof Error) {
            if (error.message.includes('timeout') || error.message.includes('timed out')) {
                throw new Error('AI request timed out. Please try again with a smaller number of risks.');
            }
            if (error.message.includes('network') || error.message.includes('fetch')) {
                throw new Error('Network error. Please check your internet connection and try again.');
            }
            if (error.message.includes('Unauthorized') || error.message.includes('unauthorized')) {
                throw new Error('Authentication error. Please try logging out and logging back in.');
            }
            // Return the original error message
            throw error;
        }
        throw new Error('Unknown error calling AI service');
    }
}
/**
 * Generate demo/mock control suggestions
 * Used when VITE_AI_DEMO_MODE=true or when API is unavailable
 */
function generateDemoSuggestions(riskTitle, category, inherentLikelihood, inherentImpact) {
    // Simulate API delay
    return new Promise((resolve) => {
        setTimeout(() => {
            const riskScore = inherentLikelihood * inherentImpact;
            const isHighRisk = riskScore >= 12;
            const suggestions = [
                {
                    name: 'Segregation of Duties',
                    description: `Implement clear separation of responsibilities to prevent any single individual from having end-to-end control over critical ${category.toLowerCase()} processes. This includes separating authorization, execution, and reconciliation functions.`,
                    control_type: 'preventive',
                    target: 'Likelihood',
                    design_score: isHighRisk ? 3 : 2,
                    implementation_score: isHighRisk ? 3 : 2,
                    monitoring_score: 2,
                    evaluation_score: 2,
                    rationale: `Segregation of duties is a fundamental control that reduces the likelihood of ${riskTitle.toLowerCase()} by ensuring multiple people are involved in critical processes, making fraud or errors more difficult.`,
                },
                {
                    name: 'Regular Monitoring and Reconciliation',
                    description: `Establish systematic monitoring procedures with daily or weekly reconciliations of key ${category.toLowerCase()} activities. Automated alerts for anomalies or deviations from expected patterns should be configured.`,
                    control_type: 'detective',
                    target: 'Likelihood',
                    design_score: 2,
                    implementation_score: 2,
                    monitoring_score: 3,
                    evaluation_score: 2,
                    rationale: 'Regular monitoring helps detect potential issues early, allowing for timely corrective action before the risk materializes into a significant incident.',
                },
                {
                    name: 'Management Review and Approval',
                    description: `Require management review and approval for high-value or high-risk ${category.toLowerCase()} transactions. Establish clear approval hierarchies and dollar thresholds for escalation.`,
                    control_type: 'preventive',
                    target: 'Likelihood',
                    design_score: 2,
                    implementation_score: 2,
                    monitoring_score: 2,
                    evaluation_score: 2,
                    rationale: `Management oversight adds an additional layer of review that can catch errors or unauthorized activities before they result in ${riskTitle.toLowerCase()}.`,
                },
            ];
            // Add more controls for high-risk items
            if (isHighRisk) {
                suggestions.push({
                    name: 'Backup and Recovery Procedures',
                    description: `Implement comprehensive backup and disaster recovery procedures to minimize ${category.toLowerCase()} impact. Include regular testing of recovery processes and documentation of recovery time objectives (RTO) and recovery point objectives (RPO).`,
                    control_type: 'corrective',
                    target: 'Impact',
                    design_score: 3,
                    implementation_score: 3,
                    monitoring_score: 3,
                    evaluation_score: 3,
                    rationale: 'While this control does not prevent the risk from occurring, it significantly reduces the potential impact by ensuring quick recovery and business continuity.',
                });
                suggestions.push({
                    name: 'Automated Exception Reporting',
                    description: `Deploy automated systems to identify and report exceptions in ${category.toLowerCase()} processes. Configure real-time alerts for unusual patterns, threshold breaches, or policy violations.`,
                    control_type: 'detective',
                    target: 'Likelihood',
                    design_score: 3,
                    implementation_score: 2,
                    monitoring_score: 3,
                    evaluation_score: 2,
                    rationale: 'Automated detection capabilities provide continuous monitoring beyond manual review capacity, catching issues that might otherwise go unnoticed.',
                });
            }
            console.log(`Demo mode: Generated ${suggestions.length} suggestions for ${riskTitle}`);
            resolve({ data: suggestions, error: null });
        }, 2000); // 2 second delay to simulate API call
    });
}
/**
 * Get AI-recommended controls for a risk
 *
 * @param riskTitle - The title of the risk
 * @param riskDescription - Detailed description of the risk
 * @param category - Risk category
 * @param division - Business division
 * @param inherentLikelihood - Inherent likelihood score (1-5)
 * @param inherentImpact - Inherent impact score (1-5)
 * @returns Array of suggested controls
 */
export async function getAIControlRecommendations(riskTitle, riskDescription, category, division, inherentLikelihood, inherentImpact) {
    try {
        // Check if demo mode is enabled
        const useDemoMode = import.meta.env.VITE_AI_DEMO_MODE === 'true';
        // If demo mode is enabled, return mock suggestions
        if (useDemoMode) {
            console.log('AI Demo Mode: Generating mock suggestions for:', riskTitle);
            return generateDemoSuggestions(riskTitle, category, inherentLikelihood, inherentImpact);
        }
        // Construct the prompt
        const prompt = `You are a risk management expert. Analyze the following risk and recommend appropriate controls.

RISK DETAILS:
- Title: ${riskTitle}
- Description: ${riskDescription || 'No description provided'}
- Category: ${category}
- Division: ${division}
- Inherent Likelihood: ${inherentLikelihood}/5
- Inherent Impact: ${inherentImpact}/5
- Inherent Risk Score: ${inherentLikelihood * inherentImpact}

TASK:
Recommend 3-5 specific, actionable controls to mitigate this risk. For each control, provide:

1. **Name**: A clear, concise name (e.g., "Segregation of Duties", "Daily Reconciliation")
2. **Description**: Detailed explanation of how the control works (2-3 sentences)
3. **Control Type**: One of: "preventive", "detective", or "corrective"
4. **Target**: Either "Likelihood" or "Impact" - which dimension this control primarily reduces
5. **DIME Scores** (0-3 scale):
   - Design (D): How well-designed is this control? (0=Not implemented, 1=Weak, 2=Adequate, 3=Strong)
   - Implementation (I): How well could this be implemented? (0=Not implemented, 1=Weak, 2=Adequate, 3=Strong)
   - Monitoring (M): How well can this control be monitored? (0=No monitoring, 1=Weak, 2=Adequate, 3=Strong)
   - Evaluation (E): How well can effectiveness be evaluated? (0=No evaluation, 1=Weak, 2=Adequate, 3=Strong)
6. **Rationale**: Why this control is recommended for this specific risk (1-2 sentences)

IMPORTANT GUIDELINES:
- Suggest controls appropriate for the risk level (higher risk = more/stronger controls)
- Mix preventive and detective controls when appropriate
- Consider industry best practices
- Ensure controls are practical and implementable
- DIME scores should be realistic (most controls will have scores of 2-3 for well-designed controls)

RESPONSE FORMAT:
Return your response as a valid JSON array of objects. Each object must have this exact structure:
{
  "name": "string",
  "description": "string",
  "control_type": "preventive" | "detective" | "corrective",
  "target": "Likelihood" | "Impact",
  "design_score": 0 | 1 | 2 | 3,
  "implementation_score": 0 | 1 | 2 | 3,
  "monitoring_score": 0 | 1 | 2 | 3,
  "evaluation_score": 0 | 1 | 2 | 3,
  "rationale": "string"
}

Return ONLY the JSON array, no other text.`;
        // Call AI via edge function (to avoid CORS issues)
        const contentText = await callAI(prompt, 4096);
        // Extract JSON from response
        const jsonMatch = contentText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            return {
                data: null,
                error: new Error('Failed to parse AI response - no JSON array found'),
            };
        }
        // Parse the JSON response
        try {
            const suggestions = JSON.parse(jsonMatch[0]);
            // Validate the suggestions
            if (!Array.isArray(suggestions)) {
                throw new Error('Response is not an array');
            }
            // Validate each suggestion has required fields
            for (const suggestion of suggestions) {
                if (!suggestion.name || !suggestion.description || !suggestion.control_type || !suggestion.target) {
                    throw new Error('Missing required fields in suggestion');
                }
            }
            console.log(`AI generated ${suggestions.length} control suggestions for risk: ${riskTitle}`);
            return { data: suggestions, error: null };
        }
        catch (parseError) {
            console.error('Failed to parse Claude response:', contentText);
            return {
                data: null,
                error: new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`),
            };
        }
    }
    catch (err) {
        console.error('Unexpected error getting AI control recommendations:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}
/**
 * Generate demo/mock risk suggestions
 */
function generateDemoRisks(industry, businessUnit, category, numberOfRisks, additionalContext) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const risks = [];
            const categories = category === 'All Categories'
                ? ['Operational', 'Strategic', 'Financial', 'Compliance', 'Technology', 'Market', 'Reputational']
                : [category];
            for (let i = 0; i < numberOfRisks; i++) {
                const riskCategory = categories[i % categories.length];
                const riskNumber = String(i + 1).padStart(3, '0');
                risks.push({
                    risk_code: `${riskCategory.substring(0, 3).toUpperCase()}-${riskNumber}`,
                    risk_title: `${riskCategory} Risk in ${businessUnit || industry}`,
                    risk_description: `This is a context-specific ${riskCategory.toLowerCase()} risk identified for ${businessUnit || industry}${additionalContext ? `. ${additionalContext}` : ''}. The risk requires monitoring and appropriate controls to mitigate potential impact.`,
                    category: riskCategory,
                    division: businessUnit || industry,
                    owner: 'Risk Officer',
                    likelihood_inherent: Math.floor(Math.random() * 3) + 2, // 2-4
                    impact_inherent: Math.floor(Math.random() * 3) + 2, // 2-4
                    status: 'OPEN',
                    rationale: `This risk is relevant to ${industry} organizations, particularly within ${businessUnit || 'this business unit'}, based on industry best practices and common risk scenarios.`,
                });
            }
            console.log(`Demo mode: Generated ${risks.length} risk suggestions`);
            resolve({ data: risks, error: null });
        }, 2500); // 2.5 second delay to simulate API call
    });
}
/**
 * Generate AI-powered risk suggestions based on context
 *
 * @param industry - Industry or sector (e.g., "Banking", "Healthcare")
 * @param businessUnit - Business unit or department
 * @param category - Risk category filter (or "All Categories")
 * @param numberOfRisks - Number of risks to generate
 * @param additionalContext - Optional additional context
 * @returns Array of generated risks
 */
export async function generateAIRisks(industry, businessUnit, category, numberOfRisks, additionalContext) {
    try {
        // Check if demo mode is enabled
        const useDemoMode = import.meta.env.VITE_AI_DEMO_MODE === 'true';
        // If demo mode is enabled, return mock suggestions
        if (useDemoMode) {
            console.log('AI Demo Mode: Generating mock risks for:', industry, businessUnit);
            return generateDemoRisks(industry, businessUnit, category, numberOfRisks, additionalContext);
        }
        console.log('AI Generation: Using edge function for:', industry, businessUnit);
        // Construct the prompt
        const categoryFilter = category === 'All Categories' ? 'across all categories' : `focusing on ${category} risks`;
        const prompt = `You are a risk management expert. Generate ${numberOfRisks} context-specific risks for the following organization.

ORGANIZATION CONTEXT:
- Industry/Sector: ${industry}
- Business Unit/Department: ${businessUnit}
- Risk Category Focus: ${categoryFilter}
${additionalContext ? `- Additional Context: ${additionalContext}` : ''}

TASK:
Generate ${numberOfRisks} specific, realistic risks that are relevant to this organization. For each risk, provide:

1. **Risk Code**: A short code (e.g., "OPS-001", "FIN-002", "TEC-003")
2. **Risk Title**: A clear, concise title (5-10 words)
3. **Risk Description**: Detailed description of the risk (2-4 sentences)
4. **Category**: One of: "Operational", "Strategic", "Financial", "Compliance", "Technology", "Market", or "Reputational"
5. **Division**: The business unit/department this risk affects
6. **Owner**: Suggested risk owner role (e.g., "CFO", "CTO", "Operations Manager")
7. **Inherent Likelihood**: Score from 1-5 (how likely without controls)
8. **Inherent Impact**: Score from 1-5 (severity if it occurs)
9. **Status**: Always "OPEN" for new risks
10. **Rationale**: Why this risk is relevant (1-2 sentences)

IMPORTANT GUIDELINES:
- Make risks specific to ${industry} and ${businessUnit}
- Ensure variety in risk types and severity
- Base risks on industry best practices and common risk scenarios
- Likelihood and impact should be realistic (most risks will be 2-4 range)
- Risk codes should match category (OPS=Operational, FIN=Financial, etc.)
${category !== 'All Categories' ? `- Focus ONLY on ${category} category risks` : ''}

RESPONSE FORMAT:
Return your response as a valid JSON array of objects. Each object must have this exact structure:
{
  "risk_code": "string",
  "risk_title": "string",
  "risk_description": "string",
  "category": "Operational" | "Strategic" | "Financial" | "Compliance" | "Technology" | "Market" | "Reputational",
  "division": "string",
  "owner": "string",
  "likelihood_inherent": 1 | 2 | 3 | 4 | 5,
  "impact_inherent": 1 | 2 | 3 | 4 | 5,
  "status": "OPEN",
  "rationale": "string"
}

Return ONLY the JSON array, no other text.`;
        // Call Claude API via Edge Function (to avoid CORS issues)
        const assistantMessage = await callAI(prompt, 4096);
        // Parse the JSON response
        try {
            // Strip markdown code blocks if present (Claude sometimes wraps JSON in ```json ... ```)
            let jsonString = assistantMessage.trim();
            // Remove ```json and ``` wrapper if present
            if (jsonString.startsWith('```json')) {
                jsonString = jsonString.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
            }
            else if (jsonString.startsWith('```')) {
                jsonString = jsonString.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
            }
            const risks = JSON.parse(jsonString);
            // Validate the risks
            if (!Array.isArray(risks)) {
                throw new Error('Response is not an array');
            }
            // Validate each risk has required fields
            for (const risk of risks) {
                if (!risk.risk_code || !risk.risk_title || !risk.category || !risk.likelihood_inherent || !risk.impact_inherent) {
                    throw new Error('Missing required fields in risk');
                }
            }
            console.log(`AI generated ${risks.length} risk suggestions`);
            return { data: risks, error: null };
        }
        catch (parseError) {
            console.error('Failed to parse Claude response:', assistantMessage);
            return {
                data: null,
                error: new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`),
            };
        }
    }
    catch (err) {
        console.error('Unexpected error generating AI risks:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}
/**
 * Classify and rewrite a risk statement using the controlled taxonomy
 *
 * Steps performed by AI:
 * 1. Classify into category & subcategory from provided taxonomy
 * 2. Explain why that classification fits
 * 3. Rewrite risk into clean ERM-standard format
 *
 * @param userStatement - User's raw risk statement
 * @param taxonomy - Array of category/subcategory objects from database
 * @returns AI classification with explanation and normalized statement
 */
export async function classifyRiskStatement(userStatement, taxonomy) {
    try {
        // Get API key from environment
        const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
        const useDemoMode = import.meta.env.VITE_AI_DEMO_MODE === 'true';
        if (!apiKey && !useDemoMode) {
            return {
                data: null,
                error: new Error('Anthropic API key not configured.'),
            };
        }
        // If demo mode, return mock classification
        if (useDemoMode) {
            console.log('AI Demo Mode: Classifying risk statement');
            return generateDemoClassification(userStatement, taxonomy);
        }
        // Build taxonomy context for AI
        const taxonomyContext = taxonomy
            .map(t => `- ${t.category} → ${t.subcategory}: ${t.subcategory_description}`)
            .join('\n');
        // Construct prompt
        const prompt = `You are a risk management expert tasked with classifying risk statements using a controlled taxonomy.

USER'S RAW RISK STATEMENT:
"${userStatement}"

CONTROLLED RISK TAXONOMY:
${taxonomyContext}

YOUR TASKS:
1. **Classify**: Select the ONE most appropriate Category and Sub-Category from the taxonomy above.
2. **Explain**: In 1-2 sentences, explain why this classification fits the user's statement.
3. **Rewrite**: Transform the user's statement into a clean, forward-looking, ERM-standard risk statement.

REWRITING GUIDELINES:
- Use clear, professional language
- Frame as a forward-looking risk (not past event)
- Be specific and actionable
- Include potential impact
- Keep it concise (2-4 sentences)

RESPONSE FORMAT:
Return your response as valid JSON with this exact structure:
{
  "category": "string (exact match from taxonomy)",
  "subcategory": "string (exact match from taxonomy)",
  "explanation": "string (1-2 sentences)",
  "normalized_statement": "string (clean, professional risk statement)",
  "confidence": "high" | "medium" | "low"
}

IMPORTANT:
- category and subcategory MUST match the taxonomy exactly
- Do NOT create new categories or subcategories
- If unsure, choose the closest match and set confidence to "medium" or "low"
- Return ONLY the JSON object, no other text.`;
        // Call Claude API
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 1024,
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
            }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Claude API error:', errorData);
            return {
                data: null,
                error: new Error(`Claude API error: ${errorData.error?.message || response.statusText}`),
            };
        }
        const data = await response.json();
        const assistantMessage = data.content[0]?.text;
        if (!assistantMessage) {
            return {
                data: null,
                error: new Error('No response from Claude API'),
            };
        }
        // Parse JSON response
        try {
            const classification = JSON.parse(assistantMessage);
            // Validate required fields
            if (!classification.category || !classification.subcategory || !classification.explanation || !classification.normalized_statement) {
                throw new Error('Missing required fields in AI response');
            }
            // Add original statement
            classification.original_statement = userStatement;
            console.log('AI classified risk:', classification.category, '→', classification.subcategory);
            return { data: classification, error: null };
        }
        catch (parseError) {
            console.error('Failed to parse Claude response:', assistantMessage);
            return {
                data: null,
                error: new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`),
            };
        }
    }
    catch (err) {
        console.error('Unexpected error classifying risk:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}
/**
 * Demo/mock classification for when AI is unavailable
 */
function generateDemoClassification(userStatement, taxonomy) {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Pick a random taxonomy entry
            const randomEntry = taxonomy[Math.floor(Math.random() * taxonomy.length)];
            const classification = {
                original_statement: userStatement,
                category: randomEntry.category,
                subcategory: randomEntry.subcategory,
                explanation: `This risk statement aligns with ${randomEntry.subcategory} because it involves potential impacts related to this risk area based on the context provided.`,
                normalized_statement: `Risk of ${userStatement.toLowerCase()}. This could result in operational disruptions, financial impact, and stakeholder concerns if not properly managed and mitigated through appropriate controls.`,
                confidence: 'medium',
            };
            console.log('Demo mode: Generated mock classification');
            resolve({ data: classification, error: null });
        }, 1500);
    });
}
/**
 * Refine a risk statement to make it clearer and more professional
 * WITHOUT changing the category/subcategory (user already selected those)
 *
 * This is used in the enhanced Add Risk form where users optionally
 * click "Fine-tune with AI" after writing their risk statement.
 */
export async function refineRiskStatement(userStatement, category, subcategory) {
    try {
        // Check if demo mode is enabled
        const demoMode = import.meta.env.VITE_AI_DEMO_MODE === 'true';
        if (demoMode) {
            // Return mock refinement in demo mode
            return generateDemoRefinement(userStatement, category, subcategory);
        }
        // Real API call via edge function
        const prompt = `You are a professional risk management expert. A user has written a risk statement and selected it should be classified as:

CATEGORY: ${category}
SUB-CATEGORY: ${subcategory}

USER'S RISK STATEMENT:
"${userStatement}"

YOUR TASK:
Improve and refine this risk statement to make it:
1. **Clear and Professional** - Use standard ERM language
2. **Forward-looking** - Frame as "Risk of..." or "Risk that..."
3. **Specific and Actionable** - Avoid vague language
4. **Concise** - 1-3 sentences maximum

IMPORTANT:
- DO NOT change the category or subcategory (user already selected them)
- DO NOT change the core meaning or intent of the risk
- DO preserve the user's specific context and details
- DO make it sound professional and well-structured

RESPONSE FORMAT:
Return valid JSON with this exact structure:
{
  "refined_statement": "Your improved version of the risk statement",
  "improvements_made": ["Improvement 1", "Improvement 2", "Improvement 3"],
  "explanation": "Brief explanation of what you changed and why (1-2 sentences)"
}`;
        // Call AI via edge function
        const contentText = await callAI(prompt, 1024);
        // Extract JSON from response
        const jsonMatch = contentText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return {
                data: null,
                error: new Error('Failed to parse AI response'),
            };
        }
        const refinement = JSON.parse(jsonMatch[0]);
        const data = {
            original_statement: userStatement,
            refined_statement: refinement.refined_statement,
            improvements_made: refinement.improvements_made || [],
            explanation: refinement.explanation || '',
        };
        console.log('AI refinement successful');
        return { data, error: null };
    }
    catch (err) {
        console.error('Unexpected refinement error:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}
/**
 * Generate demo refinement for testing (when API is unavailable)
 */
function generateDemoRefinement(userStatement, category, subcategory) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const refinement = {
                original_statement: userStatement,
                refined_statement: `Risk of ${userStatement.toLowerCase().replace(/^(risk of |risk that )/i, '')}. This could result in operational disruptions, financial impact, and reputational damage if not properly managed through appropriate controls and mitigation strategies.`,
                improvements_made: [
                    'Added forward-looking "Risk of..." framing',
                    'Made language more professional and structured',
                    'Included potential impact areas for clarity',
                ],
                explanation: `Refined the statement to use standard ERM language while preserving your specific context about ${subcategory} risks.`,
            };
            console.log('Demo mode: Generated mock refinement');
            resolve({ data: refinement, error: null });
        }, 1200);
    });
}
/**
 * Re-validate an edited risk statement to ensure category/subcategory still fit
 *
 * This is called when user edits the AI-refined statement.
 * AI checks if the edited version still fits the originally selected category/subcategory.
 */
export async function revalidateEditedStatement(editedStatement, originalCategory, originalSubcategory, taxonomy) {
    try {
        // Check if demo mode is enabled
        const demoMode = import.meta.env.VITE_AI_DEMO_MODE === 'true';
        if (demoMode) {
            // Return mock revalidation in demo mode
            return generateDemoRevalidation(editedStatement, originalCategory, originalSubcategory);
        }
        // Real API call via edge function
        const taxonomyContext = taxonomy
            .map((entry) => `- **${entry.category}** → **${entry.subcategory}**: ${entry.subcategory_description}`)
            .join('\n');
        const prompt = `You are a professional risk management expert. A user originally selected:

ORIGINAL CATEGORY: ${originalCategory}
ORIGINAL SUB-CATEGORY: ${originalSubcategory}

The user then edited their risk statement to:

EDITED STATEMENT:
"${editedStatement}"

YOUR TASK:
Check if the edited statement still fits the originally selected category and sub-category.

AVAILABLE TAXONOMY:
${taxonomyContext}

IMPORTANT:
- If the edited statement STILL fits the original category/sub-category, confirm it
- If the edited statement NO LONGER fits, suggest the correct category/sub-category from the taxonomy
- DO NOT change the wording - only validate the classification

RESPONSE FORMAT:
Return valid JSON with this exact structure:
{
  "category_still_valid": true/false,
  "subcategory_still_valid": true/false,
  "suggested_category": "Category Name" (only if invalid, otherwise same as original),
  "suggested_subcategory": "Subcategory Name" (only if invalid, otherwise same as original),
  "explanation": "Brief explanation of why the classification is correct or needs to change (1-2 sentences)",
  "final_statement": "The user's edited statement (no changes to wording)"
}`;
        // Call AI via edge function
        const contentText = await callAI(prompt, 1024);
        // Extract JSON from response
        const jsonMatch = contentText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return {
                data: null,
                error: new Error('Failed to parse AI response'),
            };
        }
        const validation = JSON.parse(jsonMatch[0]);
        const data = {
            edited_statement: editedStatement,
            category_still_valid: validation.category_still_valid,
            subcategory_still_valid: validation.subcategory_still_valid,
            suggested_category: validation.suggested_category || originalCategory,
            suggested_subcategory: validation.suggested_subcategory || originalSubcategory,
            explanation: validation.explanation || '',
            final_statement: validation.final_statement || editedStatement,
        };
        console.log('AI revalidation successful');
        return { data, error: null };
    }
    catch (err) {
        console.error('Unexpected revalidation error:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}
/**
 * Generate demo revalidation for testing (when API is unavailable)
 */
function generateDemoRevalidation(editedStatement, originalCategory, originalSubcategory) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const revalidation = {
                edited_statement: editedStatement,
                category_still_valid: true,
                subcategory_still_valid: true,
                suggested_category: originalCategory,
                suggested_subcategory: originalSubcategory,
                explanation: `The edited statement still aligns well with ${originalSubcategory} under ${originalCategory}. No changes needed to the classification.`,
                final_statement: editedStatement,
            };
            console.log('Demo mode: Generated mock revalidation');
            resolve({ data: revalidation, error: null });
        }, 1000);
    });
}
