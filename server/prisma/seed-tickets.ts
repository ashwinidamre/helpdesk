import { PrismaClient, TicketCategory, TicketStatus } from "@prisma/client";

const db = new PrismaClient();

const SENDERS = [
  { name: "Ava Thompson", email: "ava.thompson@example.com" },
  { name: "Liam Chen", email: "liam.chen@example.com" },
  { name: "Sophia Martinez", email: "sophia.martinez@example.com" },
  { name: "Noah Patel", email: "noah.patel@example.com" },
  { name: "Isabella Nguyen", email: "isabella.nguyen@example.com" },
  { name: "Mason Rodriguez", email: "mason.rodriguez@example.com" },
  { name: "Mia Johnson", email: "mia.johnson@example.com" },
  { name: "Ethan Kim", email: "ethan.kim@example.com" },
  { name: "Amelia Davis", email: "amelia.davis@example.com" },
  { name: "Lucas Anderson", email: "lucas.anderson@example.com" },
  { name: "Harper Wilson", email: "harper.wilson@example.com" },
  { name: "Benjamin Clark", email: "benjamin.clark@example.com" },
  { name: "Evelyn Lewis", email: "evelyn.lewis@example.com" },
  { name: "James Walker", email: "james.walker@example.com" },
  { name: "Charlotte Hall", email: "charlotte.hall@example.com" },
  { name: "Alexander Young", email: "alexander.young@example.com" },
  { name: "Amelia Wright", email: "amelia.wright@example.com" },
  { name: "Daniel Scott", email: "daniel.scott@example.com" },
  { name: "Grace Turner", email: "grace.turner@example.com" },
  { name: "Henry Baker", email: "henry.baker@example.com" },
];

const TICKET_TEMPLATES: Record<TicketCategory, { subject: string; body: string }[]> = {
  GENERAL_QUESTION: [
    { subject: "How do I reset my password?", body: "I forgot my password and the reset email never arrived. Can you help me regain access to my account?" },
    { subject: "Where can I update my billing address?", body: "I moved recently and need to update the billing address on my account. I can't find the setting for it." },
    { subject: "How do I change my account email?", body: "I'd like to switch my account over to a new email address. What's the process for that?" },
    { subject: "Do you offer a student discount?", body: "I'm a full-time student — is there a discounted plan available, and how do I apply for it?" },
    { subject: "What are your support hours?", body: "I want to know when your support team is available in case I run into an issue outside business hours." },
    { subject: "How do I download my invoice history?", body: "I need all of last year's invoices for expense reporting. Where can I export them?" },
    { subject: "Can I have multiple users on one account?", body: "My team would like to share a single subscription. Is that possible, and how many seats are included?" },
    { subject: "How do I close my account?", body: "I no longer need the service and would like to fully close my account. What steps do I need to take?" },
    { subject: "Is there a mobile app available?", body: "I mostly use my phone — do you have an iOS or Android app, or is this web-only?" },
    { subject: "How do I change my subscription plan?", body: "I'd like to move from the basic plan to the pro plan. Will I be charged a prorated amount?" },
    { subject: "Can I pause my subscription temporarily?", body: "I'll be traveling for two months and won't need the service. Is pausing an option instead of cancelling?" },
    { subject: "Where do I find my account settings?", body: "I can't seem to locate the settings page from the dashboard. Could you point me in the right direction?" },
    { subject: "How do I add a second email for notifications?", body: "I'd like notifications to also go to my work email in addition to my personal one." },
    { subject: "What happens to my data if I cancel?", body: "Before I decide whether to cancel, I want to know how long my data is retained afterward." },
    { subject: "How do I update my payment method?", body: "My card on file expired and I need to add a new one before my next billing cycle." },
  ],
  TECHNICAL_QUESTION: [
    { subject: "Getting a 500 error when I try to log in", body: "Every time I submit the login form I get a server error page. This started happening yesterday." },
    { subject: "Dashboard is stuck on a loading spinner", body: "The dashboard never finishes loading — it just spins indefinitely. I've tried refreshing several times." },
    { subject: "File uploads keep failing", body: "Whenever I try to upload a CSV file larger than 5MB, the upload fails with no error message." },
    { subject: "Two-factor authentication codes aren't arriving", body: "I enabled 2FA but the SMS codes never come through, so I can't finish logging in." },
    { subject: "API requests are returning 401 unexpectedly", body: "My integration was working fine last week but now every API call returns a 401 even though my token hasn't changed." },
    { subject: "Search feature returns no results", body: "Searching for tickets by keyword returns an empty list even for terms I know exist in the data." },
    { subject: "Page crashes when exporting a report", body: "Clicking 'Export to PDF' on the analytics page causes the browser tab to freeze and crash." },
    { subject: "Notifications are duplicated", body: "I'm receiving the same email notification three or four times for a single event." },
    { subject: "Cannot connect my calendar integration", body: "The 'Connect Google Calendar' button redirects me to an error page instead of the OAuth consent screen." },
    { subject: "Data isn't syncing between devices", body: "Changes I make on desktop don't show up on the mobile app until much later, if at all." },
    { subject: "Webhook deliveries are timing out", body: "Our endpoint is healthy, but your webhook sender reports timeouts and stops retrying after a few attempts." },
    { subject: "Broken layout on Safari", body: "The settings page renders with overlapping text and buttons specifically in Safari on macOS." },
    { subject: "Session keeps expiring after a few minutes", body: "I'm logged out and redirected to the login page every couple of minutes, even while actively using the app." },
    { subject: "Bulk import tool silently drops rows", body: "When I import a spreadsheet of 500 records, only about 300 actually show up afterward with no error." },
    { subject: "Dark mode toggle does nothing", body: "Switching the theme setting to dark mode has no visible effect on the interface." },
  ],
  REFUND_QUESTION: [
    { subject: "Requesting a refund for accidental duplicate charge", body: "I was charged twice for this month's subscription and would like the duplicate charge refunded." },
    { subject: "Refund request — cancelled within trial period", body: "I cancelled during the free trial but was still billed. Can you process a refund?" },
    { subject: "Charged after I already cancelled my subscription", body: "I cancelled last month but was billed again this cycle. I'd like that charge reversed." },
    { subject: "Refund for annual plan — switching providers", body: "I paid for the annual plan upfront but need to switch providers. Can I get a prorated refund for the unused months?" },
    { subject: "Requesting refund due to service outage", body: "The service was down for most of last week and I wasn't able to use it. I'd like a partial refund for the downtime." },
    { subject: "Refund for upgrade I didn't intend to purchase", body: "I accidentally clicked upgrade to the premium tier and was charged the difference immediately. Can this be reversed?" },
    { subject: "Never received the product I ordered", body: "It's been three weeks since I placed my order and it still hasn't arrived. I'd like a full refund." },
    { subject: "Refund request — feature promised at signup is missing", body: "I signed up because of a feature listed on your pricing page that turns out isn't actually available. I'd like a refund." },
    { subject: "Double billed after updating my card", body: "After updating my payment method, I was charged on both the old and new card for the same period." },
    { subject: "Requesting refund — cancelled but charged early renewal", body: "My renewal date was supposed to be next month, but I was already charged. I had planned to cancel before then." },
    { subject: "Refund for a gift subscription that was never used", body: "I bought a subscription as a gift, but the recipient never activated it and now it's expired. Can I get a refund?" },
    { subject: "Overcharged compared to the advertised price", body: "The checkout page charged me more than the price shown on the pricing page. I'd like the difference refunded." },
    { subject: "Refund after downgrading mid-cycle", body: "I downgraded my plan partway through the billing cycle and expected a prorated refund, but haven't received one." },
    { subject: "Requesting refund for a failed onboarding experience", body: "I was unable to get the product working during setup and support couldn't resolve it, so I'd like a refund." },
    { subject: "Refund for annual renewal I forgot to cancel", body: "I meant to cancel before the annual renewal but forgot. Since I haven't used the service this cycle, could I get a refund?" },
  ],
};

async function main() {
  const categories = Object.keys(TICKET_TEMPLATES) as TicketCategory[];
  const statuses: TicketStatus[] = ["OPEN", "OPEN", "OPEN", "RESOLVED", "RESOLVED", "CLOSED"];
  const TOTAL = 100;

  const tickets = Array.from({ length: TOTAL }, (_, i) => {
    const category = categories[i % categories.length];
    const pool = TICKET_TEMPLATES[category];
    const template = pool[Math.floor(i / categories.length) % pool.length];
    const sender = SENDERS[i % SENDERS.length];
    const status = statuses[i % statuses.length];
    const createdAt = new Date(Date.now() - (TOTAL - i) * 6 * 60 * 60 * 1000);

    return {
      subject: template.subject,
      body: template.body,
      senderEmail: sender.email,
      senderName: sender.name,
      category,
      status,
      createdAt,
    };
  });

  await db.ticket.createMany({ data: tickets });
  console.log(`Seeded ${tickets.length} sample tickets`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
