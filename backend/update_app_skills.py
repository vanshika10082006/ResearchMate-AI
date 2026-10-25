import re
import os

filepath = r'c:\Users\ma\Downloads\researchmate-ai (1)\researchmate-ai\backend\app.py'

with open(filepath, 'r') as f:
    app_code = f.read()

if "from skills import registry as skills_registry" not in app_code:
    app_code = app_code.replace(
        "import llm_engine",
        "import llm_engine\nfrom skills import registry as skills_registry"
    )

new_routes = """
# --- Skills & Plugins Endpoints ---

@app.route("/api/skills", methods=["GET"])
def get_skills():
    skills = skills_registry.list_skills()
    return jsonify({"skills": skills})

@app.route("/api/skills/upload", methods=["POST"])
def upload_skill():
    try:
        skill_data = request.get_json(force=True)
        if not skill_data.get("name") or not skill_data.get("system_prompt"):
            return jsonify({"error": "Missing required fields (name, system_prompt)"}), 400
        
        saved_skill = skills_registry.save_skill(skill_data)
        return jsonify({"message": "Skill uploaded successfully", "skill": saved_skill})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/skills/run", methods=["POST"])
def run_skill():
    data = request.get_json(force=True)
    doc_id = data.get("document_id")
    skill_id = data.get("skill_id")
    model = data.get("model", "auto")
    
    doc = _get_document_or_404(doc_id)
    if doc is None:
        return jsonify({"error": "Document not found"}), 404
        
    skill = skills_registry.get_skill(skill_id)
    if skill is None:
        return jsonify({"error": "Skill not found"}), 404
        
    try:
        sample_text = doc.get("sample", "")
        # Format the user prompt using the template
        template = skill.get("user_prompt_template", "{sample}")
        user_prompt = template.replace("{sample}", sample_text)
        
        # We can reuse _ask_litellm from llm_engine to run custom system/user prompts!
        result = llm_engine._ask_litellm(skill.get("system_prompt"), user_prompt, model)
        return jsonify({"result": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- End Skills & Plugins Endpoints ---
"""

if "@app.route(\"/api/skills\"" not in app_code:
    # Insert right before health endpoint
    app_code = app_code.replace(
        "@app.route(\"/api/health\"",
        new_routes + "\n@app.route(\"/api/health\""
    )

with open(filepath, 'w') as f:
    f.write(app_code)

print("Backend updated with skills endpoints.")
