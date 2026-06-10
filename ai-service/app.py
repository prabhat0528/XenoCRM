import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load env variables
load_dotenv()

# Import our AI logic
import ai_logic

app = Flask(__name__)
# Enable CORS for frontend and backend access
CORS(app)

@app.route("/api/ai/segment", methods=["POST"])
def route_segment():
    data = request.get_json() or {}
    query = data.get("query")
    if not query:
        return jsonify({"error": "Query parameter is required."}), 400
    
    result = ai_logic.parse_segment(query)
    return jsonify(result)

@app.route("/api/ai/message", methods=["POST"])
def route_message():
    data = request.get_json() or {}
    prompt = data.get("prompt")
    channel = data.get("channel", "Email")
    if not prompt:
        return jsonify({"error": "Prompt parameter is required."}), 400
    
    message = ai_logic.generate_message(prompt, channel)
    return jsonify({"message": message})

@app.route("/api/ai/recommend", methods=["POST"])
def route_recommend():
    data = request.get_json() or {}
    goal = data.get("goal")
    if not goal:
        return jsonify({"error": "Goal parameter is required."}), 400
    
    recommendation = ai_logic.generate_recommendations(goal)
    return jsonify(recommendation)

@app.route("/api/ai/chat", methods=["POST"])
def route_chat():
    data = request.get_json() or {}
    message = data.get("message")
    history = data.get("history", [])
    if not message:
        return jsonify({"error": "Message parameter is required."}), 400
    
    response = ai_logic.chat_assistant(message, history)
    return jsonify(response)

@app.route("/health", methods=["GET"])
def route_health():
    return jsonify({
        "status": "healthy",
        "service": "python-ai-engine",
        "gemini_active": True if os.getenv("GEMINI_API_KEY") else False
    })

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5002))
    print(f"[AI-Service] AI Python Service running on port {port}")
    app.run(host="0.0.0.0", port=port, debug=True)
