from pydantic import BaseModel
from typing import Dict


class AFIResponse(BaseModel):
    audio: Dict
    text: Dict
    final: Dict
