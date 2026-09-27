import { createClient } from "@libsql/client";

const client = createClient({
  url: "libsql://xcelerate-pulse-xceleratemedia.aws-ap-south-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODk5NzI5NTcsImlkIjoiMDFhMGMyYjMtMWIwMS03YWVhLTg5ZmEtNTUxNGU1ZDI4MGY4Iiwia2lkIjoiY0MtU1ZGUlFwUFMwRlRhUDlUQlJsaEVWSC13MVJ4OHE1TzlfcS1NMmpTQSIsInJpZCI6Ijk2MjM0MzgxLWZmZTMtNGRhMi1hMGY3LTFmMDczZjg3Y2MzNCJ9.M3Ut3ytG0TfdE2rYLBNTIIi18kEIt5lKC0580xh3jz7VLigef4miB6I0yvd59FT8Fc5hbe1bjA__D3rm6vOoBg"
});

async function main() {
  console.log("Removing duplicate screenshot copies for Simpli stock...");
  const updateRes = await client.execute({
    sql: `UPDATE campaign_creators 
          SET day7_screenshot = '', 
              day15_screenshot = '', 
              screenshots = '' 
          WHERE creator_name LIKE ?`,
    args: ['%Simpli%']
  });
  console.log(`Updated rows: ${updateRes.rowsAffected}`);

  const check = await client.execute({
    sql: `SELECT id, creator_name, day7_screenshot, day15_screenshot, day30_screenshot, screenshots 
          FROM campaign_creators 
          WHERE creator_name LIKE ?`,
    args: ['%Simpli%']
  });
  console.log("Post-cleanup row:", JSON.stringify(check.rows[0], null, 2));
}

main().catch(console.error);
