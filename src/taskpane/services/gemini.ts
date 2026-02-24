var GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

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

// ---- HELPERS ----

function wait(ms: number): Promise<void> {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

// ---- CALL GEMINI (with auto-retry on 429) ----

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
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  };

  if (systemParts.length > 0) {
    body.systemInstruction = { parts: systemParts };
  }

  var requestBody = JSON.stringify(body);
  var maxRetries = 3;
  var retryDelay = 2000; // start with 2 seconds

  for (var attempt = 0; attempt < maxRetries; attempt++) {
    var resp: Response;
    try {
      // 60 second timeout to prevent Office WebView hanging
      var controller = new AbortController();
      var timeoutId = setTimeout(function () { controller.abort(); }, 60000);
      resp = await fetch(GEMINI_API_URL + "?key=" + apiKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchErr) {
      var errMsg = (fetchErr && (fetchErr as any).message) ? (fetchErr as any).message : "Unbekannter Netzwerkfehler";
      if (errMsg.indexOf("abort") >= 0) {
        throw new Error("Zeitüberschreitung: Gemini hat nicht rechtzeitig geantwortet. Bitte erneut versuchen.");
      }
      throw new Error("Netzwerkfehler: " + errMsg + ". Bitte Internetverbindung prüfen.");
    }

    // Rate limit — wait and retry
    if (resp.status === 429) {
      if (attempt < maxRetries - 1) {
        await wait(retryDelay);
        retryDelay = retryDelay * 2; // exponential backoff
        continue;
      }
      throw new Error("Rate Limit erreicht. Bitte warte einige Sekunden und versuche es erneut.");
    }

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

    // Robust response parsing: handle thinking model responses
    // Thinking models return multiple parts — the JSON is in the non-thought part
    var parts = data.candidates[0].content.parts;
    var textContent = "";
    for (var p = parts.length - 1; p >= 0; p--) {
      if (parts[p].text && !parts[p].thought) {
        textContent = parts[p].text;
        break;
      }
    }
    // Fallback: if no non-thought part found, use last part
    if (!textContent && parts.length > 0) {
      textContent = parts[parts.length - 1].text || "";
    }

    if (!textContent) {
      throw new Error("Gemini hat eine leere Antwort zurückgegeben.");
    }

    try {
      return JSON.parse(textContent);
    } catch (_parseErr) {
      throw new Error("Gemini Antwort konnte nicht verarbeitet werden.");
    }
  }

  throw new Error("Gemini Anfrage fehlgeschlagen nach mehreren Versuchen.");
}
