import React, { useEffect, useState } from 'react';
import {
    getRiskKeywords,
    createRiskKeyword,
    deleteRiskKeyword,
    type RiskKeyword
} from '../../lib/riskIntelligence';
import { getCategories } from '../../lib/taxonomy';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '../ui/table';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, Plus, Trash2, Search, Tag, AlertCircle, CheckCircle2 } from 'lucide-react';

// Categories are now loaded dynamically from taxonomy
const DEFAULT_CATEGORY = 'cybersecurity';

export default function KeywordManagement() {
    const [keywords, setKeywords] = useState<RiskKeyword[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [newKeyword, setNewKeyword] = useState('');
    const [newWeight, setNewWeight] = useState(1.0);
    const [newCategory, setNewCategory] = useState<string>(DEFAULT_CATEGORY);
    const [availableCategories, setAvailableCategories] = useState<{ value: string; label: string }[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    const loadData = async () => {
        setLoading(true);

        // Load taxonomy categories
        const { data: taxCategories } = await getCategories();
        if (taxCategories) {
            const formatted = taxCategories.map(c => ({
                value: c.name.toLowerCase(), // Using name as value for backward compatibility with existing string-based system
                label: c.name
            }));
            setAvailableCategories(formatted);

            // Set default category if available
            if (formatted.length > 0 && !formatted.find(c => c.value === newCategory)) {
                setNewCategory(formatted[0].value);
            }
        }

        // Load keywords
        const { data, error } = await getRiskKeywords();
        if (error) {
            showNotification('error', `Error loading keywords: ${error.message}`);
        } else if (data) {
            setKeywords(data);
        }
        setLoading(false);
    };

    const handleAddKeyword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newKeyword.trim()) return;

        setIsSubmitting(true);
        const { data, error } = await createRiskKeyword({
            keyword: newKeyword,
            category: newCategory as any,
            weight: newWeight,
        });

        if (error) {
            showNotification('error', `Failed to add keyword: ${error.message}`);
        } else if (data) {
            showNotification('success', `Keyword "${data.keyword}" added to ${data.category} risks.`);
            setKeywords([...keywords, data]);
            setNewKeyword('');
            setNewWeight(1.0);
        }
        setIsSubmitting(false);
    };

    const handleDeleteKeyword = async (id: string, keyword: string) => {
        if (!confirm(`Are you sure you want to delete "${keyword}"?`)) return;

        const { error } = await deleteRiskKeyword(id);
        if (error) {
            showNotification('error', `Failed to delete keyword: ${error.message}`);
        } else {
            showNotification('success', `Keyword "${keyword}" deleted.`);
            setKeywords(keywords.filter(k => k.id !== id));
        }
    };

    const filteredKeywords = keywords.filter(k => {
        const matchesSearch = k.keyword.toLowerCase().includes(filter.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || k.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-6">
            {notification && (
                <Alert className={notification.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                    {notification.type === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription className={notification.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                        {notification.message}
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Add New Keyword</CardTitle>
                    <CardDescription>
                        Add keywords to the fallback scanning system. These are heavily used (97% of scans) to filter news before AI analysis.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAddKeyword} className="flex gap-4 items-end">
                        <div className="grid gap-2 flex-1">
                            <label className="text-sm font-medium">Keyword / Phrase</label>
                            <Input
                                placeholder="e.g. ransomware, interest rate, gdpr"
                                value={newKeyword}
                                onChange={(e) => setNewKeyword(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2 w-[100px]">
                            <label className="text-sm font-medium">Weight</label>
                            <Input
                                type="number"
                                min="0.1"
                                max="5.0"
                                step="0.1"
                                value={newWeight}
                                onChange={(e) => setNewWeight(parseFloat(e.target.value))}
                            />
                        </div>
                        <div className="grid gap-2 w-[200px]">
                            <label className="text-sm font-medium">Category</label>
                            <Select value={newCategory} onValueChange={setNewCategory}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableCategories.map(c => (
                                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button type="submit" disabled={isSubmitting || !newKeyword.trim()}>
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                            Add Keyword
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search keywords..."
                        className="pl-8"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {availableCategories.map(c => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Keyword</TableHead>
                            <TableHead>Weight</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                        <span className="text-muted-foreground">Loading keywords...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredKeywords.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    No keywords found. Add one above.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredKeywords.map((keyword) => (
                                <TableRow key={keyword.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <Tag className="h-4 w-4 text-muted-foreground" />
                                            {keyword.keyword}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="font-mono">
                                            {keyword.weight}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">
                                            {keyword.category}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {new Date(keyword.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDeleteKeyword(keyword.id, keyword.keyword)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="text-sm text-muted-foreground text-center">
                Showing {filteredKeywords.length} of {keywords.length} keywords
            </div>
        </div>
    );
}
