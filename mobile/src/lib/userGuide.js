// Content for screens/settings/UserGuide.tsx. Two independent axes: which
// role's guide to show (decided automatically from useAuth(), not a user
// choice) and which language to read it in (a user choice, persisted via
// SecureStore the same way theme/notification preference are). Kept as
// plain data rather than JSX so both languages stay easy to scan/edit
// side by side without touching any component code.
export const GUIDE_CONTENT = {
  manager: {
    en: {
      tabs: [
        {
          icon: "grid",
          title: "Overview",
          location: 'bottom tab: "Overview"',
          items: [
            {
              title: "Overview",
              chip: "segment",
              body: "Your dashboard: team size, how many checked in today, how many are on leave, how many haven't checked in. Search for one employee's attendance today.",
            },
            {
              title: "Team",
              chip: "segment",
              body: 'Tap "Add employee" to bring someone new onto the team — first/last name, email, temporary password, hourly rate, currency, payout cycle, department, designation, branch. Give them the email and temporary password to log in the first time; they can change the password themselves after.',
            },
            {
              title: "Team — Moderator access",
              body: "If someone is a Moderator, switch on the three things they can't do by default here: adding employees, managing the QR/geofence, and managing the subscription.",
            },
            {
              title: "Approvals",
              chip: "segment",
              body: '"Approve" / "Reject" on three lists: Leave approvals (with any attached document), Pay adjustment requests (grant full, part, or none), and Shift swap approvals (moves the shift to the new person for good).',
            },
          ],
        },
        {
          icon: "calendar",
          title: "Roster",
          location: 'bottom tab: "Roster"',
          items: [
            { title: "Assign a shift", body: "Pick an employee, a date, and a shift — this is how you build the week's schedule." },
            { title: "Shifts", body: 'Create shift templates you assign from above (e.g. "Morning, 9:00–17:00"). Edit or delete with the pencil/trash icons.' },
            { title: "Branches", chip: "+ New branch", body: "If you run more than one location, add each one — every branch gets its own check-in QR and geofence." },
            { title: "Leave types", body: "Set up categories employees can request against (Casual, Sick, ...) and how many days per year each allows." },
            { title: "Branch check-in QR & geofence", chip: "Show live QR", body: "Display this at the counter — the code refreshes every 30 seconds by itself. Optionally set a geofence radius so check-in only works near the branch." },
          ],
        },
        {
          icon: "wallet",
          title: "Payroll & Wallets",
          location: 'bottom tab: "Payroll & Wallets"',
          items: [
            { title: "Total payable now", chip: "Pay Now", body: "Pays everyone's full current balance immediately, regardless of their individual payout cycle — charged to your saved card." },
            { title: "Pending cash-out requests", body: "Employees without a bank payout set up can ask to be paid in cash — approve or decline each request." },
            { title: "Pay [employee] in cash", body: "You don't have to wait for a request — hand anyone cash whenever you want, then confirm it so their wallet reflects it." },
            { title: "Export for accounting", chip: "CSV / PDF", body: "Pick a date range and download gross pay per employee — hours, rate, total earned." },
          ],
        },
        {
          icon: "trending",
          title: "Reports",
          location: 'bottom tab: "Reports"',
          items: [
            { title: "Attendance & timesheet exports", body: "Choose a date range and export attendance as CSV, PDF, or Excel — for your books or an accountant." },
          ],
        },
      ],
    },
    bn: {
      tabs: [
        {
          icon: "grid",
          title: "Overview",
          location: 'নিচের ট্যাব: "Overview"',
          items: [
            {
              title: "Overview",
              chip: "segment",
              body: "তোমার ড্যাশবোর্ড: মোট কর্মী কতজন, আজ কতজন check-in করেছে, কতজন ছুটিতে, কতজন এখনো check-in করেনি। একজন কর্মীর আজকের হাজিরা খুঁজতে search ব্যবহার করো।",
            },
            {
              title: "Team",
              chip: "segment",
              body: 'নতুন কর্মী যোগ করতে "Add employee"-তে ট্যাপ করো — নাম, ইমেইল, temporary password, ঘণ্টা-প্রতি বেতন, মুদ্রা, payout cycle, department, designation, branch। ইমেইল আর temporary password তাকে দিয়ে দাও, প্রথমবার এই দিয়েই লগইন করবে — পরে সে নিজেই password বদলে নিতে পারবে।',
            },
            {
              title: "Team — Moderator access",
              body: "কেউ Moderator হলে, ডিফল্টে সে যে তিনটা কাজ করতে পারে না — কর্মী যোগ করা, QR/geofence ম্যানেজ করা, subscription ম্যানেজ করা — সেগুলো এখান থেকে চালু করে দিতে পারো।",
            },
            {
              title: "Approvals",
              chip: "segment",
              body: 'তিনটা লিস্টে "Approve" / "Reject": Leave approvals (attachment থাকলে দেখা যাবে), Pay adjustment requests (পুরো/অর্ধেক/শূন্য টাকা দিতে পারো), Shift swap approvals (approve করলে shift-টা স্থায়ীভাবে নতুন মানুষের নামে চলে যায়)।',
            },
          ],
        },
        {
          icon: "calendar",
          title: "Roster",
          location: 'নিচের ট্যাব: "Roster"',
          items: [
            { title: "Assign a shift", body: "একজন কর্মী, একটা তারিখ, আর একটা shift বেছে নাও — এভাবেই সপ্তাহের রোস্টার বানাও।" },
            { title: "Shifts", body: 'উপরের জন্য shift টেমপ্লেট বানাও (যেমন "Morning, 9:00–17:00")। pencil/trash icon দিয়ে edit বা delete করা যায়।' },
            { title: "Branches", chip: "+ New branch", body: "একাধিক শাখা থাকলে প্রতিটা এখানে যোগ করো — প্রতিটা শাখার নিজস্ব check-in QR আর geofence থাকবে।" },
            { title: "Leave types", body: "কর্মীরা যে ধরনের ছুটি চাইতে পারবে তার category বানাও (Casual, Sick...) আর বছরে কতদিন করে সেটাও ঠিক করো।" },
            { title: "Branch check-in QR & geofence", chip: "Show live QR", body: "কাউন্টারে এটা দেখিয়ে রাখো — কোড নিজে থেকেই প্রতি ৩০ সেকেন্ডে বদলায়। চাইলে geofence radius সেট করে দাও, তাহলে শাখার কাছে থাকলেই শুধু check-in কাজ করবে।" },
          ],
        },
        {
          icon: "wallet",
          title: "Payroll & Wallets",
          location: 'নিচের ট্যাব: "Payroll & Wallets"',
          items: [
            { title: "Total payable now", chip: "Pay Now", body: "সবার payout cycle যাই হোক না কেন, সবার পুরো বকেয়া টাকা এখনই দিয়ে দেয় — তোমার সেভ করা কার্ড থেকে কাটবে।" },
            { title: "Pending cash-out requests", body: "যাদের ব্যাংক payout সেট করা নেই, তারা নগদ চাইলে সেই request এখানে approve/decline করো।" },
            { title: "Pay [employee] in cash", body: "Request-এর জন্য অপেক্ষা করতে হয় না — যখন ইচ্ছা নগদ দিয়ে দাও, পরে এখানে confirm করে দাও যাতে তার wallet-এ যোগ হয়।" },
            { title: "Export for accounting", chip: "CSV / PDF", body: "একটা তারিখের রেঞ্জ বেছে প্রতিটা কর্মীর ঘণ্টা, রেট, মোট আয় download করো — হিসাব রাখার জন্য বা accountant-কে দেওয়ার জন্য।" },
          ],
        },
        {
          icon: "trending",
          title: "Reports",
          location: 'নিচের ট্যাব: "Reports"',
          items: [
            { title: "Attendance & timesheet exports", body: "তারিখের রেঞ্জ বেছে হাজিরার হিসাব CSV, PDF, বা Excel-এ export করো।" },
          ],
        },
      ],
    },
  },

  employee: {
    en: {
      tabs: [
        {
          icon: "clock",
          title: "Today",
          location: 'bottom tab: "Today"',
          items: [
            { title: "The ring", chip: "Tap to check in", body: 'Opens the scanner ("Scan to check in") — point your camera at the QR code your manager has displayed. Your location may be checked too, if your manager has geofencing on.' },
            { title: "Same ring, later", chip: "Tap to check out", body: 'Opens "Scan to check out" — scan the same way to end your shift. Worked hours and earnings are calculated the moment you check out.' },
          ],
        },
        {
          icon: "calendar",
          title: "My shifts",
          location: 'bottom tab: "My shifts"',
          items: [
            { title: "This week", body: "Your seven-day strip — today's card is outlined so you can spot it at a glance." },
            { title: "Swap", body: "On any upcoming shift, request a swap — pick a teammate or leave it open for anyone. Once accepted and your manager approves, the shift moves to them." },
            { title: "Weekly availability", chip: "Save availability", body: "Toggle which days you're usually free and set your hours — advisory only, helps your manager avoid scheduling you when you're not free." },
          ],
        },
        {
          icon: "file",
          title: "Leave",
          location: 'bottom tab: "Leave"',
          items: [
            { title: "Request leave", chip: "Submit request", body: "Pick a leave type, your dates, and optionally attach a document. Your remaining balance for that leave type shows right in the form." },
          ],
        },
        {
          icon: "wallet",
          title: "Wallet",
          location: 'bottom tab: "Wallet"',
          items: [
            { title: "Current balance", body: "What you're owed right now — counts up when it changes rather than snapping to the new number." },
            { title: "Request payout", body: "Ask to be paid in cash if you don't have a bank payout set up — your manager confirms handing it over, you confirm receiving it." },
            { title: "Overtime & shortfall claims", body: "Worked extra hours outside your schedule? Submit a claim describing it — your manager can grant it fully, partly, or not at all." },
          ],
        },
      ],
    },
    bn: {
      tabs: [
        {
          icon: "clock",
          title: "Today",
          location: 'নিচের ট্যাব: "Today"',
          items: [
            { title: "রিং-টা", chip: "Tap to check in", body: 'ট্যাপ করলে scanner খুলবে ("Scan to check in") — ম্যানেজারের দেখানো QR কোডের দিকে ক্যামেরা ধরো। ম্যানেজার geofence চালু রাখলে তোমার location-ও চেক হবে।' },
            { title: "একই রিং, পরে", chip: "Tap to check out", body: '"Scan to check out" খুলবে — একইভাবে scan করে shift শেষ করো। check-out করার সাথে সাথেই worked hours আর earnings হিসাব হয়ে যায়।' },
          ],
        },
        {
          icon: "calendar",
          title: "My shifts",
          location: 'নিচের ট্যাব: "My shifts"',
          items: [
            { title: "This week", body: "সাত দিনের strip — আজকের card-টা border দিয়ে আলাদা করা, চোখে সহজে পড়ে।" },
            { title: "Swap", body: "যেকোনো আসন্ন shift-এ swap request করতে পারো — নির্দিষ্ট কাউকে বা যে কেউ নিতে পারবে এভাবে। কেউ রাজি হয়ে ম্যানেজার approve করলে shift তার নামে চলে যায়।" },
            { title: "Weekly availability", chip: "Save availability", body: "কোন দিন সাধারণত ফ্রি থাকো সেটা টগল করে সময়সহ জানিয়ে রাখো — এটা বাধ্যতামূলক কিছু আটকায় না, শুধু ম্যানেজারকে ভুল দিনে shift দেওয়া এড়াতে সাহায্য করে।" },
          ],
        },
        {
          icon: "file",
          title: "Leave",
          location: 'নিচের ট্যাব: "Leave"',
          items: [
            { title: "Request leave", chip: "Submit request", body: "ছুটির ধরন, তারিখ বেছে নাও, চাইলে একটা document জুড়ে দাও। সেই ছুটির বাকি কতদিন আছে সেটা form-এই দেখা যায়।" },
          ],
        },
        {
          icon: "wallet",
          title: "Wallet",
          location: 'নিচের ট্যাব: "Wallet"',
          items: [
            { title: "Current balance", body: "এখন কত টাকা পাওনা — সংখ্যাটা বদলালে হঠাৎ না বদলে গুনে গুনে ওঠে।" },
            { title: "Request payout", body: "ব্যাংক payout সেট করা না থাকলে নগদ চাইতে পারো — ম্যানেজার দেওয়ার পর confirm করবে, তুমিও পাওয়ার পর confirm করবে।" },
            { title: "Overtime & shortfall claims", body: "শিডিউলের বাইরে বাড়তি কাজ করলে, বর্ণনাসহ claim জমা দাও — ম্যানেজার পুরো, অর্ধেক, বা শূন্য টাকা দিতে পারেন।" },
          ],
        },
      ],
    },
  },
};

export const ACCOUNT_SECTION = {
  en: {
    title: "Your account",
    location: "tap your profile picture, top right, on any tab",
    items: [
      { title: "Profile", body: "Edit your name, phone, address, and photo; change your password; delete your account." },
      { title: "Settings", body: "Night mode switch, and Notifications — turn push alerts on/off and browse your notification history." },
      { title: "Privacy policy · Help center · Logout", body: "Legal info, FAQs and a support email, and signing out." },
    ],
  },
  bn: {
    title: "তোমার অ্যাকাউন্ট",
    location: "যেকোনো ট্যাবে উপরে ডানদিকে তোমার ছবিতে ট্যাপ করো",
    items: [
      { title: "Profile", body: "নাম, ফোন, ঠিকানা, ছবি বদলাও; password বদলাও; account delete করো।" },
      { title: "Settings", body: "Night mode চালু/বন্ধ, আর Notifications — push alert চালু/বন্ধ করো, notification-এর পুরোনো history দেখো।" },
      { title: "Privacy policy · Help center · Logout", body: "নিয়ম-নীতি, প্রশ্নোত্তর আর সাহায্যের ইমেইল, আর লগআউট।" },
    ],
  },
};
