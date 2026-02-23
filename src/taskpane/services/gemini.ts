var GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// ---- API KEY STORAGE (localStorage) ----

export function saveApiKey(key: string) {
  localStorage.setItem("gemini_api_key", key);
}

export function getApiKey(): string | null {
  return localStorage.getItem("gemini_api_key") || null;
}

export function clearApiKey() {
  localStorage.removeItem("gemini_api_key");
}

export function isConnected(): boolean {
  return getApiKey() !== null;
}

// ---- CALL GEMINI ----

export async function callGemini(
  messages: Array<{ role: string; content: string }>,
  temperature?: number
): Promise<any> {
  var apiKey = getApiKey();
  if (!apiKey) throw new Error("Kein API-Key gespeichert. Bitte in den Einstellungen eingeben.");

  var temp = temperature !== undefined ? temperature : 0.3;

  // Separate system messages from user/assistant messages
  var systemParts: Array<{ text: string }> = [];
  var contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  for (var i = 0; i < messages.length; i++) {
    var msg = messages[i];
    if (msg.role === "system") {
      systemParts.push({ text: msg.content });
    } else {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }
  }

  var body: any = {
    contents: contents,
    generationConfig: {
      temperature: temp,
      responseMimeType: "application/json",
    },
  };

  if (systemParts.length > 0) {
    body.systemInstruction = { parts: systemParts };
  }

  var resp = await fetch(GEMINI_API_URL + "?key=" + apiKey, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (resp.status === 400) {
    var errorData: any;
    try {
      errorData = await resp.json();
    } catch (_e) {
      throw new Error("Gemini Fehler: Ungültige Anfrage (400)");
    }
    var errorMsg = (errorData.error && errorData.error.message) ? errorData.error.message : "Ungültige Anfrage";
    throw new Error("Gemini Fehler: " + errorMsg);
  }
  if (resp.status === 403 || resp.status === 401) {
    throw new Error("Ungültiger API-Key. Bitte in den Einstellungen prüfen.");
  }
  if (!resp.ok) throw new Error("Gemini Fehler: " + resp.status);

  var data = await resp.json();
  var textContent = data.candidates[0].content.parts[0].text;
  return JSON.parse(textContent);
}
