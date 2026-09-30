import { NextResponse } from "next/server";
import { resolveAdminRole } from "@staark/platform/server";
import { readSite, readSiteTheme } from "@/lib/admin-theme";
import { resolveThemeRuntime } from "@/lib/theme-runtime";
import {
  availableBlockIdsForTheme,
  themeOwnedBlockIds,
  resolveThemeManifest,
} from "@/lib/theme-manifests";
import { requireAuth } from "../guard";
import { getSession, isSessionActive } from "@/lib/auth";
import { resolveAdminEntitlements } from "@/lib/admin-features";
import {
  normalizeWebsiteType,
  resolveClientFeatures,
} from "@/lib/website-profile";
import {
  themeBlockTemplatesFor,
} from "@/lib/theme-admin-registry";

type BlockTemplate = {
  type: string;
  label: string;
  description: string;
  icon: string;
  template: Record<string, unknown>;
};

const BASE_BLOCKS: BlockTemplate[] = [
  {
    type: "freeform",
    label: "Freeform",
    description: "Flexible text, image and buttons for sections that do not fit a fixed block.",
    icon: "pen-tool",
    template: {
      eyebrow: "Custom section",
      heading: "Add your heading",
      text: "Write the content for this section.",
      imagePosition: "right",
      alignment: "left",
      width: "normal",
      background: "default",
    },
  },
  {
    type: "cards",
    label: "Cards",
    description: "Reusable card grid with optional icons, images, bullet points and links.",
    icon: "grid",
    template: {
      eyebrow: "Highlights",
      heading: "Choose what matters most",
      intro: "Use cards for benefits, features, packages, categories or other repeatable content.",
      columns: 3,
      items: [
        {
          title: "Card one",
          icon: "✦",
          description: "A short description for this card.",
          features: ["First point", "Second point"],
          cta: { label: "Learn more", href: "#" },
        },
        {
          title: "Card two",
          icon: "→",
          description: "A short description for this card.",
          features: ["First point", "Second point"],
        },
        {
          title: "Card three",
          icon: "✓",
          description: "A short description for this card.",
          features: ["First point", "Second point"],
        },
      ],
    },
  },
  {
    type: "linkColumns",
    label: "Link columns",
    description: "Footer-style groups of links for services, company pages, social channels or resources.",
    icon: "link",
    template: {
      columns: 3,
      items: [
        {
          title: "Services",
          links: [
            { label: "Service one", href: "#" },
            { label: "Service two", href: "#" },
            { label: "Service three", href: "#" },
          ],
        },
        {
          title: "Company",
          links: [
            { label: "About us", href: "/om-oss" },
            { label: "Contact", href: "/kontakt" },
            { label: "Pricing", href: "/priser" },
          ],
        },
        {
          title: "Social",
          links: [
            { label: "LinkedIn", href: "#" },
            { label: "Facebook", href: "#" },
          ],
        },
      ],
    },
  },
  {
    type: "projectsShowcase",
    label: "Projects showcase",
    description: "Showcase multiple projects with images, client names, results, tags and links.",
    icon: "briefcase",
    template: {
      eyebrow: "Selected work",
      heading: "Projects we're proud of",
      intro: "A selection of recent work, results and collaborations.",
      columns: 2,
      items: [
        {
          client: "Client one",
          title: "A project that made a difference",
          description: "Explain the challenge, what you delivered and the value created for the client.",
          image: {
            src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=78",
            alt: "Project preview",
          },
          result: "+42% conversion",
          tags: ["Webbdesign", "Development", "SEO"],
          cta: { label: "View project", href: "#" },
        },
        {
          client: "Client two",
          title: "A fast, modern digital experience",
          description: "Use the card for a second case, launch, redesign or customer success story.",
          image: {
            src: "https://images.unsplash.com/photo-1559028012-481c04fa702d?w=1200&q=78",
            alt: "Project preview",
          },
          result: "98 Lighthouse",
          tags: ["UX", "Performance", "Next.js"],
          cta: { label: "View project", href: "#" },
        },
      ],
    },
  },
  {
    type: "hero",
    label: "Hero",
    description: "Full-width hero section with heading, intro text, CTAs and optional image.",
    icon: "layout",
    template: {
      eyebrow: "Welcome",
      heading: "Your headline here",
      intro: "A short introduction that tells visitors what you do and why they should care.",
      primaryCta: { label: "Get started", href: "/kontakt" },
      secondaryCta: { label: "Learn more", href: "/#services" },
      image: { src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=70", alt: "Hero image" },
      points: ["Point one", "Point two", "Point three"],
    },
  },
  {
    type: "services",
    label: "Services",
    description: "Service cards with icons, descriptions, bullet points, prices and links.",
    icon: "grid",
    template: {
      eyebrow: "Services",
      heading: "What we do",
      columns: 3,
      items: [
        {
          title: "Service one",
          icon: "🎯",
          description: "Describe this service in one or two sentences.",
          features: ["First benefit", "Second benefit", "Third benefit"],
          cta: { label: "Learn more", href: "#" },
        },
        {
          title: "Service two",
          icon: "🚀",
          description: "Describe this service in one or two sentences.",
          features: ["First benefit", "Second benefit", "Third benefit"],
          cta: { label: "Learn more", href: "#" },
        },
        {
          title: "Service three",
          icon: "📊",
          description: "Describe this service in one or two sentences.",
          features: ["First benefit", "Second benefit", "Third benefit"],
          cta: { label: "Learn more", href: "#" },
        },
      ],
    },
  },
  {
    type: "process",
    label: "Process",
    description: "Step-by-step process or how-it-works section.",
    icon: "list-ordered",
    template: {
      eyebrow: "How it works",
      heading: "From start to finish",
      steps: [
        { title: "Step one", description: "Describe this step." },
        { title: "Step two", description: "Describe this step." },
        { title: "Step three", description: "Describe this step." },
      ],
    },
  },
  {
    type: "testimonials",
    label: "Testimonials",
    description: "Customer reviews and quotes with ratings.",
    icon: "message-circle",
    template: {
      heading: "What our customers say",
      items: [
        { quote: "Excellent service and great results!", author: "Jane D.", rating: 5 },
        { quote: "Highly recommended. Professional and fast.", author: "John S.", rating: 5 },
      ],
    },
  },
  {
    type: "cta",
    label: "Call to action",
    description: "Banner with heading, text and a call-to-action button.",
    icon: "megaphone",
    template: {
      heading: "Ready to get started?",
      intro: "Tell us about your project and we'll get back to you within a day.",
      cta: { label: "Contact us", href: "/kontakt" },
    },
  },
  {
    type: "contact",
    label: "Contact form",
    description: "Contact form with customizable fields.",
    icon: "mail",
    template: {
      eyebrow: "Contact",
      heading: "Get in touch",
      intro: "Fill out the form and we'll respond within one business day.",
      formId: "contact",
      submitLabel: "Send",
      successMessage: "Thanks! We'll be in touch soon.",
      fields: [
        { name: "name", label: "Name", required: true },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "phone", label: "Phone", type: "tel" },
        { name: "message", label: "Message", type: "textarea" },
      ],
    },
  },

  {
    type: "leadForm",
    label: "Lead form",
    description: "Quote or sales enquiry form. Submissions are routed to Leads.",
    icon: "user-plus",
    template: {
      eyebrow: "Free quote",
      heading: "Tell us about your project",
      intro: "Fill in the form and we'll get back to you with the next step.",
      formId: "lead-main",
      submitLabel: "Send enquiry",
      successMessage: "Thanks! We'll get back to you soon.",
      fields: [
        { name: "name", label: "Name", required: true },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "phone", label: "Phone", type: "tel" },
        { name: "company", label: "Company" },
        { name: "package", label: "Package" },
        { name: "website_url", label: "Website" },
        { name: "message", label: "Message", type: "textarea", required: true },
      ],
    },
  },

  {
    type: "bookingForm",
    label: "Booking form",
    description: "Booking request form. Submissions are routed to Bookings.",
    icon: "calendar",
    template: {
      eyebrow: "Booking",
      heading: "Request a booking",
      intro: "Choose the details below and we'll confirm your booking.",
      formId: "booking-main",
      submitLabel: "Send booking request",
      successMessage: "Thanks! We'll confirm your booking as soon as possible.",
      fields: [
        { name: "name", label: "Name", required: true },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "phone", label: "Phone", type: "tel" },
        { name: "company", label: "Company" },
        { name: "booking_type", label: "Booking type" },
        { name: "booking_date", label: "Date", type: "date" },
        { name: "booking_end_date", label: "End date", type: "date" },
        { name: "booking_time", label: "Time", type: "time" },
        { name: "booking_guests", label: "Guests", type: "number" },
        { name: "booking_item", label: "Item / service" },
        { name: "message", label: "Message", type: "textarea" },
      ],
    },
  },
];

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const session = await getSession();
  const role = isSessionActive(session)
    ? resolveAdminRole(session.role)
    : "client";

  const site = await readSite();
  const websiteType = normalizeWebsiteType(site.websiteType);
  const productFeatures = new Set(
    resolveClientFeatures(
      websiteType,
      resolveAdminEntitlements(),
    ),
  );

  const activeTheme = resolveThemeRuntime(readSiteTheme(site).family).id;
  const blocks = [
    ...BASE_BLOCKS,
    ...themeBlockTemplatesFor(activeTheme),
  ];

  const allowedBlockIds = availableBlockIdsForTheme(activeTheme);

  const availableBlocks = blocks.filter((item) => {
    if (!allowedBlockIds.has(item.type)) return false;

    // Booking blocks are only offered when the site's product profile
    // actually supports bookings. Existing page blocks are not touched.
    if (
      item.type === "bookingForm" &&
      !productFeatures.has("booking")
    ) {
      return false;
    }

    return true;
  });

  const activeManifest = resolveThemeManifest(activeTheme);
  const commonBlockIds = [...themeOwnedBlockIds("light")];
  const activeThemeOwnedBlockIds =
    activeTheme === "light"
      ? []
      : [...themeOwnedBlockIds(activeTheme)];

  return NextResponse.json({
    blocks: availableBlocks,
    theme: activeTheme,
    websiteType,
    advancedEditing: role === "manager",
    themeName: activeManifest.name,
    commonBlockIds,
    themeOwnedBlockIds: activeThemeOwnedBlockIds,
  });
}
