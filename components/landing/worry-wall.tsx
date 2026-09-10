"use client";

import dynamic from "next/dynamic";
import type { DriftWallItem } from "@/components/react-bits/DriftWall";

const DriftWall = dynamic(() => import("@/components/react-bits/DriftWall"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-black" aria-hidden />,
});

/** Real public posts / reporting — quotes truncated for the tile; hrefs go to the source. */
const WORRY_POSTS: DriftWallItem[] = [
  {
    platform: "reddit",
    handle: "r/cybersecurity",
    body: "Had an incident last week that made my blood boil. Junior dev was debugging a SQL query and literally copy-pasted 200+ customer records with emails, phone numbers, and purchase history straight into ChatGPT. Said he needed help optimizing the query and didn't think twice about it. Only caught it because I happened to walk by his screen.",
    meta: "Reddit",
    title: "Employee pasted our customer database schema into ChatGPT",
    href: "https://www.reddit.com/r/cybersecurity/comments/1p0lne3/employee_pasted_our_customer_database_schema_into/",
  },
  {
    platform: "reddit",
    handle: "r/ChatGPTPro",
    body: "Last week I caught someone pasting an entire customer database schema into ChatGPT to \"help debug a query.\" The week before that, someone uploaded a full contract with client names and financials to get help summarizing it.",
    meta: "Reddit",
    title: "Staff keep dumping proprietary code and customer data into ChatGPT",
    href: "https://www.reddit.com/r/ChatGPTPro/comments/1paxm9e/staff_keep_dumping_proprietary_code_and_customer/",
  },
  {
    platform: "x",
    handle: "@cryps1s",
    body: "We just removed a feature from @ChatGPTapp that allowed users to make their conversations discoverable by search engines, such as Google. This was a short-lived experiment… Ultimately we think this feature introduced too many opportunities for folks to accidentally share things they didn't intend to.",
    meta: "OpenAI CISO",
    title: "Discoverable chats rolled back",
    href: "https://x.com/cryps1s/status/1951041845938499669",
  },
  {
    platform: "reddit",
    handle: "r/technology",
    body: "Thousands of private ChatGPT conversations found via Google search after feature mishap. Users shocked as personal conversations were discoverable on Google.",
    meta: "Reddit",
    title: "Shared ChatGPT chats indexed by Google",
    href: "https://www.reddit.com/r/technology/comments/1mh02nu/thousands_of_private_chatgpt_conversations_found/",
  },
  {
    platform: "reddit",
    handle: "r/sysadmin",
    body: "Anyone had a real ChatGPT data leakage incident or are we just paranoid? Looking for actual incidents where customer data, source code, or internal financials went somewhere they should not — because of ChatGPT or similar tools.",
    meta: "Reddit",
    title: "Real ChatGPT leakage incidents?",
    href: "https://www.reddit.com/r/sysadmin/comments/1tiea2n/anyone_had_a_real_chatgpt_data_leakage_incident/",
  },
  {
    platform: "reddit",
    handle: "r/msp",
    body: "Are clients actually leaking customer data into ChatGPT or is it mostly theoretical? I am seeing more clients use ChatGPT… and it often turns into pasting real customer info into prompts — customer lists, phone numbers, emails, ticket notes.",
    meta: "Reddit",
    title: "MSP reality check on AI paste risk",
    href: "https://www.reddit.com/r/msp/comments/1qn4oms/are_clients_actually_leaking_customer_data_into/",
  },
  {
    platform: "reddit",
    handle: "r/cybersecurity",
    body: "Found out last week three people on our team had been feeding actual client data into random AI tools for months. Not the approved ones — just stuff they googled, signed up for with their work email, and started using because it worked better. Nobody caught it.",
    meta: "Reddit",
    title: "To every manager who thinks they have AI under control",
    href: "https://www.reddit.com/r/cybersecurity/comments/1rkhnyw/to_every_manager_who_thinks_they_have_ai_under/",
  },
  {
    platform: "reddit",
    handle: "r/sysadmin",
    body: "Traditional DLP was built around files… Nobody is attaching a file when they paste customer data into a prompt, it is just text typed into a browser field that gets encrypted and sent to a model before anything I have can see it. Copy paste is the actual channel.",
    meta: "Reddit",
    title: "DLP can't see what users type into AI tools",
    href: "https://www.reddit.com/r/sysadmin/comments/1rrln94/trying_to_write_a_dlp_policy_for_ai_interactions/",
  },
  {
    platform: "reddit",
    handle: "r/ChatGPT",
    body: "Many shared ChatGPT conversations are being indexed by Google, which means they can become publicly accessible. When users share ChatGPT chats — intended for friends, colleagues, or small groups — these conversations can appear in Google search results.",
    meta: "Reddit",
    title: "Shared chats showing up in Google",
    href: "https://www.reddit.com/r/ChatGPT/comments/1me1nyd/open_ai_is_leaking_all_your_gpt_info/",
  },
  {
    platform: "news",
    handle: "Fast Company",
    body: "Google is indexing conversations with ChatGPT that users have sent to friends, families, or colleagues — turning private exchanges intended for small groups into search results visible to millions. Nearly 4,500 conversations come up in results for the Google site search.",
    meta: "Exclusive",
    title: "Google indexing ChatGPT conversations",
    href: "https://www.fastcompany.com/91376687/google-indexing-chatgpt-conversations",
  },
  {
    platform: "news",
    handle: "Korea Herald",
    body: "Samsung Electronics joined other tech companies in banning the use of ChatGPT… after discovering leaks of sensitive internal codes by its engineers. Earlier, the Device Solution division found three misuse cases where engineers uploaded sensitive company information, including meeting minutes and source codes.",
    meta: "2023",
    title: "Samsung bans AI chatbots after leak",
    href: "https://www.koreaherald.com/article/3118116",
  },
  {
    platform: "news",
    handle: "Fortune",
    body: "OpenAI has removed a feature allowing ChatGPT conversations to be indexed by Google… The company called it a \"short-lived experiment\" after reports that thousands of conversations with the chatbot appeared in search results.",
    meta: "2025",
    title: "OpenAI ends discoverable chats",
    href: "https://fortune.com/2025/08/05/openai-google-search-chat-history/",
  },
  {
    platform: "reddit",
    handle: "r/sysadmin",
    body: "The real risk isn't some dramatic leak. It's the slow death by a thousand copy-pastes. Sales guy drops a customer list into ChatGPT to draft an email. Dev pastes a config snippet to debug something. Nobody's malicious — nobody's trying to exfiltrate anything.",
    meta: "Comment",
    title: "Death by a thousand copy-pastes",
    href: "https://www.reddit.com/r/sysadmin/comments/1tiea2n/anyone_had_a_real_chatgpt_data_leakage_incident/",
  },
  {
    platform: "news",
    handle: "The Register",
    body: "OpenAI's option to tell search engines to index a given chat… took the form of a checkbox titled \"Make this chat discoverable\" in the share popup. Earlier docs said shared links \"are not indexed by search engines.\" That changed — then the feature was pulled.",
    meta: "2025",
    title: "OpenAI removes ChatGPT self-doxing option",
    href: "https://www.theregister.com/2025/08/01/openai_removes_chatgpt_self_doxing_option/",
  },
  {
    platform: "news",
    handle: "Tom's Hardware",
    body: "In one case, a Samsung Semiconductor employee submitted source code of a proprietary program to ChatGPT to fix errors… Another entered test patterns meant to identify defective chips and requested optimization.",
    meta: "2023",
    title: "Samsung fab workers leak confidential data",
    href: "https://www.tomshardware.com/news/samsung-fab-workers-leak-confidential-data-to-chatgpt",
  },
];

export function WorryWall() {
  return (
    <section id="signal" className="relative overflow-hidden bg-black py-16 text-ink md:py-24">
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="landing-fade inline-flex rounded-full px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-ink">
            SIGNAL
          </p>
          <h2
            className="landing-fade mt-6 font-light tracking-[-0.04em] text-ink"
            style={{ fontSize: "clamp(1.85rem, 4.2vw, 3.15rem)", lineHeight: 1.12 }}
          >
            Everyone is silently leaking.
          </h2>
          <p className="landing-fade mx-auto mt-4 max-w-xl text-[15px] leading-7 text-ink/60">
            Real posts and reporting on AI chat leaks — from Reddit ops threads to shared chats
            showing up in Google. Click any card for the source.
          </p>
        </div>
      </div>

      <div className="relative mt-12 h-[min(72vh,640px)] w-full">
        <DriftWall
          items={WORRY_POSTS}
          columns={3}
          tileWidth={360}
          tileHeight={168}
          gap={16}
          tilt={14}
          turn={-12}
          perspective={1200}
          depth={110}
          speed={36}
          direction="up"
          variance={0.4}
          parallax={0.55}
          lift={56}
          fade={0.35}
          dim={1}
          overlayColor="transparent"
          radius={16}
          roll={0}
          pauseOnHover={false}
          grayscale={false}
        />
      </div>
    </section>
  );
}
