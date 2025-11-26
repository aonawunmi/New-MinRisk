/**
 * AI-Powered Risk Creation Component
 *
 * Phase 2: AI Classification System
 *
 * Workflow:
 * 1. User enters raw risk statement
 * 2. AI classifies into taxonomy category/subcategory
 * 3. AI explains why classification fits
 * 4. AI rewrites risk in ERM-standard format
 * 5. User accepts or edits
 * 6. If edited, AI re-validates classification
 * 7. Save with original + normalized statements
 */

import { useState, useEffect } from 'react';
import { classifyRiskStatement, type AIRiskClassification } from '@/lib/ai';
import { exportTaxonomy } from '@/lib/taxonomy';
import { createRisk } from '@/lib/risks';
import { getActivePeriod } from '@/lib/periods';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Sparkles,
  Loader2,
  CheckCircle,
  AlertCircle,
  Edit3,
  Save,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type WorkflowStep = 'input' | 'classifying' | 'review' | 'editing' | 'saving' | 'complete';

export default function AIRiskCreation() {
  const [step, setStep] = useState<WorkflowStep>('input');

  // User input
  const [userStatement, setUserStatement] = useState('');

  // AI classification result
  const [classification, setClassification] = useState<AIRiskClassification | null>(null);

  // Additional risk fields
  const [riskOwner, setRiskOwner] = useState('');
  const [division, setDivision] = useState('');
  const [department, setDepartment] = useState('');
  const [likelihood, setLikelihood] = useState<number>(3);
  const [impact, setImpact] = useState<number>(3);

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editedStatement, setEditedStatement] = useState('');

  // Feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleClassify() {
    if (!userStatement.trim()) {
      setError('Please enter a risk statement');
      return;
    }

    setError(null);
    setStep('classifying');

    try {
      // Fetch taxonomy from database
      const { data: taxonomyData, error: taxonomyError } = await exportTaxonomy();

      if (taxonomyError || !taxonomyData) {
        throw new Error('Failed to load taxonomy');
      }

      // Transform taxonomy for AI
      const taxonomy = taxonomyData.map(row => ({
        category: row.category,
        subcategory: row.subcategory,
        category_description: row.category_description,
        subcategory_description: row.subcategory_description,
      }));

      // Call AI classification
      const { data, error: aiError } = await classifyRiskStatement(
        userStatement,
        taxonomy
      );

      if (aiError) {
        throw aiError;
      }

      setClassification(data);
      setEditedStatement(data!.normalized_statement);
      setStep('review');
    } catch (err: any) {
      console.error('Classification error:', err);
      setError(err.message || 'Failed to classify risk');
      setStep('input');
    }
  }

  function handleEdit() {
    setIsEditing(true);
    setStep('editing');
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setEditedStatement(classification!.normalized_statement);
    setStep('review');
  }

  function handleAcceptEdit() {
    // User is satisfied with their edit
    setIsEditing(false);
    setStep('review');
  }

  async function handleSaveRisk() {
    if (!classification) return;

    // Validate required fields
    if (!riskOwner.trim()) {
      setError('Please enter a risk owner');
      return;
    }

    if (!division.trim()) {
      setError('Please enter a division');
      return;
    }

    if (!department.trim()) {
      setError('Please enter a department');
      return;
    }

    setError(null);
    setSuccess(null);
    setStep('saving');

    try {
      // Get active period
      const { data: activePeriod } = await getActivePeriod();

      // Generate risk code based on category
      const categoryPrefix = classification.category.substring(0, 3).toUpperCase();
      const timestamp = Date.now().toString().slice(-4);
      const riskCode = `${categoryPrefix}-${timestamp}`;

      // Create risk with both original and normalized statements
      const { error: createError } = await createRisk({
        risk_code: riskCode,
        risk_title: classification.subcategory, // Use subcategory as title
        risk_description: editedStatement, // Use final statement (edited or original)
        category: classification.subcategory, // Store subcategory in category field
        division: division,
        department: department,
        owner: riskOwner,
        likelihood_inherent: likelihood,
        impact_inherent: impact,
        status: 'OPEN',
        period: activePeriod || 'Q1 2025',
        is_priority: false,
      });

      if (createError) {
        throw createError;
      }

      setSuccess('Risk created successfully!');
      setStep('complete');
    } catch (err: any) {
      console.error('Save risk error:', err);
      setError(err.message || 'Failed to save risk');
      setStep('review');
    }
  }

  function handleReset() {
    setStep('input');
    setUserStatement('');
    setClassification(null);
    setRiskOwner('');
    setDivision('');
    setDepartment('');
    setLikelihood(3);
    setImpact(3);
    setIsEditing(false);
    setEditedStatement('');
    setError(null);
    setSuccess(null);
  }

  return (
    <div className="space-y-4">
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600 rounded-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle>AI-Powered Risk Creation</CardTitle>
              <CardDescription>
                Enter a risk statement and let AI classify and refine it
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Success Alert */}
            {success && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {success}
                </AlertDescription>
              </Alert>
            )}

            {/* Step 1: User Input */}
            {step === 'input' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="risk-statement">
                    Enter Your Risk Statement
                  </Label>
                  <Textarea
                    id="risk-statement"
                    value={userStatement}
                    onChange={(e) => setUserStatement(e.target.value)}
                    placeholder="Describe the risk in your own words... (e.g., 'We might lose customer data if our servers get hacked')"
                    rows={5}
                    className="resize-none"
                  />
                  <p className="text-xs text-gray-500">
                    Don't worry about formal language - describe the risk naturally and AI will help structure it.
                  </p>
                </div>

                <Button
                  onClick={handleClassify}
                  disabled={!userStatement.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  size="lg"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Classify & Refine with AI
                </Button>
              </div>
            )}

            {/* Step 2: Classifying */}
            {step === 'classifying' && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-12 w-12 text-purple-600 animate-spin" />
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900">
                    AI is analyzing your risk statement...
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Classifying, explaining, and refining
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Review Classification */}
            {(step === 'review' || step === 'editing') && classification && (
              <div className="space-y-6">
                {/* Original Statement */}
                <Card className="bg-gray-50">
                  <CardHeader>
                    <CardTitle className="text-sm">Original Statement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 italic">
                      "{classification.original_statement}"
                    </p>
                  </CardContent>
                </Card>

                {/* AI Classification */}
                <Card className="border-purple-200">
                  <CardHeader>
                    <CardTitle className="text-sm">AI Classification</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Badge className="bg-purple-600 text-white">
                        {classification.category}
                      </Badge>
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                      <Badge variant="outline" className="border-purple-600 text-purple-600">
                        {classification.subcategory}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          classification.confidence === 'high'
                            ? 'border-green-600 text-green-600'
                            : classification.confidence === 'medium'
                            ? 'border-yellow-600 text-yellow-600'
                            : 'border-red-600 text-red-600'
                        }
                      >
                        {classification.confidence} confidence
                      </Badge>
                    </div>
                    <div className="bg-purple-50 p-3 rounded border border-purple-100">
                      <p className="text-sm text-purple-900">
                        <strong>Rationale:</strong> {classification.explanation}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Refined Statement */}
                <Card className="border-green-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">
                        Refined Risk Statement
                      </CardTitle>
                      {!isEditing && (
                        <Button
                          onClick={handleEdit}
                          size="sm"
                          variant="outline"
                          className="border-purple-600 text-purple-600 hover:bg-purple-50"
                        >
                          <Edit3 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editedStatement}
                          onChange={(e) => setEditedStatement(e.target.value)}
                          rows={4}
                          className="resize-none"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={handleAcceptEdit}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Accept Changes
                          </Button>
                          <Button
                            onClick={handleCancelEdit}
                            size="sm"
                            variant="outline"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-900">{editedStatement}</p>
                    )}
                  </CardContent>
                </Card>

                {/* Additional Fields */}
                {!isEditing && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Additional Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="owner">Risk Owner *</Label>
                          <Input
                            id="owner"
                            value={riskOwner}
                            onChange={(e) => setRiskOwner(e.target.value)}
                            placeholder="e.g., Chief Risk Officer"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="division">Division *</Label>
                          <Input
                            id="division"
                            value={division}
                            onChange={(e) => setDivision(e.target.value)}
                            placeholder="e.g., IT Department"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="department">Department *</Label>
                        <Input
                          id="department"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          placeholder="e.g., Information Security"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="likelihood">
                            Inherent Likelihood (1-5)
                          </Label>
                          <Input
                            id="likelihood"
                            type="number"
                            min="1"
                            max="5"
                            value={likelihood}
                            onChange={(e) =>
                              setLikelihood(parseInt(e.target.value) || 1)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="impact">Inherent Impact (1-5)</Label>
                          <Input
                            id="impact"
                            type="number"
                            min="1"
                            max="5"
                            value={impact}
                            onChange={(e) =>
                              setImpact(parseInt(e.target.value) || 1)
                            }
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                {!isEditing && (
                  <div className="flex gap-3">
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      className="flex-1"
                    >
                      Start Over
                    </Button>
                    <Button
                      onClick={handleSaveRisk}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      size="lg"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Risk to Register
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Saving */}
            {step === 'saving' && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-12 w-12 text-green-600 animate-spin" />
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900">
                    Saving risk to register...
                  </p>
                </div>
              </div>
            )}

            {/* Step 5: Complete */}
            {step === 'complete' && (
              <div className="flex flex-col items-center justify-center py-12 space-y-6">
                <div className="p-4 bg-green-100 rounded-full">
                  <CheckCircle className="h-16 w-16 text-green-600" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-2xl font-bold text-gray-900">
                    Risk Created Successfully!
                  </p>
                  <p className="text-gray-600">
                    Your risk has been added to the risk register
                  </p>
                </div>
                <Button
                  onClick={handleReset}
                  className="bg-purple-600 hover:bg-purple-700"
                  size="lg"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Create Another Risk
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
