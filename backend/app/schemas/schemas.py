from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, EmailStr, Field

# User Schemas
class UserRegister(BaseModel):
    name: str = Field(..., example="John Doe")
    email: EmailStr = Field(..., example="operator@abcplastics.com")
    password: str = Field(..., min_length=6, example="password123")
    role: str = Field("operator", example="operator")  # operator, consultant, regulator

class UserLogin(BaseModel):
    email: EmailStr = Field(..., example="operator@abcplastics.com")
    password: str = Field(..., example="password123")

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Facility Schemas
class FacilityCreate(BaseModel):
    name: str = Field(..., example="ABC Plastics Plant 1")
    industry: str = Field(..., example="plastic")  # plastic, textile, food_processing
    facility_size: str = Field(..., example="medium")  # small, medium, large
    region: str = Field(..., example="South Asia")
    production_volume: Optional[float] = Field(None, example=50000.0)

class FacilityResponse(BaseModel):
    id: str
    owner_user_id: str
    name: str
    industry: str
    facility_size: str
    region: str
    production_volume: Optional[float] = None
    created_at: datetime

class FacilityListResponse(BaseModel):
    facilities: List[FacilityResponse]

# Process Input Schemas
class ProcessInputCreate(BaseModel):
    category: str = Field(..., example="energy")  # energy, material, waste
    subtype: str = Field(..., example="diesel_generator")
    quantity: float = Field(..., gt=0, example=5000.0)
    unit: str = Field(..., example="litre")

class ProcessInputResponse(BaseModel):
    id: str
    assessment_id: str
    category: str
    subtype: str
    quantity: float
    unit: str
    emission_factor_id: Optional[str] = None
    computed_co2e: float = 0.0

# Assessment Schemas
class AssessmentResponse(BaseModel):
    id: str
    facility_id: str
    status: str = "draft"  # draft, complete
    total_co2e: float = 0.0
    created_at: datetime
    completed_at: Optional[datetime] = None

class AssessmentDetailResponse(BaseModel):
    assessment: AssessmentResponse
    inputs: List[ProcessInputResponse]
    unsupported_inputs: Optional[List[Dict[str, Any]]] = []

# Summary Schemas
class CategoryTotal(BaseModel):
    category: str
    total_co2e: float
    pct: float

class LineItemDetail(BaseModel):
    id: str
    category: str
    subtype: str
    quantity: float
    unit: str
    emission_factor_used: float
    factor_source: str
    computed_co2e: float
    contribution_pct: float

class SummaryResponse(BaseModel):
    total_co2e: float
    category_totals: List[CategoryTotal]
    line_items: List[LineItemDetail]
    unsupported_inputs_count: int = 0
    unsupported_inputs: List[Dict[str, Any]] = []

# Leak Point Schemas
class LeakPoint(BaseModel):
    rank: int
    name: str
    category: str
    subtype: str
    computed_co2e: float
    contribution_pct: float
    severity_badge: str  # High, Medium, Low

class LeakPointListResponse(BaseModel):
    leak_points: List[LeakPoint]

# Recommendation Schemas
class InterventionSchema(BaseModel):
    id: str
    name: str
    category: str
    description: Optional[str] = ""
    supported_industries: List[str] = []
    applicable_leak_types: List[str] = []
    estimated_cost_min: float = 0.0
    estimated_cost_max: float = 0.0
    estimated_co2_reduction_min: float = 0.0
    estimated_co2_reduction_max: float = 0.0
    implementation_difficulty: str = "medium"
    payback_period_months: int = 24
    roi_pct: float = 0.0
    explanation: Optional[str] = ""

class RecommendationItem(BaseModel):
    id: str
    intervention: InterventionSchema
    score: int
    score_source: str  # ml, rule_based
    estimated_cost_range: List[float]
    estimated_co2_reduction_range: List[float]
    payback_period_months: int
    explanation: List[str]
    applicable_leak_point: str
    status: str = "suggested"  # suggested, applied, dismissed

class RecommendationListResponse(BaseModel):
    recommendations: List[RecommendationItem]

# Simulate Schemas
class SimulateRequest(BaseModel):
    selected_intervention_ids: List[str]

class SimulateResponse(BaseModel):
    current_co2e: float
    projected_co2e: float
    reduction_abs: float
    reduction_pct: float
    investment: float
    payback: int
    roi: float

# Apply & Roadmap Schemas
class ApplyRecommendationRequest(BaseModel):
    roadmap_phase: Optional[int] = None

class AppliedInterventionResponse(BaseModel):
    id: str
    assessment_id: str
    recommendation_id: str
    applied_at: datetime
    roadmap_phase: int
    status: str = "planned"

class RoadmapItem(BaseModel):
    id: str
    recommendation_id: str
    intervention_name: str
    category: str
    score: int
    estimated_cost_range: List[float]
    estimated_co2_reduction_range: List[float]
    payback_period_months: int
    applicable_leak_point: str
    roadmap_phase: int
    status: str

class RoadmapPhaseResponse(BaseModel):
    phase: int
    phase_name: str
    interventions: List[RoadmapItem]

class RoadmapResponse(BaseModel):
    phases: List[RoadmapPhaseResponse]

# History Schemas
class AssessmentHistoryItem(BaseModel):
    assessment_id: str
    total_co2e: float
    recorded_at: datetime

class AssessmentHistoryListResponse(BaseModel):
    history: List[AssessmentHistoryItem]

# Export Schema
class ExportResponse(BaseModel):
    file_url: str
    format: str
