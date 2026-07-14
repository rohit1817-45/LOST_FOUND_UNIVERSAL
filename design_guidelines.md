{
  "design_system_name": "ULFN — Hopeful Civic Network UI",
  "brand_attributes": [
    "hopeful (reunion-first, not alarmist)",
    "trustworthy (police/NGO-grade clarity)",
    "calm + efficient (30-second reporting)",
    "community-centric (citizens + verified orgs)",
    "accessible (low-literacy friendly, icon-led, WCAG-AA)"
  ],
  "visual_personality": {
    "style_fusion": [
      "Airbnb-like warmth + photography-forward cards",
      "Uber-like operational clarity for dashboards/tables",
      "LinkedIn-like trust cues (verification, identity, audit trails)",
      "Bento-grid marketing sections + split-map layouts"
    ],
    "layout_principles": [
      "Mobile-first: single-column, sticky bottom CTA for Report",
      "Desktop: split-view map + results list; dashboards use 12-col grid",
      "High whitespace: 2–3x spacing; calm surfaces; minimal borders",
      "Information hierarchy: status chips + location + time always visible"
    ]
  },
  "inspiration_sources": {
    "references": [
      {
        "name": "FoundMe — Lost & Found Platform UI/UX (Behance)",
        "url": "https://www.behance.net/gallery/226102791/FoundMe-Lost-and-Found-Platform-UI-UX-Design",
        "takeaways": [
          "Split map + card rail",
          "Large photo-first case cards",
          "Soft, calm surfaces with strong CTA"
        ]
      },
      {
        "name": "PetFBI Automatic Report Matching (real product pattern)",
        "url": "https://petfbi.org/blog/new-automatic-report-matching-feature/",
        "takeaways": [
          "Matching confidence concept",
          "Operational dashboard scanning",
          "Filters + recency/proximity emphasis"
        ]
      },
      {
        "name": "Leaflet legend patterns (control + collapsible legend)",
        "url": "https://github.com/ptma/Leaflet.Legend",
        "takeaways": [
          "Collapsible legend to reduce clutter",
          "Bottom-right legend control",
          "Layer-specific legend updates"
        ]
      }
    ]
  },
  "typography": {
    "google_fonts": {
      "heading": {
        "family": "Space Grotesk",
        "weights": ["500", "600", "700"],
        "usage": "Headings, KPI numbers, hero statements"
      },
      "body": {
        "family": "Figtree",
        "weights": ["400", "500", "600"],
        "usage": "Body, forms, tables, helper text"
      },
      "mono": {
        "family": "IBM Plex Mono",
        "weights": ["400", "500"],
        "usage": "Case IDs, audit log hashes, timestamps"
      }
    },
    "tailwind_text_hierarchy": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight",
      "h2": "text-base md:text-lg font-medium text-muted-foreground",
      "h3": "text-xl font-semibold",
      "body": "text-sm md:text-base",
      "small": "text-xs md:text-sm text-muted-foreground"
    },
    "line_length": {
      "reading": "max-w-[68ch]",
      "dense_ui": "max-w-none"
    }
  },
  "color_system": {
    "notes": [
      "Map marker colors are functional and fixed: RED=Lost, GREEN=Found, BLUE=User, PURPLE=Match, ORANGE=Selected.",
      "App palette must remain calm and neutral so markers stay distinct.",
      "Avoid purple as a brand accent; purple is reserved for Match markers only."
    ],
    "semantic_tokens_hsl": {
      "light": {
        "--background": "36 33% 98%",
        "--foreground": "222 22% 12%",
        "--card": "0 0% 100%",
        "--card-foreground": "222 22% 12%",
        "--popover": "0 0% 100%",
        "--popover-foreground": "222 22% 12%",
        "--primary": "196 78% 34%",
        "--primary-foreground": "0 0% 100%",
        "--secondary": "36 20% 94%",
        "--secondary-foreground": "222 22% 12%",
        "--muted": "36 18% 92%",
        "--muted-foreground": "215 16% 38%",
        "--accent": "24 88% 56%",
        "--accent-foreground": "0 0% 100%",
        "--border": "30 14% 86%",
        "--input": "30 14% 86%",
        "--ring": "196 78% 34%",
        "--destructive": "0 72% 52%",
        "--destructive-foreground": "0 0% 100%",
        "--success": "152 52% 36%",
        "--success-foreground": "0 0% 100%",
        "--warning": "38 92% 50%",
        "--warning-foreground": "222 22% 12%",
        "--info": "206 88% 40%",
        "--info-foreground": "0 0% 100%"
      },
      "dark": {
        "--background": "222 22% 8%",
        "--foreground": "0 0% 98%",
        "--card": "222 22% 10%",
        "--card-foreground": "0 0% 98%",
        "--popover": "222 22% 10%",
        "--popover-foreground": "0 0% 98%",
        "--primary": "196 78% 44%",
        "--primary-foreground": "222 22% 10%",
        "--secondary": "222 18% 16%",
        "--secondary-foreground": "0 0% 98%",
        "--muted": "222 18% 16%",
        "--muted-foreground": "215 18% 70%",
        "--accent": "24 88% 58%",
        "--accent-foreground": "222 22% 10%",
        "--border": "222 16% 18%",
        "--input": "222 16% 18%",
        "--ring": "196 78% 44%",
        "--destructive": "0 62% 42%",
        "--destructive-foreground": "0 0% 98%",
        "--success": "152 52% 42%",
        "--success-foreground": "222 22% 10%",
        "--warning": "38 92% 56%",
        "--warning-foreground": "222 22% 10%",
        "--info": "206 88% 52%",
        "--info-foreground": "222 22% 10%"
      }
    },
    "map_marker_colors_fixed": {
      "lost_red": "#E23D3D",
      "found_green": "#1F9D63",
      "user_blue": "#2B6DEB",
      "match_purple": "#7C3AED",
      "selected_orange": "#F59E0B"
    },
    "allowed_gradients": {
      "usage_rules": [
        "Only for hero/section backgrounds and decorative overlays.",
        "Max 20% viewport coverage.",
        "Never on text-heavy surfaces/cards/tables.",
        "Never on small UI elements (<100px)."
      ],
      "recipes": [
        {
          "name": "Hope Dawn (hero wash)",
          "css": "radial-gradient(1200px 600px at 20% 10%, rgba(34, 211, 238, 0.18), transparent 60%), radial-gradient(900px 500px at 80% 0%, rgba(251, 146, 60, 0.14), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.0), rgba(255,255,255,0.0))"
        },
        {
          "name": "Night Patrol (dark mode wash)",
          "css": "radial-gradient(900px 500px at 15% 0%, rgba(34, 211, 238, 0.14), transparent 60%), radial-gradient(900px 500px at 85% 10%, rgba(251, 146, 60, 0.10), transparent 55%)"
        }
      ]
    }
  },
  "design_tokens": {
    "radius": {
      "--radius": "0.75rem",
      "usage": [
        "Cards/dialogs: rounded-xl",
        "Inputs/buttons: rounded-lg",
        "Chips/badges: rounded-full"
      ]
    },
    "shadows": {
      "light": {
        "--shadow-sm": "0 1px 2px rgba(15, 23, 42, 0.06)",
        "--shadow-md": "0 10px 24px rgba(15, 23, 42, 0.10)",
        "--shadow-lg": "0 18px 50px rgba(15, 23, 42, 0.14)"
      },
      "dark": {
        "--shadow-sm": "0 1px 2px rgba(0, 0, 0, 0.35)",
        "--shadow-md": "0 10px 24px rgba(0, 0, 0, 0.45)",
        "--shadow-lg": "0 18px 50px rgba(0, 0, 0, 0.55)"
      }
    },
    "spacing": {
      "page_padding": "px-4 sm:px-6 lg:px-8",
      "section_spacing": "py-10 sm:py-14 lg:py-18",
      "card_padding": "p-4 sm:p-5",
      "form_gap": "gap-3 sm:gap-4",
      "dense_table_cell": "py-2 px-3"
    }
  },
  "layout_patterns": {
    "public_landing": {
      "hero": {
        "structure": [
          "Top nav (logo, Map, Search, How it works, Sign in, Report CTA)",
          "Hero split: left copy + trust indicators; right mini-map preview card",
          "Primary CTA: 'Report' opens wizard; Secondary: 'Browse map'"
        ],
        "components": [
          "navigation-menu",
          "button",
          "card",
          "badge",
          "dialog or drawer (mobile)"
        ],
        "micro_interactions": [
          "Hero map card subtle parallax on scroll (Framer Motion y: [0, 12])",
          "CTA hover: slight lift + shadow-md",
          "Trust chips animate in stagger (opacity/y)"
        ]
      },
      "featured_cases": {
        "layout": "Bento grid: 1 col mobile, 2 col sm, 3 col lg; one large spotlight card",
        "card_rules": [
          "Photo top with aspect-ratio",
          "Status chip (Lost/Found/Missing/Found Person) always top-left",
          "Location + time row",
          "Primary action: View details"
        ]
      }
    },
    "map_browse": {
      "desktop": "Two-pane: left results rail (420–520px) + right map (flex-1).",
      "mobile": "Map full-screen with bottom sheet results (shadcn drawer/sheet).",
      "map_controls": [
        "Top-left: Search input + filter chips",
        "Top-right: Report FAB",
        "Bottom-right: Legend (collapsible)",
        "Bottom-left: Radius slider + 'Search this area'"
      ],
      "performance": [
        "Use marker clustering",
        "Virtualize results list (if needed later)",
        "Debounce filter changes (250–400ms)"
      ]
    },
    "report_wizard": {
      "goal": "Complete under 30 seconds",
      "pattern": "Single-page fast form with progressive disclosure + sticky submit",
      "sections": [
        "Type selector (Lost Pet / Found Pet / Missing Person / Found Person)",
        "Basics (name/species/breed/age/description)",
        "Location picker (Leaflet + geolocate + address search)",
        "Photos (drag/drop)",
        "Contact preference (in-app chat default)"
      ],
      "mobile": "Use Drawer with snap points; sticky bottom bar with Submit",
      "desktop": "Centered Dialog with max-w-2xl; left stepper rail optional",
      "validation": [
        "Inline errors under fields",
        "Disable submit until required fields",
        "Autosave draft locally"
      ]
    },
    "case_detail": {
      "layout": "Two-column on lg: left content, right sticky action card + mini-map",
      "modules": [
        "Gallery carousel",
        "Key facts grid",
        "Timeline (reported → sightings → updates)",
        "Matches strip with confidence badges",
        "Nearby reports"
      ],
      "gated_actions": [
        "Message / Share location requires auth",
        "Sensitive details blurred for public visitors"
      ]
    },
    "dashboards": {
      "shell": "Sidebar (collapsible) + topbar (search, notifications, theme toggle, profile)",
      "grid": "12-col; KPI cards row then tabs (Queues / Map / Analytics)",
      "tables": "Use shadcn table with sticky header; row actions in dropdown-menu",
      "queues": "Split view: table left, detail inspector right (sheet on mobile)"
    }
  },
  "component_library_usage": {
    "primary": {
      "shadcn_ui_paths": [
        "/app/frontend/src/components/ui/button.jsx",
        "/app/frontend/src/components/ui/card.jsx",
        "/app/frontend/src/components/ui/badge.jsx",
        "/app/frontend/src/components/ui/input.jsx",
        "/app/frontend/src/components/ui/textarea.jsx",
        "/app/frontend/src/components/ui/select.jsx",
        "/app/frontend/src/components/ui/dialog.jsx",
        "/app/frontend/src/components/ui/drawer.jsx",
        "/app/frontend/src/components/ui/sheet.jsx",
        "/app/frontend/src/components/ui/tabs.jsx",
        "/app/frontend/src/components/ui/table.jsx",
        "/app/frontend/src/components/ui/dropdown-menu.jsx",
        "/app/frontend/src/components/ui/command.jsx",
        "/app/frontend/src/components/ui/scroll-area.jsx",
        "/app/frontend/src/components/ui/skeleton.jsx",
        "/app/frontend/src/components/ui/sonner.jsx",
        "/app/frontend/src/components/ui/switch.jsx",
        "/app/frontend/src/components/ui/tooltip.jsx",
        "/app/frontend/src/components/ui/calendar.jsx",
        "/app/frontend/src/components/ui/pagination.jsx"
      ]
    },
    "recommended_new_components_to_build": [
      {
        "name": "MapLegend",
        "purpose": "Collapsible legend showing marker meanings + heatmap scale",
        "built_from": ["card", "collapsible", "badge", "separator"],
        "data_testids": ["map-legend-toggle", "map-legend-panel"]
      },
      {
        "name": "CaseCard",
        "purpose": "Reusable card for list + featured + matches",
        "built_from": ["card", "badge", "button", "aspect-ratio"],
        "data_testids": ["case-card", "case-card-open-button"]
      },
      {
        "name": "ConfidenceBadge",
        "purpose": "Low/Medium/High confidence with accessible color + icon",
        "built_from": ["badge", "tooltip"],
        "data_testids": ["match-confidence-badge"]
      },
      {
        "name": "DashboardKpiCard",
        "purpose": "KPI tiles with sparkline placeholder",
        "built_from": ["card"],
        "data_testids": ["dashboard-kpi-card"]
      },
      {
        "name": "QueueInspector",
        "purpose": "Right-side inspector for verification/moderation",
        "built_from": ["sheet", "tabs", "separator", "button"],
        "data_testids": ["queue-inspector"]
      }
    ]
  },
  "component_behaviors": {
    "buttons": {
      "style": "Professional/Warm: rounded-lg, medium weight, clear focus ring",
      "variants": {
        "primary": {
          "use": "Primary actions (Report, Submit, Message)",
          "classes": "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
          "motion": "hover: y:-1, active: scale(0.98)"
        },
        "secondary": {
          "use": "Secondary actions (Browse map, Save search)",
          "classes": "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        },
        "ghost": {
          "use": "Toolbar/icon actions",
          "classes": "hover:bg-accent/10"
        },
        "destructive": {
          "use": "Reject, Delete",
          "classes": "bg-destructive text-destructive-foreground hover:bg-destructive/90"
        }
      },
      "data_testid_rule": "Every Button must include data-testid (e.g., report-wizard-submit-button)."
    },
    "forms": {
      "rules": [
        "Labels always visible (no placeholder-only forms)",
        "Helper text for sensitive fields (who can see this)",
        "Inline validation with Alert component",
        "Use Input OTP for verification flows if needed"
      ],
      "data_testids": [
        "auth-email-input",
        "auth-password-input",
        "report-title-input",
        "report-location-search-input",
        "report-photo-upload-input"
      ]
    },
    "badges_and_status": {
      "case_status": {
        "lost": "bg-red-600 text-white",
        "found": "bg-emerald-600 text-white",
        "missing_person": "bg-red-600 text-white",
        "found_person": "bg-emerald-600 text-white"
      },
      "verification": {
        "verified": "bg-success text-success-foreground",
        "pending": "bg-warning text-warning-foreground",
        "rejected": "bg-destructive text-destructive-foreground"
      },
      "confidence": {
        "high": "bg-success text-success-foreground",
        "medium": "bg-warning text-warning-foreground",
        "low": "bg-secondary text-secondary-foreground border border-border"
      }
    },
    "tables": {
      "pattern": [
        "Sticky header",
        "Row hover highlight",
        "Row click opens inspector",
        "Bulk actions appear when rows selected"
      ],
      "data_testids": ["verification-queue-table", "verification-queue-row"]
    },
    "messaging": {
      "layout": "Desktop: 2-pane (list + chat). Mobile: list then chat route.",
      "components": ["tabs", "scroll-area", "textarea", "button", "avatar"],
      "features": [
        "Message composer supports image + location share",
        "Safety: default to in-app messaging; avoid exposing phone/email"
      ],
      "data_testids": [
        "messages-conversation-list",
        "messages-chat-pane",
        "messages-send-button",
        "messages-attach-image-button",
        "messages-share-location-button"
      ]
    },
    "notifications": {
      "pattern": "Bell icon with dropdown + full page",
      "components": ["dropdown-menu", "tabs", "scroll-area"],
      "data_testids": ["notification-bell-button", "notification-dropdown"]
    },
    "loading_empty_error": {
      "loading": "Use skeletons for cards and tables; map shows subtle spinner overlay",
      "empty": "Friendly empty states with 1 primary action + 1 secondary link",
      "error": "Use Alert with plain language + retry button"
    }
  },
  "motion_microinteractions": {
    "library": "Framer Motion",
    "principles": [
      "Fast UI: 160–220ms for small transitions",
      "Use spring for drawers/sheets (stiffness 260, damping 26)",
      "Respect prefers-reduced-motion"
    ],
    "recommended_patterns": {
      "page_enter": "opacity 0→1 + y 8→0",
      "card_hover": "shadow-sm→shadow-md + translateY(-2px)",
      "filter_chip": "scale 1→1.03 on hover; active state uses solid fill",
      "map_pin_select": "pulse ring (CSS) around selected marker; do not animate all markers"
    }
  },
  "accessibility": {
    "wcag": [
      "AA contrast for text",
      "Keyboard navigable dialogs/drawers",
      "Visible focus ring using --ring",
      "Do not rely on color alone: add icons + labels for Lost/Found"
    ],
    "content": [
      "Plain language labels",
      "Time + distance in human format",
      "Sensitive info gating + consent copy"
    ]
  },
  "imagery_direction": {
    "note": "Image provider tool failed in this environment; use your own licensed photos or later re-run image selection.",
    "style": [
      "Documentary-style, natural light, real community moments",
      "Avoid sensational imagery; focus on hope + action",
      "Use diverse representation; global context"
    ],
    "categories_needed": [
      "Hero: community reunion / pet reunion",
      "NGO: shelter volunteers",
      "Police: community outreach",
      "Case placeholders: neutral silhouettes for pets/persons",
      "Trust indicators: partner logos (monochrome)"
    ]
  },
  "libraries_and_integrations": {
    "leaflet": {
      "notes": [
        "Use marker clustering",
        "Add collapsible legend control",
        "Add radius circle + 'search this area'"
      ]
    },
    "charts": {
      "library": "Recharts",
      "usage": [
        "Admin/NGO/Police dashboards: line chart for reports over time, bar for statuses, donut for outcomes"
      ],
      "install": "npm i recharts"
    },
    "icons": {
      "library": "lucide-react",
      "rule": "No emoji icons; use lucide icons consistently"
    }
  },
  "data_testid_convention": {
    "rule": "kebab-case describing role, not appearance",
    "examples": [
      "report-wizard-open-button",
      "report-wizard-submit-button",
      "map-filter-panel-toggle",
      "case-detail-message-button",
      "admin-verify-ngo-approve-button",
      "theme-toggle-switch"
    ]
  },
  "component_path": {
    "shadcn_ui": "/app/frontend/src/components/ui/",
    "note": "Project uses .jsx components; keep new components in .jsx and follow named exports."
  },
  "instructions_to_main_agent": [
    "Replace default shadcn tokens in /app/frontend/src/index.css with the provided semantic_tokens_hsl (light + dark) and keep marker colors separate.",
    "Remove/avoid centered App container styles; App.css currently contains CRA demo styles—do not use .App-header patterns.",
    "Implement a consistent shell: Topbar + Sidebar for dashboards; Map pages use split-view with Sheet/Drawer on mobile.",
    "Ensure every interactive element and key info element includes data-testid.",
    "Do not introduce purple as a general accent; reserve purple for Match marker and match-related UI only.",
    "Use gradients only as subtle hero washes (<=20% viewport)."
  ],
  "image_urls": {
    "status": "UNAVAILABLE_FROM_TOOL",
    "items": []
  },
  "appendix_general_ui_ux_design_guidelines": "<General UI UX Design Guidelines>  \n    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.\n</General UI UX Design Guidelines>"
}
