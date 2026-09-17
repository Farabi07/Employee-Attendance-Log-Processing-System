// Content for screens/settings/UserGuide.tsx. Two independent axes: which
// role's guide to show (decided automatically from useAuth(), not a user
// choice) and which language to read it in (a user choice, persisted via
// SecureStore the same way theme/notification preference are). Kept as
// plain data rather than JSX so both languages stay easy to scan/edit
// side by side without touching any component code.
//
// Writing rule for `body`: a complete sentence or two a first-time,
// non-technical reader can act on without needing anything else explained
// first — not a terse feature label. `location` is a plain sentence
// ("You'll find this under the ... tab"), not a code-style path.
export const GUIDE_CONTENT = {
  manager: {
    en: {
      tabs: [
        {
          icon: "grid",
          title: "Overview",
          location: "You'll find this under the Overview tab at the bottom of the screen.",
          items: [
            {
              title: "Overview",
              chip: "first section",
              body: "This is your dashboard — a quick snapshot of the whole team: how many people you have, how many have checked in today, how many are on approved leave, and how many haven't checked in yet. If you're looking for one specific person, type their name in the search box to jump straight to their attendance for today.",
            },
            {
              title: "Team",
              chip: "second section",
              body: "This is where you bring a new person onto the team. Tap \"Add employee\" and fill in their name, email, an hourly rate, which currency they're paid in, how often they get paid, and (optionally) their department, job title, and branch. You'll also set a temporary password for them — give them that password and their email, and that's what they use to log in the first time. They can change it to something only they know once they're in.",
            },
            {
              title: "Team — giving a Moderator more access",
              body: "By default, a Moderator can do almost everything a Manager can — except add new employees, change the QR code or location settings, or manage your subscription. If you trust someone with one or more of those, you can switch them on individually for that person right here.",
            },
            {
              title: "Approvals",
              chip: "third section",
              body: "Anything waiting on your decision shows up here, in three lists. Leave approvals — review a request (and any document attached to it), then Approve or Reject. Pay adjustment requests — an employee's claim for extra hours; you choose to pay the full amount, part of it, or none. Shift swap approvals — a swap two employees have already agreed to between themselves; approving it makes it official and moves the shift to the new person permanently.",
            },
          ],
        },
        {
          icon: "calendar",
          title: "Roster",
          location: "You'll find this under the Roster tab at the bottom of the screen.",
          items: [
            { title: "Assign a shift", body: "This is how you build out the week's schedule: pick an employee, a date, and which shift they're working. Do this once for each person, each day they're working." },
            { title: "Shifts", body: "Before you can assign a shift, it needs to exist as a template — for example \"Morning, 9:00–17:00.\" Create as many as your business needs here, and edit or remove one anytime using the pencil and trash icons next to it." },
            { title: "Branches", chip: "+ New branch", body: "If your business has more than one location, add each one here. Every branch gets its own check-in QR code and its own location setting, so each location works independently." },
            { title: "Leave types", body: "Decide what kinds of leave your employees can request — for example \"Casual\" or \"Sick\" — and how many days per year each one comes with. This is what powers the leave balance employees see when they apply." },
            { title: "Branch check-in QR & geofence", chip: "Show live QR", body: "This is the code your employees scan to check in and out — put it on a tablet or screen at the counter. It changes on its own every 30 seconds, so a screenshot of it stops working almost immediately. You can also set a radius (in meters) around the branch — if you do, check-in only works when the employee's phone shows they're actually that close." },
          ],
        },
        {
          icon: "wallet",
          title: "Payroll & Wallets",
          location: "You'll find this under the Payroll & Wallets tab at the bottom of the screen.",
          items: [
            { title: "Total payable now", chip: "Pay Now", body: "This one number is everything currently owed to your whole team, added up. Tapping \"Pay Now\" pays everyone their full balance immediately — regardless of whether they're normally paid daily, weekly, or monthly — and charges your saved card for the total." },
            { title: "Pending cash-out requests", body: "If an employee doesn't have a bank payout set up, they can ask to be paid in cash instead. Their request shows up here for you to approve or decline." },
            { title: "Pay an employee in cash", body: "You don't have to wait for someone to ask. Any time you hand an employee cash yourself, come back here and confirm it — that's what makes their wallet reflect it correctly." },
            { title: "Export for accounting", chip: "CSV / PDF", body: "Pick a start and end date, and download exactly what an accountant needs: each employee's hours, their rate, and their total earnings for that period." },
          ],
        },
        {
          icon: "trending",
          title: "More — Reports & Business finance",
          location: "You'll find these tools under More at the bottom of the screen.",
          items: [
            { title: "Attendance & timesheet exports", body: "Open More, choose Reports, then pick any date range and export the full attendance record as CSV, PDF, or Excel." },
            { title: "Business finance & receipts", chip: "Upload receipt", body: "Open More and choose Business finance to review revenue, expenses, profit, and categories. Use Upload receipt to choose an image or scan it with your camera; review the extracted details before saving." },
            { title: "Payment gateway", body: "Your store country is selected during signup. Bangladesh stores use SSLCommerz; stores in other countries use Stripe. The payment provider is selected automatically from the store country." },
            { title: "Notices", body: "Send important store-wide announcements from Account > Send a notice. Employees receive them in the Notices section of the notification bell and can mark them as read." },
          ],
        },
      ],
    },
    bn: {
      tabs: [
        {
          icon: "grid",
          title: "Overview",
          location: "স্ক্রিনের নিচে Overview ট্যাবে গেলেই এটা পাবে।",
          items: [
            {
              title: "Overview",
              chip: "প্রথম অংশ",
              body: "এটা তোমার ড্যাশবোর্ড — পুরো টিমের একনজর হিসাব: মোট কতজন কর্মী, আজ কতজন check-in করেছে, কতজনের অনুমোদিত ছুটি চলছে, আর কতজন এখনো আসেনি। কোনো নির্দিষ্ট মানুষকে খুঁজতে হলে search বক্সে তার নাম লিখলেই তার আজকের হাজিরা সরাসরি চলে আসবে।",
            },
            {
              title: "Team",
              chip: "দ্বিতীয় অংশ",
              body: 'নতুন কেউ টিমে যোগ হলে এখান থেকেই শুরু। "Add employee"-তে ট্যাপ করে তার নাম, ইমেইল, ঘণ্টা-প্রতি বেতন, কোন মুদ্রায় বেতন পাবে, কত ঘন ঘন বেতন পাবে — এসব দিয়ে দাও, চাইলে department, পদবি, আর কোন শাখায় কাজ করবে সেটাও। একটা temporary password-ও দিতে হবে — এই password আর তার ইমেইল তাকে দিয়ে দাও, প্রথমবার এটা দিয়েই সে লগইন করবে। পরে সে নিজে থেকেই এমন একটা password বসিয়ে নিতে পারবে যেটা শুধু সে-ই জানে।',
            },
            {
              title: "Team — Moderator-কে বেশি ক্ষমতা দেওয়া",
              body: "ডিফল্টভাবে একজন Moderator প্রায় সবকিছুই করতে পারে যা একজন Manager পারে — শুধু নতুন কর্মী যোগ করা, QR কোড বা location-সেটিংস বদলানো, আর subscription ম্যানেজ করা বাদে। এর কোনোটা কাউকে ভরসা করে দিতে চাইলে, এখান থেকে তার জন্য আলাদা করে সেটা চালু করে দিতে পারো।",
            },
            {
              title: "Approvals",
              chip: "তৃতীয় অংশ",
              body: "তোমার সিদ্ধান্তের অপেক্ষায় থাকা সবকিছু এখানে, তিনটা লিস্টে দেখা যায়। Leave approvals — request-টা দেখো (কোনো document জুড়ে থাকলে সেটাও), তারপর Approve বা Reject করো। Pay adjustment requests — কোনো কর্মীর বাড়তি কাজের দাবি; তুমি ঠিক করবে পুরো টাকা দেবে, অর্ধেক দেবে, নাকি দেবে না। Shift swap approvals — দুইজন কর্মী নিজেরাই আগে রাজি হয়ে গেছে এমন একটা shift-বদল; তুমি approve করলেই সেটা স্থায়ীভাবে নতুন মানুষের নামে হয়ে যায়।",
            },
          ],
        },
        {
          icon: "calendar",
          title: "Roster",
          location: "স্ক্রিনের নিচে Roster ট্যাবে গেলেই এটা পাবে।",
          items: [
            { title: "Assign a shift", body: "সপ্তাহের পুরো সূচি এভাবেই বানাও — একজন কর্মী, একটা তারিখ, আর একটা shift বেছে নাও। যে কর্মীর যেদিন ডিউটি, সেই দিনের জন্য একবার করে এটা করতে হবে।" },
            { title: "Shifts", body: 'কোনো shift assign করার আগে সেটা টেমপ্লেট হিসেবে থাকতে হবে — যেমন "Morning, 9:00–17:00"। তোমার দরকার অনুযায়ী যতগুলো ইচ্ছা এখানে বানাও, আর পাশের pencil/trash icon দিয়ে যেকোনো সময় edit বা মুছে ফেলো।' },
            { title: "Branches", chip: "+ New branch", body: "তোমার ব্যবসার একাধিক শাখা থাকলে প্রতিটা এখানে যোগ করো। প্রতিটা শাখা নিজের আলাদা check-in QR কোড আর নিজের location-সেটিংস পাবে, তাই প্রতিটা শাখা স্বাধীনভাবে কাজ করবে।" },
            { title: "Leave types", body: 'কর্মীরা কোন কোন ধরনের ছুটি চাইতে পারবে সেটা ঠিক করো — যেমন "Casual" বা "Sick" — আর বছরে কতদিন করে পাবে সেটাও। কর্মীরা ছুটি চাওয়ার সময় যে "বাকি কতদিন আছে" দেখে, সেটা এখান থেকেই আসে।' },
            { title: "Branch check-in QR & geofence", chip: "Show live QR", body: "কর্মীরা check-in/check-out করার জন্য এই কোডটাই scan করে — একটা ট্যাবলেট বা স্ক্রিনে কাউন্টারে রেখে দাও। এটা নিজে থেকেই প্রতি ৩০ সেকেন্ডে বদলে যায়, তাই এর একটা screenshot প্রায় সাথে সাথেই অকেজো হয়ে যায়। চাইলে শাখার চারপাশে একটা radius (মিটারে) সেট করতে পারো — করলে, কর্মীর ফোন সত্যিই ওই কাছাকাছি আছে দেখালে তবেই check-in কাজ করবে।" },
          ],
        },
        {
          icon: "wallet",
          title: "Payroll & Wallets",
          location: "স্ক্রিনের নিচে Payroll & Wallets ট্যাবে গেলেই এটা পাবে।",
          items: [
            { title: "Total payable now", chip: "Pay Now", body: 'এই একটা সংখ্যাই তোমার পুরো টিমের এই মুহূর্তে মোট বকেয়া টাকা। "Pay Now"-তে ট্যাপ করলে সবার পুরো বকেয়া টাকা তখনই দিয়ে দেয় — কারো বেতন দৈনিক, সাপ্তাহিক, নাকি মাসিক তা বিবেচনা না করেই — আর মোট পরিমাণ তোমার সেভ করা কার্ড থেকে কেটে নেয়।' },
            { title: "Pending cash-out requests", body: "কোনো কর্মীর ব্যাংক payout সেট করা না থাকলে, সে নগদে পাওয়ার জন্য request পাঠাতে পারে — সেটা এখানে এসে জমা হয়, তুমি approve বা decline করতে পারো।" },
            { title: "Pay an employee in cash", body: "কারো request-এর জন্য অপেক্ষা করতে হবে এমন না। কখনো নিজে থেকে কাউকে নগদ দিলে, এখানে এসে সেটা confirm করে দাও — তাহলেই তার wallet-এ সঠিকভাবে যোগ হবে।" },
            { title: "Export for accounting", chip: "CSV / PDF", body: "শুরু আর শেষের তারিখ বেছে নাও, আর একটা accountant-এর যা দরকার ঠিক সেটাই download করো: প্রতিটা কর্মীর ঘণ্টা, রেট, আর ওই সময়ের মোট আয়।" },
          ],
        },
        {
          icon: "trending",
          title: "More — Reports ও Business finance",
          location: "স্ক্রিনের নিচে More ট্যাবের ভেতর এই toolগুলো পাবে।",
          items: [
            { title: "Attendance & timesheet exports", body: "More খুলে Reports বেছে নাও। তারপর date range দিয়ে attendance record CSV, PDF বা Excel হিসেবে export করো।" },
            { title: "Business finance ও receipt", chip: "Upload receipt", body: "More থেকে Business finance খুলে revenue, expense, profit আর category দেখো। Upload receipt চাপলে image upload বা camera scan বেছে নিতে পারবে; save করার আগে extracted তথ্য review করো।" },
            { title: "Payment gateway", body: "Signup-এর সময় store country বেছে নাও। Bangladesh হলে SSLCommerz, আর অন্য country হলে Stripe automatically ব্যবহার হবে।" },
            { title: "Notices", body: "Account > Send a notice থেকে পুরো store-এর জন্য announcement পাঠাও। Employee-রা notification bell-এর Notices অংশে সেটা পাবে এবং পড়া হিসেবে mark করতে পারবে।" },
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
          location: "You'll find this under the Today tab at the bottom of the screen.",
          items: [
            { title: "The ring, when you arrive", chip: "Tap to check in", body: "Tap the ring in the middle of the screen. It opens a scanner — point your camera at the QR code your manager has displayed at the counter. If your manager has location-checking turned on for your branch, your phone's location gets checked at the same moment, so make sure you're actually there." },
            { title: "The same ring, when you leave", chip: "Tap to check out", body: "Tap it again to open the scanner for checking out, and scan the same code the same way. The moment you do, the app works out exactly how many hours you worked and what you earned for the shift — no waiting." },
          ],
        },
        {
          icon: "calendar",
          title: "My shifts",
          location: "You'll find this under the My shifts tab at the bottom of the screen.",
          items: [
            { title: "This week", body: "A seven-day strip showing what you're working each day. Today's card has a border around it so it's easy to spot at a glance." },
            { title: "Swap", body: "Can't make an upcoming shift? Tap Swap on that day's card to ask a specific teammate to take it, or leave it open for anyone in the store to pick up. Once a colleague agrees and your manager gives the final okay, the shift is officially theirs." },
            { title: "Weekly availability", chip: "Save availability", body: "Turn on the days you're usually free, and set your normal hours for those days, then tap Save availability. This doesn't stop your manager from scheduling you on other days — it's just information that helps them avoid scheduling you when you've said you're not free." },
          ],
        },
        {
          icon: "file",
          title: "Leave",
          location: "You'll find this under the Leave tab at the bottom of the screen.",
          items: [
            { title: "Request leave", chip: "Submit request", body: "Choose which kind of leave you're requesting and the dates, and add a document if you have one to attach (like a doctor's note). Right in the form, you'll see how many days you have left for that leave type before you submit — no guessing." },
          ],
        },
        {
          icon: "wallet",
          title: "Wallet",
          location: "You'll find this under the Wallet tab at the bottom of the screen.",
          items: [
            { title: "Current balance", body: "The amount you're currently owed. When it changes, you'll see the number count up smoothly rather than jump — that's just a visual touch, the amount itself is always accurate." },
            { title: "Request payout", body: "If you don't have a bank payout set up, use this to ask to be paid in cash instead. Your manager confirms once they've actually handed it to you, and you confirm on your end that you received it — both steps matter, so the record is accurate for everyone." },
            { title: "Overtime & shortfall claims", body: "Worked more hours than your schedule said? Submit a claim describing what happened. Your manager reviews it and can approve it in full, in part, or not at all." },
          ],
        },
      ],
    },
    bn: {
      tabs: [
        {
          icon: "clock",
          title: "Today",
          location: "স্ক্রিনের নিচে Today ট্যাবে গেলেই এটা পাবে।",
          items: [
            { title: "কাজে আসলে — রিং-টা", chip: "Tap to check in", body: "স্ক্রিনের মাঝখানের রিং-টায় ট্যাপ করো। এতে একটা scanner খুলবে — ম্যানেজার কাউন্টারে যে QR কোড দেখিয়ে রেখেছেন তার দিকে ক্যামেরা ধরো। ম্যানেজার তোমার শাখার জন্য location-check চালু রাখলে, ঠিক তখনই তোমার ফোনের location-ও চেক হবে — তাই নিশ্চিত থাকো তুমি সত্যিই সেখানে আছো।" },
            { title: "কাজ শেষে — একই রিং", chip: "Tap to check out", body: "কাজ শেষে আবার সেই রিং-এ ট্যাপ করো, একইভাবে scan করে check-out করো। scan করার সাথে সাথেই app হিসাব করে ফেলে তুমি কত ঘণ্টা কাজ করলে আর কত টাকা রোজগার করলে — অপেক্ষা করতে হয় না।" },
          ],
        },
        {
          icon: "calendar",
          title: "My shifts",
          location: "স্ক্রিনের নিচে My shifts ট্যাবে গেলেই এটা পাবে।",
          items: [
            { title: "This week", body: "সপ্তাহের সাত দিনের হিসাব একনজরে — কোন দিন কোন shift। আজকের card-টার চারপাশে border আছে, তাই সহজেই চোখে পড়ে।" },
            { title: "Swap", body: "কোনো shift-এ থাকতে না পারলে, সেই দিনের card-এ Swap চেপে নির্দিষ্ট কোনো সহকর্মীকে জিজ্ঞেস করতে পারো, বা যে কেউ নিতে পারবে এভাবে ছেড়ে দিতে পারো। কোনো সহকর্মী রাজি হয়ে ম্যানেজার শেষবার অনুমোদন দিলেই shift-টা আনুষ্ঠানিকভাবে তার হয়ে যায়।" },
            { title: "Weekly availability", chip: "Save availability", body: "সাধারণত যেদিনগুলো ফ্রি থাকো সেগুলো চালু করো, সেই দিনগুলোর জন্য নিজের সময়টাও বসিয়ে দাও, তারপর Save availability চাপো। এটা ম্যানেজারকে অন্য দিনে তোমাকে shift দেওয়া থেকে আটকায় না — এটা শুধু তথ্য, যাতে তুমি যেদিন ফ্রি না বলেছ সেদিন shift দেওয়া এড়ানো যায়।" },
          ],
        },
        {
          icon: "file",
          title: "Leave",
          location: "স্ক্রিনের নিচে Leave ট্যাবে গেলেই এটা পাবে।",
          items: [
            { title: "Request leave", chip: "Submit request", body: "কী ধরনের ছুটি চাচ্ছ আর কোন তারিখগুলোতে সেটা বেছে নাও, সাথে কোনো document থাকলে (যেমন ডাক্তারের কাগজ) জুড়ে দাও। জমা দেওয়ার আগেই form-এর ভেতর দেখতে পাবে সেই ছুটির বাকি কতদিন আছে — আন্দাজ করতে হয় না।" },
          ],
        },
        {
          icon: "wallet",
          title: "Wallet",
          location: "স্ক্রিনের নিচে Wallet ট্যাবে গেলেই এটা পাবে।",
          items: [
            { title: "Current balance", body: "তোমার এখন কত টাকা পাওনা সেটা। মান বদলালে সংখ্যাটা হঠাৎ না বদলে ধীরে ধীরে গুনে গুনে ওঠে — এটা শুধু একটা visual touch, টাকার হিসাব সবসময় ঠিকই থাকে।" },
            { title: "Request payout", body: "ব্যাংক payout সেট করা না থাকলে, এটা দিয়ে নগদে পাওয়ার জন্য request করো। ম্যানেজার হাতে টাকা দেওয়ার পর confirm করবেন, আর তুমিও পাওয়ার পর নিজের দিক থেকে confirm করবে — দুটোই জরুরি, তাহলেই হিসাবটা সবার জন্য নির্ভুল থাকে।" },
            { title: "Overtime & shortfall claims", body: "শিডিউলের চেয়ে বেশি সময় কাজ করেছ? কী হয়েছিল লিখে একটা claim জমা দাও। ম্যানেজার সেটা দেখে পুরো, অর্ধেক, বা একেবারেই না — যেকোনোটা approve করতে পারেন।" },
          ],
        },
      ],
    },
  },
};

export const ACCOUNT_SECTION = {
  en: {
    title: "Your account",
    location: "Tap your profile picture in the top-right corner, on any tab, to open this.",
    items: [
      { title: "Profile", body: "Update your name, phone number, address, and photo. Change your password. If you ever need to, you can also delete your account from here." },
      { title: "Settings", body: "Switch between Light and Night mode, and manage Notifications — turn push alerts on or off, and look back through your notification history." },
      { title: "Privacy policy · Help center · Logout", body: "Read how your data is handled, find answers to common questions or a support email, and sign out when you're done." },
    ],
  },
  bn: {
    title: "তোমার অ্যাকাউন্ট",
    location: "যেকোনো ট্যাবে থেকে উপরে-ডানদিকে তোমার profile ছবিতে ট্যাপ করলেই এটা খুলবে।",
    items: [
      { title: "Profile", body: "নাম, ফোন নম্বর, ঠিকানা, আর ছবি বদলাও। password বদলাও। কখনো দরকার হলে এখান থেকে account-ও delete করতে পারো।" },
      { title: "Settings", body: "Light আর Night mode-এর মধ্যে বদলাও, আর Notifications ম্যানেজ করো — push alert চালু/বন্ধ করো, আগের notification-গুলো ফিরে দেখো।" },
      { title: "Privacy policy · Help center · Logout", body: "তোমার তথ্য কীভাবে ব্যবহার হয় সেটা পড়ো, সাধারণ প্রশ্নের উত্তর বা সাহায্যের ইমেইল খুঁজে নাও, আর কাজ শেষে sign out করো।" },
    ],
  },
};
