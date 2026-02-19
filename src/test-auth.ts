import "dotenv/config";

async function main() {
  console.log("NFON CTI API - Authentifizierungs-Test");
  console.log("======================================\n");

  const BASE_URL = process.env.CTI_API_BASE_URL || "https://providersupportdata.cloud-cfg.com";

  try {
    const res = await fetch(`${BASE_URL}/v1/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        username: process.env.CTI_API_USERNAME,
        password: process.env.CTI_API_PASSWORD,
      }),
    });

    console.log("Status:", res.status);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
    const data = await res.json();
    console.log("\nResponse-Struktur:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("\nFehler:", err);
  }
}

main();
