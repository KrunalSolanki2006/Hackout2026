import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { FacilityAssessmentProvider } from './context/FacilityAssessmentContext';
import AppRoutes from './router/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <FacilityAssessmentProvider>
        <AppRoutes />
      </FacilityAssessmentProvider>
    </BrowserRouter>
  );
}
