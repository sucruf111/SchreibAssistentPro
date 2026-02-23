/* global Office */

const OPENAI_CLIENT_ID = "your_client_id"; // From OpenAI dashboard
const REDIRECT_URI = "https://sucruf111.github.io/SchreibAssistentPro/callback.html"; // Static callback page
const TOKEN_URL = "https://auth.openai.com/token";

// ---- TOKEN STORAGE (Office Roaming Settings) ----

function saveToken(token: string) {
  Office.context.roamingSettings.set("openai_token", token);
  Office.context.roamingSettings.saveAsync();
}

function getToken(): string | null {
  return Office.context.roamingSettings.get("openai_token") || null;
}

function clearToken() {
  Office.context.roamingSettings.remove("openai_token");
  Office.context.roamingSettings.saveAsync();
}

// ---- LOGIN ----

export function loginWithOpenAI(): Promise<void> {
  return new Promise((resolve, reject) => {
    const authUrl =
      `https://auth.openai.com/authorize` +
      `?client_id=${OPENAI_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_type=code` +
      `&scope=chat.completions models.read`;

    Office.context.ui.displayDialogAsync(authUrl, { height: 60, width: 40 }, (result) => {
      if (result.status !== Office.AsyncResultStatus.Succeeded) {
        return reject(new Error("Could not open login dialog"));
      }

      const dialog = result.value;

      dialog.addEventHandler(
        Office.EventType.DialogMessageReceived,
        async (args: { message?: string; origin?: string; error?: number }) => {
          dialog.close();
          if (!args.message) return reject(new Error("No auth code received"));
          const code = args.message; // The callback page sends the auth code

          // Exchange code for token (direct call, no server needed)
          const resp = await fetch(TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "authorization_code",
              code: code,
              redirect_uri: REDIRECT_URI,
              client_id: OPENAI_CLIENT_ID,
            }),
          });

          if (!resp.ok) return reject(new Error("Token exchange failed"));
          const tokens = await resp.json();

          saveToken(tokens.access_token);
          resolve();
        }
      );

      dialog.addEventHandler(Office.EventType.DialogEventReceived, () => {
        reject(new Error("Dialog closed"));
      });
    });
  });
}

// ---- LOGOUT ----

export function logout() {
  clearToken();
}

// ---- STATUS ----

export function isLoggedIn(): boolean {
  return getToken() !== null;
}

// ---- CALL CHATGPT ----

export async function callChatGPT(
  messages: Array<{ role: string; content: string }>,
  temperature: number = 0.3,
  model: string = "gpt-4o"
): Promise<any> {
  const token = getToken();
  if (!token) throw new Error("Nicht angemeldet. Bitte zuerst mit OpenAI verbinden.");

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      response_format: { type: "json_object" },
    }),
  });

  if (resp.status === 401) {
    clearToken();
    throw new Error("Sitzung abgelaufen. Bitte erneut anmelden.");
  }
  if (!resp.ok) throw new Error(`OpenAI Fehler: ${resp.status}`);

  const data = await resp.json();
  return JSON.parse(data.choices[0].message.content);
}
