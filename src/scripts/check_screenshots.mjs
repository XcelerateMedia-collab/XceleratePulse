import { createClient } from "@libsql/client";

const client = createClient({
  url: "libsql://xcelerate-pulse-xceleratemedia.aws-ap-south-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODk5NzI5NTcsImlkIjoiMDFhMGMyYjMtMWIwMS03YWVhLTg5ZmEtNTUxNGU1ZDI4MGY4Iiwia2lkIjoiY0MtU1ZGUlFwUFMwRlRhUDlUQlJsaEVWSC13MVJ4OHE1TzlfcS1NMmpTQSIsInJpZCI6Ijk2MjM0MzgxLWZmZTMtNGRhMi1hMGY3LTFmMDczZjg3Y2MzNCJ9.M3Ut3ytG0TfdE2rYLBNTIIi18kEIt5lKC0580xh3jz7VLigef4miB6I0yvd59FT8Fc5hbe1bjA__D3rm6vOoBg"
});

async function main() {
  const r = await client.execute(`
    SELECT id, creator_name, day7_screenshot, day15_screenshot, day30_screenshot, screenshots 
    FROM campaign_creators 
    WHERE (day7_screenshot IS NOT NULL AND day7_screenshot != '' AND day7_screenshot != '[]') 
       OR (day15_screenshot IS NOT NULL AND day15_screenshot != '' AND day15_screenshot != '[]') 
       OR (day30_screenshot IS NOT NULL AND day30_screenshot != '' AND day30_screenshot != '[]') 
       OR (screenshots IS NOT NULL AND screenshots != '' AND screenshots != '[]')
  `);
  console.log("Found rows:", r.rows.length);
  console.log(JSON.stringify(r.rows, null, 2));
}

main().catch(console.error);
