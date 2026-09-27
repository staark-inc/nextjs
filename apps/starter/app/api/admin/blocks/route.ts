import { NextResponse } from "next/server";
import { readSite, readSiteTheme } from "@/lib/admin-theme";
import { resolveThemeRuntime } from "@/lib/theme-runtime";
import { requireAuth } from "../guard";

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
    description: "Contact or booking form with customizable fields.",
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
];

const THEME_BLOCKS: Record<string, BlockTemplate[]> = {
  salong: [
    {
      type: "priceList",
      label: "Price list",
      description: "Service price list grouped by category.",
      icon: "receipt",
      template: {
        eyebrow: "Prices",
        heading: "Our prices",
        categories: [
          {
            name: "Haircut",
            items: [
              { name: "Women's cut", price: "495 kr", duration: "45 min" },
              { name: "Men's cut", price: "395 kr", duration: "30 min" },
            ],
          },
        ],
      },
    },
    {
      type: "gallery",
      label: "Gallery",
      description: "Image gallery to showcase your work.",
      icon: "image",
      template: {
        heading: "Our work",
        images: [
          { src: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=70", alt: "Work sample 1" },
          { src: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=70", alt: "Work sample 2" },
        ],
      },
    },
  ],
  gastfrihet: [
    {
      type: "rooms",
      label: "Rooms",
      description: "Room cards with price, capacity and amenities.",
      icon: "bed",
      template: {
        eyebrow: "Rooms",
        heading: "Available rooms",
        intro: "Browse our rooms and find your perfect stay.",
        rooms: [
          {
            name: "Standard room",
            image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=70",
            occupancy: "2 guests",
            description: "A comfortable room with a view.",
            price: "990 kr/night",
            amenities: ["Double bed", "Private bath", "WiFi"],
            href: "/kontakt",
          },
        ],
      },
    },
    {
      type: "amenities",
      label: "Amenities",
      description: "Icon grid showing available amenities and facilities.",
      icon: "sparkles",
      template: {
        heading: "Amenities",
        intro: "Everything you need for a comfortable stay.",
        items: [
          { label: "Breakfast included", icon: "🍳" },
          { label: "Free WiFi", icon: "📶" },
          { label: "Free parking", icon: "🚗" },
          { label: "Pets welcome", icon: "🐾" },
        ],
      },
    },
  ],
};

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const site = await readSite();
  const activeTheme = resolveThemeRuntime(readSiteTheme(site).family).id;
  const blocks = [...BASE_BLOCKS, ...(THEME_BLOCKS[activeTheme] ?? [])];

  return NextResponse.json({ blocks, theme: activeTheme });
}
