import "dotenv/config";

const BASE_URL = process.env.CTI_API_BASE_URL || "https://providersupportdata.cloud-cfg.com";

async function login(): Promise<string> {
  const res = await fetch(`${BASE_URL}/v1/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({
      username: process.env.CTI_API_USERNAME,
      password: process.env.CTI_API_PASSWORD,
    }),
  });
  const data = await res.json() as Record<string, string>;
  return data["access-token"];
}

async function main() {
  const token = await login();

  // Test calls endpoint with different Accept headers
  const acceptHeaders = [
    "text/event-stream",
    "*/*",
    "application/x-ndjson",
    "text/plain",
  ];

  for (const accept of acceptHeaders) {
    console.log(`\nTrying /v1/extensions/phone/calls with Accept: ${accept}`);
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`${BASE_URL}/v1/extensions/phone/calls`, {
        headers: { "Authorization": `Bearer ${token}`, "Accept": accept },
        signal: controller.signal,
      });
      console.log(`  Status: ${res.status}`);
      console.log(`  Content-Type: ${res.headers.get("content-type")}`);
      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let collected = "";
        try {
          while (collected.length < 1000) {
            const { done, value } = await reader.read();
            if (done) break;
            collected += decoder.decode(value, { stream: true });
          }
        } catch {}
        reader.cancel();
        console.log(`  First data: ${collected.substring(0, 500)}`);
      } else {
        const text = await res.text();
        console.log(`  Body: ${text.substring(0, 300)}`);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log(`  (Timed out after 5s - could be streaming)`);
      } else {
        console.log(`  Error: ${err.message}`);
      }
    }
  }
}

main();
