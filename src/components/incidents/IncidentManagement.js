import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Incident Management Container Component
 * Manages navigation between list, form, and detail views
 */
import { useState } from 'react';
import { IncidentList } from './IncidentList';
import { IncidentForm } from './IncidentForm';
import { IncidentDetail } from './IncidentDetail';
export default function IncidentManagement() {
    const [currentView, setCurrentView] = useState('list');
    const [selectedIncidentId, setSelectedIncidentId] = useState(null);
    const [editIncidentId, setEditIncidentId] = useState(null);
    const handleNewIncident = () => {
        setEditIncidentId(null);
        setCurrentView('form');
    };
    const handleSelectIncident = (incidentId) => {
        setSelectedIncidentId(incidentId);
        setCurrentView('detail');
    };
    const handleFormSuccess = (incidentId) => {
        // After successful submission, view the incident
        setSelectedIncidentId(incidentId);
        setEditIncidentId(null);
        setCurrentView('detail');
    };
    const handleFormCancel = () => {
        setEditIncidentId(null);
        setCurrentView('list');
    };
    const handleBackToList = () => {
        setSelectedIncidentId(null);
        setEditIncidentId(null);
        setCurrentView('list');
    };
    const handleEditIncident = (incidentId) => {
        setEditIncidentId(incidentId);
        setCurrentView('edit');
    };
    return (_jsxs("div", { className: "container mx-auto py-6", children: [currentView === 'list' && (_jsx(IncidentList, { onSelectIncident: handleSelectIncident, onNewIncident: handleNewIncident })), currentView === 'form' && (_jsx(IncidentForm, { onSuccess: handleFormSuccess, onCancel: handleFormCancel })), currentView === 'edit' && editIncidentId && (_jsx(IncidentForm, { incidentId: editIncidentId, onSuccess: handleFormSuccess, onCancel: handleFormCancel })), currentView === 'detail' && selectedIncidentId && (_jsx(IncidentDetail, { incidentId: selectedIncidentId, onBack: handleBackToList, onEdit: handleEditIncident }))] }));
}
