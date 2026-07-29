from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class GlAccountCode(StrEnum):
    OFFICE_SUPPLIES = "4000"
    FACILITIES_MAINTENANCE = "4100"
    UTILITIES = "4200"
    IT_HARDWARE_SOFTWARE = "4300"
    FUEL_TRAVEL = "4400"
    MEALS_ENTERTAINMENT = "4500"
    PROFESSIONAL_SERVICES = "4600"
    CLEANING_JANITORIAL = "4700"
    MARKETING_ADVERTISING = "4800"
    TELECOMMUNICATIONS = "4900"


GL_ACCOUNT_DESCRIPTIONS: dict[GlAccountCode, str] = {
    GlAccountCode.OFFICE_SUPPLIES: "Office Supplies & Stationery",
    GlAccountCode.FACILITIES_MAINTENANCE: "Facilities & Building Maintenance",
    GlAccountCode.UTILITIES: "Utilities (Electricity, Water, Gas)",
    GlAccountCode.IT_HARDWARE_SOFTWARE: "IT Hardware & Software Licensing",
    GlAccountCode.FUEL_TRAVEL: "Fuel & Vehicle Travel Expenses",
    GlAccountCode.MEALS_ENTERTAINMENT: "Meals & Client Entertainment",
    GlAccountCode.PROFESSIONAL_SERVICES: "Professional Services & Legal Fees",
    GlAccountCode.CLEANING_JANITORIAL: "Cleaning & Janitorial Services",
    GlAccountCode.MARKETING_ADVERTISING: "Marketing & Advertising",
    GlAccountCode.TELECOMMUNICATIONS: "Telecommunications & Internet",
}


class GlSuggestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    account_code: GlAccountCode
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str = Field(min_length=1)
