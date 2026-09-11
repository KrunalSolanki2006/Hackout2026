import React, { createContext, useContext, useState, useEffect } from 'react';
import { facilitiesApi } from '../api/facilities';
import { assessmentsApi } from '../api/assessments';
import { apiClient } from '../api/client';

const FacilityAssessmentContext = createContext(null);

export function FacilityAssessmentProvider({ children }) {
  const [facilities, setFacilities] = useState([]);
  const [activeFacility, setActiveFacility] = useState(null);
  const [activeAssessment, setActiveAssessment] = useState(null);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('carbotrack_user');
    return saved
      ? JSON.parse(saved)
      : {
          id: 'usr-001',
          name: 'Priya Sharma (Plant Operations)',
          email: 'priya.sharma@abcplastics.in',
          role: 'operator',
        };
  });
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  // Toast helper
  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initial load
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const res = await facilitiesApi.list();
        const facs = res.data.facilities || [];
        setFacilities(facs);

        if (facs.length > 0) {
          const defaultFac = facs[0];
          setActiveFacility(defaultFac);

          // Find or create assessment
          const assessmentsRes = await apiClient.getAssessment('asm-abc-001');
          if (assessmentsRes?.data?.assessment) {
            setActiveAssessment(assessmentsRes.data.assessment);
          }
        }
      } catch (err) {
        console.error('Error initializing facility/assessment context:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const selectFacility = (facility) => {
    setActiveFacility(facility);
    // When switching facility, load its active assessment
    const asmList = JSON.parse(localStorage.getItem('carbotrack_assessments') || '[]');
    const facilityAsm = asmList.find((a) => a.facility_id === facility.id) || null;
    setActiveAssessment(facilityAsm);
  };

  const refreshAssessment = async (assessmentId) => {
    if (!assessmentId) return;
    try {
      const res = await assessmentsApi.getById(assessmentId);
      if (res?.data?.assessment) {
        setActiveAssessment(res.data.assessment);
      }
    } catch (e) {
      console.error('Failed to refresh assessment', e);
    }
  };

  const loginUser = (userData, token) => {
    setUser(userData);
    localStorage.setItem('carbotrack_user', JSON.stringify(userData));
    localStorage.setItem('carbotrack_token', token);
    addToast(`Welcome back, ${userData.name}!`);
  };

  const logoutUser = () => {
    setUser(null);
    localStorage.removeItem('carbotrack_user');
    localStorage.removeItem('carbotrack_token');
    addToast('Signed out successfully', 'info');
  };

  return (
    <FacilityAssessmentContext.Provider
      value={{
        facilities,
        activeFacility,
        activeAssessment,
        user,
        loading,
        toasts,
        setFacilities,
        setActiveFacility: selectFacility,
        setActiveAssessment,
        refreshAssessment,
        addToast,
        removeToast,
        loginUser,
        logoutUser,
      }}
    >
      {children}
    </FacilityAssessmentContext.Provider>
  );
}

export function useFacilityAssessment() {
  const context = useContext(FacilityAssessmentContext);
  if (!context) {
    throw new Error('useFacilityAssessment must be used within FacilityAssessmentProvider');
  }
  return context;
}
