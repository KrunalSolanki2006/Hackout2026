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
          id: 'usr-mgr-01',
          name: 'Rajesh Mehta (Plant Manager)',
          email: 'manager@plant.com',
          role: 'manager',
          password: 'manager123',
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
          const savedFacId = localStorage.getItem('carbotrack_active_facility_id');
          const currentFac = facs.find((f) => f.id === savedFacId) || facs[0];
          setActiveFacility(currentFac);

          const savedAsmId = localStorage.getItem('carbotrack_active_assessment_id');
          const asmList = JSON.parse(localStorage.getItem('carbotrack_assessments') || '[]');
          
          let currentAsm = null;
          if (savedAsmId) {
            currentAsm = asmList.find((a) => a.id === savedAsmId && a.facility_id === currentFac.id);
          }
          if (!currentAsm) {
            currentAsm = asmList.find((a) => a.facility_id === currentFac.id && a.status === 'complete') ||
              asmList.find((a) => a.facility_id === currentFac.id);
          }

          if (currentAsm) {
            setActiveAssessment(currentAsm);
          } else {
            const assessmentsRes = await apiClient.getAssessment(savedAsmId || 'asm-abc-001');
            if (assessmentsRes?.data?.assessment) {
              setActiveAssessment(assessmentsRes.data.assessment);
            }
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
    if (!facility) return;
    setActiveFacility(facility);
    try {
      localStorage.setItem('carbotrack_active_facility_id', facility.id);
    } catch (e) {}

    // When switching facility, load its active assessment
    const asmList = JSON.parse(localStorage.getItem('carbotrack_assessments') || '[]');
    let facilityAsm = asmList.find((a) => a.facility_id === facility.id && a.status === 'complete') ||
      asmList.find((a) => a.facility_id === facility.id);

    if (!facilityAsm) {
      // Create baseline assessment if none exists
      facilityAsm = {
        id: `asm-${Date.now()}`,
        facility_id: facility.id,
        status: 'complete',
        total_co2e: 75.0,
      };
    }

    setActiveAssessment(facilityAsm);
    try {
      localStorage.setItem('carbotrack_active_assessment_id', facilityAsm.id);
    } catch (e) {}
  };

  const handleSetActiveAssessment = (asm) => {
    setActiveAssessment(asm);
    if (asm?.id) {
      try {
        localStorage.setItem('carbotrack_active_assessment_id', asm.id);
      } catch (e) {}
    }
  };

  const addFacility = (newFacility, newAssessment = null) => {
    setFacilities((prev) => {
      const exists = prev.some((f) => f.id === newFacility.id);
      return exists ? prev.map((f) => f.id === newFacility.id ? newFacility : f) : [...prev, newFacility];
    });
    setActiveFacility(newFacility);
    try {
      localStorage.setItem('carbotrack_active_facility_id', newFacility.id);
    } catch (e) {}

    if (newAssessment) {
      setActiveAssessment(newAssessment);
      try {
        localStorage.setItem('carbotrack_active_assessment_id', newAssessment.id);
      } catch (e) {}
    }
  };

  const refreshAssessment = async (assessmentId) => {
    if (!assessmentId) return;
    try {
      const res = await assessmentsApi.getById(assessmentId);
      if (res?.data?.assessment) {
        handleSetActiveAssessment(res.data.assessment);
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
        setActiveAssessment: handleSetActiveAssessment,
        addFacility,
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
