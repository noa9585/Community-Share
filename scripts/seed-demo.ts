/**
 * Fills the site with a realistic demo community: members, items with real
 * photos, loans in every state, chats, notifications and reports.
 *
 *   node --env-file=.env.local --experimental-strip-types scripts/seed-demo.ts
 *   node --env-file=.env.local --experimental-strip-types scripts/seed-demo.ts --remove
 *
 * Required environment variables (nothing secret is hard-coded):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   DEMO_USER_PASSWORD   – password of the demo member (and of the other demo members)
 *   DEMO_ADMIN_PASSWORD  – password of the demo admin
 *
 * Every demo account uses an @example.com address, so no real person is ever
 * e-mailed. `--remove` deletes all of them, and with them everything they
 * created (items, pictures, loans, chats, notifications, reports).
 * Photos: scripts/demo-data/images, see CREDITS.md there for their licences.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

const supabase = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const IMAGE_DIR = join(import.meta.dirname, "demo-data", "images");
const DAY = 86_400_000;

// ---------------------------------------------------------------------------
// The community
// ---------------------------------------------------------------------------

type MemberKey =
  | "dana" | "rachel" | "yossi" | "michal" | "avi" | "noa" | "david" | "shira" | "omer" | "tamar";

const MEMBERS: Record<MemberKey, {
  email: string;
  name: string;
  /** Position in the live area list (wraps around), so any area names work. */
  area: number;
  role?: "admin";
  pending?: boolean;
  password: "user" | "admin";
}> = {
  dana: { email: "demo.user@example.com", name: "דנה כהן", area: 0, password: "user" },
  rachel: { email: "demo.admin@example.com", name: "רחל אברהמי", area: 1, role: "admin", password: "admin" },
  yossi: { email: "yossi.levi.demo@example.com", name: "יוסי לוי", area: 2, password: "user" },
  michal: { email: "michal.friedman.demo@example.com", name: "מיכל פרידמן", area: 3, password: "user" },
  avi: { email: "avi.mizrahi.demo@example.com", name: "אבי מזרחי", area: 4, password: "user" },
  noa: { email: "noa.shapira.demo@example.com", name: "נועה שפירא", area: 0, password: "user" },
  david: { email: "david.biton.demo@example.com", name: "דוד ביטון", area: 5, password: "user" },
  shira: { email: "shira.golan.demo@example.com", name: "שירה גולן", area: 6, password: "user" },
  omer: { email: "omer.katz.demo@example.com", name: "עומר כץ", area: 2, password: "user" },
  tamar: { email: "tamar.alon.demo@example.com", name: "תמר אלון", area: 1, pending: true, password: "user" },
};

const CATEGORIES: Record<string, string> = {
  "כלי עבודה": "handyman",
  "ציוד אירוח": "flatware",
  "משחקי קופסה": "sports_esports",
  "ספרים": "menu_book",
  "מזוודות": "luggage",
  "ציוד לאירועים": "celebration",
  "ספורט וטיולים": "hiking",
};

type ItemSeed = {
  key: string;
  owner: MemberKey;
  name: string;
  description: string;
  category: keyof typeof CATEGORIES;
  condition: number;
  quantity?: number;
  deposit: number;
  daysAgo: number;
  pending?: boolean;
};

const ITEMS: ItemSeed[] = [
  { key: "drill", owner: "yossi", name: "מקדחה רוטטת נטענת", description: "מקדחה חזקה עם שתי סוללות 18V ומטען. קודחת בבטון, בעץ ובמתכת. מגיעה בתיק עם סט מקדחים וביטים.", category: "כלי עבודה", condition: 9, deposit: 100, daysAgo: 41 },
  { key: "screwdrivers", owner: "yossi", name: "סט מברגים מקצועי (32 חלקים)", description: "מברגים שטוחים ופיליפס בכל הגדלים, כולל ביטים מתחלפים ומברג מדידה. בקופסה מסודרת.", category: "כלי עבודה", condition: 8, deposit: 0, daysAgo: 38 },
  { key: "washer", owner: "yossi", name: "מכונת שטיפה בלחץ", description: "מושלמת לניקוי מרפסות, ריצוף בחוץ ורכב. כולל צינור 8 מטר ושני ראשים. נא להחזיר אחרי ניקוז המים.", category: "כלי עבודה", condition: 7, deposit: 150, daysAgo: 25 },
  { key: "ladder", owner: "rachel", name: "סולם אלומיניום 5 שלבים", description: "סולם יציב וקל, מגיע עד תקרה רגילה (2.70 מ'). מתקפל ונכנס לרכב.", category: "כלי עבודה", condition: 9, deposit: 0, daysAgo: 52 },
  { key: "saw", owner: "avi", name: "מסור עגול Makita", description: "מסור עגול 1400W עם להב חדש. מתאים לחיתוך עץ ולוחות. מומלץ למי שיש ניסיון – אשמח להסביר.", category: "כלי עבודה", condition: 8, deposit: 200, daysAgo: 33 },
  { key: "urn", owner: "rachel", name: "מיחם 40 כוסות", description: "מיחם נירוסטה גדול לאירועים ולשבתות, עם ברז ומכסה. נא להחזיר נקי ויבש.", category: "ציוד אירוח", condition: 8, quantity: 2, deposit: 50, daysAgo: 47 },
  { key: "pot", owner: "rachel", name: "סיר ענק 50 ליטר", description: "סיר נירוסטה עבה לבישול לאירועים גדולים, ממרק ועד קוסקוס. כולל מכסה.", category: "ציוד אירוח", condition: 7, deposit: 0, daysAgo: 30 },
  { key: "coffee", owner: "michal", name: "מכונת אספרסו ביתית", description: "מכונת אספרסו עם מקציף חלב. מושלמת לאירוח בבוקר. מגיעה עם שקית קפה טחון.", category: "ציוד אירוח", condition: 8, deposit: 120, daysAgo: 19 },
  { key: "catan", owner: "david", name: "קטאן – המתיישבים", description: "משחק קופסה ל-3–4 שחקנים, כל החלקים קיימים. כולל הרחבה ל-5–6 שחקנים.", category: "משחקי קופסה", condition: 9, deposit: 0, daysAgo: 60 },
  { key: "chess", owner: "david", name: "ערכת שחמט מעץ מלא", description: "לוח 50×50 ס\"מ וכלים מעץ מגולף. לשחקנים רציניים ולמי שרוצה ללמוד.", category: "משחקי קופסה", condition: 10, deposit: 50, daysAgo: 44 },
  { key: "jenga", owner: "noa", name: "ג'נגה מעץ", description: "המשחק הקלאסי, 54 קוביות עץ. להיט בכל מסיבה ובכל שבת עם הילדים.", category: "משחקי קופסה", condition: 8, deposit: 0, daysAgo: 22 },
  { key: "encyclopedia", owner: "shira", name: "אנציקלופדיה לילדים – 12 כרכים", description: "סדרה מאוירת בכריכה קשה, במצב טוב מאוד. מתאימה לעבודות בית ספר. אפשר לשאול כרך אחד או את כולה.", category: "ספרים", condition: 8, quantity: 1, deposit: 0, daysAgo: 58 },
  { key: "suitcase", owner: "dana", name: "מזוודה גדולה 28 אינץ'", description: "מזוודה קשיחה עם ארבעה גלגלים ומנעול TSA. מתאימה לטיסה ארוכה.", category: "מזוודות", condition: 8, deposit: 100, daysAgo: 36 },
  { key: "backpack", owner: "shira", name: "תרמיל טיולים 65 ליטר", description: "תרמיל מקצועי עם מערכת נשיאה מתכווננת וכיסוי גשם. עבר את שביל ישראל.", category: "ספורט וטיולים", condition: 7, deposit: 80, daysAgo: 27 },
  { key: "chairs", owner: "omer", name: "כיסאות נוח מתקפלים (4)", description: "כיסאות נוח לחצר או לסוכה, מתקפלים בקלות. אפשר לשאול כמה שצריך.", category: "ציוד לאירועים", condition: 7, quantity: 4, deposit: 0, daysAgo: 15 },
  { key: "table", owner: "omer", name: "שולחן מתקפל 1.80 מ'", description: "שולחן פלסטיק חזק ל-8 סועדים, מתקפל לחצי. מתאים לסוכה, לאירועים ולשבתות עם אורחים.", category: "ציוד לאירועים", condition: 8, quantity: 2, deposit: 0, daysAgo: 14 },
  { key: "speaker", owner: "dana", name: "רמקול בלוטות' נייד", description: "רמקול עמיד למים עם סוללה ל-12 שעות. סאונד חזק לשמחה בחצר, לשבע ברכות או לחוג.", category: "ציוד לאירועים", condition: 9, deposit: 100, daysAgo: 29 },
  { key: "popcorn", owner: "omer", name: "מכונת פופקורן", description: "מכונה בסגנון קולנוע, מכינה קערה גדולה בשלוש דקות. כולל כפית מדידה.", category: "ציוד לאירועים", condition: 9, deposit: 60, daysAgo: 1, pending: true },
  { key: "tent", owner: "dana", name: "אוהל משפחתי ל-6", description: "אוהל פתיחה מהירה עם שני חדרים, עמיד לגשם קל. כולל יתדות ותיק נשיאה.", category: "ספורט וטיולים", condition: 8, deposit: 150, daysAgo: 40 },
  { key: "cooler", owner: "dana", name: "צידנית 40 ליטר", description: "צידנית קשיחה ששומרת על קור יום שלם. מושלמת לטיול או לים.", category: "ספורט וטיולים", condition: 9, deposit: 0, daysAgo: 12 },
  { key: "bike", owner: "avi", name: "אופני ילדים 16 אינץ'", description: "אופניים לגילאי 4–7 עם גלגלי עזר נשלפים. קסדה כלולה.", category: "ספורט וטיולים", condition: 7, deposit: 50, daysAgo: 9 },
];

// ---------------------------------------------------------------------------
// Activity: requests and loans in every state, with the chat around them.
// Offsets are in days from today. Messages: [who, text], "m" is the member
// asking, "o" is the item's owner. The database adds its own automatic
// messages (request sent, approved, returned...) as each step happens.
// ---------------------------------------------------------------------------

type Line = ["m" | "o", string];

type Scenario = {
  item: string;
  member: MemberKey;
  start?: number;
  end?: number;
  quantity?: number;
  /** Final state; the request goes through every step up to it. */
  state?: "pending" | "rejected" | "cancelled" | "active" | "late" | "returned" | "completed";
  deposit?: boolean;
  /** Chat before the request is sent. */
  before?: Line[];
  /** Chat after the owner answered. */
  after?: Line[];
  /** When the conversation started, in days before today. */
  startedDaysAgo: number;
  /** Leave the last messages unread for this side. */
  unreadFor?: "m" | "o";
};

const SCENARIOS: Scenario[] = [
  {
    item: "drill", member: "dana", start: -2, end: 3, state: "active", deposit: true, startedDaysAgo: 4,
    before: [
      ["m", "היי יוסי, המקדחה פנויה בסוף השבוע? צריכה לתלות מדפים בסלון"],
      ["o", "היי דנה, בטח! יש גם מקדח לבטון בסט, תתאימי לקיר"],
      ["m", "מעולה, שולחת בקשה עכשיו"],
    ],
    after: [
      ["o", "אישרתי. אני בבית אחרי 18:00, קומה 3"],
      ["m", "מגיעה בשש וחצי, אביא את הפיקדון במזומן"],
      ["o", "סגור, הסוללות טעונות 👍"],
    ],
  },
  {
    item: "ladder", member: "avi", start: -12, end: -4, state: "late", startedDaysAgo: 13,
    before: [["m", "שלום רחל, אפשר את הסולם לצביעת חדר הילדים?"]],
    after: [
      ["o", "בשמחה, הוא במחסן בכניסה לבניין"],
      ["o", "היי אבי, הסולם היה אמור לחזור ביום שלישי. מתי נוח לך להחזיר?"],
      ["m", "סליחה! הצביעה התארכה, מחזיר עד מחר בערב"],
    ],
    unreadFor: "o",
  },
  {
    item: "speaker", member: "michal", start: -7, end: -1, state: "returned", deposit: true, startedDaysAgo: 9,
    before: [
      ["m", "דנה היי, יש לנו בר מצווה לבן בחצר. הרמקול פנוי?"],
      ["o", "פנוי! תשלחי בקשה ואאשר"],
    ],
    after: [
      ["m", "תודה רבה! הרמקול הציל את השמחה 🎉 השארתי אותו אצל השכנה שלך כמו שסיכמנו"],
    ],
    unreadFor: "o",
  },
  {
    item: "chess", member: "noa", start: -30, end: -25, state: "completed", deposit: true, startedDaysAgo: 32,
    after: [
      ["o", "אפשר לאסוף מחר בבוקר"],
      ["m", "החזרתי, תודה! הבן שלי התאהב בשחמט"],
      ["o", "איזה כיף לשמוע, ההחזרה אושרה"],
    ],
  },
  {
    item: "encyclopedia", member: "dana", start: -40, end: -20, state: "completed", startedDaysAgo: 41,
    after: [["o", "בהצלחה עם העבודה!"], ["m", "הבת שלי קיבלה 100 😊 תודה ענקית!"]],
  },
  {
    item: "jenga", member: "omer", start: 5, end: 7, state: "active", startedDaysAgo: 2,
    after: [["m", "תודה נועה! אאסוף ביום חמישי"], ["o", "מעולה, אני בבית כל הערב"]],
  },
  {
    item: "catan", member: "yossi", start: -16, end: -12, state: "completed", startedDaysAgo: 18,
    after: [["m", "המשחק חזר שלם, ספרנו את כל החלקים 🙂"]],
  },
  {
    item: "tent", member: "yossi", start: 6, end: 9, state: "pending", startedDaysAgo: 1,
    before: [
      ["m", "היי דנה, אנחנו נוסעים לכנרת בבין הזמנים. האוהל נכנס לרכב רגיל?"],
      ["o", "כן, הוא מתקפל לתיק בגודל של מזוודה בינונית"],
      ["m", "אז שולח בקשה, תודה!"],
    ],
    unreadFor: "o",
  },
  {
    item: "coffee", member: "dana", start: 2, end: 4, state: "pending", startedDaysAgo: 1,
    before: [["m", "מיכל, אפשר את מכונת האספרסו לבראנץ' ביום שישי?"]],
  },
  { item: "saw", member: "shira", start: 10, end: 11, state: "pending", startedDaysAgo: 0 },
  {
    item: "suitcase", member: "david", start: -5, end: 2, state: "rejected", startedDaysAgo: 8,
    after: [["o", "מצטערת דוד, אני טסה בדיוק באותם תאריכים 🙁"], ["m", "אין בעיה, בהצלחה!"]],
  },
  { item: "table", member: "michal", start: 3, end: 3, quantity: 1, state: "cancelled", startedDaysAgo: 3 },
  {
    item: "urn", member: "noa", startedDaysAgo: 0,
    before: [["m", "היי רחל, המיחם מתאים גם לשבת? יש בו מצב שמירת חום?"]],
    unreadFor: "o",
  },
];

// ---------------------------------------------------------------------------

function israelToday(): Date {
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
  return new Date(`${iso}T00:00:00Z`);
}

function dateOffset(days: number): string {
  return new Date(israelToday().getTime() + days * DAY).toISOString().slice(0, 10);
}

async function must<T>(label: string, run: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await run;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function memberIdByEmail(email: string): Promise<string | null> {
  const row = await must("find user", supabase.from("users").select("id").eq("email", email).maybeSingle());
  return (row as { id: string } | null)?.id ?? null;
}

async function remove(): Promise<void> {
  for (const member of Object.values(MEMBERS)) {
    const id = await memberIdByEmail(member.email);
    if (!id) continue;

    // Pictures are files, not rows: remove them from both buckets first.
    const { data: folders } = await supabase.storage.from("item-images").list(id);
    for (const folder of folders ?? []) {
      const { data: files } = await supabase.storage.from("item-images").list(`${id}/${folder.name}`);
      const paths = (files ?? []).map((file) => `${id}/${folder.name}/${file.name}`);
      if (paths.length) await supabase.storage.from("item-images").remove(paths);
    }

    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) throw new Error(`${member.email}: ${error.message}`);
    console.log(`removed ${member.email}`);
  }
  console.log("Demo data removed.");
}

async function seed(): Promise<void> {
  const seedStart = new Date().toISOString();
  const userPassword = requireEnv("DEMO_USER_PASSWORD");
  const adminPassword = requireEnv("DEMO_ADMIN_PASSWORD");

  const areaRows = (await must("areas", supabase.from("areas").select("name").order("sort_order").order("name"))) as { name: string }[];
  if (areaRows.length === 0) throw new Error("No areas defined. Add at least one in the admin panel.");
  const areaOf = (key: MemberKey) => areaRows[MEMBERS[key].area % areaRows.length].name;

  // 1. Members --------------------------------------------------------------
  const ids = {} as Record<MemberKey, string>;
  for (const [key, member] of Object.entries(MEMBERS) as [MemberKey, (typeof MEMBERS)[MemberKey]][]) {
    let id = await memberIdByEmail(member.email);
    if (id) {
      const { count } = await supabase
        .from("items").select("id", { count: "exact", head: true }).eq("owner_id", id);
      if (count) {
        throw new Error(`${member.email} already has items. Run with --remove first to start over.`);
      }
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: member.email,
        password: member.password === "admin" ? adminPassword : userPassword,
        email_confirm: true,
        user_metadata: { full_name: member.name, residence_area: areaOf(key) },
      });
      if (error || !data.user) throw new Error(`${member.email}: ${error?.message}`);
      id = data.user.id;
    }
    ids[key] = id;
    const joined = new Date(Date.now() - (70 - Object.keys(ids).length * 4) * DAY).toISOString();
    await must("approve member", supabase.from("users").update({
      full_name: member.name,
      residence_area: areaOf(key),
      status: member.pending ? "pending" : "approved",
      role: member.role ?? "regular",
      created_at: member.pending ? new Date(Date.now() - 3 * 3_600_000).toISOString() : joined,
    }).eq("id", id));
  }
  console.log(`members: ${Object.keys(ids).length}`);

  // 2. Categories --------------------------------------------------------------
  const categoryIds: Record<string, string> = {};
  for (const [name, icon] of Object.entries(CATEGORIES)) {
    const existing = await must("category", supabase.from("categories").select("id").eq("name", name).maybeSingle());
    if (existing) {
      categoryIds[name] = (existing as { id: string }).id;
    } else {
      const created = await must("create category", supabase.from("categories").insert({ name, icon }).select("id").single());
      categoryIds[name] = (created as { id: string }).id;
    }
  }

  // 3. Items with photos ----------------------------------------------------
  const itemIds: Record<string, string> = {};
  let photos = 0;
  for (const item of ITEMS) {
    const created = await must("item", supabase.from("items").insert({
      owner_id: ids[item.owner],
      name: item.name,
      description: item.description,
      category_id: categoryIds[item.category],
      condition_rating: item.condition,
      total_quantity: item.quantity ?? 1,
      available_quantity: item.quantity ?? 1,
      deposit_amount: item.deposit,
      area: areaOf(item.owner),
      approval_status: item.pending ? "pending" : "approved",
      created_at: new Date(Date.now() - item.daysAgo * DAY).toISOString(),
    }).select("id").single());
    const itemId = (created as { id: string }).id;
    itemIds[item.key] = itemId;

    const file = join(IMAGE_DIR, `${item.key}.jpg`);
    if (existsSync(file)) {
      const path = `${ids[item.owner]}/${itemId}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from("item-images")
        .upload(path, readFileSync(file), { contentType: "image/jpeg", upsert: false });
      if (error) throw new Error(`photo ${item.key}: ${error.message}`);
      await must("image row", supabase.from("item_images").insert({ item_id: itemId, storage_path: path, sort_order: 0 }));
      photos += 1;
    }
  }
  console.log(`items: ${ITEMS.length} (${photos} with photos)`);

  // 4. Requests, loans and chats ---------------------------------------------
  const conversationTimeline: { conversationId: string; startedDaysAgo: number; unreadFor?: "m" | "o" }[] = [];

  for (const scenario of SCENARIOS) {
    const item = ITEMS.find((entry) => entry.key === scenario.item)!;
    const itemId = itemIds[item.key];
    const memberId = ids[scenario.member];
    const ownerId = ids[item.owner];

    const conversation = await must("conversation", supabase.from("conversations").upsert(
      { item_id: itemId, owner_id: ownerId, member_id: memberId },
      { onConflict: "item_id,member_id" },
    ).select("id").single());
    const conversationId = (conversation as { id: string }).id;
    conversationTimeline.push({ conversationId, startedDaysAgo: scenario.startedDaysAgo, unreadFor: scenario.unreadFor });

    const say = async (lines: Line[] | undefined) => {
      for (const [who, body] of lines ?? []) {
        await must("message", supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: who === "m" ? memberId : ownerId,
          kind: "text",
          body,
        }));
      }
    };

    await say(scenario.before);
    if (!scenario.state) continue;

    const quantity = scenario.quantity ?? 1;
    // Each step is its own write, so the database triggers add the automatic
    // chat messages and notifications exactly as they would for real users.
    const request = await must("request", supabase.from("borrow_requests").insert({
      item_id: itemId,
      requester_id: memberId,
      start_date: dateOffset(scenario.start!),
      end_date: dateOffset(scenario.end!),
      requested_quantity: quantity,
      status: "pending",
      created_at: new Date(Date.now() - scenario.startedDaysAgo * DAY).toISOString(),
    }).select("id").single());
    const requestId = (request as { id: string }).id;

    if (scenario.state === "pending") {
      await say(scenario.after);
      continue;
    }
    if (scenario.state === "rejected" || scenario.state === "cancelled") {
      await must("decide", supabase.from("borrow_requests").update({ status: scenario.state }).eq("id", requestId));
      await say(scenario.after);
      continue;
    }

    await must("approve", supabase.from("borrow_requests").update({ status: "approved" }).eq("id", requestId));
    const loan = await must("loan", supabase.from("loans").insert({
      borrow_request_id: requestId,
      status: "active",
      deposit_received: scenario.deposit ?? false,
    }).select("id").single());
    const loanId = (loan as { id: string }).id;

    const lines = scenario.after ?? [];
    // The first reply comes right after the approval; the rest of the chat
    // follows the later steps of the loan (late, returned, closed).
    const ongoing = scenario.state === "active" ? lines.length : 1;
    await say(lines.slice(0, ongoing));

    if (scenario.state === "late") {
      await must("late", supabase.from("loans").update({ status: "late" }).eq("id", loanId));
    }
    if (scenario.state === "returned" || scenario.state === "completed") {
      await must("returned", supabase.from("loans").update({
        status: "returned_pending_confirmation",
        actual_return_date: dateOffset(scenario.end!),
      }).eq("id", loanId));
    }
    if (scenario.state === "completed") {
      await must("completed", supabase.from("loans").update({ status: "completed" }).eq("id", loanId));
    }
    await say(lines.slice(ongoing));

    // Stock follows the loan: units are out until the owner confirms the return.
    if (scenario.state !== "completed") {
      const row = await must("stock", supabase.from("items").select("available_quantity").eq("id", itemId).single());
      await must("stock update", supabase.from("items").update({
        available_quantity: Math.max(0, (row as { available_quantity: number }).available_quantity - quantity),
      }).eq("id", itemId));
    }
  }

  // 5. Spread the chat over realistic times -----------------------------------
  // Everything above was written a moment ago; give each conversation its own
  // history, a few minutes to a few hours between messages.
  for (const { conversationId, startedDaysAgo, unreadFor } of conversationTimeline) {
    const messages = (await must("messages", supabase
      .from("messages").select("id, sender_id").eq("conversation_id", conversationId)
      .order("created_at").order("id"))) as { id: string; sender_id: string | null }[];
    if (messages.length === 0) continue;

    let at = Date.now() - startedDaysAgo * DAY - 2 * 3_600_000 + 9 * 3_600_000 * Math.random();
    at = Math.min(at, Date.now() - messages.length * 100 * 60_000);
    let last = at;
    for (const message of messages) {
      last = at;
      await must("retime", supabase.from("messages").update({ created_at: new Date(at).toISOString() }).eq("id", message.id));
      at += (6 + Math.random() * 90) * 60_000;
    }
    // Read up to just after the last message, or just before it for the side
    // that should find it waiting.
    const readAt = new Date(last + 60_000).toISOString();
    const unreadAt = new Date(last - 60_000).toISOString();
    await must("conversation times", supabase.from("conversations").update({
      last_message_at: new Date(last).toISOString(),
      owner_last_read_at: unreadFor === "o" ? unreadAt : readAt,
      member_last_read_at: unreadFor === "m" ? unreadAt : readAt,
    }).eq("id", conversationId));
  }

  // 6. Reports -------------------------------------------------------------------
  const report = (reporter: MemberKey, target: { item?: string; user?: MemberKey }, reason: string, details: string, status = "open", note?: string) => ({
    reporter_id: ids[reporter],
    target_type: target.item ? "item" : "user",
    item_id: target.item ? itemIds[target.item] : null,
    reported_user_id: target.item ? ids[ITEMS.find((i) => i.key === target.item)!.owner] : ids[target.user!],
    target_label: target.item ? ITEMS.find((i) => i.key === target.item)!.name : MEMBERS[target.user!].name,
    reason,
    details,
    status,
    admin_note: note ?? null,
    handled_by: status === "open" ? null : ids.rachel,
    handled_at: status === "open" ? null : new Date(Date.now() - 2 * DAY).toISOString(),
  });
  await must("reports", supabase.from("reports").insert([
    report("rachel", { user: "avi" }, "not_returned", "הסולם היה אמור לחזור לפני ארבעה ימים. שלחתי הודעה בצ'אט וקיבלתי הבטחה, אבל עדיין לא חזר."),
    report("david", { item: "washer" }, "damaged", "הצינור דולף בחיבור למכונה, כדאי לבדוק לפני ההשאלה הבאה."),
    report("noa", { item: "chairs" }, "misleading", "בתיאור כתוב ארבעה כיסאות, אבל באחד מהם הרצועה קרועה. לא נורא, רק כדאי לעדכן.", "resolved", "דיברתי עם עומר, התיאור עודכן."),
  ]));

  // 7. Notifications ------------------------------------------------------------
  // The triggers wrote them all "now". Spread them back in time, keep the most
  // recent few unread so the bell has something to show, and drop the
  // "new member waiting" notices for members this script approved itself.
  const seededIds = Object.values(ids);
  await must("tidy notifications", supabase.from("notifications").delete()
    .eq("type", "user_pending").in("related_id", seededIds.filter((id) => id !== ids.tamar)));
  const notifications = (await must("notifications", supabase
    .from("notifications").select("id, user_id").gte("created_at", seedStart)
    .order("created_at", { ascending: false }))) as { id: string; user_id: string }[];
  const perUser = new Map<string, number>();
  for (const notification of notifications) {
    const rank = perUser.get(notification.user_id) ?? 0;
    perUser.set(notification.user_id, rank + 1);
    const at = Date.now() - rank * (8 + Math.random() * 30) * 3_600_000;
    await must("notification time", supabase.from("notifications").update({
      created_at: new Date(at).toISOString(),
      read_at: rank < 3 ? null : new Date(at + 3_600_000).toISOString(),
    }).eq("id", notification.id));
  }

  console.log(`conversations: ${conversationTimeline.length}, reports: 3, notifications: ${notifications.length}`);
  console.log("\nDemo accounts:");
  console.log(`  member: ${MEMBERS.dana.email}   (password: DEMO_USER_PASSWORD)`);
  console.log(`  admin:  ${MEMBERS.rachel.email}  (password: DEMO_ADMIN_PASSWORD)`);
  console.log("Remove everything after the presentation with --remove.");
}

(process.argv.includes("--remove") ? remove() : seed()).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
