import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import Login from '../pages/Login';
import FacilitySetup from '../pages/FacilitySetup';
import IntakeWizard from '../pages/IntakeWizard';
import OverviewDashboard from '../pages/OverviewDashboard';
import EmissionAnalysisDashboard from '../pages/EmissionAnalysisDashboard';
import LeakPointDashboard from '../pages/LeakPointDashboard';
import RecommendationDashboard from '../pages/RecommendationDashboard';
import WhatIfSimulator from '../pages/WhatIfSimulator';
import ActionRoadmap from '../pages/ActionRoadmap';
import ReportsHistory from '../pages/ReportsHistory';
import LandingPage from '../pages/LandingPage';
import { useFacilityAssessment } from '../context/FacilityAssessmentContext';

export default function AppRoutes() {
  const { activeFacility, activeAssessment } = useFacilityAssessment();

  const defaultFacilityId = activeFacility?.id || 'fac-abc-001';
  const defaultAssessmentId = activeAssessment?.id || 'asm-abc-001';

  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/landing" element={<LandingPage />} />

      {/* Public / Auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Login />} />

      {/* Facility Setup (standalone full-page wizard) */}
      <Route path="/facility/new" element={<FacilitySetup />} />

      {/* Guided Intake Wizard (stepped standalone view) */}
      <Route path="/facility/:id/intake" element={<IntakeWizard />} />

      {/* Main Authenticated Layout Shell */}
      <Route element={<AppLayout />}>
        {/* Assessment Dashboards */}
        <Route
          path="/assessment/:id/overview"
          element={<OverviewDashboard />}
        />
        <Route
          path="/assessment/:id/emissions"
          element={<EmissionAnalysisDashboard />}
        />
        <Route
          path="/assessment/:id/leak-points"
          element={<LeakPointDashboard />}
        />
        <Route
          path="/assessment/:id/recommendations"
          element={<RecommendationDashboard />}
        />
        <Route
          path="/assessment/:id/simulate"
          element={<WhatIfSimulator />}
        />
        <Route
          path="/assessment/:id/roadmap"
          element={<ActionRoadmap />}
        />

        {/* Facility Reports */}
        <Route
          path="/facility/:id/reports"
          element={<ReportsHistory />}
        />

        {/* Facility Root Redirect */}
        <Route
          path="/facility/:id"
          element={<Navigate to={`/facility/:id/intake`} replace />}
        />
      </Route>

      {/* Default Catch-all */}
      <Route
        path="*"
        element={<Navigate to={`/assessment/${defaultAssessmentId}/overview`} replace />}
      />
    </Routes>
  );
}
