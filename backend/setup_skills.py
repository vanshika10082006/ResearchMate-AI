import os
import json
import re

backend_dir = r'c:\Users\ma\Downloads\researchmate-ai (1)\researchmate-ai\backend'
skills_dir = os.path.join(backend_dir, 'skills')
custom_skills_dir = os.path.join(skills_dir, 'custom')

os.makedirs(custom_skills_dir, exist_ok=True)

# 1. Create registry.py
registry_code = """import os
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
"""

with open(os.path.join(skills_dir, 'registry.py'), 'w', encoding='utf-8') as f:
    f.write(registry_code)
    
with open(os.path.join(skills_dir, '__init__.py'), 'w', encoding='utf-8') as f:
    f.write("")

# 2. Create a default sample skill
bibtex_skill = {
  "id": "bibtex-generator",
  "name": "BibTeX Generator",
  "category": "citation",
  "description": "Extracts citation details and formats them into a BibTeX entry.",
  "system_prompt": "You are a reference management tool. Generate a clean BibTeX entry for this research paper. Return ONLY the BibTeX code.",
  "user_prompt_template": "Paper Text Sample:\n{sample}\n\nGenerate BibTeX:"
}

with open(os.path.join(custom_skills_dir, 'bibtex-generator.json'), 'w', encoding='utf-8') as f:
    json.dump(bibtex_skill, f, indent=2)

print("Skills setup done.")
