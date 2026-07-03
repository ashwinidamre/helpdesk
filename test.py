import google.generativeai as genai

genai.configure(api_key="AIzaSyDa0zUdRjSSYg0un7kY3ghV26M1cZJxduo")

try:
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content("Say hello in one word")
    print("✅ Gemini API key is working!")
    print("Response:", response.text)
except Exception as e:
    print("❌ Gemini API key failed:")
    print(e)