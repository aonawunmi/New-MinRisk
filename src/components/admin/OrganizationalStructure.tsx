/**
 * OrganizationalStructure Component
 * 
 * Manages divisions and departments with hierarchical relationships.
 * Replaces the simple tag-based UI in RiskConfiguration.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertCircle,
    CheckCircle,
    Plus,
    X,
    Building2,
    Users,
    ChevronDown,
    ChevronRight,
    Edit2,
    Trash2,
    FolderOpen,
    Loader2,
} from 'lucide-react';
import {
    getDivisionsWithDepartments,
    getUnassignedDepartments,
    createDivision,
    deleteDivision,
    createDepartment,
    deleteDepartment,
    assignDepartmentToDivision,
    type Division,
    type Department,
    type DivisionWithDepartments,
} from '@/lib/divisions';

export default function OrganizationalStructure() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [divisions, setDivisions] = useState<DivisionWithDepartments[]>([]);
    const [unassignedDepartments, setUnassignedDepartments] = useState<Department[]>([]);
    const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());

    // Form state
    const [newDivisionName, setNewDivisionName] = useState('');
    const [newDepartmentName, setNewDepartmentName] = useState('');
    const [selectedDivisionForDept, setSelectedDivisionForDept] = useState<string>('');

    // Feedback
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        setError(null);

        try {
            const [divsResult, unassignedResult] = await Promise.all([
                getDivisionsWithDepartments(),
                getUnassignedDepartments(),
            ]);

            if (divsResult.error) {
                setError(divsResult.error.message);
                return;
            }

            if (unassignedResult.error) {
                setError(unassignedResult.error.message);
                return;
            }

            setDivisions(divsResult.data || []);
            setUnassignedDepartments(unassignedResult.data || []);

            // Auto-expand all divisions initially
            if (divsResult.data) {
                setExpandedDivisions(new Set(divsResult.data.map(d => d.id)));
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddDivision() {
        if (!newDivisionName.trim()) return;

        setSaving(true);
        setError(null);

        const { data, error } = await createDivision(newDivisionName);

        if (error) {
            setError(error.message);
            setSaving(false);
            return;
        }

        setSuccess('Division created successfully!');
        setTimeout(() => setSuccess(null), 2000);
        setNewDivisionName('');
        await loadData();
        setSaving(false);
    }

    async function handleDeleteDivision(divisionId: string) {
        if (!confirm('Delete this division? Departments will become unassigned.')) return;

        setSaving(true);
        const { error } = await deleteDivision(divisionId);

        if (error) {
            setError(error.message);
            setSaving(false);
            return;
        }

        setSuccess('Division deleted.');
        setTimeout(() => setSuccess(null), 2000);
        await loadData();
        setSaving(false);
    }

    async function handleAddDepartment() {
        if (!newDepartmentName.trim()) return;

        setSaving(true);
        setError(null);

        const { data, error } = await createDepartment(
            newDepartmentName,
            selectedDivisionForDept || undefined
        );

        if (error) {
            setError(error.message);
            setSaving(false);
            return;
        }

        setSuccess('Department created successfully!');
        setTimeout(() => setSuccess(null), 2000);
        setNewDepartmentName('');
        await loadData();
        setSaving(false);
    }

    async function handleDeleteDepartment(deptId: string) {
        if (!confirm('Delete this department?')) return;

        setSaving(true);
        const { error } = await deleteDepartment(deptId);

        if (error) {
            setError(error.message);
            setSaving(false);
            return;
        }

        setSuccess('Department deleted.');
        setTimeout(() => setSuccess(null), 2000);
        await loadData();
        setSaving(false);
    }

    async function handleAssignDepartment(deptId: string, divisionId: string | null) {
        setSaving(true);
        const { error } = await assignDepartmentToDivision(deptId, divisionId);

        if (error) {
            setError(error.message);
            setSaving(false);
            return;
        }

        await loadData();
        setSaving(false);
    }

    function toggleDivision(divId: string) {
        const newExpanded = new Set(expandedDivisions);
        if (newExpanded.has(divId)) {
            newExpanded.delete(divId);
        } else {
            newExpanded.add(divId);
        }
        setExpandedDivisions(newExpanded);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Loading organizational structure...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Feedback */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
            )}

            {/* Add Division */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Divisions
                    </CardTitle>
                    <CardDescription>
                        Define divisions in your organization. Departments can be assigned to divisions.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Enter division name..."
                            value={newDivisionName}
                            onChange={(e) => setNewDivisionName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddDivision()}
                            disabled={saving}
                        />
                        <Button onClick={handleAddDivision} size="sm" disabled={saving || !newDivisionName.trim()}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add Division
                        </Button>
                    </div>

                    {/* Division List with nested departments */}
                    <div className="space-y-2">
                        {divisions.length === 0 ? (
                            <p className="text-sm text-gray-500 py-4 text-center">
                                No divisions defined. Add a division to get started.
                            </p>
                        ) : (
                            divisions.map((division) => (
                                <div key={division.id} className="border rounded-lg">
                                    {/* Division Header */}
                                    <div
                                        className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                                        onClick={() => toggleDivision(division.id)}
                                    >
                                        <div className="flex items-center gap-2">
                                            {expandedDivisions.has(division.id) ? (
                                                <ChevronDown className="h-4 w-4 text-gray-500" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4 text-gray-500" />
                                            )}
                                            <FolderOpen className="h-4 w-4 text-blue-600" />
                                            <span className="font-medium">{division.name}</span>
                                            <Badge variant="secondary" className="text-xs">
                                                {division.departments.length} dept{division.departments.length !== 1 ? 's' : ''}
                                            </Badge>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteDivision(division.id);
                                            }}
                                            disabled={saving}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>

                                    {/* Departments under this division */}
                                    {expandedDivisions.has(division.id) && (
                                        <div className="p-3 pl-8 bg-white border-t">
                                            {division.departments.length === 0 ? (
                                                <p className="text-sm text-gray-400 italic">No departments assigned</p>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    {division.departments.map((dept) => (
                                                        <Badge
                                                            key={dept.id}
                                                            variant="outline"
                                                            className="text-sm py-1 px-3 flex items-center gap-1"
                                                        >
                                                            <Users className="h-3 w-3" />
                                                            {dept.name}
                                                            <X
                                                                className="h-3 w-3 ml-1 cursor-pointer hover:text-red-600"
                                                                onClick={() => handleDeleteDepartment(dept.id)}
                                                            />
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Add Department */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Departments
                    </CardTitle>
                    <CardDescription>
                        Add departments and assign them to divisions. Select a division before adding a department.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2 flex-wrap">
                        <div className="flex-1 min-w-[200px]">
                            <Select
                                value={selectedDivisionForDept}
                                onValueChange={setSelectedDivisionForDept}
                                disabled={saving}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select division (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Division (Unassigned)</SelectItem>
                                    {divisions.map((div) => (
                                        <SelectItem key={div.id} value={div.id}>
                                            {div.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Input
                            placeholder="Enter department name..."
                            value={newDepartmentName}
                            onChange={(e) => setNewDepartmentName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddDepartment()}
                            disabled={saving}
                            className="flex-1 min-w-[200px]"
                        />
                        <Button
                            onClick={handleAddDepartment}
                            size="sm"
                            disabled={saving || !newDepartmentName.trim()}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Department
                        </Button>
                    </div>

                    {/* Unassigned Departments */}
                    {unassignedDepartments.length > 0 && (
                        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-sm font-medium text-amber-800 mb-2">
                                Unassigned Departments ({unassignedDepartments.length})
                            </p>
                            <p className="text-xs text-amber-600 mb-3">
                                These departments haven't been assigned to a division yet. Select a division to assign them.
                            </p>
                            <div className="space-y-2">
                                {unassignedDepartments.map((dept) => (
                                    <div key={dept.id} className="flex items-center gap-2 bg-white p-2 rounded border">
                                        <Users className="h-4 w-4 text-gray-400" />
                                        <span className="flex-1 text-sm">{dept.name}</span>
                                        <Select
                                            value=""
                                            onValueChange={(divId) => handleAssignDepartment(dept.id, divId === 'none' ? null : divId)}
                                        >
                                            <SelectTrigger className="w-[180px] h-8 text-xs">
                                                <SelectValue placeholder="Assign to division..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {divisions.map((div) => (
                                                    <SelectItem key={div.id} value={div.id}>
                                                        {div.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteDepartment(dept.id)}
                                            disabled={saving}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
