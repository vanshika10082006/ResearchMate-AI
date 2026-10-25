import os
import json
from glob import glob

SKILLS_DIR = os.path.join(os.path.dirname(__file__), "custom")
os.makedirs(SKILLS_DIR, exist_ok=True)

def list_skills():
    skills = []
    for filepath in glob(os.path.join(SKILLS_DIR, "*.json")):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                skill = json.load(f)
                skills.append(skill)
        except Exception as e:
            print(f"Error loading skill {filepath}: {e}")
    return skills

def save_skill(skill_data):
    skill_id = skill_data.get("id")
    if not skill_id:
        import uuid
        skill_id = str(uuid.uuid4())
        skill_data["id"] = skill_id
    
    filepath = os.path.join(SKILLS_DIR, f"{skill_id}.json")
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(skill_data, f, indent=2)
    return skill_data

def get_skill(skill_id):
    filepath = os.path.join(SKILLS_DIR, f"{skill_id}.json")
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    return None
