import { NextResponse } from "next/server";
import { devOnly } from "../guard";

type BlockTemplate = {
  type: string;
  label: string;
  description: string;
  icon: string;
  template: Record<string, unknown>;
};

const BASE_BLOCKS: BlockTemplate[] = [
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
    description: "Card grid showing your services or features with icons.",
    icon: "grid",
    template: {
      eyebrow: "Services",
      heading: "What we do",
      columns: 3,
      items: [
        { title: "Service one", icon: "🎯", description: "Describe this service in one or two sentences." },
        { title: "Service two", icon: "🚀", description: "Describe this service in one or two sentences." },
        { title: "Service three", icon: "📊", description: "Describe this service in one or two sentences." },
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
  const blocked = devOnly();
  if (blocked) return blocked;

  const activeTheme = process.env.STAARK_THEME ?? "light";
  const blocks = [...BASE_BLOCKS, ...(THEME_BLOCKS[activeTheme] ?? [])];

  return NextResponse.json({ blocks, theme: activeTheme });
}
