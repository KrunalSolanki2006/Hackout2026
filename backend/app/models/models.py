from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class UserModel(BaseModel):
    id: Optional[str] = None
    name: str
    email: str
    password_hash: str
    role: str = "operator"  # operator, consultant, regulator
    created_at: datetime = Field(default_factory=datetime.utcnow)

class FacilityModel(BaseModel):
    id: Optional[str] = None
    owner_user_id: str
    name: str
    industry: str  # plastic, textile, food_processing
    facility_size: str  # small, medium, large
    region: str
    production_volume: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AssessmentModel(BaseModel):
    id: Optional[str] = None
    facility_id: str
    owner_user_id: str
    status: str = "draft"  # draft, complete
    total_co2e: float = 0.0  # numeric, derived, read-only
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

class ProcessInputModel(BaseModel):
    id: Optional[str] = None
    assessment_id: str
    category: str  # energy, material, waste
    subtype: str
    quantity: float
    unit: str
    emission_factor_id: Optional[str] = None
    computed_co2e: float = 0.0  # numeric, derived, read-only

class EmissionFactorModel(BaseModel):
    id: Optional[str] = None
    category: str
    subtype: str
    unit: str
    emission_factor: float
    factor_unit: str
    source: str
    scope: int  # 1, 2, 3
    last_updated: str

class InterventionLibraryModel(BaseModel):
    id: Optional[str] = None
    name: str
    category: str  # energy, material, waste
    description: str
    supported_industries: List[str]
    applicable_leak_types: List[str]
    estimated_cost_min: float
    estimated_cost_max: float
    estimated_co2_reduction_min: float
    estimated_co2_reduction_max: float
    implementation_difficulty: str  # low, medium, high
    payback_period_months: int
    roi_pct: float
    explanation: str

class RecommendationModel(BaseModel):
    id: Optional[str] = None
    assessment_id: str
    intervention_id: str
    leak_point_ref: str
    score: int  # 0-100
    score_source: str  # ml, rule_based
    status: str = "suggested"  # suggested, applied, dismissed
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AppliedInterventionModel(BaseModel):
    id: Optional[str] = None
    assessment_id: str
    recommendation_id: str
    applied_at: datetime = Field(default_factory=datetime.utcnow)
    roadmap_phase: int  # 1, 2, 3
    status: str = "planned"  # planned, in_progress, completed

class AssessmentHistoryModel(BaseModel):
    id: Optional[str] = None
    facility_id: str
    assessment_id: str
    total_co2e_snapshot: float
    recorded_at: datetime = Field(default_factory=datetime.utcnow)

class ReportModel(BaseModel):
    id: Optional[str] = None
    assessment_id: str
    format: str  # pdf, csv
    file_url: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)
