/**
 * Incident Management Container Component
 * Manages navigation between list, form, and detail views
 */

import React, { useState } from 'react';
import { IncidentList } from './IncidentList';
import { IncidentForm } from './IncidentForm';
import { IncidentDetail } from './IncidentDetail';

type View = 'list' | 'form' | 'detail' | 'edit';

export default function IncidentManagement() {
  const [currentView, setCurrentView] = useState<View>('list');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [editIncidentId, setEditIncidentId] = useState<string | null>(null);

  const handleNewIncident = () => {
    setEditIncidentId(null);
    setCurrentView('form');
  };

  const handleSelectIncident = (incidentId: string) => {
    setSelectedIncidentId(incidentId);
    setCurrentView('detail');
  };

  const handleFormSuccess = (incidentId: string) => {
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

  const handleEditIncident = (incidentId: string) => {
    setEditIncidentId(incidentId);
    setCurrentView('edit');
  };

  return (
    <div className="container mx-auto py-6">
      {currentView === 'list' && (
        <IncidentList
          onSelectIncident={handleSelectIncident}
          onNewIncident={handleNewIncident}
        />
      )}

      {currentView === 'form' && (
        <IncidentForm
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      )}

      {currentView === 'edit' && editIncidentId && (
        <IncidentForm
          incidentId={editIncidentId}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      )}

      {currentView === 'detail' && selectedIncidentId && (
        <IncidentDetail
          incidentId={selectedIncidentId}
          onBack={handleBackToList}
          onEdit={handleEditIncident}
        />
      )}
    </div>
  );
}
