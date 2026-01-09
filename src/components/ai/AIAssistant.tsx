/**
 * AIAssistant Component
 *
 * AI-powered risk generation using Claude API.
 * Generates context-specific risks based on industry, business unit, and other parameters.
 */

import { useState, useEffect } from 'react';
import { generateAIRisks, type AIGeneratedRisk } from '@/lib/ai';
import { createRisk, getRisks } from '@/lib/risks';
import { getActivePeriod, formatPeriod } from '@/lib/periods-v2';
import { getCategories as fetchTaxonomyCategories } from '@/lib/taxonomy';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Loader2, CheckCircle, XCircle, EyeOff } from 'lucide-react';



export default function AIAssistant() {
  const { profile } = useAuth();
  const [industry, setIndustry] = useState('');
  const [businessUnit, setBusinessUnit] = useState('');
  const [category, setCategory] = useState<string>('All Categories');
  const [numberOfRisks, setNumberOfRisks] = useState(5);
  const [additionalContext, setAdditionalContext] = useState('');

  // Dynamic categories from Risk Taxonomy
  const [taxonomyCategories, setTaxonomyCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [generating, setGenerating] = useState(false);
  const [generatedRisks, setGeneratedRisks] = useState<AIGeneratedRisk[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(true);

  // Fetch taxonomy categories on mount
  useEffect(() => {
    async function loadCategories() {
      try {
        const { data, error } = await fetchTaxonomyCategories();
        if (error) {
          console.error('Failed to load taxonomy categories:', error);
        } else if (data) {
          setTaxonomyCategories(data.map((cat) => cat.name));
        }
      } catch (err) {
        console.error('Error fetching taxonomy categories:', err);
      } finally {
        setLoadingCategories(false);
      }
    }
    loadCategories();
  }, []);

  // Combine "All Categories" with taxonomy categories
  const categoryOptions = ['All Categories', ...taxonomyCategories];

  const handleGenerate = async () => {
    setError(null);
    setSuccess(null);
    setGeneratedRisks([]);

    // Validation
    if (!industry.trim()) {
      setError('Please enter an industry or sector');
      return;
    }

    setGenerating(true);

    try {
      const { data, error: aiError } = await generateAIRisks(
        industry,
        businessUnit || industry,
        category,
        numberOfRisks,
        additionalContext || undefined,
        taxonomyCategories
      );

      if (aiError) {
        setError(aiError.message);
        console.error('AI generation error:', aiError);
      } else if (data) {
        setGeneratedRisks(data);
        setSuccess(`Successfully generated ${data.length} risk${data.length > 1 ? 's' : ''}!`);
      }
    } catch (err) {
      console.error('Unexpected generation error:', err);
      setError('An unexpected error occurred');
    } finally {
      setGenerating(false);
    }
  };

  const handleAddRiskToRegister = async (risk: AIGeneratedRisk, index: number) => {
    if (!profile?.organization_id) {
      alert('Organization context missing');
      return;
    }

    try {
      // Get active period
      const { data: activePeriodData } = await getActivePeriod(profile.organization_id);

      // Determine period string
      const periodString = activePeriodData
        ? formatPeriod({
          year: activePeriodData.current_period_year,
          quarter: activePeriodData.current_period_quarter
        })
        : 'Q1 2025';

      // Get existing risks to check for code uniqueness
      const { data: existingRisks } = await getRisks();
      const existingCodes = new Set((existingRisks || []).map(r => r.risk_code));

      // Ensure unique risk code
      let riskCode = risk.risk_code;
      let counter = 1;
      while (existingCodes.has(riskCode)) {
        riskCode = `${risk.risk_code}-${counter}`;
        counter++;
      }

      const { error: createError } = await createRisk({
        risk_code: riskCode,
        risk_title: risk.risk_title,
        risk_description: risk.risk_description,
        category: risk.category,
        division: risk.division,
        department: risk.division, // Use division as department
        owner: risk.owner,
        likelihood_inherent: risk.likelihood_inherent,
        impact_inherent: risk.impact_inherent,
        status: risk.status,
        period: periodString,
        is_priority: false,
      });

      if (createError) {
        alert(`Failed to add risk: ${createError.message}`);
        console.error('Create risk error:', createError);
      } else {
        // Remove from generated list
        setGeneratedRisks((prev) => prev.filter((_, i) => i !== index));
        if (generatedRisks.length === 1) {
          setSuccess('All generated risks have been added to the register!');
        }
      }
    } catch (err) {
      console.error('Unexpected error adding risk:', err);
      alert('An unexpected error occurred');
    }
  };

  const handleAddAllRisks = async () => {
    if (!profile?.organization_id) {
      alert('Organization context missing');
      return;
    }

    try {
      const { data: activePeriodData } = await getActivePeriod(profile.organization_id);

      const periodString = activePeriodData
        ? formatPeriod({
          year: activePeriodData.current_period_year,
          quarter: activePeriodData.current_period_quarter
        })
        : 'Q1 2025';

      // Get existing risks to check for code uniqueness
      const { data: existingRisks } = await getRisks();
      const existingCodes = new Set((existingRisks || []).map(r => r.risk_code));

      let successCount = 0;
      let failCount = 0;

      for (const risk of generatedRisks) {
        // Ensure unique risk code
        let riskCode = risk.risk_code;
        let counter = 1;
        while (existingCodes.has(riskCode)) {
          riskCode = `${risk.risk_code}-${counter}`;
          counter++;
        }

        // Add the used code to the set for next iteration
        existingCodes.add(riskCode);

        const { error: createError } = await createRisk({
          risk_code: riskCode,
          risk_title: risk.risk_title,
          risk_description: risk.risk_description,
          category: risk.category,
          division: risk.division,
          department: risk.division, // Use division as department
          owner: risk.owner,
          likelihood_inherent: risk.likelihood_inherent,
          impact_inherent: risk.impact_inherent,
          status: risk.status,
          period: periodString,
          is_priority: false,
        });

        if (createError) {
          failCount++;
          console.error('Create risk error:', createError);
        } else {
          successCount++;
        }
      }

      setGeneratedRisks([]);
      if (failCount > 0) {
        setSuccess(`Added ${successCount} risks to the register. ${failCount} failed.`);
      } else {
        setSuccess(`All ${successCount} risks have been added to the register!`);
      }
    } catch (err) {
      console.error('Unexpected error adding all risks:', err);
      alert('An unexpected error occurred');
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600 rounded-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle>AI Risk Generator</CardTitle>
                <CardDescription>
                  Generate context-specific risks using Claude AI
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGenerator(!showGenerator)}
              className="border-purple-500 text-purple-600 hover:bg-purple-50"
            >
              <EyeOff className="h-4 w-4 mr-2" />
              {showGenerator ? 'Hide Generator' : 'Show Generator'}
            </Button>
          </div>
        </CardHeader>

        {showGenerator && (
          <CardContent>
            <div className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Risk Generation Context</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="industry">
                      Industry / Sector <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="industry"
                      placeholder="e.g., Banking, Insurance, Healthcare"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      disabled={generating}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessUnit">Business Unit / Department</Label>
                    <Input
                      id="businessUnit"
                      placeholder="e.g., Trading Desk, IT Operations"
                      value={businessUnit}
                      onChange={(e) => setBusinessUnit(e.target.value)}
                      disabled={generating}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Risk Category</Label>
                    <Select
                      value={category}
                      onValueChange={(value) => setCategory(value)}
                      disabled={generating}
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="numberOfRisks">Number of Risks</Label>
                    <Input
                      id="numberOfRisks"
                      type="number"
                      min="1"
                      max="20"
                      value={numberOfRisks}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        setNumberOfRisks(Math.min(Math.max(value, 1), 20));
                      }}
                      disabled={generating}
                    />
                    <p className="text-xs text-gray-500">Maximum 20 risks per generation</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="context">Additional Context (Optional)</Label>
                  <Textarea
                    id="context"
                    placeholder="Provide any additional context, specific concerns, or areas of focus..."
                    rows={4}
                    value={additionalContext}
                    onChange={(e) => setAdditionalContext(e.target.value)}
                    disabled={generating}
                  />
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={generating || !industry.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  size="lg"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Risks...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Risks
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Generated Risks Display */}
      {generatedRisks.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Generated Risks ({generatedRisks.length})</CardTitle>
              <Button onClick={handleAddAllRisks} size="sm">
                Add All to Register
              </Button>
            </div>
            <CardDescription>
              Review the AI-generated risks below and add them to your risk register
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {generatedRisks.map((risk, index) => (
                <Card key={index} className="border-l-4 border-l-purple-500">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                              {risk.risk_code}
                            </span>
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                              {risk.category}
                            </span>
                          </div>
                          <h4 className="font-semibold text-gray-900">{risk.risk_title}</h4>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddRiskToRegister(risk, index)}
                        >
                          Add to Register
                        </Button>
                      </div>

                      <p className="text-sm text-gray-600">{risk.risk_description}</p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Division:</span>{' '}
                          <span className="font-medium">{risk.division}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Owner:</span>{' '}
                          <span className="font-medium">{risk.owner}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Likelihood:</span>{' '}
                          <span className="font-medium">{risk.likelihood_inherent}/5</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Impact:</span>{' '}
                          <span className="font-medium">{risk.impact_inherent}/5</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <p className="text-xs text-gray-600 italic">
                          <strong>Rationale:</strong> {risk.rationale}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
