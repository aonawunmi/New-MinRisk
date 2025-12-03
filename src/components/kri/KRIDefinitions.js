import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * KRIDefinitions Component
 *
 * Manage KRI (Key Risk Indicator) definitions, including creation,
 * editing, linking to risks, and viewing coverage
 */
import { useState, useEffect } from 'react';
import { getKRIDefinitions, createKRI, updateKRI, deleteKRI, linkKRIToRisk, unlinkKRIFromRisk, getKRICoverageStats, } from '@/lib/kri';
import { getRisks } from '@/lib/risks';
import { isUserAdmin } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Link as LinkIcon, Unlink, Plus, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table';
import KRIForm from './KRIForm';
export default function KRIDefinitions() {
    const [kris, setKris] = useState([]);
    const [risks, setRisks] = useState([]);
    const [coverage, setCoverage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingKRI, setEditingKRI] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [selectedKRIs, setSelectedKRIs] = useState(new Set());
    // Risk link management state
    const [showLinkDialog, setShowLinkDialog] = useState(false);
    const [managingLinksFor, setManagingLinksFor] = useState(null);
    const [linkSearchTerm, setLinkSearchTerm] = useState('');
    const [linkingInProgress, setLinkingInProgress] = useState(false);
    useEffect(() => {
        loadData();
        checkAdminStatus();
    }, []);
    async function checkAdminStatus() {
        const adminStatus = await isUserAdmin();
        setIsAdmin(adminStatus);
    }
    async function loadData() {
        setLoading(true);
        setError(null);
        try {
            const [krisResult, risksResult, coverageResult] = await Promise.all([
                getKRIDefinitions(),
                getRisks(),
                getKRICoverageStats(),
            ]);
            if (krisResult.error)
                throw new Error(krisResult.error.message);
            if (risksResult.error)
                throw new Error(risksResult.error.message);
            if (coverageResult.error)
                throw new Error(coverageResult.error.message);
            setKris(krisResult.data || []);
            setRisks(risksResult.data || []);
            setCoverage(coverageResult.data);
        }
        catch (err) {
            console.error('Load error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load data');
        }
        finally {
            setLoading(false);
        }
    }
    async function handleSaveKRI(kriData, riskCodeToLink) {
        try {
            let kriId;
            console.log('handleSaveKRI called with riskCodeToLink:', riskCodeToLink);
            if (editingKRI) {
                // When editing: Only update KRI data, don't modify risk links (they're read-only)
                const result = await updateKRI(editingKRI.id, kriData);
                if (result.error)
                    throw new Error(result.error.message);
                kriId = editingKRI.id;
                console.log('KRI updated:', kriId);
            }
            else {
                // When creating: Create KRI and link to risk if specified
                const result = await createKRI(kriData);
                if (result.error)
                    throw new Error(result.error.message);
                kriId = result.data?.id;
                console.log('KRI created with ID:', kriId);
                // Link to risk if specified
                if (riskCodeToLink && kriId) {
                    console.log('Linking KRI', kriId, 'to risk', riskCodeToLink);
                    const linkResult = await linkKRIToRisk(kriId, riskCodeToLink);
                    if (linkResult.error) {
                        console.error('Link error:', linkResult.error);
                        alert(`KRI created but failed to link to risk: ${linkResult.error.message}`);
                    }
                    else {
                        console.log('Successfully linked KRI to risk');
                    }
                }
                else {
                    console.log('No risk code to link or no KRI ID');
                }
            }
            await loadData();
            setShowForm(false);
            setEditingKRI(null);
        }
        catch (err) {
            console.error('Save error:', err);
            alert(err instanceof Error ? err.message : 'Failed to save KRI');
        }
    }
    async function handleDeleteKRI(id) {
        // Find the KRI
        const kri = kris.find((k) => k.id === id);
        if (!kri)
            return;
        try {
            // Check if KRI is linked to any risks (now using risk_id)
            const { data: links, error: linksError } = await supabase
                .from('kri_risk_links')
                .select('risk_id, risks:risk_id(risk_code)')
                .eq('kri_id', id);
            if (linksError) {
                console.error('Error checking risk links:', linksError);
            }
            // Build confirmation message
            let confirmMessage = 'Are you sure you want to delete this KRI?';
            if (links && links.length > 0) {
                const riskCodes = links.map((link) => link.risks?.risk_code).filter(Boolean).join(', ');
                confirmMessage = `⚠️ WARNING: This KRI is currently monitoring ${links.length} risk(s): ${riskCodes}\n\nDeleting this KRI will remove all risk associations and historical data.\n\nAre you sure you want to permanently delete "${kri.kri_name}"?`;
            }
            if (!confirm(confirmMessage))
                return;
            // Proceed with deletion
            const result = await deleteKRI(id);
            if (result.error)
                throw new Error(result.error.message);
            await loadData();
        }
        catch (err) {
            console.error('Delete error:', err);
            alert(err instanceof Error ? err.message : 'Failed to delete KRI');
        }
    }
    // Open link management dialog
    function handleManageLinks(kri) {
        setManagingLinksFor(kri);
        setShowLinkDialog(true);
        setLinkSearchTerm('');
    }
    // Link KRI to a risk
    async function handleLinkRisk(riskCode) {
        if (!managingLinksFor)
            return;
        setLinkingInProgress(true);
        try {
            const result = await linkKRIToRisk(managingLinksFor.id, riskCode);
            if (result.error)
                throw new Error(result.error.message);
            // Reload data to refresh links
            await loadData();
            // Update the managingLinksFor with new data
            const updatedKRI = kris.find(k => k.id === managingLinksFor.id);
            if (updatedKRI) {
                setManagingLinksFor(updatedKRI);
            }
        }
        catch (err) {
            console.error('Link error:', err);
            alert(err instanceof Error ? err.message : 'Failed to link risk');
        }
        finally {
            setLinkingInProgress(false);
        }
    }
    // Unlink KRI from a risk
    async function handleUnlinkRisk(riskCode) {
        if (!managingLinksFor)
            return;
        if (!confirm(`Unlink "${riskCode}" from this KRI?`))
            return;
        setLinkingInProgress(true);
        try {
            // Find the link by getting the risk_id from risk_code
            const risk = risks.find(r => r.risk_code === riskCode);
            if (!risk)
                throw new Error('Risk not found');
            // Get the link record
            const { data: links, error: linkError } = await supabase
                .from('kri_risk_links')
                .select('id')
                .eq('kri_id', managingLinksFor.id)
                .eq('risk_id', risk.id)
                .single();
            if (linkError || !links)
                throw new Error('Link not found');
            const result = await unlinkKRIFromRisk(links.id);
            if (result.error)
                throw new Error(result.error.message);
            // Reload data to refresh links
            await loadData();
            // Update the managingLinksFor with new data
            const updatedKRI = kris.find(k => k.id === managingLinksFor.id);
            if (updatedKRI) {
                setManagingLinksFor(updatedKRI);
            }
        }
        catch (err) {
            console.error('Unlink error:', err);
            alert(err instanceof Error ? err.message : 'Failed to unlink risk');
        }
        finally {
            setLinkingInProgress(false);
        }
    }
    // Get risks not yet linked to the current KRI
    function getAvailableRisks() {
        if (!managingLinksFor)
            return risks;
        const linkedCodes = new Set(managingLinksFor.linked_risk_codes || []);
        return risks.filter(r => !linkedCodes.has(r.risk_code));
    }
    // Filter available risks by search term
    function getFilteredAvailableRisks() {
        const available = getAvailableRisks();
        if (!linkSearchTerm)
            return available;
        const term = linkSearchTerm.toLowerCase();
        return available.filter(r => r.risk_code.toLowerCase().includes(term) ||
            r.risk_title.toLowerCase().includes(term) ||
            r.category?.toLowerCase().includes(term));
    }
    async function handleBulkDelete() {
        if (selectedKRIs.size === 0) {
            alert('Please select KRIs to delete');
            return;
        }
        const confirmMessage = `Are you sure you want to delete ${selectedKRIs.size} KRI(s)?\n\nThis will remove all risk associations and historical data.\n\nThis action cannot be undone.`;
        if (!confirm(confirmMessage))
            return;
        let successCount = 0;
        let failCount = 0;
        for (const kriId of Array.from(selectedKRIs)) {
            try {
                const result = await deleteKRI(kriId);
                if (result.error) {
                    failCount++;
                }
                else {
                    successCount++;
                }
            }
            catch (err) {
                console.error('Delete error:', err);
                failCount++;
            }
        }
        alert(`Deleted ${successCount} KRI(s)${failCount > 0 ? `. ${failCount} failed.` : ''}`);
        setSelectedKRIs(new Set());
        await loadData();
    }
    function handleSelectKRI(kriId, checked) {
        const newSelection = new Set(selectedKRIs);
        if (checked) {
            newSelection.add(kriId);
        }
        else {
            newSelection.delete(kriId);
        }
        setSelectedKRIs(newSelection);
    }
    function handleSelectAll(checked) {
        if (checked) {
            setSelectedKRIs(new Set(kris.map(k => k.id)));
        }
        else {
            setSelectedKRIs(new Set());
        }
    }
    // Loading state
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsx("div", { className: "text-lg text-gray-600", children: "Loading KRI definitions..." }) }));
    }
    // Error state
    if (error) {
        return (_jsx(Alert, { variant: "destructive", children: _jsx(AlertDescription, { children: error }) }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-xl font-semibold", children: "KRI Definitions" }), _jsx("p", { className: "text-sm text-gray-600", children: "Define and manage Key Risk Indicators" })] }), isAdmin && (_jsxs("div", { className: "flex gap-2", children: [selectedKRIs.size > 0 && (_jsxs(Button, { variant: "destructive", onClick: handleBulkDelete, children: ["Delete Selected (", selectedKRIs.size, ")"] })), _jsx(Button, { onClick: () => setShowForm(true), children: "+ New KRI" })] }))] }), coverage && (_jsx(Card, { className: coverage.coverage_percentage < 50 ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50', children: _jsx(CardContent, { className: "pt-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-2xl font-bold", children: [coverage.coverage_percentage, "%"] }), _jsx("p", { className: "text-sm text-gray-700", children: "KRI Coverage" })] }), _jsx("div", { className: "text-right text-sm text-gray-600", children: _jsxs("p", { children: [coverage.risks_with_kris, " of ", coverage.total_risks, " risks have KRIs"] }) })] }) }) })), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { children: ["All KRI Definitions (", kris.length, ")"] }) }), _jsx(CardContent, { children: kris.length === 0 ? (_jsxs("div", { className: "text-center py-12", children: [_jsx("p", { className: "text-gray-600 text-lg mb-2", children: "No KRIs defined yet" }), isAdmin && _jsx(Button, { onClick: () => setShowForm(true), children: "Create First KRI" }), !isAdmin && _jsx("p", { className: "text-gray-500 text-sm", children: "Contact your administrator to create KRIs" })] })) : (_jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [isAdmin && (_jsx(TableHead, { className: "w-[50px]", children: _jsx(Checkbox, { checked: kris.length > 0 && selectedKRIs.size === kris.length, onCheckedChange: (checked) => handleSelectAll(checked === true) }) })), _jsx(TableHead, { children: "Code" }), _jsx(TableHead, { children: "Name" }), _jsx(TableHead, { children: "Type" }), _jsx(TableHead, { children: "Unit" }), _jsx(TableHead, { children: "Frequency" }), _jsx(TableHead, { children: "Thresholds" }), _jsx(TableHead, { children: "Linked Risks" }), _jsx(TableHead, { children: "Actions" })] }) }), _jsx(TableBody, { children: kris.map((kri) => (_jsxs(TableRow, { children: [isAdmin && (_jsx(TableCell, { children: _jsx(Checkbox, { checked: selectedKRIs.has(kri.id), onCheckedChange: (checked) => handleSelectKRI(kri.id, checked === true) }) })), _jsx(TableCell, { className: "font-mono text-sm", children: kri.kri_code }), _jsx(TableCell, { className: "font-medium", children: kri.kri_name }), _jsx(TableCell, { children: _jsx(Badge, { variant: "outline", children: kri.kri_type }) }), _jsx(TableCell, { children: kri.unit_of_measure }), _jsx(TableCell, { children: kri.frequency }), _jsxs(TableCell, { className: "text-xs", children: [_jsxs("div", { children: ["Yellow: ", kri.threshold_yellow_lower || '-', " - ", kri.threshold_yellow_upper || '-'] }), _jsxs("div", { children: ["Red: ", kri.threshold_red_lower || '-', " - ", kri.threshold_red_upper || '-'] })] }), _jsx(TableCell, { children: _jsx(Button, { variant: "ghost", size: "sm", onClick: () => handleManageLinks(kri), className: "h-auto p-1", children: _jsxs(Badge, { variant: kri.linked_risk_codes?.length ? "default" : "outline", className: "cursor-pointer hover:bg-blue-600", children: [_jsx(LinkIcon, { className: "h-3 w-3 mr-1" }), kri.linked_risk_codes?.length || 0, " risk(s)"] }) }) }), _jsxs(TableCell, { children: [isAdmin && (_jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { size: "sm", variant: "outline", onClick: () => {
                                                                    setEditingKRI(kri);
                                                                    setShowForm(true);
                                                                }, children: "Edit" }), _jsx(Button, { size: "sm", variant: "destructive", onClick: () => handleDeleteKRI(kri.id), children: "Delete" })] })), !isAdmin && _jsx("span", { className: "text-gray-400 text-sm", children: "View only" })] })] }, kri.id))) })] })) })] }), _jsx(Dialog, { open: showForm, onOpenChange: (open) => {
                    setShowForm(open);
                    if (!open)
                        setEditingKRI(null);
                }, children: _jsxs(DialogContent, { className: "max-w-2xl max-h-[85vh] overflow-y-auto", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: editingKRI ? 'Edit KRI' : 'New KRI Definition' }) }), _jsx(KRIForm, { kri: editingKRI, onSave: handleSaveKRI, onCancel: () => {
                                setShowForm(false);
                                setEditingKRI(null);
                            } })] }) }), _jsx(Dialog, { open: showLinkDialog, onOpenChange: (open) => {
                    setShowLinkDialog(open);
                    if (!open) {
                        setManagingLinksFor(null);
                        setLinkSearchTerm('');
                    }
                }, children: _jsxs(DialogContent, { className: "max-w-3xl max-h-[85vh] overflow-hidden flex flex-col", children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { children: ["Manage Risk Links: ", managingLinksFor?.kri_code] }), _jsx("p", { className: "text-sm text-gray-600", children: managingLinksFor?.kri_name })] }), _jsxs("div", { className: "flex-1 overflow-y-auto space-y-6", children: [_jsxs("div", { children: [_jsxs("h4", { className: "font-semibold mb-3 flex items-center gap-2", children: [_jsx(LinkIcon, { className: "h-4 w-4" }), "Currently Linked Risks (", managingLinksFor?.linked_risk_codes?.length || 0, ")"] }), managingLinksFor?.linked_risk_codes && managingLinksFor.linked_risk_codes.length > 0 ? (_jsx("div", { className: "space-y-2", children: managingLinksFor.linked_risk_codes.map((riskCode) => {
                                                const risk = risks.find(r => r.risk_code === riskCode);
                                                return (_jsxs("div", { className: "flex items-center justify-between p-3 border rounded-lg bg-blue-50 border-blue-200", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Badge, { variant: "outline", className: "font-mono", children: riskCode }), _jsx("span", { className: "font-medium", children: risk?.risk_title || 'Unknown' })] }), risk?.category && (_jsxs("p", { className: "text-sm text-gray-600 mt-1", children: ["Category: ", risk.category] }))] }), isAdmin && (_jsxs(Button, { size: "sm", variant: "destructive", onClick: () => handleUnlinkRisk(riskCode), disabled: linkingInProgress, children: [_jsx(Unlink, { className: "h-4 w-4 mr-1" }), "Unlink"] }))] }, riskCode));
                                            }) })) : (_jsxs("div", { className: "text-center py-8 text-gray-500 border-2 border-dashed rounded-lg", children: [_jsx(LinkIcon, { className: "h-8 w-8 mx-auto mb-2 opacity-50" }), _jsx("p", { children: "No risks linked yet" }), _jsx("p", { className: "text-sm", children: "Link risks below to monitor them with this KRI" })] }))] }), isAdmin && (_jsxs("div", { children: [_jsxs("h4", { className: "font-semibold mb-3 flex items-center gap-2", children: [_jsx(Plus, { className: "h-4 w-4" }), "Link Additional Risks"] }), _jsxs("div", { className: "relative mb-3", children: [_jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" }), _jsx(Input, { type: "text", placeholder: "Search risks by code, title, or category...", value: linkSearchTerm, onChange: (e) => setLinkSearchTerm(e.target.value), className: "pl-10" })] }), _jsx("div", { className: "space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-2", children: getFilteredAvailableRisks().length === 0 ? (_jsx("div", { className: "text-center py-8 text-gray-500", children: getAvailableRisks().length === 0 ? (_jsxs(_Fragment, { children: [_jsx(Badge, { className: "mb-2", children: "All Linked" }), _jsx("p", { className: "text-sm", children: "This KRI is already linked to all available risks" })] })) : (_jsx("p", { className: "text-sm", children: "No risks match your search" })) })) : (getFilteredAvailableRisks().map((risk) => (_jsxs("div", { className: "flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Badge, { variant: "outline", className: "font-mono", children: risk.risk_code }), _jsx("span", { className: "font-medium", children: risk.risk_title })] }), risk.category && (_jsxs("p", { className: "text-sm text-gray-600 mt-1", children: ["Category: ", risk.category, " | Status: ", risk.status] }))] }), _jsxs(Button, { size: "sm", onClick: () => handleLinkRisk(risk.risk_code), disabled: linkingInProgress, children: [_jsx(Plus, { className: "h-4 w-4 mr-1" }), "Link"] })] }, risk.id)))) })] }))] }), _jsx("div", { className: "flex justify-end pt-4 border-t", children: _jsx(Button, { variant: "outline", onClick: () => setShowLinkDialog(false), children: "Close" }) })] }) })] }));
}
