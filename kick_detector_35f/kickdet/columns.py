"""
columns.py
----------
DataDRILL column registry: the single source of truth for input schema.

Split out of the training project's ``kickconfig`` so this package has **no
filesystem side effects on import** and no dependency on the training repo
layout. Every name and description is copied verbatim from Table IV of
arXiv:2409.19724 "DataDRILL: Formation Pressure Prediction and Kick Detection
for Drilling Rigs" and from the released CSV headers.
"""

from __future__ import annotations

TARGET = "ActiveGL"  # "Active Gain Loss" - the kick label (Table IV, attr 14)

# Leakage block list. Present in the CSV, forbidden as model input.
# In the OTR simulator these are (near-)deterministic functions of the label.
BANNED = ["ActiveGL", "ATVolume", "FDensity", "MVis"]

# Dead channels: constant or pure instrument noise in the release.
DEAD = ["BSize", "CPress", "MPS1", "MPS2", "MPS3", "AMTD", "STP", "ATMPV", "ATMYP"]

# The nine surface-measurable channels that actually move during drilling.
# `WellDepth` and `FPress` are deliberately excluded from the deployable set.
PRIMARY_CHANNELS = [
    "FOut",      # Flow Out            - fluid exiting the drill pipe
    "FIn",       # Flow In             - fluid entering the drill pipe
    "DPPress",   # Drill Pipe Pressure
    "WBoPress",  # Well Bore Pressure
    "WoBit",     # Weight on Bit
    "HLoad",     # Hook Load
    "RoPen",     # Rate of Penetration
    "CircFlow",  # Circulation Flow
    "SMSpeed",   # String Moving Speed
]

OPTIONAL_CHANNELS = ["FPress"]  # Formation Pressure - downhole virtual sensor

# (column_name, human_name, description)
VARIABLES: dict[str, tuple[str, str]] = {
    "CircFlow": ("Circulation Flow", "Flow rate of circulating fluid through the drill pipe"),
    "FRate": ("Flow Rate", "Flow rate of the fluid from the mud pumps"),
    "FDensity": ("Fluid Density", "Density of the fluid circulating through the drill pipe"),
    "SMSpeed": ("String Moving Speed", "Speed at which the string moves"),
    "BDepth": ("Bit Depth", "Position of the drill bit from the surface"),
    "BSize": ("Bit Size", "The size of the drill bit"),
    "MVis": ("Mud Viscosity", "Viscosity of the fluid flowing through the drill string"),
    "FPress": ("Formation Pressure", "Pressure exerted by the formation"),
    "DPPress": ("Drill Pipe Pressure", "Difference between formation pressure at bit and hydrostatic"),
    "CPress": ("Casing Pressure", "Pressure exerted by the surface on the casing inside the well"),
    "FIn": ("Flow In", "Amount of drilling fluid entering the drill pipe"),
    "FOut": ("Flow Out", "Amount of drilling fluid exiting the drill pipe"),
    "MRFlow": ("Return Flow", "Rate of the returned fluid flow"),
    "ActiveGL": ("Active Gain Loss", "Indicator of the kick"),
    "ATVolume": ("Active Tank Volume", "Volume of the mud tank for containing muds"),
    "RoPen": ("Rate of Penetration", "Penetration rate of the drill bit"),
    "WoBit": ("Weight on Bit", "Amount of downward force exerted on the drill bit"),
    "HLoad": ("Hook Load", "Vertical force pulling down on the top-drive shaft"),
    "WBoPress": ("Well Bore Pressure", "Pressure exerted on the formation from the well bore"),
    "BTBR": ("Bit TVD below RKB", "True vertical depth of the bit below rotary kelly bushing"),
    "MPS1": ("Mud Pump Speed 1", "Speed at which mud pump 1 circulates the muds"),
    "MPS2": ("Mud Pump Speed 2", "Speed at which mud pump 2 circulates the muds"),
    "MPS3": ("Mud Pump Speed 3", "Speed at which mud pump 3 circulates the muds"),
    "AMTD": ("Active Mud Tank Density", "Density of the drilling mud in the tank"),
    "ATMPV": ("Active Tank Mud PV", "Plastic viscosity of the drilling mud"),
    "ATMYP": ("Active Tank Mud YP", "Yield point of the drilling fluid inside the tank"),
    "STP": ("Strokes Pumped", "Measures the efficiency of the mud pumps"),
    "WellDepth": ("Well Depth", "Height of the drilled well from the surface"),
}

ALL_COLUMNS: list[str] = list(VARIABLES)

# Columns the DataDRILL authors declare invariant across the kick event
# (paper Section III). `WellDepth` is excluded: in this single-event dataset it
# is a proxy for sample position, not a cause of the kick.
PAPER_INVARIANT_COLUMNS = [
    "BDepth", "BSize", "FPress", "CPress",
    "MPS1", "MPS2", "MPS3", "AMTD", "STP",
]


def human(col: str) -> str:
    """Human-readable name of a DataDRILL column."""
    return VARIABLES[col][0]


def describe(col: str) -> str:
    """Verbatim description of a DataDRILL column."""
    return VARIABLES[col][1]
