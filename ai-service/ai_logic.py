import os
import json
import re
import datetime
import google.generativeai as genai

# Setup Gemini Config
API_KEY = os.getenv("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)
    print("[AI-Service] Gemini API configured.")
else:
    print("[AI-Service] No GEMINI_API_KEY found. Using rule-based fallback model.")

def get_gemini_model():
    if not API_KEY:
        return None
    try:
        return genai.GenerativeModel("gemini-2.5-flash")
    except Exception as e:
        print(f"Error loading Gemini: {e}")
        return None

def clean_json_string(text):
    # Extract structural JSON block out of any markdown wrappers
    match = re.search(r"(\{.*\})", text, re.DOTALL)
    if match:
        return match.group(1)
    return text

def parse_segment(query):
    model = get_gemini_model()
    if model:
        prompt = f"""
        You are an AI data analyst for a CRM database.
        Convert the following customer segmentation request into a structured JSON filter.
        
        Database Schema details:
        - city: String (e.g. "Delhi", "Mumbai")
        - totalSpent: Number (total amount spent by customer)
        - totalOrders: Number (number of orders placed)
        - lastOrderDate: Date (date of last purchase)
        - demographics: Object containing 'gender' (String) and 'age' (Number)
        
        Output rules:
        Return ONLY a JSON object with this exact structure:
        {{
          "criteria": {{
            "city": string (or null),
            "totalSpentMin": number (or null),
            "totalOrdersMin": number (or null),
            "inactiveDays": number (or null, representing last purchase older than X days ago),
            "gender": string (or null, e.g. "Male", "Female"),
            "ageMin": number (or null),
            "ageMax": number (or null)
          }},
          "explanation": "Brief human explanation of what the query filters"
        }}
        Do not add any markdown formatting, do not use ```json wrappers. Return raw JSON text.
        
        User segmentation query: "{query}"
        """
        try:
            response = model.generate_content(prompt)
            json_text = clean_json_string(response.text)
            parsed = json.loads(json_text)
            if "criteria" in parsed:
                return parsed
        except Exception as e:
            print(f"Gemini segmentation parsing failed: {e}")
            # fall through to offline rules

    # Rule-based fallback parsing
    print("[AI-Service] Using local fallback parser for segmentation.")
    query_lower = query.lower()
    criteria = {}
    explanation_parts = []

    # City match
    city_match = re.search(r"in\s+([a-zA-Z\s]+?)(?:\s+who|\s+and|\s*$)", query, re.IGNORECASE) or \
                 re.search(r"from\s+([a-zA-Z\s]+?)(?:\s+who|\s+and|\s*$)", query, re.IGNORECASE)
    if city_match:
        city = city_match.group(1).strip().title()
        criteria["city"] = city
        explanation_parts.append(f"from {city}")

    # Total spent match
    spent_match = re.search(r"(?:spent|spending|spent\s+more\s+than)\s*(?:rs\.?|₹)?\s*(\d+)", query_lower) or \
                  re.search(r"spending\s*(?:>|>=)\s*(\d+)", query_lower)
    if spent_match:
        val = int(spent_match.group(1))
        criteria["totalSpentMin"] = val
        explanation_parts.append(f"spent > ₹{val}")

    # Total orders match
    orders_match = re.search(r"(?:orders|ordered|purchases|bought)\s*(?:more\s+than|>)?\s*(\d+)\s*(?:times|orders|purchases)?", query_lower)
    if orders_match:
        val = int(orders_match.group(1))
        criteria["totalOrdersMin"] = val
        explanation_parts.append(f"placed > {val} orders")

    # Inactivity match
    inactive_match = re.search(r"inactive\s*(?:for)?\s*(\d+)\s*days", query_lower) or \
                     re.search(r"not\s*ordered\s*(?:in|for)?\s*(\d+)\s*days", query_lower) or \
                     re.search(r"last\s*order\s*(?:more\s*than)?\s*(\d+)\s*days\s*ago", query_lower)
    if inactive_match:
        val = int(inactive_match.group(1))
        criteria["inactiveDays"] = val
        explanation_parts.append(f"inactive for > {val} days")
    elif "3 months" in query_lower:
        criteria["inactiveDays"] = 90
        explanation_parts.append("inactive for > 90 days")
    elif "6 months" in query_lower:
        criteria["inactiveDays"] = 180
        explanation_parts.append("inactive for > 180 days")

    # Demographics
    if "female" in query_lower or "women" in query_lower or "girl" in query_lower:
        criteria["gender"] = "Female"
        explanation_parts.append("gender is Female")
    elif "male" in query_lower or "men" in query_lower or "boy" in query_lower:
        criteria["gender"] = "Male"
        explanation_parts.append("gender is Male")

    age_match = re.search(r"age\s*(?:above|>)\s*(\d+)", query_lower)
    if age_match:
        val = int(age_match.group(1))
        criteria["ageMin"] = val
        explanation_parts.append(f"age > {val}")

    explanation = "Find customers who are " + " and ".join(explanation_parts) if explanation_parts else "Find all customers"
    
    return {
        "criteria": criteria,
        "explanation": explanation
    }

def generate_message(prompt, channel):
    model = get_gemini_model()
    if model:
        ai_prompt = f"""
        You are a professional marketing copywriter.
        Generate a highly engaging campaign message template for the communication channel: {channel}.
        The marketer wants the campaign to achieve: {prompt}
        
        You must personalize the template using the following template variables where appropriate:
        - {{{{name}}}} (customer's name)
        - {{{{totalSpent}}}} (total amount the customer has spent)
        - {{{{city}}}} (customer's city)
        - {{{{totalOrders}}}} (number of orders customer made)
        
        Rules:
        - WhatsApp: Include emojis, keep it compact and highly engaging.
        - SMS: Brief, maximum 160 characters, with a clear call to action.
        - Email: Start with "Subject: [Your Subject Line]" followed by the email body.
        - RCS: Interactive, engaging, rich styling.
        
        Return ONLY the final campaign message template. Do not include introductory notes or meta-comments.
        """
        try:
            response = model.generate_content(ai_prompt)
            return response.text.strip()
        except Exception as e:
            print(f"Gemini message generation failed: {e}")

    # Fallback copy templates
    print("[AI-Service] Using local fallback for campaign copywriting.")
    prompt_l = prompt.lower()
    
    # Generic templates
    subject = "Special Offer Just For You!"
    body = "Hi {{name}},\n\nWe love having you as a customer in {{city}}. To say thank you for spending ₹{{totalSpent}} with us, here is a special 15% discount on your next order! Use code THANKYOU15.\n\nBest,\nCRM Team"

    if "discount" in prompt_l or "coupon" in prompt_l or "offer" in prompt_l:
        subject = "We have a special discount for you!"
        body = "Hi {{name}},\n\nGet ready for our special sale! Enjoy 20% off your next purchase using coupon code GET20. Thank you for your continued loyalty!\n\nBest,\nMarketing Team"
    elif "miss" in prompt_l or "inactive" in prompt_l or "back" in prompt_l:
        subject = "We miss you, {{name}}! Come back and save 25%"
        body = "Hi {{name}},\n\nIt's been a while since your last purchase. We miss you! Enjoy 25% off everything on your next order with coupon MISSYOU25.\n\nWarmly,\nCRM Team"
    elif "loyalty" in prompt_l or "vip" in prompt_l or "spent" in prompt_l:
        subject = "Exclusive VIP Reward Inside!"
        body = "Hi {{name}},\n\nSince you are one of our top customers in {{city}} with ₹{{totalSpent}} spent, we wanted to treat you to an exclusive VIP reward. Get free shipping and double points on all orders this week!\n\nSincerely,\nVIP Support"

    if channel == 'SMS':
        sms_body = body.replace("\n\n", " ").replace("\n", " ")
        if len(sms_body) > 150:
            sms_body = f"Hi {{name}}, we miss you! Enjoy 20% off your next purchase with code SAVE20. Order now!"
        return sms_body
    elif channel == 'WhatsApp':
        return f"Hi *{{name}}*! 👋 We miss you. Get *20% OFF* your next order in {{city}}! 🛍️ Use code *BACK20* at checkout. Click here to shop now!"
    elif channel == 'RCS':
        return f"Hi {{name}}! We appreciate your business. Enjoy a special *20% discount* on our new collections. Tap to redeem: [Redeem Now]"
    else:
        return f"Subject: {subject}\n\n{body}"

def generate_recommendations(goal):
    model = get_gemini_model()
    if model:
        prompt = f"""
        You are a seasoned growth marketing consultant.
        A marketer has the following goal: "{goal}".
        Suggest the best campaign setup to achieve this.
        
        Return ONLY a JSON response in the following format:
        {{
          "segment": {{
            "city": string or null,
            "totalSpentMin": number or null,
            "totalOrdersMin": number or null,
            "inactiveDays": number or null,
            "gender": string or null
          }},
          "channel": "WhatsApp" | "Email" | "SMS" | "RCS",
          "message": "Campaign message template using {{{{name}}}}, {{{{city}}}}, etc.",
          "reasoning": "Brief explanation of why this segment, channel, and message was recommended."
        }}
        Do not output markdown code blocks. Return raw JSON.
        """
        try:
            response = model.generate_content(prompt)
            json_text = clean_json_string(response.text)
            return json.loads(json_text)
        except Exception as e:
            print(f"Gemini recommendations failed: {e}")

    # Fallback recommendations
    print("[AI-Service] Using local fallback for recommendations.")
    goal_l = goal.lower()
    
    if "repeat" in goal_l or "loyalty" in goal_l or "sales" in goal_l:
        return {
          "segment": {
            "totalOrdersMin": 2,
            "inactiveDays": 60
          },
          "channel": "WhatsApp",
          "message": "Hi *{{name}}*! 👋 Ready for your next purchase? We noticed you've placed {{totalOrders}} orders with us. Enjoy *15% OFF* your next shop with code *REPEAT15*! Shop now.",
          "reasoning": "Targeting customers who have purchased at least twice but have been inactive for 60 days. WhatsApp has high response rates for repeat buyers."
        }
    elif "win back" in goal_l or "inactive" in goal_l or "miss" in goal_l:
        return {
          "segment": {
            "inactiveDays": 90,
            "totalSpentMin": 1000
          },
          "channel": "Email",
          "message": "Subject: We miss you, {{name}} - Here's ₹200 off!\n\nHi {{name}},\n\nIt's been 3 months since your last order. We want to welcome you back! Enjoy ₹200 off your next order over ₹1000. Use code WELCOMEBACK.\n\nShop now!",
          "reasoning": "Targets inactive high-value customers (>₹1000 spent) who haven't ordered in 90 days. Email provides space for coupon codes and direct shop links."
        }
    else:
        return {
          "segment": {
            "totalSpentMin": 3000
          },
          "channel": "SMS",
          "message": "Hi {{name}}, thank you for being a top customer! Get early access to our weekend sale. Use code VIPEARLY. Shop: bit.ly/shop",
          "reasoning": "Targets high-value customers (>₹3000 spent) for a quick VIP announcement via SMS, which has a 98% open rate."
        }

def chat_assistant(message, history):
    model = get_gemini_model()
    history_str = ""
    for h in history[-6:]: # last 6 messages
        history_str += f"User: {h.get('user', '')}\nAssistant: {h.get('assistant', '')}\n"

    if model:
        prompt = f"""
        You are a smart CRM Campaign Coordinator. You assist marketers in managing their database, creating segments, drafting campaigns, and scheduling them.
        
        Marketers can execute operations using natural language. If the user expresses an action intent, you should output a structured action in the JSON response to let the UI execute it.
        
        Supported UI Actions:
        1. create_segment:
           payload: {{ "query": "nlp query", "criteria": {{ "city": "...", "totalSpentMin": 0 }} }}
        2. create_campaign:
           payload: {{ "name": "Campaign Name", "channel": "WhatsApp|Email|SMS|RCS", "messageTemplate": "...", "segmentCriteria": {{ ... }} }}
        
        Example Interaction:
        User: "Create a WhatsApp campaign for customers who spent more than 5000"
        Response JSON:
        {{
          "response": "I've drafted a WhatsApp campaign targeting customers with a spend greater than ₹5000. I populated the message template for you. Would you like to review and launch it?",
          "action": {{
            "type": "create_campaign",
            "payload": {{
              "name": "High Value WhatsApp Campaign",
              "channel": "WhatsApp",
              "messageTemplate": "Hi *{{name}}*! We have a special gift for you. Use code HIGH5 to save on your next order!",
              "segmentCriteria": {{
                "totalSpentMin": 5000
              }}
            }}
          }}
        }}

        Output rules:
        Return ONLY a JSON response matching this exact schema:
        {{
          "response": "Conversational reply to user",
          "action": {{ "type": "create_segment"|"create_campaign", "payload": {{ ... }} }} (or null)
        }}
        Do not use markdown blocks. Return raw JSON.
        
        Conversation History:
        {history_str}
        
        User input: "{message}"
        """
        try:
            response = model.generate_content(prompt)
            json_text = clean_json_string(response.text)
            return json.loads(json_text)
        except Exception as e:
            print(f"Gemini chat assistant failed: {e}")

    # Fallback chat assistant
    print("[AI-Service] Using local fallback for Chat Assistant.")
    message_l = message.lower()
    response_text = "I'm your CRM assistant. Tell me to create segments or campaigns!"
    action = None

    if "campaign" in message_l:
        channel = "WhatsApp"
        if "email" in message_l: channel = "Email"
        if "sms" in message_l: channel = "SMS"

        # Determine segment
        total_spent = 5000 if "5000" in message_l else 2000
        inactive_days = 90 if "inactive" in message_l or "months" in message_l else None

        criteria = {"totalSpentMin": total_spent}
        if inactive_days:
            criteria["inactiveDays"] = inactive_days

        action = {
            "type": "create_campaign",
            "payload": {
                "name": f"AI Assistant Generated Campaign ({channel})",
                "channel": channel,
                "messageTemplate": "Hi {{name}}! 🎁 Enjoy our special appreciation discount. Use code OFF20 at checkout!",
                "segmentCriteria": criteria
            }
        }
        response_text = f"I've configured an action to set up your campaign targeting customers with spend > ₹{total_spent} on channel: {channel}. Let me know if you would like to run it."
    elif "segment" in message_l or "find" in message_l or "show" in message_l:
        total_spent = 5000 if "5000" in message_l else 2000
        action = {
            "type": "create_segment",
            "payload": {
                "query": message,
                "criteria": {
                    "totalSpentMin": total_spent
                }
            }
        }
        response_text = f"I've generated a segment filter for customers with spend > ₹{total_spent}. Let's view the audience!"

    return {
        "response": response_text,
        "action": action
    }
